"""Assembles question_bank/ (cropped PNGs + questions_index.json) from one or
more manifest_<exam>.json files.

Usage: python build_bank.py [manifest1.json manifest2.json ...]
If no manifests are given, processes every manifest_*.json next to this file.
"""

import glob
import json
import os
import sys
from collections import defaultdict

import fitz

from render import PageRenderer
from segment import page_bands, trim_leading_blank, crop_band

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUT_DIR = os.path.join(REPO_ROOT, "public", "question_bank")
IMAGES_DIR = os.path.join(OUT_DIR, "images")
INDEX_PATH = os.path.join(OUT_DIR, "questions_index.json")


def load_manifests(paths):
    manifests = []
    for p in paths:
        with open(p, encoding="utf-8") as f:
            manifests.append(json.load(f))
    return manifests


def make_id(category, chapter, question_number, source_exam):
    return f"{category}_ch{chapter}_q{question_number}_{source_exam}"


def build(manifests):
    os.makedirs(IMAGES_DIR, exist_ok=True)

    index = []
    # summary[(source_exam, category, chapter)] = {question_number: correct_answer}
    summary = defaultdict(dict)

    for manifest in manifests:
        source_exam = manifest["source_exam"]
        pdf_path = manifest["pdf_path"]
        batch = manifest.get("batch")
        renderer = PageRenderer(pdf_path)
        band_cache = {}  # page_index -> (rgb, gray, bands)

        for q in manifest["questions"]:
            page_index = q["page_index"]
            qid = make_id(q["category"], q["chapter"], q["question_number"], source_exam)
            img_filename = f"{qid}.png"

            if "bbox" in q:
                # New-format ("campus") manifests: the question's own bbox
                # (in PDF points) was already located precisely from the
                # PDF's text/image blocks — no band-detection needed.
                zoom = renderer.dpi / 72
                mat = fitz.Matrix(zoom, zoom)
                pix = renderer._doc[page_index].get_pixmap(matrix=mat, clip=fitz.Rect(q["bbox"]))
                pix.save(os.path.join(IMAGES_DIR, img_filename))
            else:
                if page_index not in band_cache:
                    rgb = renderer.rgb(page_index)
                    gray = renderer.gray(page_index)
                    bands = page_bands(rgb, gray)
                    band_cache[page_index] = (rgb, gray, bands)
                rgb, gray, bands = band_cache[page_index]

                y0, y1 = bands[q["band_index"]]
                if q.get("trim"):
                    y0 = trim_leading_blank(gray, y0, y1)

                img = crop_band(rgb, y0, y1)
                img.save(os.path.join(IMAGES_DIR, img_filename))

            entry = {
                "id": qid,
                "category": q["category"],
                "subtype": q["subtype"],
                "source_exam": source_exam,
                "chapter": q["chapter"],
                "question_number": q["question_number"],
                "image_path": img_filename,
                "correct_answer": q["correct_answer"],
            }
            if batch:
                entry["batch"] = batch
            if q.get("solution_text"):
                entry["solution_text"] = q["solution_text"]

            index.append(entry)
            summary[(source_exam, q["category"], q["chapter"])][q["question_number"]] = q["correct_answer"]

        renderer.close()

    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    return index, summary


def print_summary(index, summary):
    print(f"\n{len(index)} questions written to {INDEX_PATH}")

    by_exam_category = defaultdict(int)
    for item in index:
        by_exam_category[(item["source_exam"], item["category"])] += 1
    print("\nCounts by exam/category:")
    for (exam, cat), count in sorted(by_exam_category.items()):
        print(f"  {exam} / {cat}: {count}")

    print("\nAnswer key summary (question_number -> correct_answer), for manual verification:")
    for (source_exam, category, chapter), qa in sorted(summary.items()):
        pairs = ", ".join(f"{qn}->{ans}" for qn, ans in sorted(qa.items()))
        print(f"  [{source_exam}] {category} ch{chapter}: {pairs}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args:
        manifest_paths = args
    else:
        manifest_paths = sorted(glob.glob(os.path.join(SCRIPT_DIR, "manifest_*.json")))

    if not manifest_paths:
        print("No manifest files found.")
        sys.exit(1)

    manifests = load_manifests(manifest_paths)
    index, summary = build(manifests)
    print_summary(index, summary)
