"""
Prahari AI — FastAPI Backend entrypoint
Run with: python run.py
Or directly: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""
import uvicorn
from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        reload_dirs=["app", "../prahari-ai-ml/pipeline"],
        log_level="info",
    )
