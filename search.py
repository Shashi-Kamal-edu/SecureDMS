from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.middleware.response_envelope import success
from app.models.audit import AuditAction, AuditStatus
from app.models.user import User
from app.services.audit_service import log_action
from app.services.search_service import global_search

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("")
def search(
    request: Request,
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = global_search(db, q)

    log_action(
        db,
        user_id=current_user.id,
        action=AuditAction.SEARCH_DOCUMENT,
        status=AuditStatus.SUCCESS,
        details=f"query={q}",
        request=request,
    )

    return success({"query": q, "results": results, "count": len(results)})
