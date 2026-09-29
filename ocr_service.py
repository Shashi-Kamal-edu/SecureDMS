from __future__ import annotations

"""
OCR service built on PaddleOCR's pretrained model.

Supports:
- PDF OCR using pdf2image + Poppler
- Image OCR using Pillow
- PaddleOCR 2.7.x result parsing
"""

import io
import os

from app.utils.file_validation import get_extension

_paddle_ocr_instance = None


class OCRUnavailableError(Exception):
    pass


class OCRProcessingError(Exception):
    pass


def _get_ocr_engine():
    global _paddle_ocr_instance

    if _paddle_ocr_instance is not None:
        return _paddle_ocr_instance

    try:
        from paddleocr import PaddleOCR  # type: ignore
    except Exception as exc:
        raise OCRUnavailableError(
            "PaddleOCR is not installed/available in this environment. "
            "Install paddleocr and paddlepaddle to enable OCR. "
            f"Original error: {exc}"
        ) from exc

    try:
        _paddle_ocr_instance = PaddleOCR(
            use_angle_cls=True,
            lang="en",
            show_log=False
        )
    except Exception as exc:
        raise OCRUnavailableError(
            f"Failed to initialize PaddleOCR pretrained model: {exc}"
        ) from exc

    return _paddle_ocr_instance


def _pdf_to_images(file_bytes: bytes) -> list:
    """Convert PDF pages to PIL images using Poppler."""

    try:
        from pdf2image import convert_from_bytes  # type: ignore
    except Exception as exc:
        raise OCRUnavailableError(
            "pdf2image/poppler is required to OCR PDF files but is not "
            f"available: {exc}"
        ) from exc

    poppler_path = (
        r"C:\Users\hp\Downloads\Release-26.09.0-0"
        r"\poppler-26.09.0\Library\bin"
    )

    if not os.path.isdir(poppler_path):
        raise OCRUnavailableError(
            f"Poppler directory not found: {poppler_path}"
        )

    # Make Poppler available to the current Python process.
    os.environ["PATH"] = poppler_path + os.pathsep + os.environ.get("PATH", "")

    try:
        images = convert_from_bytes(
            file_bytes,
            poppler_path=poppler_path
        )

        if not images:
            raise OCRProcessingError(
                "PDF was converted successfully but no pages were produced."
            )

        return images

    except OCRProcessingError:
        raise

    except Exception as exc:
        raise OCRProcessingError(
            f"Failed to rasterize PDF for OCR: {exc}"
        ) from exc


def _extract_text_from_paddle_result(result) -> list[str]:
    """
    Extract text from PaddleOCR 2.7.x output.

    Expected structure for PaddleOCR 2.7.x:

    [
        [
            [
                [box_coordinates],
                ("recognized text", confidence)
            ],
            ...
        ]
    ]

    This function safely handles empty/None results.
    """

    extracted_lines: list[str] = []

    if not result:
        return extracted_lines

    try:
        for page in result:

            if not page:
                continue

            for line in page:

                if not line:
                    continue

                # Standard PaddleOCR line:
                # [box, (text, confidence)]
                if (
                    isinstance(line, (list, tuple))
                    and len(line) >= 2
                    and isinstance(line[1], (list, tuple))
                    and len(line[1]) >= 1
                ):
                    text = line[1][0]

                    if text is not None:
                        text = str(text).strip()

                        if text:
                            extracted_lines.append(text)

    except Exception as exc:
        raise OCRProcessingError(
            f"Failed to parse PaddleOCR result: {exc}"
        ) from exc

    return extracted_lines


def run_ocr(file_bytes: bytes, filename: str) -> str:
    """
    Run OCR over the given file bytes and return extracted text.

    Raises:
        OCRUnavailableError
        OCRProcessingError
    """

    ext = get_extension(filename)

    engine = _get_ocr_engine()

    images_to_process = []

    # ---------------------------------------------------------
    # PDF
    # ---------------------------------------------------------
    if ext == "pdf":

        images_to_process = _pdf_to_images(file_bytes)

    # ---------------------------------------------------------
    # IMAGE
    # ---------------------------------------------------------
    else:

        try:
            from PIL import Image  # type: ignore

            image = Image.open(io.BytesIO(file_bytes))

            images_to_process = [image]

        except Exception as exc:
            raise OCRProcessingError(
                f"Failed to load image for OCR: {exc}"
            ) from exc

    # ---------------------------------------------------------
    # OCR
    # ---------------------------------------------------------

    extracted_lines: list[str] = []

    try:
        import numpy as np  # type: ignore

        for image in images_to_process:

            rgb_image = image.convert("RGB")

            result = engine.ocr(
                np.array(rgb_image),
                cls=True
            )

            page_lines = _extract_text_from_paddle_result(result)

            extracted_lines.extend(page_lines)

    except OCRUnavailableError:
        raise

    except Exception as exc:
        raise OCRProcessingError(
            f"PaddleOCR failed to process the file: {exc}"
        ) from exc

    # ---------------------------------------------------------
    # FINAL TEXT
    # ---------------------------------------------------------

    extracted_text = "\n".join(extracted_lines).strip()

    return extracted_text