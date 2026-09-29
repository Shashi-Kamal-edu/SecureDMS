from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.audit import AuditAction, AuditStatus


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None
    action: AuditAction
    document_id: str | None
    case_id: str | None
    timestamp: datetime
    ip_address: str | None
    user_agent: str | None
    status: AuditStatus
    details: str | None


class AuditLogListResponse(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    page_size: int
