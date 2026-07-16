"""
Prahari AI Backend — Settings / Configuration
Reads from .env file via pydantic-settings.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "..", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # JWT
    SECRET_KEY: str = "dev-secret-key-please-change-in-production-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # ML / DuckDB
    ML_DB_PATH: str = "../prahari-ai-ml/db/karnataka_fir.duckdb"
    ML_PIPELINE_PATH: str = "../prahari-ai-ml/pipeline"

    # LLM
    GROQ_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:4173"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def db_path_absolute(self) -> str:
        """Resolve ML_DB_PATH relative to the backend root."""
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.normpath(os.path.join(base, self.ML_DB_PATH))

    @property
    def ml_pipeline_path_absolute(self) -> str:
        """Resolve ML_PIPELINE_PATH relative to the backend root."""
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.normpath(os.path.join(base, self.ML_PIPELINE_PATH))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
