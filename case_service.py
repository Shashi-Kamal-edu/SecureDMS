from __future__ import annotations

from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.case import Case, CaseStatus


class CaseNotFoundError(Exception):
    pass


class CaseConflictError(Exception):
    pass


def create_case(db: Session, *, data: dict) -> Case:
    existing = db.query(Case).filter(Case.case_number == data["case_number"]).first()
    if existing:
        raise CaseConflictError("A case with this case_number already exists.")
    case = Case(**data)
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


def get_case(db: Session, case_id: str) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise CaseNotFoundError("Case not found.")
    return case


def list_cases(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[CaseStatus] = None,
    case_type: Optional[str] = None,
) -> tuple[list[Case], int]:
    query = db.query(Case)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Case.case_number.ilike(like),
                Case.case_name.ilike(like),
                Case.description.ilike(like),
            )
        )
    if status_filter:
        query = query.filter(Case.status == status_filter)
    if case_type:
        query = query.filter(Case.case_type == case_type)

    total = query.count()
    items = (
        query.order_by(Case.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def update_case(db: Session, case_id: str, *, data: dict) -> Case:
    case = get_case(db, case_id)
    for key, value in data.items():
        if value is not None:
            setattr(case, key, value)
    db.commit()
    db.refresh(case)
    return case


def delete_case(db: Session, case_id: str) -> None:
    case = get_case(db, case_id)
    db.delete(case)
    db.commit()
