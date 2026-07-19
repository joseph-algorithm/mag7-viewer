"""Price fetching via yfinance.

Isolated behind :func:`fetch_close_prices` so the rest of the backend depends on a
DataFrame contract rather than on yfinance itself. Tests substitute this function.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import cast

import pandas as pd
import yfinance as yf


class PriceFetchError(RuntimeError):
    """Raised when upstream price data is unavailable or unusable."""


def fetch_close_prices(
    symbols: tuple[str, ...],
    start: date,
    end: date,
) -> pd.DataFrame:
    """Fetch daily close prices for ``symbols`` between ``start`` and ``end``.

    Returns a DataFrame indexed by trading day with one column per symbol. The
    yfinance ``end`` bound is exclusive, so it is advanced by a day to make the
    caller's inclusive range hold.
    """
    try:
        raw = yf.download(
            list(symbols),
            start=start.isoformat(),
            end=(end + timedelta(days=1)).isoformat(),
            auto_adjust=True,
            progress=False,
            group_by="column",
            threads=True,
        )
    except Exception as exc:  # noqa: BLE001 - upstream raises a wide range of errors
        raise PriceFetchError(f"price provider request failed: {exc}") from exc

    if raw is None or raw.empty:
        raise PriceFetchError(
            "price provider returned no data for the requested range; "
            "the range may cover only weekends or holidays"
        )

    close = _extract_close(raw, symbols)
    if close.empty:
        raise PriceFetchError("price provider returned no close prices for the requested range")
    return close


def _extract_close(raw: pd.DataFrame, symbols: tuple[str, ...]) -> pd.DataFrame:
    """Normalize yfinance output to a plain close-price frame keyed by symbol.

    A multi-symbol download yields MultiIndex columns; a single-symbol download
    yields flat columns. Both shapes are reduced to ``symbol -> close`` here.
    """
    if isinstance(raw.columns, pd.MultiIndex):
        if "Close" not in raw.columns.get_level_values(0):
            raise PriceFetchError("price provider response is missing Close prices")
        close = cast(pd.DataFrame, raw["Close"])
    else:
        if "Close" not in raw.columns:
            raise PriceFetchError("price provider response is missing Close prices")
        close = raw[["Close"]].rename(columns={"Close": symbols[0]})

    present = [symbol for symbol in symbols if symbol in close.columns]
    return close[present].dropna(axis=1, how="all")
