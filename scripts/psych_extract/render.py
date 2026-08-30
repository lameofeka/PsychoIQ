"""Page rendering helpers for the psychometric PDF extraction pipeline.

These old exam PDFs are fully scanned (no extractable text layer), so the
whole pipeline works on rasterized page images rather than PDF text/objects.
"""

import fitz
import numpy as np

DPI = 200


class PageRenderer:
    """Renders and caches pages (as grayscale numpy arrays) for one PDF."""

    def __init__(self, pdf_path, dpi=DPI):
        self.pdf_path = pdf_path
        self.dpi = dpi
        self._doc = fitz.open(pdf_path)
        self._cache = {}

    @property
    def page_count(self):
        return self._doc.page_count

    def rgb(self, page_index):
        """Full-color page render as an (H, W, 3) uint8 array."""
        if page_index not in self._cache:
            zoom = self.dpi / 72
            mat = fitz.Matrix(zoom, zoom)
            pix = self._doc[page_index].get_pixmap(matrix=mat)
            arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
            if pix.n == 4:
                arr = arr[:, :, :3]
            self._cache[page_index] = arr
        return self._cache[page_index]

    def gray(self, page_index):
        rgb = self.rgb(page_index)
        return rgb.mean(axis=2)

    def close(self):
        self._doc.close()
