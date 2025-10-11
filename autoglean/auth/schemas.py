"""Pydantic schemas for authentication."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Login request schema."""
    email: str
    password: str


class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User response schema."""
    id: int
    full_name_en: str
    full_name_ar: str
    email: str
    department_id: int
    department_name_en: Optional[str] = None
    department_name_ar: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
