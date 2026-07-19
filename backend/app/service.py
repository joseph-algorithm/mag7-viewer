"""Composition of fetching, computing, and caching.

The API layer talks only to this module, so transport concerns stay in ``api.py``
and data concerns stay in ``fetcher``/``returns``/``cache``.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date

import pandas as pd

from .cache import TTLCache
from .fetcher import PriceFetchError, fetch_close_prices
from .models import MAG7, DateRange, ReturnsBySymbol
from .returns import compute_daily_returns, to_records

#: Signature every price source must satisfy; lets tests inject a fixture frame.
Fetcher = Callable[[tuple[str, ...], date, date], pd.DataFrame]


class ReturnsService:
    """Serves daily return series for a symbol universe, with caching."""

    def __init__(
        self,
        symbols: tuple[str, ...] = MAG7,
        cache: TTLCache[DateRange, ReturnsBySymbol] | None = None,
        fetch: Fetcher | None = None,
    ) -> None:
        self.symbols = symbols
        self._cache: TTLCache[DateRange, ReturnsBySymbol] = cache or TTLCache()
        self._fetch: Fetcher = fetch or fetch_close_prices

    def get_returns(self, start: date, end: date) -> ReturnsBySymbol:
        """Return the daily return series per symbol for the inclusive range.

        Raises :class:`~app.fetcher.PriceFetchError` when upstream data is unusable.
        """
        key: DateRange = (start, end)
        cached = self._cache.get(key)
        if cached is not None:
            return cached

        close = self._fetch(self.symbols, start, end)
        records = to_records(compute_daily_returns(close))
        if not any(records.values()):
            raise PriceFetchError(
                "no complete trading days in the requested range; "
                "a return needs a prior close, so widen the range by at least one trading day"
            )
        self._cache.set(key, records)
        return records
