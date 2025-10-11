"""Extraction jobs routes."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from autoglean.db.base import get_db
from autoglean.db.models import User, ExtractionJob, Extractor
from autoglean.auth.dependencies import get_current_active_user
from autoglean.jobs.schemas import ExtractionJobResponse, ExtractionJobListResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["Extraction Jobs"])


@router.get("", response_model=ExtractionJobListResponse)
async def list_jobs(
    extractor_id: Optional[int] = Query(None, description="Filter by extractor ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, le=200, description="Limit results"),
    offset: int = Query(0, description="Offset for pagination"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List extraction jobs for the current user."""
    try:
        # Base query - user can only see their own jobs
        query = db.query(
            ExtractionJob,
            User.full_name.label('user_name'),
            Extractor.name.label('extractor_name')
        ).join(
            User, ExtractionJob.user_id == User.id
        ).join(
            Extractor, ExtractionJob.extractor_id == Extractor.id
        ).filter(
            ExtractionJob.user_id == current_user.id
        )

        # Apply filters
        if extractor_id:
            query = query.filter(ExtractionJob.extractor_id == extractor_id)

        if status:
            query = query.filter(ExtractionJob.status == status)

        # Get total count
        total = query.count()

        # Apply pagination and ordering
        results = query.order_by(
            desc(ExtractionJob.created_at)
        ).limit(limit).offset(offset).all()

        # Build response
        jobs = [
            ExtractionJobResponse(
                id=row.ExtractionJob.id,
                job_id=row.ExtractionJob.job_id,
                user_id=row.ExtractionJob.user_id,
                user_name=row.user_name,
                extractor_id=row.ExtractionJob.extractor_id,
                extractor_name=row.extractor_name,
                file_name=row.ExtractionJob.file_name,
                status=row.ExtractionJob.status,
                result_text=row.ExtractionJob.result_text,
                error_message=row.ExtractionJob.error_message,
                created_at=row.ExtractionJob.created_at,
                completed_at=row.ExtractionJob.completed_at
            )
            for row in results
        ]

        return ExtractionJobListResponse(
            total=total,
            jobs=jobs
        )

    except Exception as e:
        logger.error(f"Failed to list jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}", response_model=ExtractionJobResponse)
async def get_job(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific extraction job."""
    try:
        result = db.query(
            ExtractionJob,
            User.full_name.label('user_name'),
            Extractor.name.label('extractor_name')
        ).join(
            User, ExtractionJob.user_id == User.id
        ).join(
            Extractor, ExtractionJob.extractor_id == Extractor.id
        ).filter(
            ExtractionJob.job_id == job_id,
            ExtractionJob.user_id == current_user.id
        ).first()

        if not result:
            raise HTTPException(status_code=404, detail="Job not found")

        return ExtractionJobResponse(
            id=result.ExtractionJob.id,
            job_id=result.ExtractionJob.job_id,
            user_id=result.ExtractionJob.user_id,
            user_name=result.user_name,
            extractor_id=result.ExtractionJob.extractor_id,
            extractor_name=result.extractor_name,
            file_name=result.ExtractionJob.file_name,
            status=result.ExtractionJob.status,
            result_text=result.ExtractionJob.result_text,
            error_message=result.ExtractionJob.error_message,
            created_at=result.ExtractionJob.created_at,
            completed_at=result.ExtractionJob.completed_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
