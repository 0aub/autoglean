"""Pydantic models for API requests and responses."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# === Extractor Models ===

class ExtractorInfo(BaseModel):
    """Extractor configuration info."""
    id: str
    name: str
    icon: str
    description: Optional[str] = None
    prompt: Optional[str] = None
    llm: str
    temperature: float
    max_tokens: int


class ExtractorsListResponse(BaseModel):
    """Response for list of extractors."""
    extractors: Dict[str, ExtractorInfo]


class UpdateExtractorRequest(BaseModel):
    """Request to update extractor prompt."""
    prompt: str = Field(..., description="New prompt text")


# === Extraction Request Models ===

class ExtractionRequest(BaseModel):
    """Request to extract from document."""
    extractor_id: str = Field(..., description="ID of extractor to use")
    job_id: str = Field(..., description="Unique job identifier")


class BatchExtractionRequest(BaseModel):
    """Request to extract from multiple documents."""
    extractor_id: str
    job_id: str
    file_count: int


# === Extraction Response Models ===

class ExtractionResult(BaseModel):
    """Single extraction result."""
    job_id: str
    extractor_id: str
    file_name: str
    result_content: str  # Markdown content
    result_path: str
    usage: Dict[str, int]
    model: str


class ExtractionResponse(BaseModel):
    """Response for extraction request."""
    task_id: str
    job_id: str
    status: str
    message: str


class TaskStatusResponse(BaseModel):
    """Response for task status check."""
    task_id: str
    status: str  # PENDING, PROCESSING, SUCCESS, FAILURE
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# === File Upload Models ===

class FileUploadResponse(BaseModel):
    """Response after file upload."""
    job_id: str
    file_name: str
    file_path: str
    message: str


# === Health Check ===

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
