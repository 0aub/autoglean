"""Centralized YAML configuration management with validation."""

import os
import re
import yaml
from pathlib import Path
from typing import Any, Dict, Optional
from threading import Lock

class ConfigLoader:
    """Load and manage YAML configurations with env var substitution."""

    def __init__(self, config_dir: str = "config"):
        self.config_dir = Path(config_dir)
        self.lock = Lock()
        self._env_pattern = re.compile(r'\$\{([^}^{]+)\}')
        self._cache: Dict[str, Any] = {}

    def _substitute_env_vars(self, value: Any) -> Any:
        """Recursively substitute ${VAR:default} with environment variables."""
        if isinstance(value, dict):
            return {k: self._substitute_env_vars(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [self._substitute_env_vars(item) for item in value]
        elif isinstance(value, str):
            def replace_env(match):
                var_spec = match.group(1)
                parts = var_spec.split(':', 1)
                var_name = parts[0]
                default = parts[1] if len(parts) > 1 else ''
                return os.environ.get(var_name, default)
            return self._env_pattern.sub(replace_env, value)
        return value

    def load_yaml(self, filename: str, use_cache: bool = True) -> Dict[str, Any]:
        """Load YAML file with environment variable substitution."""
        if use_cache and filename in self._cache:
            return self._cache[filename]

        filepath = self.config_dir / filename
        if not filepath.exists():
            raise FileNotFoundError(f"Configuration file not found: {filepath}")

        with open(filepath, 'r') as f:
            config = yaml.safe_load(f) or {}

        config = self._substitute_env_vars(config)

        if use_cache:
            self._cache[filename] = config

        return config

    def load_app_config(self) -> Dict[str, Any]:
        """Load application configuration."""
        return self.load_yaml("app.yaml")

    def load_llm_config(self) -> Dict[str, Any]:
        """Load LLM configuration."""
        return self.load_yaml("llm.yaml")

    def load_extractors_config(self) -> Dict[str, Any]:
        """Load extractors configuration."""
        return self.load_yaml("extractors.yaml")

    def load_api_config(self) -> Dict[str, Any]:
        """Load API configuration."""
        return self.load_yaml("api.yaml")

    def load_all(self) -> Dict[str, Any]:
        """Load all configuration files."""
        with self.lock:
            return {
                'app': self.load_app_config(),
                'llm': self.load_llm_config(),
                'extractors': self.load_extractors_config(),
                'api': self.load_api_config()
            }

    def reload(self):
        """Clear cache and reload all configurations."""
        with self.lock:
            self._cache.clear()


# Global instance
_config_loader: Optional[ConfigLoader] = None


def get_config_loader() -> ConfigLoader:
    """Get or create global config loader."""
    global _config_loader
    if _config_loader is None:
        _config_loader = ConfigLoader()
    return _config_loader


def get_config() -> Dict[str, Any]:
    """Get current configuration."""
    return get_config_loader().load_all()


def reload_config():
    """Reload all configurations."""
    get_config_loader().reload()
