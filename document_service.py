from __future__ import annotations

import os
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import (
    BlockchainStatus,
    Document,
    DocumentType,
    IntegrityStatus,
    OCRStatus,
)
from app.models.document_version import DocumentVersion
from app.services import blockchain_service, ocr_service
from app.services.hash_service import sha256_bytes, sha256_file
from app.utils.file_validation import (
    generate_storage_name,
    resolve_storage_path,
    sanitize_filename,
)


class DocumentNotFoundError(Exception):
    pass


def _ensure_storage_dir() -> None:
    os.makedirs(os.path.abspath(settings.STORAGE_DIRECTORY), exist_ok=True)


def create_document(
    db: Session,
    *,
    case_id: str,
    title: str,
    document_type: DocumentType,
    description: Optional[str],
    original_filename: str,
    mime_type: str,
    file_bytes: bytes,
    uploaded_by: str,
) -> Document:
    _ensure_storage_dir()

    safe_original_name = sanitize_filename(original_filename)
    storage_name = generate_storage_name(safe_original_name)
    full_path = resolve_storage_path(storage_name)

    with open(full_path, "wb") as f:
        f.write(file_bytes)

    file_hash = sha256_bytes(file_bytes)

    document = Document(
        document_id=f"DOC-{uuid.uuid4().hex[:8].upper()}",
        case_id=case_id,
        title=title,
        filename=safe_original_name,
        document_type=document_type,
        description=description,
        storage_path=full_path,
        file_size=len(file_bytes),
        mime_type=mime_type,
        version=1,
        uploaded_by=uploaded_by,
        ocr_status=OCRStatus.PENDING,
        sha256_hash=file_hash,
        blockchain_status=BlockchainStatus.NOT_REGISTERED,
        integrity_status=IntegrityStatus.NOT_VERIFIED,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    # First version snapshot
    version = DocumentVersion(
        document_id=document.id,
        version=1,
        filename=safe_original_name,
        storage_path=full_path,
        file_size=len(file_bytes),
        sha256_hash=file_hash,
        uploaded_by=uploaded_by,
    )

    db.add(version)
    db.commit()

    return document


def get_document(db: Session, document_id: str) -> Document:
    doc = db.query(Document).filter(Document.id == document_id).first()

    if not doc:
        raise DocumentNotFoundError("Document not found.")

    return doc


def list_documents(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    case_id: Optional[str] = None,
    document_type: Optional[DocumentType] = None,
    uploaded_by: Optional[str] = None,
    ocr_status: Optional[OCRStatus] = None,
    integrity_status: Optional[IntegrityStatus] = None,
) -> tuple[list[Document], int]:

    query = db.query(Document)

    if case_id:
        query = query.filter(Document.case_id == case_id)

    if document_type:
        query = query.filter(Document.document_type == document_type)

    if uploaded_by:
        query = query.filter(Document.uploaded_by == uploaded_by)

    if ocr_status:
        query = query.filter(Document.ocr_status == ocr_status)

    if integrity_status:
        query = query.filter(Document.integrity_status == integrity_status)

    total = query.count()

    items = (
        query.order_by(Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return items, total


def update_document(
    db: Session,
    document_id: str,
    *,
    data: dict
) -> Document:

    doc = get_document(db, document_id)

    for key, value in data.items():
        if value is not None:
            setattr(doc, key, value)

    db.commit()
    db.refresh(doc)

    return doc


def delete_document(
    db: Session,
    document_id: str
) -> None:

    doc = get_document(db, document_id)

    db.query(DocumentVersion).filter(
        DocumentVersion.document_id == doc.id
    ).delete()

    if os.path.exists(doc.storage_path):
        try:
            os.remove(doc.storage_path)
        except OSError:
            pass

    db.delete(doc)
    db.commit()


def create_new_version(
    db: Session,
    *,
    document_id: str,
    original_filename: str,
    file_bytes: bytes,
    uploaded_by: str,
) -> DocumentVersion:

    _ensure_storage_dir()

    doc = get_document(db, document_id)

    safe_name = sanitize_filename(original_filename)
    storage_name = generate_storage_name(safe_name)
    full_path = resolve_storage_path(storage_name)

    with open(full_path, "wb") as f:
        f.write(file_bytes)

    file_hash = sha256_bytes(file_bytes)

    new_version_number = doc.version + 1

    version = DocumentVersion(
        document_id=doc.id,
        version=new_version_number,
        filename=safe_name,
        storage_path=full_path,
        file_size=len(file_bytes),
        sha256_hash=file_hash,
        uploaded_by=uploaded_by,
    )

    db.add(version)

    # Promote the document's current pointers to the new version
    doc.version = new_version_number
    doc.filename = safe_name
    doc.storage_path = full_path
    doc.file_size = len(file_bytes)
    doc.sha256_hash = file_hash
    doc.ocr_status = OCRStatus.PENDING
    doc.blockchain_status = BlockchainStatus.NOT_REGISTERED
    doc.integrity_status = IntegrityStatus.NOT_VERIFIED

    db.commit()
    db.refresh(version)

    return version


def list_versions(
    db: Session,
    document_id: str
) -> list[DocumentVersion]:

    get_document(db, document_id)

    return (
        db.query(DocumentVersion)
        .filter(DocumentVersion.document_id == document_id)
        .order_by(DocumentVersion.version.asc())
        .all()
    )


def run_ocr_for_document(
    db: Session,
    document_id: str
) -> Document:

    doc = get_document(db, document_id)

    doc.ocr_status = OCRStatus.PROCESSING
    db.commit()

    with open(doc.storage_path, "rb") as f:
        file_bytes = f.read()

    try:
        text = ocr_service.run_ocr(
            file_bytes,
            doc.filename
        )

        doc.ocr_text = text
        doc.ocr_status = OCRStatus.COMPLETED

    except ocr_service.OCRUnavailableError:
        doc.ocr_status = OCRStatus.FAILED
        db.commit()
        raise

    except ocr_service.OCRProcessingError:
        doc.ocr_status = OCRStatus.FAILED
        db.commit()
        raise

    db.commit()
    db.refresh(doc)

    return doc


def register_document_on_blockchain(
    db: Session,
    document_id: str,
    *,
    user_id: str
) -> Document:

    doc = get_document(db, document_id)

    try:
        tx_hash = blockchain_service.register_document(
            document_id=doc.document_id,
            sha256_hash=doc.sha256_hash,
            version=doc.version,
            user_id=user_id,
        )

        doc.blockchain_tx_hash = tx_hash
        doc.blockchain_status = BlockchainStatus.REGISTERED

    except (
        blockchain_service.BlockchainUnavailableError,
        blockchain_service.BlockchainTransactionError,
    ):
        doc.blockchain_status = BlockchainStatus.FAILED
        db.commit()
        raise

    db.commit()
    db.refresh(doc)

    return doc


def verify_document_integrity(
    db: Session,
    document_id: str
) -> tuple[Document, str, Optional[str]]:

    doc = get_document(db, document_id)

    # ---------------------------------------------------------
    # STEP 1: Calculate the current SHA-256 hash of the file
    # ---------------------------------------------------------

    current_hash = sha256_file(doc.storage_path)

    # This will contain the hash against which we compare
    registered_hash: Optional[str] = None

    # ---------------------------------------------------------
    # STEP 2:
    # Only contact blockchain if the document is actually
    # registered on the blockchain.
    # ---------------------------------------------------------

    if doc.blockchain_status == BlockchainStatus.REGISTERED:

        try:
            registered_hash = blockchain_service.get_registered_hash(
                document_id=doc.document_id,
                version=doc.version,
            )

        except blockchain_service.BlockchainUnavailableError:
            registered_hash = None

        except blockchain_service.BlockchainTransactionError:
            registered_hash = None

    # ---------------------------------------------------------
    # STEP 3:
    # If blockchain is NOT registered, use the original
    # SHA-256 hash stored when the document was uploaded.
    # ---------------------------------------------------------

    if registered_hash is None:
        registered_hash = doc.sha256_hash

    # ---------------------------------------------------------
    # STEP 4:
    # Compare current file hash with reference hash.
    # ---------------------------------------------------------

    if registered_hash and current_hash == registered_hash:

        doc.integrity_status = IntegrityStatus.VERIFIED

    else:

        doc.integrity_status = IntegrityStatus.FAILED

    # ---------------------------------------------------------
    # STEP 5:
    # Save verification result
    # ---------------------------------------------------------

    db.commit()
    db.refresh(doc)

    return doc, current_hash, registered_hash