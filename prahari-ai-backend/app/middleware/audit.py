"""
Audit Middleware — logs every mutating request to the in-memory audit log.
Only records POST / PATCH / PUT / DELETE operations.
"""
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.db import SessionLocal
from app.services import operational_store

logger = logging.getLogger(__name__)

_AUDIT_METHODS = {"POST", "PATCH", "PUT", "DELETE"}


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        t0 = time.monotonic()
        response = await call_next(request)
        elapsed = round((time.monotonic() - t0) * 1000, 1)

        if request.method in _AUDIT_METHODS:
            path = request.url.path
            # Skip health / docs / auth endpoints from audit
            skip_prefixes = ("/docs", "/redoc", "/openapi", "/health", "/auth/login")
            if not any(path.startswith(p) for p in skip_prefixes):
                action = f"{request.method} {path} ({response.status_code}) [{elapsed}ms]"
                resource = path.split("/")[-1] or path
                db = SessionLocal()
                try:
                    operational_store.add_audit_entry(db, action, resource)
                    db.commit()
                except Exception as e:
                    logger.debug("Audit log write failed: %s", e)
                finally:
                    db.close()

        return response
