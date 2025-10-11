"""Pydantic schemas for leaderboard."""

from typing import Optional
from pydantic import BaseModel


class ExtractorLeaderboardEntry(BaseModel):
    """Extractor leaderboard entry schema."""
    id: int
    name_en: str
    name_ar: str
    icon: str
    owner_name_en: str
    owner_name_ar: str
    usage_count: int
    rating_avg: Optional[float]
    rating_count: int


class UserLeaderboardEntry(BaseModel):
    """User leaderboard entry schema."""
    id: int
    full_name_en: str
    full_name_ar: str
    department_en: str
    department_ar: str
    extractor_count: int
    total_usage: int
    rating_avg: Optional[float]
    rating_count: int


class DepartmentLeaderboardEntry(BaseModel):
    """Department leaderboard entry schema."""
    department_en: str
    department_ar: str
    user_count: int
    extractor_count: int
    total_usage: int
    rating_avg: Optional[float]
    rating_count: int


class LeaderboardResponse(BaseModel):
    """Leaderboard response schema."""
    top_extractors_by_usage: list[ExtractorLeaderboardEntry]
    top_extractors_by_rating: list[ExtractorLeaderboardEntry]
    top_users_by_extractor_count: list[UserLeaderboardEntry]
    top_users_by_usage: list[UserLeaderboardEntry]
    top_users_by_rating: list[UserLeaderboardEntry]
    top_departments_by_extractor_count: list[DepartmentLeaderboardEntry]
    top_departments_by_usage: list[DepartmentLeaderboardEntry]
    top_departments_by_rating: list[DepartmentLeaderboardEntry]
