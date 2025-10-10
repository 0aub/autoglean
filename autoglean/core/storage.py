"""File storage utilities for documents and results."""

import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class StorageManager:
    """Manage file storage for documents and extraction results."""

    def __init__(self, base_dir: str = "storage"):
        self.base_dir = Path(base_dir)
        self.documents_dir = self.base_dir / "documents"
        self.results_dir = self.base_dir / "results"
        self.temp_dir = self.base_dir / "temp"

        # Create directories
        self.documents_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def save_uploaded_file(
        self,
        file_content: bytes,
        filename: str,
        job_id: str
    ) -> Path:
        """
        Save uploaded file to storage.

        Args:
            file_content: File content as bytes
            filename: Original filename
            job_id: Unique job identifier

        Returns:
            Path to saved file
        """
        # Create job-specific directory
        job_dir = self.documents_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        # Save file
        file_path = job_dir / filename
        with open(file_path, 'wb') as f:
            f.write(file_content)

        logger.info(f"Saved file: {file_path}")
        return file_path

    def save_result(
        self,
        content: str,
        job_id: str,
        extractor_id: str,
        filename: Optional[str] = None
    ) -> Path:
        """
        Save extraction result as markdown file.

        Args:
            content: Markdown content
            job_id: Unique job identifier
            extractor_id: Extractor ID
            filename: Optional custom filename

        Returns:
            Path to saved result file
        """
        # Create results directory for job
        results_job_dir = self.results_dir / job_id
        results_job_dir.mkdir(parents=True, exist_ok=True)

        # Generate filename if not provided
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{extractor_id}_{timestamp}.md"

        result_path = results_job_dir / filename
        with open(result_path, 'w', encoding='utf-8') as f:
            f.write(content)

        logger.info(f"Saved result: {result_path}")
        return result_path

    def get_document_path(self, job_id: str, filename: str) -> Path:
        """Get path to a stored document."""
        return self.documents_dir / job_id / filename

    def get_result_path(self, job_id: str, result_filename: str) -> Path:
        """Get path to a stored result."""
        return self.results_dir / job_id / result_filename

    def cleanup_job(self, job_id: str):
        """Remove all files for a specific job."""
        job_doc_dir = self.documents_dir / job_id
        job_result_dir = self.results_dir / job_id

        if job_doc_dir.exists():
            shutil.rmtree(job_doc_dir)
            logger.info(f"Cleaned up documents for job: {job_id}")

        if job_result_dir.exists():
            shutil.rmtree(job_result_dir)
            logger.info(f"Cleaned up results for job: {job_id}")

    def list_job_documents(self, job_id: str) -> list[Path]:
        """List all documents for a job."""
        job_dir = self.documents_dir / job_id
        if not job_dir.exists():
            return []
        return list(job_dir.iterdir())

    def list_job_results(self, job_id: str) -> list[Path]:
        """List all results for a job."""
        results_dir = self.results_dir / job_id
        if not results_dir.exists():
            return []
        return list(results_dir.iterdir())


# Global instance
_storage_manager: Optional[StorageManager] = None


def get_storage_manager() -> StorageManager:
    """Get or create global storage manager."""
    global _storage_manager
    if _storage_manager is None:
        _storage_manager = StorageManager()
    return _storage_manager
