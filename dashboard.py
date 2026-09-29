from __future__ import annotations

from pydantic import BaseModel

from app.schemas.audit import AuditLogOut


class DashboardStats(BaseModel):
    total_documents: int
    total_cases: int
    active_cases: int
    documents_uploaded_today: int
    ocr_processed: int
    blockchain_registered: int
    verified_documents: int
    integrity_failures: int
    total_users: int


class RecentActivityResponse(BaseModel):
    items: list[AuditLogOut]
