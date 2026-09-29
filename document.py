from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.document import (
    BlockchainStatus,
    DocumentType,
    IntegrityStatus,
    OCRStatus,
)


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    case_id: str
    title: str
    filename: str
    document_type: DocumentType
    description: str | None
    file_size: int
    mime_type: str
    version: int
    uploaded_by: str
    ocr_status: OCRStatus
    ocr_text: str | None = None
    sha256_hash: str
    blockchain_tx_hash: str | None
    blockchain_status: BlockchainStatus
    integrity_status: IntegrityStatus
    created_at: datetime
    updated_at: datetime


class DocumentUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    document_type: DocumentType | None = None


class DocumentListResponse(BaseModel):
    items: list[DocumentOut]
    total: int
    page: int
    page_size: int


class OCRResultOut(BaseModel):
    document_id: str
    ocr_status: OCRStatus
    ocr_text: str | None = None
    message: str | None = None


class BlockchainRegisterOut(BaseModel):
    document_id: str
    sha256_hash: str
    blockchain_status: BlockchainStatus
    transaction_hash: str | None = None
    message: str | None = None


class VerifyResultOut(BaseModel):
    document_id: str
    current_hash: str
    registered_hash: str | None
    integrity: IntegrityStatus


class DocumentVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    version: int
    filename: str
    file_size: int
    sha256_hash: str
    uploaded_by: str
    blockchain_tx_hash: str | None
    created_at: datetime