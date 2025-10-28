"""Schemas for extractor API export."""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ApiKeyResponse(BaseModel):
    """Response schema for API key."""
    id: int
    extractor_id: int
    api_key: str
    is_active: bool
    created_at: datetime
    usage_count: int = 0

    class Config:
        from_attributes = True


class ApiKeyToggleRequest(BaseModel):
    """Request to toggle API key active status."""
    is_active: bool


class ApiKeyCreateResponse(BaseModel):
    """Response when creating a new API key."""
    api_key: str
    message: str
