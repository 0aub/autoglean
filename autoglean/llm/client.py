"""LLM client with LiteLLM integration for multimodal document extraction."""

import logging
import os
import time
import base64
from typing import Dict, Any, List, Optional, Union
from pathlib import Path

from autoglean.core.config import get_config_loader

# Import litellm
try:
    from litellm import completion
    LITELLM_AVAILABLE = True
except ImportError:
    LITELLM_AVAILABLE = False
    logging.warning("LiteLLM not available. Install with: pip install litellm")

logger = logging.getLogger(__name__)


class LLMClient:
    """LLM client with multimodal support via LiteLLM."""

    def __init__(self):
        """Initialize LLM client with configuration."""
        config_loader = get_config_loader()
        self.llm_config = config_loader.load_llm_config()
        self._setup_environment()

        # Check if mock mode is enabled
        self.mock_mode = os.environ.get('LLM_MOCK_MODE', 'false').lower() == 'true'
        if self.mock_mode:
            logger.warning("⚠️ LLM CLIENT RUNNING IN MOCK MODE")

        if not LITELLM_AVAILABLE and not self.mock_mode:
            logger.warning("LiteLLM not available")

    def _setup_environment(self):
        """Setup API keys in environment for LiteLLM."""
        providers = self.llm_config.get('providers', {})
        for provider_name, provider_config in providers.items():
            if 'api_key' in provider_config and provider_config['api_key']:
                provider = provider_config['provider'].upper()
                env_var = f"{provider}_API_KEY"
                if provider_config['api_key']:
                    os.environ[env_var] = provider_config['api_key']
                    logger.debug(f"Set {env_var} from config")

    def get_model_config(self, provider_name: str = "gemini-flash") -> Dict[str, Any]:
        """Get configuration for a specific provider."""
        providers = self.llm_config.get('providers', {})
        if provider_name not in providers:
            raise ValueError(f"Provider '{provider_name}' not found in configuration")
        return providers[provider_name]

    def _encode_image(self, image_path: Union[str, Path]) -> str:
        """Encode image to base64."""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def complete(
        self,
        messages: List[Dict[str, Any]],
        model: str = "gemini-flash",
        image_path: Optional[Union[str, Path]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate completion using LiteLLM with optional image.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Provider name from config
            image_path: Optional path to image file for multimodal models
            **kwargs: Additional parameters (temperature, max_tokens, etc.)

        Returns:
            Dictionary with 'content', 'usage', and 'model'
        """
        # Mock mode
        if self.mock_mode:
            return self._get_mock_response(messages, image_path)

        if not LITELLM_AVAILABLE:
            raise RuntimeError("LiteLLM is not installed")

        provider_config = self.get_model_config(model)

        # Build full model name for LiteLLM
        provider = provider_config['provider']
        model_name = provider_config['model']

        # Handle image for multimodal models
        if image_path and provider_config.get('supports_vision', False):
            # Add image to the last user message
            if messages and messages[-1]['role'] == 'user':
                # Convert to multimodal format
                content = messages[-1]['content']
                messages[-1]['content'] = [
                    {"type": "text", "text": content},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{self._encode_image(image_path)}"
                        }
                    }
                ]

        # Get global settings
        settings = self.llm_config.get('settings', {})

        # Merge config with kwargs
        params = {
            'temperature': kwargs.get('temperature', 0.7),
            'max_tokens': kwargs.get('max_tokens', 2000),
            'timeout': settings.get('timeout', 120)
        }

        # Add custom API base if specified
        if 'api_base' in provider_config:
            params['api_base'] = provider_config['api_base']

        # Add API key if specified
        if 'api_key' in provider_config and provider_config['api_key']:
            params['api_key'] = provider_config['api_key']

        # Retry logic
        max_retries = settings.get('max_retries', 3)
        retry_delay = settings.get('retry_delay', 2)

        for attempt in range(max_retries):
            try:
                logger.debug(f"Calling LLM: {model_name} (attempt {attempt + 1}/{max_retries})")

                response = completion(
                    model=model_name,
                    messages=messages,
                    **params
                )

                # Debug: Log raw response
                logger.info(f"=== RAW GEMINI RESPONSE ===")
                logger.info(f"Response object type: {type(response)}")
                logger.info(f"Response: {response}")
                logger.info(f"Choices: {response.choices}")
                logger.info(f"Message: {response.choices[0].message}")
                logger.info(f"Content: {response.choices[0].message.content}")
                logger.info(f"Content type: {type(response.choices[0].message.content)}")
                logger.info(f"Content length: {len(str(response.choices[0].message.content)) if response.choices[0].message.content else 0}")
                logger.info(f"=== END RAW RESPONSE ===")

                # Extract cached tokens if available
                cached_tokens = None
                if hasattr(response.usage, 'prompt_tokens_details') and response.usage.prompt_tokens_details:
                    if hasattr(response.usage.prompt_tokens_details, 'cached_tokens'):
                        cached_tokens = response.usage.prompt_tokens_details.cached_tokens

                result = {
                    'content': response.choices[0].message.content,
                    'usage': {
                        'prompt_tokens': response.usage.prompt_tokens,
                        'completion_tokens': response.usage.completion_tokens,
                        'total_tokens': response.usage.total_tokens,
                        'cached_tokens': cached_tokens
                    },
                    'model': model_name,
                    'provider': provider
                }

                logger.info(f"LLM response: {result['usage']['total_tokens']} tokens, content_length: {len(str(result['content'])) if result['content'] else 0}")
                return result

            except Exception as e:
                error_str = str(e).lower()
                is_quota_error = 'quota' in error_str or 'rate limit' in error_str

                if is_quota_error and attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(f"Quota error, retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"LLM completion failed: {e}")
                    raise

    def _get_mock_response(
        self,
        messages: List[Dict[str, Any]],
        image_path: Optional[Union[str, Path]] = None
    ) -> Dict[str, Any]:
        """Generate mock response for testing."""
        user_msg = messages[-1]['content'] if messages else ''
        if isinstance(user_msg, list):
            user_msg = ' '.join([
                item.get('text', '') for item in user_msg if item.get('type') == 'text'
            ])

        user_msg_lower = user_msg.lower()

        # Generate mock markdown response based on content
        if 'coordinate' in user_msg_lower or 'location' in user_msg_lower:
            mock_content = """# Extracted Coordinates

| Location | Latitude | Longitude | Context |
|----------|----------|-----------|---------|
| City Center | 40.7128 | -74.0060 | Main office location |
| Warehouse | 40.7589 | -73.9851 | Distribution center |

**Note:** This is mock data for testing purposes.
"""
        elif 'date' in user_msg_lower:
            mock_content = """# Extracted Dates

| Original Format | ISO Format | Context |
|-----------------|------------|---------|
| Jan 15, 2024 | 2024-01-15 | Contract signing date |
| 2024/03/20 | 2024-03-20 | Project deadline |
| March 1st | 2024-03-01 | Meeting date |

**Note:** This is mock data for testing purposes.
"""
        elif 'entit' in user_msg_lower or 'compan' in user_msg_lower:
            mock_content = """# Extracted Entities

## Companies
- **Acme Corporation** - Technology company
- **Global Industries Inc.** - Manufacturing organization

## Organizations
- **Tech Alliance** - Industry consortium
- **Innovation Hub** - Research institution

**Note:** This is mock data for testing purposes.
"""
        else:
            mock_content = """# Extraction Results

The document has been processed and analyzed.

## Key Information
- Sample data point 1
- Sample data point 2
- Sample data point 3

**Note:** This is mock data for testing purposes.
"""

        return {
            'content': mock_content,
            'usage': {
                'prompt_tokens': 100,
                'completion_tokens': 150,
                'total_tokens': 250
            },
            'model': 'mock-model',
            'provider': 'mock'
        }


# Global instance
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """Get or create global LLM client."""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
