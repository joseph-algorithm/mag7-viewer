"""HTTP surface: query validation, error mapping, and JSON shaping."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool

from .fetcher import PriceFetchError
from .models import MAG7
from .service import ReturnsService

router = APIRouter()

#: Guards against a request that would pull decades of data in one call.
MAX_RANGE_DAYS = 365 * 10


async def get_service(request: Request) -> ReturnsService:
    """Resolve the process-wide service instance attached at app startup."""
    service: ReturnsService = request.app.state.returns_service
    return service


@router.get("/returns")
async def get_returns(
    start: Annotated[date, Query(description="Inclusive start date, YYYY-MM-DD")],
    end: Annotated[date, Query(description="Inclusive end date, YYYY-MM-DD")],
    service: Annotated[ReturnsService, Depends(get_service)],
) -> dict[str, Any]:
    """Daily percentage returns per MAG7 symbol over the inclusive date range.

    Symbols with no usable series are reported in ``unavailable`` rather than
    omitted, so the caller can tell a data gap from a shrunken universe.
    """
    if start > end:
        raise HTTPException(status_code=400, detail="start must be on or before end")
    if (end - start).days > MAX_RANGE_DAYS:
        raise HTTPException(
            status_code=400,
            detail=f"date range is limited to {MAX_RANGE_DAYS} days",
        )

    try:
        # yfinance and pandas expose synchronous APIs. Keep that blocking work
        # out of the event-loop thread while retaining the synchronous,
        # independently testable service boundary.
        payload = await run_in_threadpool(service.get_returns, start, end)
    except PriceFetchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "data": {
            symbol: [point.model_dump(by_alias=True) for point in points]
            for symbol, points in payload.data.items()
        },
        "unavailable": [item.model_dump() for item in payload.unavailable],
    }


@router.get("/symbols")
async def get_symbols() -> dict[str, list[str]]:
    """The symbol universe, so the UI does not hardcode the ticker list."""
    return {"symbols": list(MAG7)}


@router.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
