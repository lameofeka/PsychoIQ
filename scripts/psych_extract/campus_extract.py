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

            # The title block re-matches on every page of some exams' PDFs
            # (a repeated per-page banner that sometimes uses the same
            # "פרק N: category" colon form as the real title, unlike other
            # exams where the banner uses a dash) — only start a new chapter
            # when the category/number actually changes, and fall through
            # to range-scanning below either way rather than skipping the
            # page (a banner-only match on a later page still needs its
            # sub-range labels, like "הסקה מתרשים", picked up).
            is_new_chapter = current is None or current["category"] != category or current["chapter"] != chnum
            if is_new_chapter:
                if current:
                    chapters.append(current)
                current = {
                    "category": category,
                    "chapter": chnum,
                    "start_page": page_index,
                    "total_questions": total,
                    "ranges": [],
                }
            elif total and not current["total_questions"]:
                current["total_questions"] = total

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
# space-tolerant (\s*) regex but not a fully-collapsed one. The separator
# is usually "-" but some exams' chapter-title blocks use ":" instead
# (same dash/colon inconsistency seen in the questions PDFs).
ANSWER_TABLE_HEADER_RE = re.compile(r"פרק(\d+)[-:](חשיבהמילולית|חשיבהכמותית|אנגלית)")


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


def _merge_split_teshuva(lines):
    """Rarely, the word תשובה itself gets split right at the boundary
    marker line — either "N. ת" on one line with "שובה ..." on the next,
    or (after _merge_split_numbers has already turned "N" + ". ת" into
    "N." + "ת" as two separate lines) a lone "ת" line followed by
    "שובה ...". Either form makes the marker unrecognizable as the bare
    "N." or inline "N. תשובה" boundary form, silently losing that
    question. Recombine them."""
    merged = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line == "ת" and i + 1 < len(lines) and lines[i + 1].strip().startswith("שובה"):
            merged.append(f"ת{lines[i + 1].strip()}")
            i += 2
            continue
        if re.match(r"^\d{1,2}\.\s*ת$", line) and i + 1 < len(lines) and lines[i + 1].strip().startswith("שובה"):
            num_part = line[:-1].strip()  # "N." with the trailing "ת" dropped
            merged.append(f"{num_part} ת{lines[i + 1].strip()}")
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
        elif tok in ("-", "–", "—"):
            # Placeholder for a pilot-chapter question with no correct
            # answer at all (a genuine gap in the source material).
            answers.append(None)
            i += 1
        elif tok == "":
            i += 1
        else:
            break

    if len(answers) != len(numbers):
        return {}
    return dict(zip(numbers, answers))


_SOLO_NUM_RE = re.compile(r"^(\d{1,2})\.$")
# Usually "N." sits alone on its own line with the answer/explanation
# starting on the next one, but occasionally "תשובה" runs on straight after
# the number on the same line ("7. תשובה...") — recognize that too, keeping
# its trailing content as the item's first line.
_INLINE_NUM_RE = re.compile(r"^(\d{1,2})\.\s+(תשובה.*)$")

# Every genuine per-question explanation in this corpus opens with a
# "(תשובה N) נכונה" verdict line within a few lines of its "N." marker —
# solving the marker/boundary ambiguity below by content rather than
# position: real markers are always followed almost immediately by this
# phrase, while decoy "N." lines (nested rule/tip lists, stray sentence-
# ending numerals) are followed by ordinary prose instead. Must require
# תשובה followed closely by a digit specifically (the verdict's answer
# number) — quant explanations routinely say "תשובה נכונה" / "נבדוק את
# התשובות" mid-reasoning with no digit attached, which a bare "'תשובה' in
# lookahead" substring check would wrongly treat as a nearby decoy's own
# verdict line too.
_LOOKAHEAD_LINES = 6
_VERDICT_RE = re.compile(r"תשובה\s*\)?\s*\d")


def _find_number_markers(lines):
    """Return every line that looks like a top-level "N." boundary marker,
    as (line_index, number, inline_tail_or_None, looks_real), in line order.
    looks_real is the תשובה/נכונה content check described above; not every
    looks_real=True entry is necessarily a genuine boundary either (a
    duplicate/out-of-place one can still pass) — see _parse_chapter_lines."""
    markers = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        m = _SOLO_NUM_RE.match(stripped)
        tail = None
        if not m:
            m = _INLINE_NUM_RE.match(stripped)
            if m:
                tail = m.group(2)
        if not m:
            continue
        if tail is not None:
            looks_real = bool(_VERDICT_RE.search(tail))
        else:
            lookahead = "".join(lines[i + 1 : i + 1 + _LOOKAHEAD_LINES])
            looks_real = bool(_VERDICT_RE.search(lookahead))
        markers.append((i, int(m.group(1)), tail, looks_real))
    return markers


