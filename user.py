from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AdminCreateUserRequest(BaseModel):
    """Only usable by an authenticated ADMIN. Allows setting any role."""

    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.VIEWER
    is_active: bool = True


class UserUpdateRequest(BaseModel):
    name: str | None = None
    is_active: bool | None = None
    role: UserRole | None = None
