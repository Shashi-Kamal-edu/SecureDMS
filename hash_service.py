from __future__ import annotations

import hashlib


def sha256_bytes(data: bytes) -> str:
    """Return the hex-encoded SHA-256 digest of the given bytes."""
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: str) -> str:
    """Stream a file from disk and return its hex-encoded SHA-256 digest."""
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()
