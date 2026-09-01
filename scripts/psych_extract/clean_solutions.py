"""One-off cleanup pass over already-extracted `solution_text` fields.

The campus solutions PDFs get extracted line-by-line (one PDF text line per
`\n`), which reads as a choppy word-per-line mess in the app's popup and
sometimes has a page header/footer ("...- סימולציה קמפוס1 - 11 - פתרונות
פרק 1 - חשיבה מילולית") stitched into the middle of an explanation, where a
question's solution spans a PDF page break.

This rewrites solution_text into normal flowing paragraphs:
  0. rebuild the opening "(תשובה N נכונה.)" verdict line, whose paren/period
     placement comes out scrambled by bidi reordering, from scratch
  1. strip the embedded page header/footer block
  2. join wrapped lines back into paragraphs (no inserted space after a
     trailing "-", since that's a Hebrew prefix like "ב-"/"ל-" glued to the
     next token, e.g. "מתחלק ב-\\n5" -> "מתחלק ב-5")
  3. normalize each parenthesized-digit list/choice marker to "(N)" (bidi
     extraction sometimes flips a logical "(N)" to ")N("), then break into
     a new paragraph before each one and before each solution-method
     heading ("דרך א/ב/ג/ד - ...")
  4. add a missing space between a Hebrew letter and an immediately
     adjacent digit (e.g. "תשובה4" -> "תשובה 4", "מתוך20" -> "מתוך 20")
  5. collapse repeated whitespace and drop spaces before punctuation

Run: python clean_solutions.py
Rewrites every manifest_campus_*.json in this directory in place, then
patches matching entries (by category/chapter/question_number/source_exam)
into public/question_bank/questions_index.json.
"""

import glob
import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
INDEX_PATH = os.path.join(REPO_ROOT, "public", "question_bank", "questions_index.json")

HEADER_RE = re.compile(
    r"\s*פתרונות\s*-\s*סימולציה\s*קמפוס\s*\d+\s*-\s*\d+\s*-\s*פתרונות\s*פרק\s*\d+\s*-\s*"
    r"(?:חשיבה\s*מילולית|חשיבה\s*כמותית|אנגלית|אנגלי\s*ת)\s*"
)


def _fuzzy(word):
    """Match `word` tolerating stray whitespace/newlines between its own
    letters — the PDF wrap can split mid-word (e.g. "נכו\\nנה")."""
    return r"\s*".join(list(word))


# The extractor emits every solution's opening verdict — logically "(תשובה N
# נכונה.)" — with the parenthesis/period placement scrambled by bidi
# reordering (e.g. ") תשובה4\n (\n .נכונה\n", or "תשובה\n )4\n (\n .נכונה\n").
# It's a fixed template, so rebuild it outright instead of trying to salvage
# token order.
VERDICT_RE = re.compile(
    rf"^\s*[)(]?\s*{_fuzzy('תשובה')}\s*[)(]?\s*(\d{{1,2}})\s*[)(.:\s]{{0,6}}{_fuzzy('נכונה')}\.?\s*"
)

WAY_HEADING_RE = re.compile(r"(?<!^)(?<!\n)(\s*דרך\s+[א-ת]\s*-)")
# A "(N)" list/choice marker, in either paren order — bidi extraction often
# flips a logical "(N)" to ")N(" — normalized to canonical "(N)" first, then
# (separately, below) turned into its own paragraph.
MARKER_RE = re.compile(r"[()]\s*(\d{1,2})\s*[()]")
CHOICE_MARKER_RE = re.compile(r"(?<!^)(?<!\n)(\s*\(\d{1,2}\))")
COLON_HEADING_RE = re.compile(r"(?<!^)(?<!\n)(\s*:?\s*(?:פסילת תשובות|תיקון אפשרי להפיכת המשפט להגיוני|טיפ)\s*:?)")

HE_LETTER = "א-ת"


def clean_solution_text(text):
    if not text:
        return text

    verdict_prefix = ""
    vm = VERDICT_RE.match(text)
    if vm:
        verdict_prefix = f"(תשובה {vm.group(1)} נכונה.)\n\n"
        text = text[vm.end():]

    text = HEADER_RE.sub(" ", text)

    lines = [l.strip() for l in text.split("\n")]
    lines = [l for l in lines if l]

    parts = []
    for line in lines:
        if parts and parts[-1].endswith("-"):
            parts[-1] = parts[-1] + line
        else:
            parts.append(line)
    joined = " ".join(parts)

    joined = re.sub(rf"(?<=[{HE_LETTER}])(?=\d)", " ", joined)
    joined = re.sub(rf"(?<=\d)(?=[{HE_LETTER}])", " ", joined)

    joined = MARKER_RE.sub(r"(\1)", joined)

    joined = WAY_HEADING_RE.sub(r"\n\n\1", joined)
    joined = CHOICE_MARKER_RE.sub(r"\n\n\1", joined)
    joined = COLON_HEADING_RE.sub(r"\n\n\1", joined)

    joined = re.sub(r"[ \t]+", " ", joined)
    joined = re.sub(r" *\n *", "\n", joined)
    joined = re.sub(r" +([.,:;)])", r"\1", joined)
    joined = re.sub(r"\n{3,}", "\n\n", joined)

    lines = [l.strip() for l in joined.split("\n")]
    joined = "\n".join(l for l in lines if l)

    return (verdict_prefix + joined).strip()


def clean_manifests():
    manifest_paths = sorted(glob.glob(os.path.join(SCRIPT_DIR, "manifest_campus_*.json")))
    updates = {}  # (category, chapter, question_number, source_exam) -> new text
    changed_files = 0

    for path in manifest_paths:
        with open(path, encoding="utf-8") as f:
            manifest = f.read()
        data = json.loads(manifest)
        source_exam = data["source_exam"]
        dirty = False
        for q in data["questions"]:
            old = q.get("solution_text")
            if not old:
                continue
            new = clean_solution_text(old)
            if new != old:
                q["solution_text"] = new
                dirty = True
            key = (q["category"], q["chapter"], q["question_number"], source_exam)
            updates[key] = q.get("solution_text")
        if dirty:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            changed_files += 1

    return updates, changed_files


def patch_index(updates):
    with open(INDEX_PATH, encoding="utf-8") as f:
        index = json.load(f)

    changed = 0
    for entry in index:
        if not entry.get("solution_text"):
            continue
        key = (entry["category"], entry["chapter"], entry["question_number"], entry["source_exam"])
        if key in updates and entry["solution_text"] != updates[key]:
            entry["solution_text"] = updates[key]
            changed += 1

    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    return changed


if __name__ == "__main__":
    updates, changed_files = clean_manifests()
    changed_entries = patch_index(updates)
    print(f"Cleaned {len(updates)} solution texts across {changed_files} manifest files.")
    print(f"Patched {changed_entries} entries in {INDEX_PATH}.")
