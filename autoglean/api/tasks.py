"""Celery tasks for async document extraction."""

import logging
from pathlib import Path
from datetime import datetime

from autoglean.api.celery_app import celery_app
from autoglean.extractors.document import get_document_extractor
from autoglean.core.storage import get_storage_manager
from autoglean.db.base import get_db
from autoglean.db.models import ExtractionJob, ExtractorUsageStats, ApiExtractionJob

logger = logging.getLogger(__name__)


def _update_usage_stats(db, extractor_id: int, success: bool = True):
    """Update extractor usage statistics."""
    stats = db.query(ExtractorUsageStats).filter(
        ExtractorUsageStats.extractor_id == extractor_id
    ).first()

    if stats:
        stats.total_uses += 1
        if success:
            stats.successful_uses += 1
        else:
            stats.failed_uses += 1
        stats.last_used_at = datetime.utcnow()
        stats.updated_at = datetime.utcnow()
    else:
        stats = ExtractorUsageStats(
            extractor_id=extractor_id,
            total_uses=1,
            successful_uses=1 if success else 0,
            failed_uses=0 if success else 1,
            last_used_at=datetime.utcnow()
        )
        db.add(stats)

    db.commit()


@celery_app.task(bind=True, name='autoglean.extract_document')
def extract_document_task(
    self,
    job_id: str,
    extractor_id: str,
    file_path: str
) -> dict:
    """
    Async task to extract information from document.

    Args:
        job_id: Unique job identifier
        extractor_id: ID of extractor to use
        file_path: Path to document file

    Returns:
        Extraction result dictionary
    """
    db = next(get_db())

    try:
        logger.info(f"Starting extraction job: {job_id}")
        logger.info(f"Extractor: {extractor_id}, File: {file_path}")

        # Query for both job types (regular and API)
        job = db.query(ExtractionJob).filter(ExtractionJob.job_id == job_id).first()
        api_job = db.query(ApiExtractionJob).filter(ApiExtractionJob.job_id == job_id).first()

        # Determine which job type this is and get the database extractor ID
        db_extractor_id = None
        if job:
            db_extractor_id = job.extractor_id
            job.status = "processing"
            job.started_at = datetime.utcnow()
            db.commit()
        elif api_job:
            db_extractor_id = api_job.extractor_id
            api_job.status = "processing"
            api_job.started_at = datetime.utcnow()
            db.commit()

        # Update task state
        self.update_state(
            state='PROCESSING',
            meta={'status': 'Processing document...'}
        )

        # Check for cached result from a previous successful extraction
        # Look for a previous job with same file_name and extractor_id that succeeded
        from pathlib import Path
        file_name = Path(file_path).name

        cached_job = None
        if db_extractor_id:
            cached_job = db.query(ExtractionJob).filter(
                ExtractionJob.file_name == file_name,
                ExtractionJob.extractor_id == db_extractor_id,
                ExtractionJob.status.in_(["success", "completed"]),  # Support both statuses
                ExtractionJob.result_content != None,
                ExtractionJob.id != (job.id if job else -1)  # Don't match itself
            ).order_by(
                ExtractionJob.completed_at.desc()
            ).first()

        is_cached = False
        if cached_job:
            # Reuse the cached result
            logger.info(f"Using cached result from job {cached_job.job_id}")
            result = {
                'job_id': job_id,
                'extractor_id': extractor_id,
                'file_name': file_name,
                'result_content': cached_job.result_content,
                'result_path': cached_job.result_path,
                'usage': {
                    'prompt_tokens': 0,
                    'completion_tokens': 0,
                    'total_tokens': 0,
                    'cached_tokens': 0
                },
                'model': cached_job.model_used or 'cached'
            }
            is_cached = True
        else:
            # Get extractor and process document
            extractor = get_document_extractor()
            result = extractor.extract(
                extractor_id=extractor_id,
                file_path=file_path,
                job_id=job_id
            )

        logger.info(f"Extraction completed for job: {job_id} (cached: {is_cached})")

        # Update database: mark as completed
        if job:
            job.status = "completed"  # Use "completed" to match existing jobs
            job.result_content = result.get('result_content', '')
            job.result_path = result.get('result_path', '')
            job.completed_at = datetime.utcnow()
            job.is_cached_result = is_cached  # Mark if result was from cache

            # Update token usage if available
            if 'usage' in result:
                usage = result['usage']
                job.prompt_tokens = usage.get('prompt_tokens')
                job.completion_tokens = usage.get('completion_tokens')
                job.total_tokens = usage.get('total_tokens')
                job.cached_tokens = usage.get('cached_tokens')  # Save cached tokens

            if 'model' in result:
                job.model_used = result['model']

            db.commit()

            # Update usage stats (only for non-cached results)
            if not is_cached and db_extractor_id:
                _update_usage_stats(db, db_extractor_id)

        # Also update API extraction job if this is an API request
        if api_job:
            api_job.status = "completed"
            api_job.result_content = result.get('result_content', '')
            api_job.result_path = result.get('result_path', '')
            api_job.completed_at = datetime.utcnow()
            api_job.is_cached_result = is_cached

            if 'usage' in result:
                usage = result['usage']
                api_job.prompt_tokens = usage.get('prompt_tokens')
                api_job.completion_tokens = usage.get('completion_tokens')
                api_job.total_tokens = usage.get('total_tokens')
                api_job.cached_tokens = usage.get('cached_tokens')

            if 'model' in result:
                api_job.model_used = result['model']

            db.commit()
            logger.info(f"API extraction job {job_id} marked as completed")

        return {
            'status': 'completed',
            'job_id': job_id,
            'result': result
        }

    except Exception as e:
        logger.error(f"Extraction failed for job {job_id}: {str(e)}", exc_info=True)

        # Update database: mark as failed
        if job:
            job.status = "failed"  # Use "failed" to match existing jobs
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db.commit()

        # Update usage stats (count failures too)
        if db_extractor_id:
            _update_usage_stats(db, db_extractor_id, success=False)

        # Also update API extraction job if this is an API request
        if api_job:
            api_job.status = "failed"
            api_job.error_message = str(e)
            api_job.completed_at = datetime.utcnow()
            db.commit()
            logger.info(f"API extraction job {job_id} marked as failed")

        # Return error as a dict instead of raising to avoid Celery serialization issues
        return {
            'status': 'failed',
            'job_id': job_id,
            'error': str(e),
            'error_type': type(e).__name__
        }
    finally:
        db.close()


@celery_app.task(name='docinfo.extract_batch')
def extract_batch_task(
    job_id: str,
    extractor_id: str,
    file_paths: list[str]
) -> dict:
    """
    Extract from multiple documents in batch.

    Args:
        job_id: Unique job identifier
        extractor_id: ID of extractor to use
        file_paths: List of file paths

    Returns:
        Batch extraction results
    """
    logger.info(f"Starting batch extraction: {job_id}, {len(file_paths)} files")

    extractor = get_document_extractor()
    results = []
    errors = []

    for file_path in file_paths:
        try:
            result = extractor.extract(
                extractor_id=extractor_id,
                file_path=file_path,
                job_id=job_id
            )
            results.append(result)
        except Exception as e:
            logger.error(f"Failed to extract from {file_path}: {str(e)}")
            errors.append({
                'file': file_path,
                'error': str(e)
            })

    return {
        'status': 'completed',
        'job_id': job_id,
        'total_files': len(file_paths),
        'successful': len(results),
        'failed': len(errors),
        'results': results,
        'errors': errors
    }
