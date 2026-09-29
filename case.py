from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.case import CaseStatus


class CaseCreateRequest(BaseModel):
    case_number: str
    case_name: str
    case_type: str
    department: str | None = None
    assigned_officer: str | None = None
    status: CaseStatus = CaseStatus.OPEN
    description: str | None = None


class CaseUpdateRequest(BaseModel):
    case_name: str | None = None
    case_type: str | None = None
    department: str | None = None
    assigned_officer: str | None = None
    status: CaseStatus | None = None
    description: str | None = None


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_number: str
    case_name: str
    case_type: str
    department: str | None
    assigned_officer: str | None
    status: CaseStatus
    description: str | None
    created_at: datetime
    updated_at: datetime


class CaseListResponse(BaseModel):
    items: list[CaseOut]
    total: int
    page: int
    page_size: int
