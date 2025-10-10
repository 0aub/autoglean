"""Celery tasks for async document extraction."""

import logging
from pathlib import Path

from autoglean.api.celery_app import celery_app
from autoglean.extractors.document import get_document_extractor
from autoglean.core.storage import get_storage_manager

logger = logging.getLogger(__name__)


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
    try:
        logger.info(f"Starting extraction job: {job_id}")
        logger.info(f"Extractor: {extractor_id}, File: {file_path}")

        # Update task state
        self.update_state(
            state='PROCESSING',
            meta={'status': 'Processing document...'}
        )

        # Get extractor and process document
        extractor = get_document_extractor()
        result = extractor.extract(
            extractor_id=extractor_id,
            file_path=file_path,
            job_id=job_id
        )

        logger.info(f"Extraction completed for job: {job_id}")

        return {
            'status': 'completed',
            'job_id': job_id,
            'result': result
        }

    except Exception as e:
        logger.error(f"Extraction failed for job {job_id}: {str(e)}", exc_info=True)
        # Return error as a dict instead of raising to avoid Celery serialization issues
        return {
            'status': 'failed',
            'job_id': job_id,
            'error': str(e),
            'error_type': type(e).__name__
        }


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
