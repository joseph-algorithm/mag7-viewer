"""Typed data shapes shared across the backend."""

from __future__ import annotations

from datetime import date
from typing import TypeAlias

from pydantic import BaseModel, Field

#: The MAG7 universe. Ordering is stable so the UI grid renders deterministically.
MAG7: tuple[str, ...] = ("MSFT", "AAPL", "GOOGL", "AMZN", "NVDA", "META", "TSLA")


class ReturnPoint(BaseModel):
    """A single trading day's percentage return for one symbol."""

    date: str = Field(description="Trading day in YYYY-MM-DD form")
    return_: float = Field(
        alias="return",
        description="Fractional daily return, e.g. 0.004 for +0.4%",
    )

    model_config = {"populate_by_name": True}


#: Symbol -> ordered daily return series.
ReturnsBySymbol: TypeAlias = dict[str, list[ReturnPoint]]


class UnavailableSymbol(BaseModel):
    """A requested symbol that produced no usable series, and why.

    Reported explicitly rather than omitted: a caller cannot distinguish "this
    ticker had no data" from "we forgot to ask for it" by looking at absence.
    """

    symbol: str = Field(description="The requested ticker")
    reason: str = Field(description="Human-readable explanation, safe to display")


class ReturnsPayload(BaseModel):
    """Response body of ``GET /returns``.

    ``data`` carries every symbol that produced at least one return; every other
    requested symbol appears in ``unavailable``. Together they always account for
    the full requested universe.
    """

    data: ReturnsBySymbol = Field(default_factory=dict)
    unavailable: list[UnavailableSymbol] = Field(default_factory=list)

#: Cache key for one query: the inclusive date range that was requested.
DateRange: TypeAlias = tuple[date, date]
