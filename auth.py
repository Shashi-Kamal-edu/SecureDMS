from __future__ import annotations

from pydantic import BaseModel, EmailStr

from app.schemas.user import UserOut


class RegisterRequest(BaseModel):
    """Public self-registration. Role is intentionally NOT accepted here;
    the service layer always forces role=VIEWER regardless of any extra
    fields the client might send."""

    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenData(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
