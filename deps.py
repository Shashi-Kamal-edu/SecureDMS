from __future__ import annotations

from typing import Iterable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import TokenError, decode_access_token
from app.models.audit import AuditAction, AuditStatus
from app.models.user import User, UserRole
from app.services.audit_service import log_action

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except TokenError:
        log_action(
            db,
            user_id=None,
            action=AuditAction.INVALID_JWT,
            status=AuditStatus.FAILED,
            details="Invalid or expired JWT presented.",
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    request.state.current_user = user
    return user


def require_role(*allowed_roles: UserRole):
    """Dependency factory. Usage: Depends(require_role(UserRole.ADMIN))"""

    def dependency(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if current_user.role not in allowed_roles:
            log_action(
                db,
                user_id=current_user.id,
                action=AuditAction.FORBIDDEN_ACCESS,
                status=AuditStatus.FAILED,
                details=(
                    f"Role {current_user.role.value} attempted an action "
                    f"restricted to {[r.value for r in allowed_roles]}."
                ),
                request=request,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return dependency


def require_any_role(roles: Iterable[UserRole]):
    return require_role(*roles)
