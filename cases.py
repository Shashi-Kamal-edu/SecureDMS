from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.middleware.response_envelope import success
from app.models.audit import AuditAction, AuditStatus
from app.models.case import CaseStatus
from app.models.user import User, UserRole
from app.schemas.case import CaseCreateRequest, CaseOut, CaseUpdateRequest
from app.services import case_service
from app.services.audit_service import log_action

router = APIRouter(prefix="/cases", tags=["Cases"])

# All authenticated roles can view; only ADMIN/INVESTIGATOR can write.
_WRITE_ROLES = (UserRole.ADMIN, UserRole.INVESTIGATOR)


@router.post("", dependencies=[Depends(require_role(*_WRITE_ROLES))])
def create_case(
    payload: CaseCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        case = case_service.create_case(db, data=payload.model_dump())
    except case_service.CaseConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.CREATE_CASE,
        status=AuditStatus.SUCCESS,
        case_id=case.id,
        request=request,
    )
    return success(CaseOut.model_validate(case), message="Case created.")


@router.get("")
def list_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status_filter: CaseStatus | None = Query(None, alias="status"),
    case_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = case_service.list_cases(
        db,
        page=page,
        page_size=page_size,
        search=search,
        status_filter=status_filter,
        case_type=case_type,
    )
    return success(
        {
            "items": [CaseOut.model_validate(c) for c in items],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@router.get("/{case_id}")
def get_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        case = case_service.get_case(db, case_id)
    except case_service.CaseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return success(CaseOut.model_validate(case))


@router.put("/{case_id}", dependencies=[Depends(require_role(*_WRITE_ROLES))])
def update_case(
    case_id: str,
    payload: CaseUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        case = case_service.update_case(
            db, case_id, data=payload.model_dump(exclude_unset=True)
        )
    except case_service.CaseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.UPDATE_CASE,
        status=AuditStatus.SUCCESS,
        case_id=case.id,
        request=request,
    )
    return success(CaseOut.model_validate(case), message="Case updated.")


@router.delete("/{case_id}", dependencies=[Depends(require_role(UserRole.ADMIN))])
def delete_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        case_service.delete_case(db, case_id)
    except case_service.CaseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return success(message="Case deleted.")
