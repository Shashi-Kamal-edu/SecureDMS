from __future__ import annotations

import os
import re
import uuid

from fastapi import UploadFile

from app.core.config import settings


class FileValidationError(Exception):
    pass


_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def get_extension(filename: str) -> str:
    _, ext = os.path.splitext(filename)
    return ext.lower().lstrip(".")


def validate_extension(filename: str) -> str:
    ext = get_extension(filename)
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise FileValidationError(
            f"File extension '.{ext}' is not allowed. "
            f"Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    return ext


def validate_mime_type(content_type: str | None) -> None:
    if not content_type or content_type not in settings.ALLOWED_MIME_TYPES:
        raise FileValidationError(
            f"MIME type '{content_type}' is not allowed."
        )


def validate_size(size_bytes: int) -> None:
    if size_bytes <= 0:
        raise FileValidationError("Uploaded file is empty.")
    if size_bytes > settings.MAX_FILE_SIZE:
        raise FileValidationError(
            f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE} bytes."
        )


def sanitize_filename(filename: str) -> str:
    """Strip directory components and unsafe characters to prevent path
    traversal and injection into the storage path."""
    base = os.path.basename(filename)
    base = _SAFE_NAME_RE.sub("_", base)
    if not base or base in (".", ".."):
        base = "file"
    return base


def generate_storage_name(original_filename: str) -> str:
    """Generate a random, collision-resistant name for on-disk storage.
    The original filename is preserved only in the database, never used
    directly as the stored path, so it can never be used for traversal."""
    ext = get_extension(original_filename)
    unique = uuid.uuid4().hex
    return f"{unique}.{ext}" if ext else unique


def resolve_storage_path(storage_name: str) -> str:
    """Join the storage name with the configured storage directory and
    verify the resulting path stays inside that directory."""
    storage_dir = os.path.abspath(settings.STORAGE_DIRECTORY)
    full_path = os.path.abspath(os.path.join(storage_dir, storage_name))
    if not full_path.startswith(storage_dir + os.sep) and full_path != storage_dir:
        raise FileValidationError("Invalid storage path.")
    return full_path


async def read_and_validate_upload(file: UploadFile) -> tuple[bytes, str]:
    """Validate extension/mime up front, then read the body and validate
    size. Returns (file_bytes, extension)."""
    ext = validate_extension(file.filename or "")
    validate_mime_type(file.content_type)
    content = await file.read()
    validate_size(len(content))
    return content, ext
