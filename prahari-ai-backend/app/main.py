"""
Prahari AI Backend — FastAPI Application Factory
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, close_db
from app.middleware.audit import AuditMiddleware
from app.dependencies import require_level_1, require_level_2, require_level_3
from app.routers import auth, kpi, incidents, units, analytics, reports, ml
from app.routers import settings_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle manager."""
    logger.info("🚀 Prahari AI Backend starting up...")
    init_db()
    logger.info("✅ Database initialised")
    yield
    logger.info("🛑 Prahari AI Backend shutting down...")
    close_db()


app = FastAPI(
    title="Prahari AI — Backend API",
    description=(
        "Bridge between the Prahari AI frontend and the Karnataka Police FIR "
        "analytics ML pipeline (DuckDB + SARIMA/XGBoost/DBSCAN + Groq NL2SQL)."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Audit Middleware ──────────────────────────────────────────────────────────
app.add_middleware(AuditMiddleware)

# ── Routers ───────────────────────────────────────────────────────────────────
from fastapi import Depends
app.include_router(auth.router,             prefix="/auth",          tags=["Authentication"])
app.include_router(kpi.router,              prefix="/kpi",           tags=["KPI Dashboard"], dependencies=[Depends(require_level_1)])
app.include_router(incidents.router,        prefix="/incidents",     tags=["Incidents"],     dependencies=[Depends(require_level_1)])
app.include_router(units.router,            prefix="/units",         tags=["Patrol Units"],  dependencies=[Depends(require_level_1)])
app.include_router(reports.router,          prefix="/reports",       tags=["Reports"],       dependencies=[Depends(require_level_1)])
app.include_router(settings_router.router,  prefix="/settings",      tags=["Settings"],      dependencies=[Depends(require_level_1)])
app.include_router(analytics.router,        prefix="/analytics",     tags=["Analytics"],     dependencies=[Depends(require_level_2)])
app.include_router(ml.router,               prefix="/api/v1",        tags=["ML / Analytics Engine"], dependencies=[Depends(require_level_2)])


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "Prahari AI Backend",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    from app.database import is_db_available
    return {
        "status": "healthy",
        "db_connected": is_db_available(),
    }
