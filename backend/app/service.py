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
from .models import MAG7, DateRange, ReturnsPayload, UnavailableSymbol
from .returns import compute_daily_returns, to_records

#: Shown when a requested ticker came back with no usable prices at all.
NO_DATA_REASON = "no data returned by the price provider for this range"

#: Shown when a ticker had prices but not enough to difference into a return.
NO_COMPLETE_DAY_REASON = (
    "no complete trading day in this range; a return needs a prior close"
)

#: Signature every price source must satisfy; lets tests inject a fixture frame.
Fetcher = Callable[[tuple[str, ...], date, date], pd.DataFrame]


class ReturnsService:
    """Serves daily return series for a symbol universe, with caching."""

    def __init__(
        self,
        symbols: tuple[str, ...] = MAG7,
        cache: TTLCache[DateRange, ReturnsPayload] | None = None,
        fetch: Fetcher | None = None,
    ) -> None:
        self.symbols = symbols
        self._cache: TTLCache[DateRange, ReturnsPayload] = cache or TTLCache()
        self._fetch: Fetcher = fetch or fetch_close_prices

    def get_returns(self, start: date, end: date) -> ReturnsPayload:
        """Return the daily return series per symbol for the inclusive range.

        Every requested symbol is accounted for: those with at least one return
        land in ``data``, the rest in ``unavailable`` with a reason. Raises
        :class:`~app.fetcher.PriceFetchError` only when *nothing* was usable.
        """
        key: DateRange = (start, end)
        cached = self._cache.get(key)
        if cached is not None:
            return cached

        close = self._fetch(self.symbols, start, end)
        records = to_records(compute_daily_returns(close))

        data = {symbol: points for symbol, points in records.items() if points}
        unavailable = [
            UnavailableSymbol(
                symbol=symbol,
                # A symbol absent from the frame never had prices; one present but
                # empty had prices that could not be differenced into a return.
                reason=NO_COMPLETE_DAY_REASON if symbol in records else NO_DATA_REASON,
            )
            for symbol in self.symbols
            if symbol not in data
        ]

        if not data:
            raise PriceFetchError(
                "no complete trading days in the requested range; "
                "a return needs a prior close, so widen the range by at least one trading day"
            )

        payload = ReturnsPayload(data=data, unavailable=unavailable)
        self._cache.set(key, payload)
        return payload
