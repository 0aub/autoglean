"""Service for managing extraction jobs."""

import logging
from datetime import datetime
from sqlalchemy.orm import Session

from autoglean.db.models import ExtractionJob, ExtractorUsageStats

logger = logging.getLogger(__name__)


def create_extraction_job(
    db: Session,
    job_id: str,
    user_id: int,
    extractor_id: int,
    file_name: str,
    file_path: str
) -> ExtractionJob:
    """Create a new extraction job record."""
    job = ExtractionJob(
        job_id=job_id,
        user_id=user_id,
        extractor_id=extractor_id,
        file_name=file_name,
        file_path=file_path,
        status="pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info(f"Created extraction job {job_id} for user {user_id}")
    return job


def update_extraction_job_status(
    db: Session,
    job_id: str,
    status: str,
    result_text: str = None,
    error_message: str = None
):
    """Update extraction job status."""
    job = db.query(ExtractionJob).filter(ExtractionJob.job_id == job_id).first()

    if not job:
        logger.warning(f"Job {job_id} not found for status update")
        return

    job.status = status
    if result_text:
        job.result_text = result_text
    if error_message:
        job.error_message = error_message

    if status in ["completed", "failed"]:
        job.completed_at = datetime.utcnow()

        # Update usage stats if completed successfully
        if status == "completed":
            _update_usage_stats(db, job.extractor_id, job.user_id)

    db.commit()
    logger.info(f"Updated job {job_id} status to {status}")


def _update_usage_stats(db: Session, extractor_id: int, user_id: int):
    """Update extractor usage statistics."""
    stats = db.query(ExtractorUsageStats).filter(
        ExtractorUsageStats.extractor_id == extractor_id,
        ExtractorUsageStats.user_id == user_id
    ).first()

    if stats:
        stats.usage_count += 1
        stats.last_used_at = datetime.utcnow()
    else:
        stats = ExtractorUsageStats(
            extractor_id=extractor_id,
            user_id=user_id,
            usage_count=1,
            last_used_at=datetime.utcnow()
        )
        db.add(stats)

    db.commit()
