"""
Application configuration.

All configurable values are loaded from environment variables (via .env in
development). Nothing security sensitive is hard-coded here.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from dotenv import load_dotenv

load_dotenv()


def _split_csv(value: str) -> List[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


class Settings:
    # --- General -----------------------------------------------------
    APP_NAME: str = "Secure Digital Document Management System"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # --- Database ------------------------------------------------------
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/secure_dms",
    )

    # --- Auth / JWT ------------------------------------------------------
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_THIS_SECRET")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )

    # --- Blockchain ------------------------------------------------------
    BLOCKCHAIN_RPC_URL: str = os.getenv("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:7545")
    BLOCKCHAIN_PRIVATE_KEY: str = os.getenv("BLOCKCHAIN_PRIVATE_KEY", "")
    CONTRACT_ADDRESS: str = os.getenv("CONTRACT_ADDRESS", "")
    BLOCKCHAIN_ENABLED: bool = os.getenv("BLOCKCHAIN_ENABLED", "true").lower() == "true"

    # --- Storage ------------------------------------------------------
    STORAGE_DIRECTORY: str = os.getenv("STORAGE_DIRECTORY", "storage/documents")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(10 * 1024 * 1024)))  # 10MB
    ALLOWED_EXTENSIONS: List[str] = _split_csv(
        os.getenv("ALLOWED_EXTENSIONS", "pdf,png,jpg,jpeg,docx")
    )
    ALLOWED_MIME_TYPES: List[str] = _split_csv(
        os.getenv(
            "ALLOWED_MIME_TYPES",
            "application/pdf,image/png,image/jpeg,"
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    )

    # --- CORS ------------------------------------------------------
    CORS_ORIGINS: List[str] = _split_csv(
        os.getenv("CORS_ORIGINS", "http://localhost:5173")
    )

    # --- Testing ------------------------------------------------------
    TESTING: bool = os.getenv("TESTING", "false").lower() == "true"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
