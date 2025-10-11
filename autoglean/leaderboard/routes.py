"""Leaderboard routes."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from autoglean.db.base import get_db
from autoglean.db.models import (
    User, Extractor, ExtractorUsageStats, ExtractorRating, VisibilityEnum,
    Department, GeneralManagement
)
from autoglean.auth.dependencies import get_current_active_user
from autoglean.leaderboard.schemas import (
    ExtractorLeaderboardEntry, UserLeaderboardEntry, DepartmentLeaderboardEntry, LeaderboardResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    limit: int = Query(10, le=50, description="Limit per category"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get leaderboard data with 8 metrics:
    1. Top extractors by usage count
    2. Top extractors by rating (min 3 reviews)
    3. Top users by extractor count
    4. Top users by total usage
    5. Top users by ratings (min 5 reviews)
    6. Top departments by extractor count
    7. Top departments by total usage
    8. Top departments by ratings (min 5 reviews)
    """
    try:
        # 1. Top extractors by usage count
        top_extractors_usage = db.query(
            Extractor.id,
            Extractor.name_en,
            Extractor.name_ar,
            Extractor.icon,
            User.full_name_en.label('owner_name_en'),
            User.full_name_ar.label('owner_name_ar'),
            func.coalesce(ExtractorUsageStats.total_uses, 0).label('usage_count'),
            func.avg(ExtractorRating.rating).label('rating_avg'),
            func.count(func.distinct(ExtractorRating.id)).label('rating_count')
        ).join(
            User, Extractor.owner_id == User.id
        ).outerjoin(
            ExtractorUsageStats, ExtractorUsageStats.extractor_id == Extractor.id
        ).outerjoin(
            ExtractorRating, ExtractorRating.extractor_id == Extractor.id
        ).filter(
            Extractor.deleted_at == None,
            Extractor.visibility == VisibilityEnum.PUBLIC
        ).group_by(
            Extractor.id, User.full_name_en, User.full_name_ar, ExtractorUsageStats.total_uses
        ).order_by(
            desc('usage_count')
        ).limit(limit).all()

        # 2. Top extractors by rating (min 3 reviews)
        top_extractors_rating = db.query(
            Extractor.id,
            Extractor.name_en,
            Extractor.name_ar,
            Extractor.icon,
            User.full_name_en.label('owner_name_en'),
            User.full_name_ar.label('owner_name_ar'),
            func.coalesce(ExtractorUsageStats.total_uses, 0).label('usage_count'),
            func.avg(ExtractorRating.rating).label('rating_avg'),
            func.count(func.distinct(ExtractorRating.id)).label('rating_count')
        ).join(
            User, Extractor.owner_id == User.id
        ).outerjoin(
            ExtractorUsageStats, ExtractorUsageStats.extractor_id == Extractor.id
        ).join(
            ExtractorRating, ExtractorRating.extractor_id == Extractor.id
        ).filter(
            Extractor.deleted_at == None,
            Extractor.visibility == VisibilityEnum.PUBLIC
        ).group_by(
            Extractor.id, User.full_name_en, User.full_name_ar, ExtractorUsageStats.total_uses
        ).having(
            func.count(func.distinct(ExtractorRating.id)) >= 3
        ).order_by(
            desc('rating_avg')
        ).limit(limit).all()

        # 3. Top users by extractor count
        top_users_extractors = db.query(
            User.id,
            User.full_name_en,
            User.full_name_ar,
            Department.name_en.label('department_en'),
            Department.name_ar.label('department_ar'),
            func.count(func.distinct(Extractor.id)).label('extractor_count'),
            func.coalesce(func.sum(ExtractorUsageStats.total_uses), 0).label('total_usage'),
            func.avg(ExtractorRating.rating).label('rating_avg'),
            func.count(func.distinct(ExtractorRating.id)).label('rating_count')
        ).join(
            Department, User.department_id == Department.id
        ).outerjoin(
            Extractor,
            (Extractor.owner_id == User.id) &
            (Extractor.deleted_at == None) &
            (Extractor.visibility == VisibilityEnum.PUBLIC)
        ).outerjoin(
            ExtractorUsageStats, ExtractorUsageStats.extractor_id == Extractor.id
        ).outerjoin(
            ExtractorRating, ExtractorRating.extractor_id == Extractor.id
        ).filter(
            User.is_active == True,
            User.deleted_at == None
        ).group_by(
            User.id, Department.name_en, Department.name_ar
        ).order_by(
            desc('extractor_count')
        ).limit(limit).all()

        # 4. Top users by total usage
        top_users_usage = db.query(
            User.id,
            User.full_name_en,
            User.full_name_ar,
            Department.name_en.label('department_en'),
            Department.name_ar.label('department_ar'),
            func.count(func.distinct(Extractor.id)).label('extractor_count'),
            func.coalesce(func.sum(ExtractorUsageStats.total_uses), 0).label('total_usage'),
            func.avg(ExtractorRating.rating).label('rating_avg'),
            func.count(func.distinct(ExtractorRating.id)).label('rating_count')
        ).join(
            Department, User.department_id == Department.id
        ).outerjoin(
            Extractor,
            (Extractor.owner_id == User.id) &
            (Extractor.deleted_at == None) &
            (Extractor.visibility == VisibilityEnum.PUBLIC)
        ).outerjoin(
            ExtractorUsageStats, ExtractorUsageStats.extractor_id == Extractor.id
        ).outerjoin(
            ExtractorRating, ExtractorRating.extractor_id == Extractor.id
        ).filter(
            User.is_active == True,
            User.deleted_at == None
        ).group_by(
            User.id, Department.name_en, Department.name_ar
        ).order_by(
            desc('total_usage')
        ).limit(limit).all()

        # 5. Top users by ratings (min 5 reviews on their extractors)
        top_users_rating = db.query(
            User.id,
            User.full_name_en,
            User.full_name_ar,
            Department.name_en.label('department_en'),
            Department.name_ar.label('department_ar'),
            func.count(func.distinct(Extractor.id)).label('extractor_count'),
            func.coalesce(func.sum(ExtractorUsageStats.total_uses), 0).label('total_usage'),
            func.avg(ExtractorRating.rating).label('rating_avg'),
            func.count(func.distinct(ExtractorRating.id)).label('rating_count')
        ).join(
            Department, User.department_id == Department.id
        ).outerjoin(
            Extractor, Extractor.owner_id == User.id
        ).outerjoin(
            ExtractorUsageStats, ExtractorUsageStats.extractor_id == Extractor.id
        ).join(
            ExtractorRating, ExtractorRating.extractor_id == Extractor.id
        ).filter(
            User.is_active == True,
            User.deleted_at == None
        ).group_by(
            User.id, Department.name_en, Department.name_ar
        ).having(
            func.count(func.distinct(ExtractorRating.id)) >= 5
        ).order_by(
            desc('rating_avg')
        ).limit(limit).all()

        # 6. Top departments by extractor count
        top_departments_extractors = db.query(
            Department.name_en.label('department_en'),
            Department.name_ar.label('department_ar'),
            func.count(func.distinct(User.id)).label('user_count'),
            func.count(func.distinct(Extractor.id)).label('extractor_count'),
            func.coalesce(func.sum(ExtractorUsageStats.total_uses), 0).label('total_usage'),
            func.avg(ExtractorRating.rating).label('rating_avg'),
            func.count(func.distinct(ExtractorRating.id)).label('rating_count')
        ).join(
            User, User.department_id == Department.id
        ).outerjoin(
            Extractor,
            (Extractor.owner_id == User.id) &
            (Extractor.deleted_at == None) &
            (Extractor.visibility == VisibilityEnum.PUBLIC)
        ).outerjoin(
            ExtractorUsageStats, ExtractorUsageStats.extractor_id == Extractor.id
        ).outerjoin(
            ExtractorRating, ExtractorRating.extractor_id == Extractor.id
        ).filter(
            User.is_active == True,
            User.deleted_at == None
        ).group_by(
            Department.name_en, Department.name_ar
        ).order_by(
            desc('extractor_count')
        ).limit(limit).all()

        # 7. Top departments by total usage
        top_departments_usage = db.query(
            Department.name_en.label('department_en'),
            Department.name_ar.label('department_ar'),
            func.count(func.distinct(User.id)).label('user_count'),
            func.count(func.distinct(Extractor.id)).label('extractor_count'),
            func.coalesce(func.sum(ExtractorUsageStats.total_uses), 0).label('total_usage'),
            func.avg(ExtractorRating.rating).label('rating_avg'),
            func.count(func.distinct(ExtractorRating.id)).label('rating_count')
        ).join(
            User, User.department_id == Department.id
        ).outerjoin(
            Extractor,
            (Extractor.owner_id == User.id) &
            (Extractor.deleted_at == None) &
            (Extractor.visibility == VisibilityEnum.PUBLIC)
        ).outerjoin(
            ExtractorUsageStats, ExtractorUsageStats.extractor_id == Extractor.id
        ).outerjoin(
            ExtractorRating, ExtractorRating.extractor_id == Extractor.id
        ).filter(
            User.is_active == True,
            User.deleted_at == None
        ).group_by(
            Department.name_en, Department.name_ar
        ).order_by(
            desc('total_usage')
        ).limit(limit).all()

        # 8. Top departments by ratings (min 5 reviews)
        top_departments_rating = db.query(
            Department.name_en.label('department_en'),
            Department.name_ar.label('department_ar'),
            func.count(func.distinct(User.id)).label('user_count'),
            func.count(func.distinct(Extractor.id)).label('extractor_count'),
            func.coalesce(func.sum(ExtractorUsageStats.total_uses), 0).label('total_usage'),
            func.avg(ExtractorRating.rating).label('rating_avg'),
            func.count(func.distinct(ExtractorRating.id)).label('rating_count')
        ).join(
            User, User.department_id == Department.id
        ).outerjoin(
            Extractor,
            (Extractor.owner_id == User.id) &
            (Extractor.deleted_at == None) &
            (Extractor.visibility == VisibilityEnum.PUBLIC)
        ).outerjoin(
            ExtractorUsageStats, ExtractorUsageStats.extractor_id == Extractor.id
        ).join(
            ExtractorRating, ExtractorRating.extractor_id == Extractor.id
        ).filter(
            User.is_active == True,
            User.deleted_at == None
        ).group_by(
            Department.name_en, Department.name_ar
        ).having(
            func.count(func.distinct(ExtractorRating.id)) >= 5
        ).order_by(
            desc('rating_avg')
        ).limit(limit).all()

        # Build response
        return LeaderboardResponse(
            top_extractors_by_usage=[
                ExtractorLeaderboardEntry(
                    id=row.id,
                    name_en=row.name_en,
                    name_ar=row.name_ar,
                    icon=row.icon,
                    owner_name_en=row.owner_name_en,
                    owner_name_ar=row.owner_name_ar,
                    usage_count=row.usage_count,
                    rating_avg=float(row.rating_avg) if row.rating_avg else None,
                    rating_count=row.rating_count
                )
                for row in top_extractors_usage
            ],
            top_extractors_by_rating=[
                ExtractorLeaderboardEntry(
                    id=row.id,
                    name_en=row.name_en,
                    name_ar=row.name_ar,
                    icon=row.icon,
                    owner_name_en=row.owner_name_en,
                    owner_name_ar=row.owner_name_ar,
                    usage_count=row.usage_count,
                    rating_avg=float(row.rating_avg) if row.rating_avg else None,
                    rating_count=row.rating_count
                )
                for row in top_extractors_rating
            ],
            top_users_by_extractor_count=[
                UserLeaderboardEntry(
                    id=row.id,
                    full_name_en=row.full_name_en,
                    full_name_ar=row.full_name_ar,
                    department_en=row.department_en,
                    department_ar=row.department_ar,
                    extractor_count=row.extractor_count,
                    total_usage=row.total_usage,
                    rating_avg=float(row.rating_avg) if row.rating_avg else None,
                    rating_count=row.rating_count
                )
                for row in top_users_extractors
            ],
            top_users_by_usage=[
                UserLeaderboardEntry(
                    id=row.id,
                    full_name_en=row.full_name_en,
                    full_name_ar=row.full_name_ar,
                    department_en=row.department_en,
                    department_ar=row.department_ar,
                    extractor_count=row.extractor_count,
                    total_usage=row.total_usage,
                    rating_avg=float(row.rating_avg) if row.rating_avg else None,
                    rating_count=row.rating_count
                )
                for row in top_users_usage
            ],
            top_users_by_rating=[
                UserLeaderboardEntry(
                    id=row.id,
                    full_name_en=row.full_name_en,
                    full_name_ar=row.full_name_ar,
                    department_en=row.department_en,
                    department_ar=row.department_ar,
                    extractor_count=row.extractor_count,
                    total_usage=row.total_usage,
                    rating_avg=float(row.rating_avg) if row.rating_avg else None,
                    rating_count=row.rating_count
                )
                for row in top_users_rating
            ],
            top_departments_by_extractor_count=[
                DepartmentLeaderboardEntry(
                    department_en=row.department_en,
                    department_ar=row.department_ar,
                    user_count=row.user_count,
                    extractor_count=row.extractor_count,
                    total_usage=row.total_usage,
                    rating_avg=float(row.rating_avg) if row.rating_avg else None,
                    rating_count=row.rating_count
                )
                for row in top_departments_extractors
            ],
            top_departments_by_usage=[
                DepartmentLeaderboardEntry(
                    department_en=row.department_en,
                    department_ar=row.department_ar,
                    user_count=row.user_count,
                    extractor_count=row.extractor_count,
                    total_usage=row.total_usage,
                    rating_avg=float(row.rating_avg) if row.rating_avg else None,
                    rating_count=row.rating_count
                )
                for row in top_departments_usage
            ],
            top_departments_by_rating=[
                DepartmentLeaderboardEntry(
                    department_en=row.department_en,
                    department_ar=row.department_ar,
                    user_count=row.user_count,
                    extractor_count=row.extractor_count,
                    total_usage=row.total_usage,
                    rating_avg=float(row.rating_avg) if row.rating_avg else None,
                    rating_count=row.rating_count
                )
                for row in top_departments_rating
            ]
        )

    except Exception as e:
        logger.error(f"Failed to get leaderboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
