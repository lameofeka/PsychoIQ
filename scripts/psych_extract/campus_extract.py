"""Extraction pipeline for the "campus" exam batch (10 new-format simulations).

Unlike the old scanned-PDF exams, these PDFs have a real text layer for all
structural/navigational content (chapter headers, section labels, question
numbering, the correct-answer key, and — in the companion "תשובות" PDF — full
worked solutions). Only the question bodies themselves (word pairs, sentence
stems, answer choices, diagrams) are embedded as one raster image per
question; there is no shared-image-across-questions case to handle.

So the approach is: parse chapter/section boundaries and per-question image
bboxes straight from the PDF's text/image blocks (no pixel-heuristic line
detection needed, unlike segment.py), pick the target question numbers per
the fixed selection rules below, then separately parse the solutions PDF's
plain text for correct answers + explanations.

Usage: python campus_extract.py <exam_number> [<exam_number> ...]
Writes manifest_campus_<n>.json next to this file for each exam number.
"""

import json
import os
import re
import sys

import fitz

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = r"c:\מסמכימים\פסיכומטרי שיט\סימולציות קמפוס\1-10"

NUMBER_LABEL_RE = re.compile(r"^\d+\.?$")
# Bracket order comes out reversed by bidi reordering in text extraction
# (")שאלות17-7(" rather than "(שאלות 7-17)"), so match the range content
# only and don't anchor on which paren comes first.
RANGE_RE = re.compile(r"(?:שאלות|Questions)\s*(\d+)\s*[-–]\s*(\d+)")
VERBAL_HEADER_RE = re.compile(r"פרק\s*(\d+)\s*:\s*חשיבה\s*מילולית")
QUANT_HEADER_RE = re.compile(r"פרק\s*(\d+)\s*:\s*חשיבה\s*כמותית")
ENGLISH_HEADER_RE = re.compile(r"SECTION\s*(\d+)\s*:\s*ENGLISH")
CHAPTER_COUNT_RE = re.compile(r"בפרק זה\s*(\d+)")
ENGLISH_COUNT_RE = re.compile(r"contains\s*(\d+)\s*questions", re.IGNORECASE)

# Sub-range label keyword -> (category, subtype) it marks within a chapter.
LABEL_SUBTYPES = {
    "הבנה והסקה": ("verbal", "reading_inference"),
    "קטע קריאה": ("verbal", "reading_passage"),
    "ובעיות": ("quant", "regular"),
    "הסקה מתרשים": ("quant", "diagram"),
    "הסקה מטבלה": ("quant", "diagram"),
    "Restatements": ("english", "restatement"),
    "Restatement": ("english", "restatement"),
    "Sentence Completions": ("english", "word_completion"),
    "Reading Comprehension": ("english", "reading_passage"),
}

# Implicit opening subtype for each category (the range before the first
# explicitly labeled sub-range, which uses a title graphic that doesn't
# extract as text — see module docstring).
OPENING_SUBTYPE = {
    "verbal": "analogy",
    "quant": "regular",
    "english": "word_completion",
}


def page_blocks(page):
    """Return (text_blocks, image_blocks) for a page: text_blocks is a list
    of (bbox, text), image_blocks a list of bbox."""
    d = page.get_text("dict")
    text_blocks = []
    image_blocks = []
    for b in d["blocks"]:
        if b["type"] == 0:
            txt = "".join(s["text"] for l in b["lines"] for s in l["spans"]).strip()
            if txt:
                text_blocks.append((b["bbox"], txt))
        else:
            image_blocks.append(b["bbox"])
    return text_blocks, image_blocks


def find_question_images(page):
    """Match each numbering label ("7.") on the page to the image block
    directly below it. Returns {question_number: bbox}."""
    text_blocks, image_blocks = page_blocks(page)
    labels = []
    for bbox, txt in text_blocks:
        if NUMBER_LABEL_RE.match(txt):
            labels.append((int(txt.rstrip(".")), bbox[1]))  # (number, y_top)

    result = {}
    for qnum, label_y in labels:
        best = None
        best_gap = None
        for img_bbox in image_blocks:
            gap = img_bbox[1] - label_y
            if gap < -5:
                continue
            if best_gap is None or gap < best_gap:
                best_gap = gap
                best = img_bbox
        if best is not None:
            result[qnum] = list(best)
    return result


