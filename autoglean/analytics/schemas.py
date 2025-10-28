"""Schemas for analytics and usage tracking."""

from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class ApiUserStats(BaseModel):
    """Statistics for a user who used the API."""
    user_id: int
    user_name_en: str
    user_name_ar: str
    request_count: int
    successful_count: int
    failed_count: int
    total_tokens: int


class ApiUsageResponse(BaseModel):
    """Response schema for API usage analytics."""
    total_api_requests: int
    total_app_usage: int
    successful_requests: int
    failed_requests: int
    api_users: List[ApiUserStats]


class ApiRequestRecord(BaseModel):
    """Individual API request record."""
    id: int
    job_id: str
    requester_user_id: int
    requester_user_name_en: str
    requester_user_name_ar: str
    request_label: str
    file_name: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime]
    total_tokens: Optional[int]
    is_cached_result: bool

    class Config:
        from_attributes = True


class MyApiRequestsResponse(BaseModel):
    """Response schema for user's own API requests."""
    total: int
    requests: List[ApiRequestRecord]
