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
    JWT_SECRET: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Zoho Catalyst Configuration
    CATALYST_PROJECT_ID: str = ""
    CATALYST_CLIENT_ID: str = ""
    CATALYST_CLIENT_SECRET: str = ""
    CATALYST_REFRESH_TOKEN: str = ""
    CATALYST_DC: str = "IN"

    ZOHO_CLIENT_ID: str = ""
    ZOHO_CLIENT_SECRET: str = ""
    ZOHO_REFRESH_TOKEN: str = ""
    ZOHO_ORG_ID: str = ""

    # NVIDIA AI Hosted APIs
    NVIDIA_API_KEY: str = ""

    # ML / DuckDB
    ML_DB_PATH: str = "../prahari-ai-ml/db/karnataka_fir.duckdb"
    ML_PIPELINE_PATH: str = "../prahari-ai-ml/pipeline"

    # LLM
    GROQ_API_KEY: str = ""

    # OCR.space Fallback Key
    OCR_SPACE_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:4173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:4173"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def effective_jwt_secret(self) -> str:
        return self.JWT_SECRET if self.JWT_SECRET else self.SECRET_KEY

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
