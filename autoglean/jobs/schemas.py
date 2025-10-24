"""Pydantic schemas for extraction jobs."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ExtractionJobResponse(BaseModel):
    """Extraction job response schema."""
    id: int
    job_id: str
    user_id: int
    user_name: str
    extractor_id: int
    extractor_name: str
    file_name: str
    status: str
    result_text: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
    # Token usage
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    cached_tokens: Optional[int] = None
    model_used: Optional[str] = None
    is_cached_result: bool = False

    class Config:
        from_attributes = True


class ExtractionJobListResponse(BaseModel):
    """List of extraction jobs."""
    total: int
    jobs: list[ExtractionJobResponse]
