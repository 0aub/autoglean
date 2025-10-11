"""Pydantic schemas for extractors."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from autoglean.db.models import VisibilityEnum


class ExtractorCreateRequest(BaseModel):
    """Create extractor request schema."""
    name_en: str
    name_ar: str
    icon: str
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    prompt: str
    llm: str = "gemini-flash"
    temperature: float = 0.7
    max_tokens: int = 2000
    output_format: str = "markdown"
    visibility: VisibilityEnum = VisibilityEnum.PRIVATE


class ExtractorUpdateRequest(BaseModel):
    """Update extractor request schema."""
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    icon: Optional[str] = None
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    prompt: Optional[str] = None
    llm: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    output_format: Optional[str] = None
    visibility: Optional[VisibilityEnum] = None
    change_notes: Optional[str] = None  # Required for public extractors


class ExtractorResponse(BaseModel):
    """Extractor response schema."""
    id: int
    extractor_id: str  # UUID for extraction operations
    name_en: str
    name_ar: str
    icon: str
    description_en: Optional[str]
    description_ar: Optional[str]
    prompt: Optional[str]  # Hidden for non-owners
    llm: str
    temperature: float
    max_tokens: int
    output_format: str
    visibility: VisibilityEnum
    owner_id: int
    owner_name_en: str
    owner_name_ar: str
    owner_department_name_en: Optional[str] = None
    owner_department_name_ar: Optional[str] = None
    owner_gm_name_en: Optional[str] = None
    owner_gm_name_ar: Optional[str] = None
    usage_count: int
    rating_avg: Optional[float]
    rating_count: int
    is_favorited: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True  # Return enum values instead of enum names


class ExtractorShareRequest(BaseModel):
    """Share extractor request schema."""
    user_id: int
    can_edit: bool = False


class ExtractorShareResponse(BaseModel):
    """Extractor share response schema."""
    id: int
    extractor_id: int
    shared_with_user_id: int
    shared_with_user_name_en: str
    shared_with_user_name_ar: str
    can_edit: bool
    shared_at: datetime

    class Config:
        from_attributes = True


class ExtractorRatingRequest(BaseModel):
    """Rate extractor request schema."""
    rating: int  # 1-5
    review: Optional[str] = None


class ExtractorRatingResponse(BaseModel):
    """Extractor rating response schema."""
    id: int
    extractor_id: int
    user_id: int
    user_name_en: str
    user_name_ar: str
    rating: int
    review: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