def find_chapters(doc):
    """Scan the whole document once, returning a list of chapter dicts:
    {category, chapter, start_page, total_questions, ranges: [(start,end,subtype)]}
    ranges covers every explicitly labeled sub-range in that chapter; the
    implicit opening range (1..first_range_start-1) is added by the caller."""
    chapters = []
    current = None

    for page_index in range(doc.page_count):
        page = doc[page_index]
        text_blocks, _ = page_blocks(page)
        page_text = "\n".join(t for _, t in text_blocks)

        m = VERBAL_HEADER_RE.search(page_text) or QUANT_HEADER_RE.search(page_text)
        me = ENGLISH_HEADER_RE.search(page_text)
        if m or me:
            if current:
                chapters.append(current)
            if m:
                category = "verbal" if "מילולית" in page_text[m.start() : m.start() + 30] else "quant"
                chnum = int(m.group(1))
                cm = CHAPTER_COUNT_RE.search(page_text)
                total = int(cm.group(1)) if cm else None
            else:
                category = "english"
                chnum = int(me.group(1))
                cm = ENGLISH_COUNT_RE.search(page_text)
                total = int(cm.group(1)) if cm else None
            current = {
                "category": category,
                "chapter": chnum,
                "start_page": page_index,
                "total_questions": total,
                "ranges": [],
            }
            continue

        if current is None:
            continue

        for bbox, txt in text_blocks:
            rm = RANGE_RE.search(txt)
            if not rm:
                continue
            # The two numbers, like the brackets, come out bidi-reversed for
            # Hebrew range labels ("שאלות17-7" really means "questions 7-17").
            start, end = sorted((int(rm.group(1)), int(rm.group(2))))
            label_text = txt[: rm.start()]
            subtype = None
            for keyword, (cat, st) in LABEL_SUBTYPES.items():
                if keyword in label_text or keyword in txt:
                    subtype = st
                    break
            if subtype:
                current["ranges"].append((start, end, subtype))

        # Stop scanning this chapter once the next chapter's header appears
        # (handled by the header check above) or a blank/answer-key page —
        # heuristically stop after total_questions is covered isn't needed
        # since header regex naturally closes the chapter.

    if current:
        chapters.append(current)
    return chapters


# English section-type boundaries never appear as extractable text (the
# "Sentence Completions" / "Restatements" / "Reading Comprehension" labels
# are baked into title-graphic images, unlike the Hebrew section labels) —
# but every English chapter observed follows the same fixed E22-NEW template,
# so hardcode it rather than trying to detect it per chapter.
ENGLISH_TEMPLATE = [(1, 8, "word_completion"), (9, 12, "restatement"), (13, 22, "reading_passage")]

# Some "pilot" chapters (experimental item-bank content, flagged "V1"/"Q1"
# in the booklet rather than the usual "V7-NEW" etc.) bake their section
# labels into the header image instead of drawing them as live text, so
# find_chapters finds no explicit ranges for them at all even though the
# underlying layout matches a normal chapter of that category — fall back
# to the confirmed layout from this exam's non-pilot verbal chapters.
VERBAL_TEMPLATE = [(1, 6, "analogy"), (7, 17, "reading_inference"), (18, 23, "reading_passage")]


def resolve_ranges(chapter):
    """Fill in the implicit opening range and return a sorted, deduped list
    of (start, end, subtype) covering the whole chapter."""
    if chapter["category"] == "english" and not chapter["ranges"]:
        return ENGLISH_TEMPLATE
    if chapter["category"] == "verbal" and not chapter["ranges"] and chapter["total_questions"] == 23:
        return VERBAL_TEMPLATE

    ranges = sorted(chapter["ranges"])
    opening_subtype = OPENING_SUBTYPE[chapter["category"]]
    if ranges:
        first_start = ranges[0][0]
        if first_start > 1:
            ranges = [(1, first_start - 1, opening_subtype)] + ranges
    elif chapter["total_questions"]:
        ranges = [(1, chapter["total_questions"], opening_subtype)]
    return ranges


