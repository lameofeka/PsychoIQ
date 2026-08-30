"""Question segmentation: find the horizontal ruled lines that separate
questions on a page, and crop out individual question bands.

All these exam booklets share the same publisher template (NITE), so the
same pixel-density heuristics generalize across every exam PDF at a fixed
render DPI (see render.DPI).
"""

import numpy as np
from PIL import Image

# Fractional margins (of page width/height) that keep us clear of the
# decorative checkmark watermarks in the left/right margins, and the
# copyright footer block at the bottom. Verified against psychometric_apr_2010.pdf.
SIDE_MARGIN_FRAC = 0.085
BOTTOM_MARGIN_FRAC = 0.075

DARK_PIXEL_THRESHOLD = 150  # grayscale value below which a pixel counts as "ink"
# Ruled separator lines on verbal/English pages read as ~0.85-0.95 dark-pixel
# fraction; on quantitative pages (narrower rule, more whitespace around
# right-aligned numeric answer choices) they read closer to ~0.72. Dense text
# or diagram rows stay well under 0.6 in both cases, so 0.6 separates ruled
# lines from content without false positives — verified against both page
# styles in psychometric_apr_2010.pdf.
LINE_DARK_FRACTION = 0.6  # fraction of the content width that must be dark for a row to be a ruled line
MIN_LINE_GAP_PX = 3  # merge consecutive dark rows into one line center

BLANK_ROW_MAX_FRACTION = 0.02  # a "blank" row has at most this fraction of dark pixels
# Threshold tuned so that ordinary line-spacing/paragraph-internal gaps (roughly
# 20-40px at 200dpi) stay below it, while the wider gap that separates a
# section's intro/instructions paragraph from its first question's own text
# (roughly 55-65px) clears it. See segment.py notes in the extraction manifest
# docs for why this must be the FIRST qualifying gap, not the largest one.
MIN_INTRO_GAP_PX = 45


def content_x_range(width):
    margin = int(width * SIDE_MARGIN_FRAC)
    return margin, width - margin


def bottom_bound(height):
    return int(height * (1 - BOTTOM_MARGIN_FRAC))


def find_separator_lines(gray):
    """Return sorted y-centers of full-width ruled lines within the safe content x-range."""
    height, width = gray.shape
    x0, x1 = content_x_range(width)
    band = gray[:, x0:x1]
    dark_frac = (band < DARK_PIXEL_THRESHOLD).mean(axis=1)
    line_rows = np.where(dark_frac > LINE_DARK_FRACTION)[0]

    lines = []
    if len(line_rows):
        start = prev = line_rows[0]
        for r in line_rows[1:]:
            if r - prev > MIN_LINE_GAP_PX:
                lines.append((start + prev) // 2)
                start = r
            prev = r
        lines.append((start + prev) // 2)
    return lines


def trim_leading_blank(gray, y_start, y_end):
    """Within [y_start, y_end), find the FIRST blank-row run at least
    MIN_INTRO_GAP_PX tall and return the y just after it — used to strip a
    section's intro/instruction paragraph from the band that contains that
    section's first question.

    Deliberately the *first* qualifying gap, not the largest: a first-question
    band typically looks like [intro paragraph] [gap A] [question stem line]
    [gap B] [answer choices], and gap A and gap B are often close in height
    (both are "paragraph break" sized) — picking the largest can land on gap B
    and crop out the question stem itself. Gap A is what we want.
    """
    height, width = gray.shape
    x0, x1 = content_x_range(width)
    band = gray[y_start:y_end, x0:x1]
    dark_frac = (band < DARK_PIXEL_THRESHOLD).mean(axis=1)
    is_blank = dark_frac < BLANK_ROW_MAX_FRACTION

    # A couple of rows right at the top of the band can read as faintly
    # "dark" (antialiasing bleed from the separator rule at the boundary)
    # without being real text — only count content once a run of non-blank
    # rows is tall enough to be an actual text line, so that noise doesn't
    # prematurely mark "content seen" and let the true leading whitespace
    # gap masquerade as the intro/question boundary.
    MIN_CONTENT_RUN_PX = 8

    run_start = None
    content_run_start = None
    seen_content = False
    for i, blank in enumerate(is_blank):
        if blank:
            if run_start is None:
                run_start = i
            content_run_start = None
        else:
            if run_start is not None:
                run_len = i - run_start
                if seen_content and run_len >= MIN_INTRO_GAP_PX:
                    return y_start + i
                run_start = None
            if content_run_start is None:
                content_run_start = i
            elif not seen_content and i - content_run_start >= MIN_CONTENT_RUN_PX:
                seen_content = True
    return y_start


def page_bands(rgb, gray):
    """Split a page into content bands using the ruled separator lines.

    Returns a list of (y_start, y_end) pixel ranges, one per band, in
    top-to-bottom order — band[0] is whatever sits above the first ruled
    line (usually the page's own header rule + section intro + question 1),
    band[i] for i>0 is between separator line i-1 and i, and the last band
    runs from the final separator line down to the footer margin.
    """
    height, width = gray.shape
    lines = find_separator_lines(gray)
    bottom = bottom_bound(height)

    bounds = [0] + lines + [bottom]
    bands = []
    for i in range(len(bounds) - 1):
        y0, y1 = bounds[i], bounds[i + 1]
        if y1 - y0 > 10:  # skip degenerate slivers between adjacent lines
            bands.append((y0, y1))
    return bands


def crop_band(rgb, y_start, y_end, pad=6):
    height, width = rgb.shape[:2]
    x0, x1 = content_x_range(width)
    y0 = max(0, y_start - pad)
    y1 = min(height, y_end + pad)
    return Image.fromarray(rgb[y0:y1, x0:x1])
