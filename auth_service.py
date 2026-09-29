from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User, UserRole


class AuthError(Exception):
    pass


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower()).first()


def register_public_user(db: Session, *, name: str, email: str, password: str) -> User:
    """Public self-registration. Role is ALWAYS forced to VIEWER here,
    regardless of anything the client sends -- this function does not even
    accept a role parameter, by design, to make privilege escalation via
    the registration endpoint structurally impossible."""
    if get_user_by_email(db, email):
        raise AuthError("A user with this email already exists.")

    user = User(
        name=name,
        email=email.lower(),
        password_hash=hash_password(password),
        role=UserRole.VIEWER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def admin_create_user(
    db: Session,
    *,
    name: str,
    email: str,
    password: str,
    role: UserRole,
    is_active: bool = True,
) -> User:
    """Only callable from a route protected by require_role(ADMIN). This is
    the only path by which a user with an elevated role can be created."""
    if get_user_by_email(db, email):
        raise AuthError("A user with this email already exists.")

    user = User(
        name=name,
        email=email.lower(),
        password_hash=hash_password(password),
        role=role,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, *, email: str, password: str) -> User:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        raise AuthError("Invalid email or password.")
    if not user.is_active:
        raise AuthError("This account has been deactivated.")
    return user