def _parse_chapter_lines(lines):
    lines = _merge_split_numbers(lines)
    lines = _merge_split_teshuva(lines)
    answer_table = _parse_answer_table(lines)
    markers = _find_number_markers(lines)

    # A "N." line is textually identical whether it's a genuine top-level
    # question boundary or just part of the explanation body — this bites
    # in practice as: explanations for rule/logic questions containing
    # their own nested "1. / 2. / 3." list enumerating premises or steps;
    # pilot chapters' "רציונל" intro block (printed between the answer
    # table and question 1) containing its own "1. / 2. / 3." tips list in
    # the exact same format; and the rare stray sentence-ending numeral
    # ("...מתוך ה-5.") coinciding with a real question number. All of
    # these are prose-followed, not תשובה/נכונה-followed, so looks_real
    # (see _find_number_markers) flags them — but some genuinely real
    # markers occasionally fail that check too (unusual page furniture
    # between the marker and its verdict line), so it's used as a
    # *preference*, not a hard filter — a chapter with messier layout
    # still resolves every question, just without the extra disambiguation.
    #
    # Matched against the answer-key table's ground-truth ordered sequence
    # by walking it backwards (highest number first): for each expected
    # number, look among markers of that exact number sitting before the
    # already-resolved next-higher boundary, preferring a looks_real one
    # if any exists there, otherwise taking the last one regardless. Going
    # backwards is what correctly skips earlier decoys sitting before the
    # real marker (rule list, intro tips) — the real one is closer to, but
    # still before, the next boundary — while decoys sitting after the
    # real marker (out-of-place blocks, e.g. the sentence-ending "5." case
    # above) are excluded outright by the upper bound; the looks_real
    # preference additionally resolves the case where a decoy and the real
    # marker fall in the same window (e.g. a decoy inside the real
    # question's own body, after its marker). A number whose marker never
    # extracts cleanly (e.g. a still-unmerged split line) is simply
    # skipped: its content merges into the previous question's body rather
    # than permanently desyncing every question after it.
    boundaries = []
    if answer_table:
        upper_bound = len(lines)
        for target in sorted(answer_table.keys(), reverse=True):
            best = None  # last candidate overall, as positional fallback
            best_real = None  # last looks_real candidate, preferred
            for idx, num, tail, looks_real in markers:
                if idx >= upper_bound or num != target:
                    continue
                best = (idx, num, tail)
                if looks_real:
                    best_real = best
            chosen = best_real or best
            if chosen:
                boundaries.append(chosen)
                upper_bound = chosen[0]
        boundaries.reverse()
    else:
        # No ground-truth table to validate against: fall back to treating
        # any strictly-increasing looks_real marker as a boundary.
        last = None
        for idx, num, tail, looks_real in markers:
            if looks_real and (last is None or num > last):
                boundaries.append((idx, num, tail))
                last = num

    by_q = {}
    for bi, (idx, num, tail) in enumerate(boundaries):
        body_start = idx + 1
        body_end = boundaries[bi + 1][0] if bi + 1 < len(boundaries) else len(lines)
        body_lines = ([tail] if tail else []) + lines[body_start:body_end]
        joined = "\n".join(l for l in body_lines if l.strip())
        am = re.search(r"תשובה\s*(\d)", joined)
        parsed_answer = int(am.group(1)) if am else None
        by_q[num] = {
            "correct_answer": answer_table.get(num, parsed_answer),
            "solution_text": joined.strip(),
        }
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
        # Some pages carry a stray/stale "פרק N - category" eyebrow fragment
        # (a page-header artifact in the source PDF, sometimes for the wrong
        # chapter number entirely) that isn't an actual new chapter start —
        # a genuine chapter title block is always immediately followed by
        # the "מספר השאלה" answer-key table, so require that to confirm it,
        # and ignore header matches that aren't (keep accumulating into
        # whatever chapter is already current).
        genuine = [
            h for h in ANSWER_TABLE_HEADER_RE.finditer(collapsed) if "מספרהשאלה" in collapsed[h.end() : h.end() + 60]
        ]
        if genuine:
            current_chapter = int(genuine[-1].group(1))
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
