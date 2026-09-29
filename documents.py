from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.middleware.response_envelope import success
from app.models.audit import AuditAction, AuditStatus
from app.models.document import DocumentType, IntegrityStatus, OCRStatus
from app.models.user import User, UserRole
from app.schemas.document import (
    BlockchainRegisterOut,
    DocumentOut,
    DocumentUpdateRequest,
    DocumentVersionOut,
    OCRResultOut,
    VerifyResultOut,
)
from app.services import blockchain_service, case_service, document_service, ocr_service
from app.services.audit_service import log_action
from app.utils.file_validation import FileValidationError, read_and_validate_upload

router = APIRouter(prefix="/documents", tags=["Documents"])

_UPLOAD_ROLES = (UserRole.ADMIN, UserRole.INVESTIGATOR)
_WRITE_ROLES = (UserRole.ADMIN, UserRole.INVESTIGATOR)
_OCR_VERIFY_ROLES = (UserRole.ADMIN, UserRole.INVESTIGATOR, UserRole.REVIEWER)


@router.post("/upload", dependencies=[Depends(require_role(*_UPLOAD_ROLES))])
async def upload_document(
    request: Request,
    case_id: str = Form(...),
    title: str = Form(...),
    document_type: DocumentType = Form(...),
    description: str | None = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Ensure the case exists first.
    try:
        case_service.get_case(db, case_id)
    except case_service.CaseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    try:
        content, _ext = await read_and_validate_upload(file)
    except FileValidationError as exc:
        log_action(
            db,
            user_id=current_user.id,
            action=AuditAction.UPLOAD_DOCUMENT,
            status=AuditStatus.FAILED,
            case_id=case_id,
            details=str(exc),
            request=request,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    document = document_service.create_document(
        db,
        case_id=case_id,
        title=title,
        document_type=document_type,
        description=description,
        original_filename=file.filename or "upload",
        mime_type=file.content_type or "application/octet-stream",
        file_bytes=content,
        uploaded_by=current_user.id,
    )

    log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.UPLOAD_DOCUMENT,
        status=AuditStatus.SUCCESS,
        document_id=document.id,
        case_id=case_id,
        request=request,
    )
    return success(DocumentOut.model_validate(document), message="Document uploaded.")


@router.get("")
def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    case_id: str | None = None,
    document_type: DocumentType | None = None,
    uploaded_by: str | None = None,
    ocr_status: OCRStatus | None = None,
    integrity_status: IntegrityStatus | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = document_service.list_documents(
        db,
        page=page,
        page_size=page_size,
        case_id=case_id,
        document_type=document_type,
        uploaded_by=uploaded_by,
        ocr_status=ocr_status,
        integrity_status=integrity_status,
    )
    return success(
        {
            "items": [DocumentOut.model_validate(d) for d in items],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{document_id}")
def get_document(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        doc = document_service.get_document(db, document_id)
    except document_service.DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.VIEW_DOCUMENT,
        status=AuditStatus.SUCCESS,
        document_id=doc.id,
        request=request,
    )
    return success(DocumentOut.model_validate(doc))


@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        doc = document_service.get_document(db, document_id)
    except document_service.DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.DOWNLOAD_DOCUMENT,
        status=AuditStatus.SUCCESS,
        document_id=doc.id,
        request=request,
    )
    # storage_path is never exposed directly to clients; only served
    # through this authenticated, audited endpoint.
    return FileResponse(
        doc.storage_path, filename=doc.filename, media_type=doc.mime_type
    )


@router.put("/{document_id}", dependencies=[Depends(require_role(*_WRITE_ROLES))])
def update_document(
    document_id: str,
    payload: DocumentUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        doc = document_service.update_document(
            db, document_id, data=payload.model_dump(exclude_unset=True)
        )
    except document_service.DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.UPDATE_DOCUMENT,
        status=AuditStatus.SUCCESS,
        document_id=doc.id,
        request=request,
    )
    return success(DocumentOut.model_validate(doc), message="Document updated.")


@router.delete("/{document_id}", dependencies=[Depends(require_role(UserRole.ADMIN))])
def delete_document(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        document_service.delete_document(db, document_id)
    except document_service.DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.DELETE_DOCUMENT,
        status=AuditStatus.SUCCESS,
        document_id=document_id,
        request=request,
    )
    return success(message="Document deleted.")


@router.post(
    "/{document_id}/ocr", dependencies=[Depends(require_role(*_OCR_VERIFY_ROLES))]
)
def trigger_ocr(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        doc = document_service.run_ocr_for_document(db, document_id)
    except document_service.DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ocr_service.OCRUnavailableError as exc:
        log_action(
            db,
            user_id=current_user.id,
            action=AuditAction.OCR_PROCESS,
            status=AuditStatus.FAILED,
            document_id=document_id,
            details=str(exc),
            request=request,
        )
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except ocr_service.OCRProcessingError as exc:
        log_action(
            db,
            user_id=current_user.id,
            action=AuditAction.OCR_PROCESS,
            status=AuditStatus.FAILED,
            document_id=document_id,
            details=str(exc),
            request=request,
        )
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.OCR_PROCESS,
        status=AuditStatus.SUCCESS,
        document_id=doc.id,
        request=request,
    )
    return success(
        OCRResultOut(
            document_id=doc.id, ocr_status=doc.ocr_status, ocr_text=doc.ocr_text
        ),
        message="OCR completed.",
    )


@router.get("/{document_id}/ocr")
def get_ocr_result(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        doc = document_service.get_document(db, document_id)
    except document_service.DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    return success(
        OCRResultOut(document_id=doc.id, ocr_status=doc.ocr_status, ocr_text=doc.ocr_text)
    )


@router.post(
    "/{document_id}/blockchain/register",
    dependencies=[Depends(require_role(*_WRITE_ROLES))],
)
def register_blockchain(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        doc = document_service.register_document_on_blockchain(
            db, document_id, user_id=current_user.id
        )
    except document_service.DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except (
        blockchain_service.BlockchainUnavailableError,
        blockchain_service.BlockchainTransactionError,
    ) as exc:
        log_action(
            db,
            user_id=current_user.id,
            action=AuditAction.BLOCKCHAIN_REGISTER,
            status=AuditStatus.FAILED,
            document_id=document_id,
            details=str(exc),
            request=request,
        )
        # Fetch current (FAILED) status to report accurately.
        doc = document_service.get_document(db, document_id)
        return success(
            BlockchainRegisterOut(
                document_id=doc.id,
                sha256_hash=doc.sha256_hash,
                blockchain_status=doc.blockchain_status,
                transaction_hash=None,
                message=str(exc),
            ),
            message="Blockchain registration failed.",
        )

    log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.BLOCKCHAIN_REGISTER,
        status=AuditStatus.SUCCESS,
        document_id=doc.id,
        request=request,
    )
    return success(
        BlockchainRegisterOut(
            document_id=doc.id,
            sha256_hash=doc.sha256_hash,
            blockchain_status=doc.blockchain_status,
            transaction_hash=doc.blockchain_tx_hash,
        ),
        message="Document registered on blockchain.",
    )


@router.post(
    "/{document_id}/verify", dependencies=[Depends(require_role(*_OCR_VERIFY_ROLES))]
)
def verify_document(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        doc, current_hash, registered_hash = document_service.verify_document_integrity(
            db, document_id
        )
    except document_service.DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    audit_status = (
        AuditStatus.SUCCESS
        if doc.integrity_status == IntegrityStatus.VERIFIED
        else AuditStatus.FAILED
    )
    log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.VERIFY_DOCUMENT,
        status=audit_status,
        document_id=doc.id,
        details=f"integrity={doc.integrity_status.value}",
        request=request,
    )

    return success(
        VerifyResultOut(
            document_id=doc.document_id,
            current_hash=current_hash,
            registered_hash=registered_hash,
            integrity=doc.integrity_status,
        )
    )


@router.post(
    "/{document_id}/versions", dependencies=[Depends(require_role(*_WRITE_ROLES))]
)
async def create_version(
    document_id: str,
    request: Request,
    file: UploadFile = File(...),
    run_ocr: bool = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        document_service.get_document(db, document_id)
    except document_service.DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    try:
        content, _ext = await read_and_validate_upload(file)
    except FileValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    version = document_service.create_new_version(
        db,
        document_id=document_id,
        original_filename=file.filename or "upload",
        file_bytes=content,
        uploaded_by=current_user.id,
    )

    log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.CREATE_VERSION,
        status=AuditStatus.SUCCESS,
        document_id=document_id,
        details=f"version={version.version}",
        request=request,
    )

    if run_ocr:
        try:
            document_service.run_ocr_for_document(db, document_id)
        except (ocr_service.OCRUnavailableError, ocr_service.OCRProcessingError):
            pass  # OCR failure on a version does not fail the upload itself

    return success(DocumentVersionOut.model_validate(version), message="New version created.")


@router.get("/{document_id}/versions")
def list_versions(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        versions = document_service.list_versions(db, document_id)
    except document_service.DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return success([DocumentVersionOut.model_validate(v) for v in versions])
