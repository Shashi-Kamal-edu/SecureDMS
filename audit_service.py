from __future__ import annotations

from typing import Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit import AuditAction, AuditLog, AuditStatus


def log_action(
    db: Session,
    *,
    user_id: Optional[str],
    action: AuditAction,
    status: AuditStatus,
    document_id: Optional[str] = None,
    case_id: Optional[str] = None,
    details: Optional[str] = None,
    request: Optional[Request] = None,
) -> AuditLog:
    """Centralized audit trail writer. Never logs passwords or secrets --
    callers must only pass non-sensitive `details`."""
    ip_address = None
    user_agent = None
    if request is not None:
        client = request.client
        ip_address = client.host if client else None
        user_agent = request.headers.get("user-agent")

    entry = AuditLog(
        user_id=user_id,
        action=action,
        document_id=document_id,
        case_id=case_id,
        ip_address=ip_address,
        user_agent=user_agent,
        status=status,
        details=details,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
