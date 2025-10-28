"""Schemas for public API."""

from pydantic import BaseModel, Field
from typing import Optional


class PublicExtractionRequest(BaseModel):
    """Request schema for public API extraction."""
    api_key: str = Field(..., description="API key for the extractor")
    user_id: int = Field(..., description="ID of the user making the request")
    label: str = Field(..., description="Label/title for this extraction request", max_length=512)


class PublicExtractionResponse(BaseModel):
    """Response schema for public API extraction."""
    task_id: str
    job_id: str
    message: str


class PublicTaskStatusResponse(BaseModel):
    """Response schema for task status check."""
    task_id: str
    status: str  # pending, processing, completed, failed
    result: Optional[dict] = None
    error: Optional[str] = None
