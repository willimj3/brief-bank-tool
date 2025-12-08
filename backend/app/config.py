"""
Configuration management for the Brief Bank tool.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # API Keys
    anthropic_api_key: str = ""

    # Paths
    data_dir: Path = Path(__file__).parent.parent.parent / "data"
    upload_dir: Path = data_dir / "briefs"
    embeddings_dir: Path = data_dir / "embeddings"
    export_dir: Path = data_dir / "exports"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # AI Settings
    default_model: str = "claude-sonnet-4-20250514"
    max_tokens_outline: int = 2000
    max_tokens_section: int = 4000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure directories exist
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.embeddings_dir.mkdir(parents=True, exist_ok=True)
settings.export_dir.mkdir(parents=True, exist_ok=True)
