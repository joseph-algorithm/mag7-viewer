"""Pure transforms from close prices to daily percentage returns.

No network or cache concerns live here, which keeps this module directly unit-testable.
"""

from __future__ import annotations

import math
from typing import Any, cast

import pandas as pd

from .models import ReturnPoint, ReturnsBySymbol

#: Returns are fractions; six decimals keeps sub-basis-point precision in JSON.
_ROUND_DECIMALS = 6


def compute_daily_returns(close: pd.DataFrame) -> pd.DataFrame:
    """Compute per-symbol daily fractional returns from a close-price frame.

    The first row of the range has no prior close to difference against and is
    dropped, so the returned frame is one row shorter than ``close``.
    """
    if close.empty:
        return close
    return close.sort_index().pct_change().iloc[1:]


def to_records(returns: pd.DataFrame) -> ReturnsBySymbol:
    """Convert a returns frame into the JSON-facing ``symbol -> series`` mapping.

    Per-symbol NaNs (a symbol that did not trade on a given day) are skipped rather
    than emitted as nulls, so each series stays numerically clean for the charts.
    """
    result: ReturnsBySymbol = {}
    for symbol in returns.columns:
        series = returns[symbol]
        points: list[ReturnPoint] = []
        for timestamp, value in series.items():
            numeric = float(value)
            if math.isnan(numeric) or math.isinf(numeric):
                continue
            points.append(
                ReturnPoint(
                    date=pd.Timestamp(cast(Any, timestamp)).date().isoformat(),
                    **{"return": round(numeric, _ROUND_DECIMALS)},
                )
            )
        result[str(symbol)] = points
    return result
