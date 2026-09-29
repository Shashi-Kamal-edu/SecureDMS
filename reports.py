from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.middleware.response_envelope import success
from app.models.audit import AuditLog
from app.models.case import Case
from app.models.document import Document, IntegrityStatus, OCRStatus
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/documents")
def documents_report(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    by_type = (
        db.query(Document.document_type, func.count(Document.id))
        .group_by(Document.document_type)
        .all()
    )
    by_ocr_status = (
        db.query(Document.ocr_status, func.count(Document.id))
        .group_by(Document.ocr_status)
        .all()
    )
    by_integrity_status = (
        db.query(Document.integrity_status, func.count(Document.id))
        .group_by(Document.integrity_status)
        .all()
    )

    return success(
        {
            "by_document_type": [
                {"label": t.value, "count": c} for t, c in by_type
            ],
            "by_ocr_status": [{"label": s.value, "count": c} for s, c in by_ocr_status],
            "by_integrity_status": [
                {"label": s.value, "count": c} for s, c in by_integrity_status
            ],
        }
    )


@router.get("/cases")
def cases_report(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    by_status = (
        db.query(Case.status, func.count(Case.id)).group_by(Case.status).all()
    )
    return success(
        {"by_status": [{"label": s.value, "count": c} for s, c in by_status]}
    )


@router.get("/security")
def security_report(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    by_action = (
        db.query(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
        .all()
    )
    by_status = (
        db.query(AuditLog.status, func.count(AuditLog.id))
        .group_by(AuditLog.status)
        .all()
    )
    return success(
        {
            "activity_by_action": [{"label": a.value, "count": c} for a, c in by_action],
            "by_status": [{"label": s.value, "count": c} for s, c in by_status],
        }
    )
