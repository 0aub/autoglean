"""Public API routes for external extraction requests."""

import logging
import uuid
from pathlib import Path
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from celery.result import AsyncResult

from autoglean.db.base import get_db
from autoglean.db.models import User, Extractor, ExtractorApiKey, ApiExtractionJob
from autoglean.core.storage import get_storage_manager
from autoglean.api.celery_app import celery_app
from autoglean.public_api.schemas import (
    PublicExtractionResponse,
    PublicTaskStatusResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Public API"])

storage_manager = get_storage_manager()


@router.post("/extract", response_model=PublicExtractionResponse)
async def public_extract(
    api_key: str = Form(..., description="API key for the extractor"),
    user_id: int = Form(..., description="ID of the user making the request"),
    label: str = Form(..., description="Label/title for this extraction request"),
    file: UploadFile = File(..., description="File to extract information from"),
    db: Session = Depends(get_db)
):
    """
    Public API endpoint for extraction.

    This endpoint allows external systems to trigger extractions using API keys.
    No authentication token required - uses API key instead.
    """
    try:
        # 1. Validate API key
        api_key_entry = db.query(ExtractorApiKey).filter(
            ExtractorApiKey.api_key == api_key
        ).first()

        if not api_key_entry:
            raise HTTPException(status_code=401, detail="Invalid API key")

        if not api_key_entry.is_active:
            raise HTTPException(status_code=403, detail="API key is inactive")

        # 2. Validate user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # 3. Get extractor
        extractor = db.query(Extractor).filter(
            Extractor.id == api_key_entry.extractor_id,
            Extractor.deleted_at == None
        ).first()

        if not extractor:
            raise HTTPException(status_code=404, detail="Extractor not found")

        # 4. Save uploaded file
        job_id = str(uuid.uuid4())
        file_path = storage_manager.save_document(file.file, file.filename, job_id)

        logger.info(f"API extraction - File saved: {file_path}")

        # 5. Create API extraction job record
        api_job = ApiExtractionJob(
            job_id=job_id,
            api_key_id=api_key_entry.id,
            extractor_id=extractor.id,
            requester_user_id=user_id,
            request_label=label,
            file_name=file.filename,
            status="pending"
        )
        db.add(api_job)
        db.commit()
        db.refresh(api_job)

        # 6. Trigger Celery task for extraction
        task = celery_app.send_task(
            'autoglean.extract_document',
            args=[job_id, extractor.extractor_id, str(file_path)],
            task_id=f"api_{job_id}"
        )

        logger.info(f"API extraction task created: {task.id} for job {job_id}")

        return PublicExtractionResponse(
            task_id=task.id,
            job_id=job_id,
            message="Extraction started successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Public API extraction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@router.get("/extract/{task_id}", response_model=PublicTaskStatusResponse)
async def get_extraction_status(
    task_id: str,
    db: Session = Depends(get_db)
):
    """
    Get the status of an extraction task.

    Returns the current status and result (if completed).
    """
    try:
        # Get task result from Celery
        task_result = AsyncResult(task_id, app=celery_app)

        status_map = {
            'PENDING': 'pending',
            'STARTED': 'processing',
            'PROCESSING': 'processing',
            'SUCCESS': 'completed',
            'FAILURE': 'failed',
            'RETRY': 'processing',
            'REVOKED': 'failed'
        }

        status = status_map.get(task_result.state, 'pending')

        response = PublicTaskStatusResponse(
            task_id=task_id,
            status=status
        )

        if task_result.state == 'SUCCESS':
            result_data = task_result.result
            if isinstance(result_data, dict):
                # Find the corresponding API job
                job_id = result_data.get('job_id')
                if job_id:
                    api_job = db.query(ApiExtractionJob).filter(
                        ApiExtractionJob.job_id == job_id
                    ).first()

                    if api_job and api_job.status == 'completed':
                        response.result = {
                            'job_id': api_job.job_id,
                            'file_name': api_job.file_name,
                            'label': api_job.request_label,
                            'result_content': api_job.result_content,
                            'model_used': api_job.model_used,
                            'total_tokens': api_job.total_tokens,
                            'is_cached': api_job.is_cached_result
                        }

        elif task_result.state == 'FAILURE':
            response.error = str(task_result.info)

        return response

    except Exception as e:
        logger.error(f"Failed to get task status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
