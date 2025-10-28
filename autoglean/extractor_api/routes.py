"""Routes for extractor API key management."""

import secrets
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from autoglean.db.base import get_db
from autoglean.db.models import User, Extractor, ExtractorApiKey, ApiExtractionJob
from autoglean.auth.dependencies import get_current_active_user
from autoglean.extractor_api.schemas import (
    ApiKeyResponse,
    ApiKeyToggleRequest,
    ApiKeyCreateResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/extractors", tags=["Extractor API"])


def generate_api_key() -> str:
    """Generate a secure API key with agk_ prefix."""
    random_part = secrets.token_urlsafe(48)  # ~64 characters
    return f"agk_{random_part}"


def _check_extractor_ownership(db: Session, extractor_id: int, user_id: int) -> Extractor:
    """Check if user owns the extractor."""
    extractor = db.query(Extractor).filter(
        Extractor.id == extractor_id,
        Extractor.deleted_at == None
    ).first()

    if not extractor:
        raise HTTPException(status_code=404, detail="Extractor not found")

    if extractor.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to manage this extractor's API")

    return extractor


@router.post("/{extractor_id}/api-export", response_model=ApiKeyCreateResponse)
async def create_api_key(
    extractor_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create/regenerate API key for an extractor.
    Only the extractor owner can do this.
    """
    try:
        # Check ownership
        extractor = _check_extractor_ownership(db, extractor_id, current_user.id)

        # Check if API key already exists
        existing_key = db.query(ExtractorApiKey).filter(
            ExtractorApiKey.extractor_id == extractor_id
        ).first()

        if existing_key:
            # Regenerate the key
            new_api_key = generate_api_key()
            existing_key.api_key = new_api_key
            existing_key.is_active = True
            db.commit()

            return ApiKeyCreateResponse(
                api_key=new_api_key,
                message="API key regenerated successfully"
            )
        else:
            # Create new API key
            new_api_key = generate_api_key()
            api_key_entry = ExtractorApiKey(
                extractor_id=extractor_id,
                api_key=new_api_key,
                is_active=True,
                created_by_user_id=current_user.id
            )
            db.add(api_key_entry)
            db.commit()

            return ApiKeyCreateResponse(
                api_key=new_api_key,
                message="API key created successfully"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create API key for extractor {extractor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{extractor_id}/api-export", response_model=ApiKeyResponse)
async def get_api_key(
    extractor_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get API key details for an extractor.
    Only the extractor owner can access this.
    """
    try:
        # Check ownership
        extractor = _check_extractor_ownership(db, extractor_id, current_user.id)

        # Get API key
        api_key = db.query(ExtractorApiKey).filter(
            ExtractorApiKey.extractor_id == extractor_id
        ).first()

        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found. Create one first.")

        # Get usage count
        usage_count = db.query(func.count(ApiExtractionJob.id)).filter(
            ApiExtractionJob.api_key_id == api_key.id
        ).scalar() or 0

        return ApiKeyResponse(
            id=api_key.id,
            extractor_id=api_key.extractor_id,
            api_key=api_key.api_key,
            is_active=api_key.is_active,
            created_at=api_key.created_at,
            usage_count=usage_count
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get API key for extractor {extractor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{extractor_id}/api-export/toggle", response_model=ApiKeyResponse)
async def toggle_api_key(
    extractor_id: int,
    toggle_data: ApiKeyToggleRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Toggle API key active status (enable/disable API access).
    Only the extractor owner can do this.
    """
    try:
        # Check ownership
        extractor = _check_extractor_ownership(db, extractor_id, current_user.id)

        # Get API key
        api_key = db.query(ExtractorApiKey).filter(
            ExtractorApiKey.extractor_id == extractor_id
        ).first()

        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found. Create one first.")

        # Update active status
        api_key.is_active = toggle_data.is_active
        db.commit()

        # Get usage count
        usage_count = db.query(func.count(ApiExtractionJob.id)).filter(
            ApiExtractionJob.api_key_id == api_key.id
        ).scalar() or 0

        return ApiKeyResponse(
            id=api_key.id,
            extractor_id=api_key.extractor_id,
            api_key=api_key.api_key,
            is_active=api_key.is_active,
            created_at=api_key.created_at,
            usage_count=usage_count
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to toggle API key for extractor {extractor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{extractor_id}/api-export")
async def delete_api_key(
    extractor_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete API key (revoke API access permanently).
    Only the extractor owner can do this.
    """
    try:
        # Check ownership
        extractor = _check_extractor_ownership(db, extractor_id, current_user.id)

        # Get and delete API key
        api_key = db.query(ExtractorApiKey).filter(
            ExtractorApiKey.extractor_id == extractor_id
        ).first()

        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")

        db.delete(api_key)
        db.commit()

        return {"message": "API key deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete API key for extractor {extractor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
