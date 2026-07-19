"""Tests for the caching/composition layer."""

from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from app.fetcher import PriceFetchError
from app.service import ReturnsService

START = date(2024, 1, 2)
END = date(2024, 1, 5)


def test_repeat_query_is_served_from_cache(close_frame: pd.DataFrame) -> None:
    calls = 0

    def counting_fetch(symbols: tuple[str, ...], start: date, end: date) -> pd.DataFrame:
        nonlocal calls
        calls += 1
        return close_frame

    service = ReturnsService(fetch=counting_fetch)
    first = service.get_returns(START, END)
    second = service.get_returns(START, END)

    assert calls == 1
    assert first == second


def test_different_range_refetches(close_frame: pd.DataFrame) -> None:
    calls = 0

    def counting_fetch(symbols: tuple[str, ...], start: date, end: date) -> pd.DataFrame:
        nonlocal calls
        calls += 1
        return close_frame

    service = ReturnsService(fetch=counting_fetch)
    service.get_returns(START, END)
    service.get_returns(START, date(2024, 1, 6))

    assert calls == 2


def test_single_day_range_raises_rather_than_caching_empty() -> None:
    one_day = pd.DataFrame(
        {"MSFT": [100.0]}, index=pd.to_datetime(["2024-01-02"])
    )
    service = ReturnsService(fetch=lambda symbols, start, end: one_day)

    with pytest.raises(PriceFetchError, match="prior close"):
        service.get_returns(START, START)


def test_fetch_errors_propagate(close_frame: pd.DataFrame) -> None:
    def failing_fetch(symbols: tuple[str, ...], start: date, end: date) -> pd.DataFrame:
        raise PriceFetchError("upstream down")

    service = ReturnsService(fetch=failing_fetch)

    with pytest.raises(PriceFetchError, match="upstream down"):
        service.get_returns(START, END)
