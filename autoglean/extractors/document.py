"""Document extraction logic with multimodal support."""

import logging
import time
from pathlib import Path
from typing import Dict, Any, Optional, Union
from PIL import Image
import io

try:
    from pdf2image import convert_from_path
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    logging.warning("pdf2image not installed - PDF support disabled")

from autoglean.llm.client import get_llm_client
from autoglean.core.config import get_config_loader
from autoglean.core.storage import get_storage_manager

logger = logging.getLogger(__name__)

# Global rate limiting
_last_request_time = 0
_MIN_REQUEST_INTERVAL = 2.0  # 2 seconds between requests


class DocumentExtractor:
    """Extract information from documents using LLM."""

    def __init__(self):
        self.llm_client = get_llm_client()
        self.config_loader = get_config_loader()
        self.storage_manager = get_storage_manager()

    def get_extractor_config(self, extractor_id: str) -> Dict[str, Any]:
        """Get configuration for a specific extractor."""
        # First try to load from YAML config
        extractors_config = self.config_loader.load_extractors_config()
        extractors = extractors_config.get('extractors', {})

        if extractor_id in extractors:
            return extractors[extractor_id]

        # If not in YAML, try to load from database
        try:
            from autoglean.db.base import SessionLocal
            from autoglean.db.models import Extractor

            db = SessionLocal()
            try:
                extractor = db.query(Extractor).filter(Extractor.extractor_id == extractor_id).first()
                if extractor:
                    # Convert database extractor to config format
                    return {
                        'id': extractor.extractor_id,
                        'name': extractor.name_en,  # Use English name as default
                        'icon': extractor.icon,
                        'description': extractor.description_en,
                        'prompt': extractor.prompt,
                        'llm': extractor.llm,
                        'temperature': extractor.temperature,
                        'max_tokens': extractor.max_tokens,
                        'output_format': extractor.output_format
                    }
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Failed to load extractor from database: {e}")

        raise ValueError(f"Extractor '{extractor_id}' not found in configuration")

    def list_extractors(self) -> Dict[str, Dict[str, Any]]:
        """List all available extractors."""
        extractors_config = self.config_loader.load_extractors_config()
        return extractors_config.get('extractors', {})

    def is_image_file(self, file_path: Union[str, Path]) -> bool:
        """Check if file is an image or PDF."""
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.pdf'}
        return Path(file_path).suffix.lower() in image_extensions

    def convert_pdf_to_image(self, pdf_path: Union[str, Path]) -> Union[str, Path]:
        """
        Convert first page of PDF to image.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Path to converted image
        """
        if not PDF_SUPPORT:
            raise RuntimeError("pdf2image not installed. Cannot convert PDF to image.")

        try:
            logger.info(f"Converting PDF to image: {Path(pdf_path).name}")

            # Convert first page only
            images = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=200)

            # Save as JPEG
            output_path = Path(pdf_path).parent / f"{Path(pdf_path).stem}_page1.jpg"
            images[0].save(output_path, 'JPEG', quality=90)

            logger.info(f"PDF converted to: {output_path.name}")
            return output_path

        except Exception as e:
            logger.error(f"Failed to convert PDF to image: {e}")
            raise

    def optimize_image(self, image_path: Union[str, Path], max_width: int = 2048) -> Union[str, Path]:
        """
        Optimize image size to reduce token usage.

        Args:
            image_path: Path to original image
            max_width: Maximum width in pixels (default 2048)

        Returns:
            Path to optimized image (or original if optimization not needed)
        """
        try:
            img = Image.open(image_path)

            # Check if optimization is needed
            if img.width <= max_width:
                logger.debug(f"Image already optimized: {img.width}x{img.height}")
                return image_path

            # Calculate new dimensions
            ratio = max_width / img.width
            new_height = int(img.height * ratio)

            # Resize
            img_resized = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

            # Save optimized version
            optimized_path = Path(image_path).parent / f"{Path(image_path).stem}_optimized{Path(image_path).suffix}"
            img_resized.save(optimized_path, quality=90, optimize=True)

            logger.info(f"Optimized image: {img.width}x{img.height} -> {max_width}x{new_height}")
            return optimized_path

        except Exception as e:
            logger.warning(f"Failed to optimize image: {e}, using original")
            return image_path

    def read_text_file(self, file_path: Union[str, Path]) -> str:
        """Read text content from file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # Try with different encoding
            with open(file_path, 'r', encoding='latin-1') as f:
                return f.read()

    def extract(
        self,
        extractor_id: str,
        file_path: Union[str, Path],
        job_id: str
    ) -> Dict[str, Any]:
        """
        Extract information from document.

        Args:
            extractor_id: ID of the extractor to use
            file_path: Path to the document file
            job_id: Unique job identifier

        Returns:
            Dictionary with extraction results
        """
        # Get extractor configuration
        extractor_config = self.get_extractor_config(extractor_id)

        # Build messages for LLM
        system_message = "You are a helpful assistant that extracts specific information from documents."
        user_prompt = extractor_config['prompt']

        # Check if file is an image or text
        is_image = self.is_image_file(file_path)

        if is_image:
            # Convert PDF to image if needed
            if Path(file_path).suffix.lower() == '.pdf':
                image_path = self.convert_pdf_to_image(file_path)
            else:
                image_path = file_path

            # For images, use multimodal
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_prompt}
            ]
        else:
            # For text files, include content in prompt
            try:
                document_text = self.read_text_file(file_path)
                full_prompt = f"{user_prompt}\n\n--- DOCUMENT CONTENT ---\n{document_text}"
                messages = [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": full_prompt}
                ]
                image_path = None
            except Exception as e:
                logger.error(f"Failed to read text file: {e}")
                raise

        # Get LLM model from config
        model = extractor_config.get('llm', 'gemini-flash')
        temperature = extractor_config.get('temperature', 0.7)
        max_tokens = extractor_config.get('max_tokens', 2000)

        # Optimize image if provided
        if image_path:
            image_path = self.optimize_image(image_path, max_width=2048)

        # Rate limiting: wait if needed
        global _last_request_time
        current_time = time.time()
        time_since_last = current_time - _last_request_time
        if time_since_last < _MIN_REQUEST_INTERVAL:
            wait_time = _MIN_REQUEST_INTERVAL - time_since_last
            logger.info(f"Rate limiting: waiting {wait_time:.1f}s before next request")
            time.sleep(wait_time)

        # Call LLM
        logger.info(f"Extracting with {extractor_id} from {Path(file_path).name}")
        response = self.llm_client.complete(
            messages=messages,
            model=model,
            image_path=image_path,
            temperature=temperature,
            max_tokens=max_tokens
        )

        # Update last request time
        _last_request_time = time.time()

        # Extract markdown content
        markdown_content = response.get('content')

        if not markdown_content:
            # Check if response was truncated (max_tokens reached)
            usage = response.get('usage', {})
            if usage.get('completion_tokens', 0) >= max_tokens - 10:
                error_msg = f"LLM response truncated (hit max_tokens={max_tokens}). Try increasing max_tokens in extractor config."
                logger.error(error_msg)
                raise ValueError(error_msg)
            else:
                error_msg = f"LLM returned empty content. Response: {response}"
                logger.error(error_msg)
                raise ValueError(error_msg)

        # Save result
        result_filename = f"{extractor_id}_{Path(file_path).stem}.md"
        result_path = self.storage_manager.save_result(
            content=markdown_content,
            job_id=job_id,
            extractor_id=extractor_id,
            filename=result_filename
        )

        return {
            'job_id': job_id,
            'extractor_id': extractor_id,
            'file_name': Path(file_path).name,
            'result_content': markdown_content,
            'result_path': str(result_path),
            'usage': response['usage'],
            'model': response['model']
        }


# Global instance
_document_extractor: Optional[DocumentExtractor] = None


def get_document_extractor() -> DocumentExtractor:
    """Get or create global document extractor."""
    global _document_extractor
    if _document_extractor is None:
        _document_extractor = DocumentExtractor()
    return _document_extractor
