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


#: Response body of ``GET /returns``: symbol -> ordered daily return series.
ReturnsBySymbol: TypeAlias = dict[str, list[ReturnPoint]]

#: Cache key for one query: the inclusive date range that was requested.
DateRange: TypeAlias = tuple[date, date]