def select_targets(chapter, ranges):
    """Apply the fixed per-category selection rules. Returns list of
    (question_number, subtype)."""
    category = chapter["category"]
    by_subtype = {}
    for start, end, subtype in ranges:
        by_subtype.setdefault(subtype, []).extend(range(start, end + 1))

    targets = []
    if category == "verbal":
        analogies = by_subtype.get("analogy", [])[:3]
        targets += [(q, "analogy") for q in analogies]

        comprehension = sorted(by_subtype.get("reading_inference", []))
        # "sentence completion" here is whichever comprehension sub-block
        # comes first, per the missing-paragraph-part instructions; there is
        # no separate text label for it, so it's just the first block's
        # first question — but the ranges list only has one combined
        # "reading_inference" span, so take its first question as the
        # completion pick and the next two non-completion questions after
        # the first *labeled instruction gap* — approximated here as
        # "first question" + "3rd and 4th questions" based on the observed
        # exam-1 layout (Q7 completion / Q8-9 completion / Q10-11 regular).
        if comprehension:
            targets.append((comprehension[0], "sentence_completion"))
            rest = [q for q in comprehension[1:] if q != comprehension[0]]
            targets += [(q, "reading_inference") for q in rest[2:4]]

    elif category == "quant":
        window = [q for q in range(1, 9)]
        diagram_qs = set(by_subtype.get("diagram", []))
        clean = [q for q in window if q not in diagram_qs]
        targets += [(q, "regular") for q in clean]

    elif category == "english":
        word_completion = sorted(by_subtype.get("word_completion", []))[:4]
        targets += [(q, "word_completion") for q in word_completion]
        restatement = sorted(by_subtype.get("restatement", []))[:2]
        targets += [(q, "restatement") for q in restatement]

    return targets


def locate_bboxes(doc, chapter, targets):
    """For each target question number, find its page_index + bbox by
    scanning pages from the chapter's start until all targets are found."""
    remaining = {q for q, _ in targets}
    found = {}
    page_index = chapter["start_page"]
    while remaining and page_index < doc.page_count:
        page = doc[page_index]
        images = find_question_images(page)
        for qnum in list(remaining):
            if qnum in images:
                found[qnum] = (page_index, images[qnum])
                remaining.discard(qnum)
        page_index += 1
        # Safety: don't wander past ~20 pages into the next chapter.
        if page_index - chapter["start_page"] > 20:
            break
    return found


# Matched against whitespace-collapsed text: the category word can wrap
# across a line break mid-word (e.g. "אנגלי\nת"), which breaks a
# space-tolerant (\s*) regex but not a fully-collapsed one.
ANSWER_TABLE_HEADER_RE = re.compile(r"פרק(\d+)-(חשיבהמילולית|חשיבהכמותית|אנגלית)")


def _merge_split_numbers(lines):
    """Multi-digit question numbers are sometimes split across two lines by
    the PDF's text extraction (e.g. "11" then "." on the next line, while
    single-digit ones stay as one "5." token) — recombine them."""
    merged = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if re.match(r"^\d{1,2}$", line) and i + 1 < len(lines) and lines[i + 1].strip().startswith("."):
            dot_line = lines[i + 1].strip()
            merged.append(line + ".")
            rest = dot_line[1:].strip()
            if rest:
                merged.append(rest)
            i += 2
            continue
        merged.append(lines[i])
        i += 1
    return merged


def _parse_answer_table(lines):
    """Find the "מספר השאלה" / "התשובה הנכונה" table at the top of a
    chapter's solutions and return {question_number: answer}. Returns {} if
    no table is found (parsing falls back to per-item text only)."""
    joined_idx = None
    for i, line in enumerate(lines):
        if line.strip() == "מספר" and i + 1 < len(lines) and lines[i + 1].strip() == "השאלה":
            joined_idx = i + 2
            break
    if joined_idx is None:
        return {}

    numbers = []
    i = joined_idx
    while i < len(lines):
        tok = lines[i].strip()
        if re.match(r"^\d{1,2}$", tok):
            numbers.append(int(tok))
            i += 1
        elif tok == "" or tok == "‏":
            i += 1
        else:
            break

    # Skip the "התשובה" / "הנכונה" label pair, then read the same count of
    # single-digit answers.
    while i < len(lines) and lines[i].strip() in ("", "התשובה", "הנכונה"):
        i += 1

    answers = []
    while i < len(lines) and len(answers) < len(numbers):
        tok = lines[i].strip()
        if re.match(r"^\d$", tok):
            answers.append(int(tok))
            i += 1
        elif tok == "":
            i += 1
        else:
            break

    if len(answers) != len(numbers):
        return {}
    return dict(zip(numbers, answers))


