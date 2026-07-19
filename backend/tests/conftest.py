"""Shared fixtures. No test in this suite touches the network."""

from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from app.models import MAG7


@pytest.fixture
def close_frame() -> pd.DataFrame:
    """Four trading days of close prices for every MAG7 symbol."""
    index = pd.to_datetime(["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"])
    base = {
        "MSFT": [100.0, 101.0, 100.0, 102.0],
        "AAPL": [200.0, 198.0, 202.0, 202.0],
        "GOOGL": [50.0, 50.5, 51.0, 50.0],
        "AMZN": [150.0, 151.5, 150.0, 153.0],
        "NVDA": [400.0, 420.0, 415.0, 430.0],
        "META": [300.0, 297.0, 303.0, 300.0],
        "TSLA": [250.0, 245.0, 255.0, 250.0],
    }
    return pd.DataFrame(base, index=index)


@pytest.fixture
def stub_fetch(close_frame: pd.DataFrame):
    """A fetcher that ignores the range and returns the fixture frame."""

    def _fetch(symbols: tuple[str, ...], start: date, end: date) -> pd.DataFrame:
        return close_frame[[symbol for symbol in symbols if symbol in close_frame.columns]]

    return _fetch


@pytest.fixture
def symbols() -> tuple[str, ...]:
    return MAG7
