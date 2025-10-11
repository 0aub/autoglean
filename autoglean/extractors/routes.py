"""Extractor management routes."""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from autoglean.db.base import get_db
from autoglean.db.models import (
    User, Extractor, ExtractorShare, UserFavorite,
    ExtractorRating, VisibilityEnum, Department, GeneralManagement
)
from autoglean.auth.dependencies import get_current_active_user
from autoglean.extractors.schemas import (
    ExtractorCreateRequest, ExtractorUpdateRequest, ExtractorResponse,
    ExtractorShareRequest, ExtractorShareResponse,
    ExtractorRatingRequest, ExtractorRatingResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/extractors", tags=["Extractors"])


def _can_access_extractor(user: User, extractor: Extractor, db: Session, require_edit: bool = False) -> bool:
    """Check if user can access an extractor."""
    # Owner can always access
    if extractor.owner_id == user.id:
        return True

    # Public extractors are readable by everyone
    if extractor.visibility == VisibilityEnum.PUBLIC and not require_edit:
        return True

    # Check if shared with user
    share = db.query(ExtractorShare).filter(
        ExtractorShare.extractor_id == extractor.id,
        ExtractorShare.user_id == user.id
    ).first()

    if share:
        return not require_edit or share.can_edit

    return False


@router.post("", response_model=ExtractorResponse, status_code=status.HTTP_201_CREATED)
async def create_extractor(
    request: ExtractorCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new extractor."""
    try:
        import uuid
        # Generate unique extractor_id
        extractor_id = str(uuid.uuid4())[:8]  # Short UUID

        extractor = Extractor(
            extractor_id=extractor_id,
            name_en=request.name_en,
            name_ar=request.name_ar,
            icon=request.icon,
            description_en=request.description_en,
            description_ar=request.description_ar,
            prompt=request.prompt,
            llm=request.llm,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            output_format=request.output_format,
            visibility=request.visibility,
            owner_id=current_user.id
        )

        db.add(extractor)
        db.commit()
        db.refresh(extractor)

        # Get user's department and GM info
        department = db.query(Department).filter(Department.id == current_user.department_id).first()
        gm = None
        if department:
            gm = db.query(GeneralManagement).filter(GeneralManagement.id == department.gm_id).first()

        # Build response
        response_data = ExtractorResponse(
            id=extractor.id,
            extractor_id=extractor.extractor_id,
            name_en=extractor.name_en,
            name_ar=extractor.name_ar,
            icon=extractor.icon,
            description_en=extractor.description_en,
            description_ar=extractor.description_ar,
            prompt=extractor.prompt,
            llm=extractor.llm,
            temperature=extractor.temperature,
            max_tokens=extractor.max_tokens,
            output_format=extractor.output_format,
            visibility=extractor.visibility,
            owner_id=extractor.owner_id,
            owner_name_en=current_user.full_name_en,
            owner_name_ar=current_user.full_name_ar,
            owner_department_name_en=department.name_en if department else None,
            owner_department_name_ar=department.name_ar if department else None,
            owner_gm_name_en=gm.name_en if gm else None,
            owner_gm_name_ar=gm.name_ar if gm else None,
            usage_count=0,
            rating_avg=None,
            rating_count=0,
            is_favorited=False,
            created_at=extractor.created_at,
            updated_at=extractor.updated_at
        )

        logger.info(f"User {current_user.email} created extractor '{extractor.name_en}'")
        return response_data

    except Exception as e:
        logger.error(f"Failed to create extractor: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[ExtractorResponse])
async def list_extractors(
    visibility: Optional[str] = Query(None, description="Filter by visibility: all, public, private, shared"),
    favorites_only: bool = Query(False, description="Show only favorites"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List extractors accessible to the current user."""
    try:
        # Base query
        query = db.query(
            Extractor,
            User.full_name_en.label('owner_name_en'),
            User.full_name_ar.label('owner_name_ar'),
            Department.name_en.label('owner_department_name_en'),
            Department.name_ar.label('owner_department_name_ar'),
            GeneralManagement.name_en.label('owner_gm_name_en'),
            GeneralManagement.name_ar.label('owner_gm_name_ar'),
            func.coalesce(func.count(func.distinct(ExtractorRating.id)), 0).label('rating_count'),
            func.avg(ExtractorRating.rating).label('rating_avg')
        ).join(
            User, Extractor.owner_id == User.id
        ).join(
            Department, User.department_id == Department.id
        ).join(
            GeneralManagement, Department.gm_id == GeneralManagement.id
        ).outerjoin(
            ExtractorRating, ExtractorRating.extractor_id == Extractor.id
        ).filter(
            Extractor.deleted_at == None
        )

        # Filter by visibility
        if visibility == "public":
            query = query.filter(Extractor.visibility == VisibilityEnum.PUBLIC)
        elif visibility == "private":
            query = query.filter(
                Extractor.owner_id == current_user.id,
                Extractor.visibility == VisibilityEnum.PRIVATE
            )
        elif visibility == "shared":
            query = query.join(
                ExtractorShare,
                and_(
                    ExtractorShare.extractor_id == Extractor.id,
                    ExtractorShare.user_id == current_user.id
                )
            )
        else:  # "all" or None
            # User can see: their own extractors + public + shared with them
            query = query.filter(
                or_(
                    Extractor.owner_id == current_user.id,
                    Extractor.visibility == VisibilityEnum.PUBLIC,
                    Extractor.id.in_(
                        db.query(ExtractorShare.extractor_id).filter(
                            ExtractorShare.user_id == current_user.id
                        )
                    )
                )
            )

        query = query.group_by(
            Extractor.id,
            User.full_name_en,
            User.full_name_ar,
            Department.name_en,
            Department.name_ar,
            GeneralManagement.name_en,
            GeneralManagement.name_ar
        )

        results = query.all()

        # Get favorites
        favorite_ids = set()
        if favorites_only or True:  # Always fetch to set is_favorited
            favorites = db.query(UserFavorite.extractor_id).filter(
                UserFavorite.user_id == current_user.id
            ).all()
            favorite_ids = {fav[0] for fav in favorites}

        # Filter by favorites if requested
        if favorites_only:
            results = [r for r in results if r.Extractor.id in favorite_ids]

        # Get usage counts
        usage_counts = dict(
            db.query(
                Extractor.id,
                func.count().label('count')
            ).select_from(Extractor).outerjoin(
                ExtractorRating
            ).group_by(Extractor.id).all()
        )

        # Build response
        extractors = []
        for row in results:
            extractor = row.Extractor
            # Hide prompt for non-owners
            prompt_value = extractor.prompt if extractor.owner_id == current_user.id else None

            extractors.append(ExtractorResponse(
                id=extractor.id,
                extractor_id=extractor.extractor_id,
                name_en=extractor.name_en,
                name_ar=extractor.name_ar,
                icon=extractor.icon,
                description_en=extractor.description_en,
                description_ar=extractor.description_ar,
                prompt=prompt_value,
                llm=extractor.llm,
                temperature=extractor.temperature,
                max_tokens=extractor.max_tokens,
                output_format=extractor.output_format,
                visibility=extractor.visibility,
                owner_id=extractor.owner_id,
                owner_name_en=row.owner_name_en,
                owner_name_ar=row.owner_name_ar,
                owner_department_name_en=row.owner_department_name_en,
                owner_department_name_ar=row.owner_department_name_ar,
                owner_gm_name_en=row.owner_gm_name_en,
                owner_gm_name_ar=row.owner_gm_name_ar,
                usage_count=usage_counts.get(extractor.id, 0),
                rating_avg=float(row.rating_avg) if row.rating_avg else None,
                rating_count=row.rating_count,
                is_favorited=extractor.id in favorite_ids,
                created_at=extractor.created_at,
                updated_at=extractor.updated_at
            ))

        return extractors

    except Exception as e:
        logger.error(f"Failed to list extractors: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{extractor_id}", response_model=ExtractorResponse)
async def get_extractor(
    extractor_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific extractor."""
    try:
        result = db.query(
            Extractor,
            User.full_name_en.label('owner_name_en'),
            User.full_name_ar.label('owner_name_ar'),
            func.coalesce(func.count(func.distinct(ExtractorRating.id)), 0).label('rating_count'),
            func.avg(ExtractorRating.rating).label('rating_avg')
        ).join(
            User, Extractor.owner_id == User.id
        ).outerjoin(
            ExtractorRating, ExtractorRating.extractor_id == Extractor.id
        ).filter(
            Extractor.id == extractor_id,
            Extractor.deleted_at == None
        ).group_by(
            Extractor.id, User.full_name_en, User.full_name_ar
        ).first()

        if not result:
            raise HTTPException(status_code=404, detail="Extractor not found")

        extractor = result.Extractor

        # Check access
        if not _can_access_extractor(current_user, extractor, db):
            raise HTTPException(status_code=403, detail="Access denied")

        # Check if favorited
        is_favorited = db.query(UserFavorite).filter(
            UserFavorite.user_id == current_user.id,
            UserFavorite.extractor_id == extractor_id
        ).first() is not None

        # Hide prompt for non-owners
        prompt_value = extractor.prompt if extractor.owner_id == current_user.id else None

        return ExtractorResponse(
            id=extractor.id,
            extractor_id=extractor.extractor_id,
            name_en=extractor.name_en,
            name_ar=extractor.name_ar,
            icon=extractor.icon,
            description_en=extractor.description_en,
            description_ar=extractor.description_ar,
            prompt=prompt_value,
            llm=extractor.llm,
            temperature=extractor.temperature,
            max_tokens=extractor.max_tokens,
            output_format=extractor.output_format,
            visibility=extractor.visibility,
            owner_id=extractor.owner_id,
            owner_name_en=result.owner_name_en,
            owner_name_ar=result.owner_name_ar,
            usage_count=0,  # Can add usage count logic later
            rating_avg=float(result.rating_avg) if result.rating_avg else None,
            rating_count=result.rating_count,
            is_favorited=is_favorited,
            created_at=extractor.created_at,
            updated_at=extractor.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get extractor: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{extractor_id}", response_model=ExtractorResponse)
async def update_extractor(
    extractor_id: int,
    request: ExtractorUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update an extractor."""
    try:
        extractor = db.query(Extractor).filter(
            Extractor.id == extractor_id,
            Extractor.deleted_at == None
        ).first()

        if not extractor:
            raise HTTPException(status_code=404, detail="Extractor not found")

        # Check edit access
        if not _can_access_extractor(current_user, extractor, db, require_edit=True):
            raise HTTPException(status_code=403, detail="Edit access denied")

        # For public extractors, require change notes only if changing content (not just visibility)
        update_data = request.model_dump(exclude_unset=True)
        change_notes = update_data.get('change_notes', None)

        # Check if we're updating more than just visibility
        content_fields = ['name_en', 'name_ar', 'description_en', 'description_ar', 'prompt', 'icon']
        has_content_changes = any(field in update_data for field in content_fields)

        if extractor.visibility == VisibilityEnum.PUBLIC and has_content_changes and not change_notes:
            raise HTTPException(
                status_code=400,
                detail="Change notes are required when updating public extractor content"
            )

        # Track changes for versioning
        import json
        from autoglean.db.models import ExtractorHistory

        change_notes = update_data.pop('change_notes', None)

        # Create history record for public extractors or when significant changes occur
        if extractor.visibility == VisibilityEnum.PUBLIC:
            changes_dict = {}
            for field, new_value in update_data.items():
                old_value = getattr(extractor, field)
                if old_value != new_value:
                    changes_dict[field] = {
                        "old": str(old_value),
                        "new": str(new_value)
                    }

            if changes_dict:
                history = ExtractorHistory(
                    extractor_id=extractor.id,
                    changed_by_user_id=current_user.id,
                    change_type="updated",
                    changes=json.dumps({
                        "fields": changes_dict,
                        "notes": change_notes
                    })
                )
                db.add(history)

        # Update fields
        for field, value in update_data.items():
            setattr(extractor, field, value)

        db.commit()
        db.refresh(extractor)

        # Get owner name, department and GM
        owner = db.query(User).filter(User.id == extractor.owner_id).first()
        department = db.query(Department).filter(Department.id == owner.department_id).first() if owner else None
        gm = db.query(GeneralManagement).filter(GeneralManagement.id == department.gm_id).first() if department else None

        # Check if favorited
        is_favorited = db.query(UserFavorite).filter(
            UserFavorite.user_id == current_user.id,
            UserFavorite.extractor_id == extractor_id
        ).first() is not None

        # Hide prompt for non-owners
        prompt_value = extractor.prompt if extractor.owner_id == current_user.id else None

        logger.info(f"User {current_user.email} updated extractor {extractor_id}")

        return ExtractorResponse(
            id=extractor.id,
            extractor_id=extractor.extractor_id,
            name_en=extractor.name_en,
            name_ar=extractor.name_ar,
            icon=extractor.icon,
            description_en=extractor.description_en,
            description_ar=extractor.description_ar,
            prompt=prompt_value,
            llm=extractor.llm,
            temperature=extractor.temperature,
            max_tokens=extractor.max_tokens,
            output_format=extractor.output_format,
            visibility=extractor.visibility,
            owner_id=extractor.owner_id,
            owner_name_en=owner.full_name_en if owner else "",
            owner_name_ar=owner.full_name_ar if owner else "",
            owner_department_name_en=department.name_en if department else None,
            owner_department_name_ar=department.name_ar if department else None,
            owner_gm_name_en=gm.name_en if gm else None,
            owner_gm_name_ar=gm.name_ar if gm else None,
            usage_count=0,
            rating_avg=None,
            rating_count=0,
            is_favorited=is_favorited,
            created_at=extractor.created_at,
            updated_at=extractor.updated_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update extractor: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{extractor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_extractor(
    extractor_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Soft delete an extractor (owner only)."""
    try:
        extractor = db.query(Extractor).filter(
            Extractor.id == extractor_id,
            Extractor.deleted_at == None
        ).first()

        if not extractor:
            raise HTTPException(status_code=404, detail="Extractor not found")

        # Only owner can delete
        if extractor.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only owner can delete")

        # Soft delete
        from datetime import datetime
        extractor.deleted_at = datetime.utcnow()

        db.commit()
        logger.info(f"User {current_user.email} deleted extractor {extractor_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete extractor: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{extractor_id}/shares", response_model=List[ExtractorShareResponse])
async def get_extractor_shares(
    extractor_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all users an extractor is shared with (owner only)."""
    try:
        extractor = db.query(Extractor).filter(
            Extractor.id == extractor_id,
            Extractor.deleted_at == None
        ).first()

        if not extractor:
            raise HTTPException(status_code=404, detail="Extractor not found")

        # Only owner can view shares
        if extractor.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only owner can view shares")

        # Get all shares with user details
        shares = db.query(ExtractorShare, User).join(
            User, ExtractorShare.user_id == User.id
        ).filter(
            ExtractorShare.extractor_id == extractor_id
        ).all()

        result = []
        for share, user in shares:
            result.append(ExtractorShareResponse(
                id=share.id,
                extractor_id=share.extractor_id,
                shared_with_user_id=share.user_id,
                shared_with_user_name_en=user.full_name_en,
                shared_with_user_name_ar=user.full_name_ar,
                can_edit=False,  # Not implemented in current schema
                shared_at=share.shared_at
            ))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get extractor shares: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{extractor_id}/share", response_model=ExtractorShareResponse, status_code=status.HTTP_201_CREATED)
async def share_extractor(
    extractor_id: int,
    request: ExtractorShareRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Share an extractor with another user (owner only)."""
    try:
        extractor = db.query(Extractor).filter(
            Extractor.id == extractor_id,
            Extractor.deleted_at == None
        ).first()

        if not extractor:
            raise HTTPException(status_code=404, detail="Extractor not found")

        # Only owner can share
        if extractor.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only owner can share")

        # Check if user exists
        user_to_share = db.query(User).filter(User.id == request.user_id).first()
        if not user_to_share:
            raise HTTPException(status_code=404, detail="User not found")

        # Check if already shared
        existing_share = db.query(ExtractorShare).filter(
            ExtractorShare.extractor_id == extractor_id,
            ExtractorShare.user_id == request.user_id
        ).first()

        if existing_share:
            # Note: can_edit field doesn't exist in current schema
            logger.info(f"Extractor {extractor_id} already shared with user {request.user_id}")
            share = existing_share
        else:
            # Create new share
            share = ExtractorShare(
                extractor_id=extractor_id,
                user_id=request.user_id
            )
            db.add(share)
            db.commit()
            db.refresh(share)

        logger.info(f"User {current_user.email} shared extractor {extractor_id} with user {request.user_id}")

        return ExtractorShareResponse(
            id=share.id,
            extractor_id=share.extractor_id,
            shared_with_user_id=share.user_id,
            shared_with_user_name_en=user_to_share.full_name_en,
            shared_with_user_name_ar=user_to_share.full_name_ar,
            can_edit=False,  # Not implemented in current schema
            shared_at=share.shared_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to share extractor: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{extractor_id}/share/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unshare_extractor(
    extractor_id: int,
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Remove extractor share (owner only)."""
    try:
        extractor = db.query(Extractor).filter(
            Extractor.id == extractor_id,
            Extractor.deleted_at == None
        ).first()

        if not extractor:
            raise HTTPException(status_code=404, detail="Extractor not found")

        # Only owner can unshare
        if extractor.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only owner can unshare")

        share = db.query(ExtractorShare).filter(
            ExtractorShare.extractor_id == extractor_id,
            ExtractorShare.user_id == user_id
        ).first()

        if not share:
            raise HTTPException(status_code=404, detail="Share not found")

        db.delete(share)
        db.commit()

        logger.info(f"User {current_user.email} unshared extractor {extractor_id} from user {user_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unshare extractor: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{extractor_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def favorite_extractor(
    extractor_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add extractor to favorites."""
    try:
        extractor = db.query(Extractor).filter(
            Extractor.id == extractor_id,
            Extractor.deleted_at == None
        ).first()

        if not extractor:
            raise HTTPException(status_code=404, detail="Extractor not found")

        # Check access
        if not _can_access_extractor(current_user, extractor, db):
            raise HTTPException(status_code=403, detail="Access denied")

        # Check if already favorited
        existing = db.query(UserFavorite).filter(
            UserFavorite.user_id == current_user.id,
            UserFavorite.extractor_id == extractor_id
        ).first()

        if not existing:
            favorite = UserFavorite(
                user_id=current_user.id,
                extractor_id=extractor_id
            )
            db.add(favorite)
            db.commit()
            logger.info(f"User {current_user.email} favorited extractor {extractor_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to favorite extractor: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{extractor_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def unfavorite_extractor(
    extractor_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Remove extractor from favorites."""
    try:
        favorite = db.query(UserFavorite).filter(
            UserFavorite.user_id == current_user.id,
            UserFavorite.extractor_id == extractor_id
        ).first()

        if favorite:
            db.delete(favorite)
            db.commit()
            logger.info(f"User {current_user.email} unfavorited extractor {extractor_id}")

    except Exception as e:
        logger.error(f"Failed to unfavorite extractor: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{extractor_id}/rate", response_model=ExtractorRatingResponse, status_code=status.HTTP_201_CREATED)
async def rate_extractor(
    extractor_id: int,
    request: ExtractorRatingRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Rate an extractor (1-5 stars)."""
    try:
        extractor = db.query(Extractor).filter(
            Extractor.id == extractor_id,
            Extractor.deleted_at == None
        ).first()

        if not extractor:
            raise HTTPException(status_code=404, detail="Extractor not found")

        # Check access
        if not _can_access_extractor(current_user, extractor, db):
            raise HTTPException(status_code=403, detail="Access denied")

        # Validate rating
        if request.rating < 1 or request.rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

        # Check if already rated
        existing_rating = db.query(ExtractorRating).filter(
            ExtractorRating.user_id == current_user.id,
            ExtractorRating.extractor_id == extractor_id
        ).first()

        if existing_rating:
            # Update existing rating
            existing_rating.rating = request.rating
            existing_rating.review = request.review
            db.commit()
            db.refresh(existing_rating)
            rating = existing_rating
        else:
            # Create new rating
            rating = ExtractorRating(
                user_id=current_user.id,
                extractor_id=extractor_id,
                rating=request.rating,
                review=request.review
            )
            db.add(rating)
            db.commit()
            db.refresh(rating)

        logger.info(f"User {current_user.email} rated extractor {extractor_id}: {request.rating}/5")

        return ExtractorRatingResponse(
            id=rating.id,
            extractor_id=rating.extractor_id,
            user_id=rating.user_id,
            user_name_en=current_user.full_name_en,
            user_name_ar=current_user.full_name_ar,
            rating=rating.rating,
            review=rating.review,
            created_at=rating.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to rate extractor: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{extractor_id}/history")
async def get_extractor_history(
    extractor_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get version history for an extractor."""
    try:
        from autoglean.db.models import ExtractorHistory
        import json

        # Check if extractor exists and user has access
        extractor = db.query(Extractor).filter(
            Extractor.id == extractor_id,
            Extractor.deleted_at == None
        ).first()

        if not extractor:
            raise HTTPException(status_code=404, detail="Extractor not found")

        if not _can_access_extractor(current_user, extractor, db):
            raise HTTPException(status_code=403, detail="Access denied")

        # Get history with user names
        history_records = db.query(
            ExtractorHistory,
            User.full_name_en.label('user_name_en'),
            User.full_name_ar.label('user_name_ar')
        ).join(
            User, ExtractorHistory.changed_by_user_id == User.id
        ).filter(
            ExtractorHistory.extractor_id == extractor_id
        ).order_by(
            ExtractorHistory.changed_at.desc()
        ).all()

        result = []
        for record, user_name_en, user_name_ar in history_records:
            changes_data = json.loads(record.changes) if record.changes else {}
            result.append({
                "id": record.id,
                "change_type": record.change_type,
                "changed_by_user_name_en": user_name_en,
                "changed_by_user_name_ar": user_name_ar,
                "changed_at": record.changed_at.isoformat(),
                "changes": changes_data
            })

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get extractor history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{extractor_id}/ratings", response_model=List[ExtractorRatingResponse])
async def get_extractor_ratings(
    extractor_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all ratings for an extractor."""
    try:
        extractor = db.query(Extractor).filter(
            Extractor.id == extractor_id,
            Extractor.deleted_at == None
        ).first()

        if not extractor:
            raise HTTPException(status_code=404, detail="Extractor not found")

        # Check access
        if not _can_access_extractor(current_user, extractor, db):
            raise HTTPException(status_code=403, detail="Access denied")

        ratings = db.query(
            ExtractorRating, User.full_name_en, User.full_name_ar
        ).join(
            User, ExtractorRating.user_id == User.id
        ).filter(
            ExtractorRating.extractor_id == extractor_id
        ).order_by(
            ExtractorRating.created_at.desc()
        ).all()

        return [
            ExtractorRatingResponse(
                id=rating.ExtractorRating.id,
                extractor_id=rating.ExtractorRating.extractor_id,
                user_id=rating.ExtractorRating.user_id,
                user_name_en=rating.full_name_en,
                user_name_ar=rating.full_name_ar,
                rating=rating.ExtractorRating.rating,
                review=rating.ExtractorRating.review,
                created_at=rating.ExtractorRating.created_at
            )
            for rating in ratings
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get ratings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