def _parse_chapter_lines(lines):
    lines = _merge_split_numbers(lines)
    answer_table = _parse_answer_table(lines)

    by_q = {}
    pending_num = None
    pending_lines = []

    def commit(num, body_lines):
        if num is None:
            return
        joined = "\n".join(l for l in body_lines if l.strip())
        am = re.search(r"תשובה\s*(\d)", joined)
        parsed_answer = int(am.group(1)) if am else None
        by_q[num] = {
            "correct_answer": answer_table.get(num, parsed_answer),
            "solution_text": joined.strip(),
        }

    for line in lines:
        stripped = line.strip()
        if re.match(r"^\d{1,2}\.$", stripped):
            commit(pending_num, pending_lines)
            pending_num = int(stripped.rstrip("."))
            pending_lines = []
        elif pending_num is not None:
            pending_lines.append(line)
    commit(pending_num, pending_lines)
    return by_q


def parse_solutions(ans_path):
    """Parse the companion תשובות PDF. Returns
    {chapter_num: {question_number: {"correct_answer": int, "solution_text": str}}}
    keyed purely by chapter ordinal (1..8) as printed, since that's how the
    question-side chapters are also numbered."""
    doc = fitz.open(ans_path)
    chapter_lines = {}
    current_chapter = None

    for page_index in range(doc.page_count):
        text = doc[page_index].get_text()
        collapsed = re.sub(r"\s+", "", text)
        header = ANSWER_TABLE_HEADER_RE.search(collapsed)
        if header:
            current_chapter = int(header.group(1))
            chapter_lines.setdefault(current_chapter, [])
        if current_chapter is None:
            continue
        chapter_lines[current_chapter].extend(text.split("\n"))

    doc.close()
    return {chnum: _parse_chapter_lines(lines) for chnum, lines in chapter_lines.items()}


def build_manifest(exam_num):
    q_path = os.path.join(SOURCE_DIR, f"{exam_num} שאלות.pdf")
    a_path = os.path.join(SOURCE_DIR, f"{exam_num} תשובות.pdf")

    doc = fitz.open(q_path)
    chapters = find_chapters(doc)
    solutions = parse_solutions(a_path)

    questions = []
    for idx, chapter in enumerate(chapters, start=1):
        ranges = resolve_ranges(chapter)
        targets = select_targets(chapter, ranges)
        bboxes = locate_bboxes(doc, chapter, targets)
        chapter_solutions = solutions.get(chapter["chapter"], {})

        for qnum, subtype in targets:
            if qnum not in bboxes:
                print(f"  WARN exam {exam_num} ch{chapter['chapter']} q{qnum}: no image bbox found")
                continue
            page_index, bbox = bboxes[qnum]
            sol = chapter_solutions.get(qnum)
            if sol is None:
                print(f"  WARN exam {exam_num} ch{chapter['chapter']} q{qnum}: no solution parsed")
            questions.append(
                {
                    "category": chapter["category"],
                    "subtype": subtype,
                    "chapter": chapter["chapter"],
                    "question_number": qnum,
                    "page_index": page_index,
                    "bbox": bbox,
                    "correct_answer": sol["correct_answer"] if sol else None,
                    "solution_text": sol["solution_text"] if sol else None,
                }
            )

    doc.close()

    manifest = {
        "source_exam": f"campus_{exam_num}",
        "pdf_path": q_path,
        "batch": "campus",
        "questions": questions,
    }
    out_path = os.path.join(SCRIPT_DIR, f"manifest_campus_{exam_num}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"exam {exam_num}: {len(questions)} questions -> {out_path}")
    return manifest


if __name__ == "__main__":
    nums = [int(a) for a in sys.argv[1:]] or [1]
    for n in nums:
        build_manifest(n)
