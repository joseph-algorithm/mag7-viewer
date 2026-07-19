"""Application factory and ASGI entrypoint."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router
from .cache import TTLCache
from .service import ReturnsService

#: Dev origins allowed by default; override with ALLOWED_ORIGINS (comma separated).
DEFAULT_ORIGINS = ("http://localhost:5173", "http://127.0.0.1:5173")


def _allowed_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", "").strip()
    if not raw:
        return list(DEFAULT_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def create_app(service: ReturnsService | None = None) -> FastAPI:
    """Build the FastAPI app. Tests pass a service with a stub fetcher."""
    app = FastAPI(
        title="MAG7 Returns API",
        version="0.1.0",
        description="Daily percentage returns for the MAG7 stocks.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    ttl = float(os.environ.get("CACHE_TTL_SECONDS", 15 * 60))
    app.state.returns_service = service or ReturnsService(cache=TTLCache(ttl_seconds=ttl))
    app.include_router(router)
    return app


app = create_app()
