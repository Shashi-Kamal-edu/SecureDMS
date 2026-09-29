from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.middleware.response_envelope import success
from app.models.user import User, UserRole
from app.schemas.user import AdminCreateUserRequest, UserOut
from app.services import auth_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", dependencies=[Depends(require_role(UserRole.ADMIN))])
def create_user(payload: AdminCreateUserRequest, db: Session = Depends(get_db)):
    """ADMIN only. This is the only route that can create a user with an
    elevated role (INVESTIGATOR, REVIEWER, ADMIN)."""
    try:
        user = auth_service.admin_create_user(
            db,
            name=payload.name,
            email=payload.email,
            password=payload.password,
            role=payload.role,
            is_active=payload.is_active,
        )
    except auth_service.AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return success(UserOut.model_validate(user), message="User created.")


@router.get("", dependencies=[Depends(require_role(UserRole.ADMIN))])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return success([UserOut.model_validate(u) for u in users])
