"""Analytics routes for API usage tracking."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from autoglean.db.base import get_db
from autoglean.db.models import (
    User, Extractor, ExtractorApiKey, ApiExtractionJob,
    ExtractionJob, ExtractorUsageStats
)
from autoglean.auth.dependencies import get_current_active_user
from autoglean.analytics.schemas import (
    ApiUsageResponse,
    ApiUserStats,
    MyApiRequestsResponse,
    ApiRequestRecord
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Analytics"])


@router.get("/extractors/{extractor_id}/api-usage", response_model=ApiUsageResponse)
async def get_extractor_api_usage(
    extractor_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get API usage analytics for an extractor.
    Only the extractor owner can access this.
    """
    try:
        # Check ownership
        extractor = db.query(Extractor).filter(
            Extractor.id == extractor_id,
            Extractor.deleted_at == None
        ).first()

        if not extractor:
            raise HTTPException(status_code=404, detail="Extractor not found")

        if extractor.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this extractor's analytics")

        # Get API key
        api_key = db.query(ExtractorApiKey).filter(
            ExtractorApiKey.extractor_id == extractor_id
        ).first()

        if not api_key:
            # No API key exists, return zero stats
            return ApiUsageResponse(
                total_api_requests=0,
                total_app_usage=0,
                successful_requests=0,
                failed_requests=0,
                api_users=[]
            )

        # Get total API requests
        total_api_requests = db.query(func.count(ApiExtractionJob.id)).filter(
            ApiExtractionJob.api_key_id == api_key.id
        ).scalar() or 0

        # Get successful/failed API requests
        successful_requests = db.query(func.count(ApiExtractionJob.id)).filter(
            ApiExtractionJob.api_key_id == api_key.id,
            ApiExtractionJob.status == 'completed'
        ).scalar() or 0

        failed_requests = db.query(func.count(ApiExtractionJob.id)).filter(
            ApiExtractionJob.api_key_id == api_key.id,
            ApiExtractionJob.status == 'failed'
        ).scalar() or 0

        # Get total app usage (from ExtractionJob or ExtractorUsageStats)
        usage_stats = db.query(ExtractorUsageStats).filter(
            ExtractorUsageStats.extractor_id == extractor_id
        ).first()

        total_app_usage = usage_stats.total_uses if usage_stats else 0

        # Get per-user API usage statistics
        user_stats_query = db.query(
            ApiExtractionJob.requester_user_id,
            User.full_name_en,
            User.full_name_ar,
            func.count(ApiExtractionJob.id).label('request_count'),
            func.sum(
                func.cast(ApiExtractionJob.status == 'completed', db.bind.dialect.BIGINT)
            ).label('successful_count'),
            func.sum(
                func.cast(ApiExtractionJob.status == 'failed', db.bind.dialect.BIGINT)
            ).label('failed_count'),
            func.coalesce(func.sum(ApiExtractionJob.total_tokens), 0).label('total_tokens')
        ).join(
            User, User.id == ApiExtractionJob.requester_user_id
        ).filter(
            ApiExtractionJob.api_key_id == api_key.id
        ).group_by(
            ApiExtractionJob.requester_user_id,
            User.full_name_en,
            User.full_name_ar
        ).all()

        api_users = [
            ApiUserStats(
                user_id=row.requester_user_id,
                user_name_en=row.full_name_en,
                user_name_ar=row.full_name_ar,
                request_count=row.request_count,
                successful_count=row.successful_count or 0,
                failed_count=row.failed_count or 0,
                total_tokens=row.total_tokens
            )
            for row in user_stats_query
        ]

        return ApiUsageResponse(
            total_api_requests=total_api_requests,
            total_app_usage=total_app_usage,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            api_users=api_users
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get API usage for extractor {extractor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my-api-requests", response_model=MyApiRequestsResponse)
async def get_my_api_requests(
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    status: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get the current user's API requests to other extractors.
    """
    try:
        # Build query
        query = db.query(
            ApiExtractionJob.id,
            ApiExtractionJob.job_id,
            ApiExtractionJob.requester_user_id,
            User.full_name_en.label('requester_user_name_en'),
            User.full_name_ar.label('requester_user_name_ar'),
            ApiExtractionJob.request_label,
            ApiExtractionJob.file_name,
            ApiExtractionJob.status,
            ApiExtractionJob.created_at,
            ApiExtractionJob.completed_at,
            ApiExtractionJob.total_tokens,
            ApiExtractionJob.is_cached_result
        ).join(
            User, User.id == ApiExtractionJob.requester_user_id
        ).filter(
            ApiExtractionJob.requester_user_id == current_user.id
        )

        # Apply status filter if provided
        if status:
            query = query.filter(ApiExtractionJob.status == status)

        # Get total count
        total = query.count()

        # Get paginated results
        results = query.order_by(
            ApiExtractionJob.created_at.desc()
        ).limit(limit).offset(offset).all()

        requests = [
            ApiRequestRecord(
                id=row.id,
                job_id=row.job_id,
                requester_user_id=row.requester_user_id,
                requester_user_name_en=row.requester_user_name_en,
                requester_user_name_ar=row.requester_user_name_ar,
                request_label=row.request_label,
                file_name=row.file_name,
                status=row.status,
                created_at=row.created_at,
                completed_at=row.completed_at,
                total_tokens=row.total_tokens,
                is_cached_result=row.is_cached_result
            )
            for row in results
        ]

        return MyApiRequestsResponse(
            total=total,
            requests=requests
        )

    except Exception as e:
        logger.error(f"Failed to get API requests for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
