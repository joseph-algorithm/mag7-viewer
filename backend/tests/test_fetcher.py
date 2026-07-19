"""Tests for yfinance response normalization, with yfinance itself patched out."""

from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from app import fetcher
from app.fetcher import PriceFetchError, fetch_close_prices

START = date(2024, 1, 2)
END = date(2024, 1, 3)
INDEX = pd.to_datetime(["2024-01-02", "2024-01-03"])


def _multi_index_frame() -> pd.DataFrame:
    columns = pd.MultiIndex.from_product([["Close", "Volume"], ["MSFT", "AAPL"]])
    return pd.DataFrame(
        [[100.0, 200.0, 10, 20], [101.0, 198.0, 11, 21]],
        index=INDEX,
        columns=columns,
    )


def test_multi_symbol_download_is_reduced_to_close_columns(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(fetcher.yf, "download", lambda *a, **k: _multi_index_frame())

    close = fetch_close_prices(("MSFT", "AAPL"), START, END)

    assert list(close.columns) == ["MSFT", "AAPL"]
    assert close["MSFT"].tolist() == [100.0, 101.0]


def test_single_symbol_download_is_renamed_to_that_symbol(monkeypatch: pytest.MonkeyPatch) -> None:
    flat = pd.DataFrame({"Close": [100.0, 101.0], "Volume": [10, 11]}, index=INDEX)
    monkeypatch.setattr(fetcher.yf, "download", lambda *a, **k: flat)

    close = fetch_close_prices(("MSFT",), START, END)

    assert list(close.columns) == ["MSFT"]


def test_end_bound_is_made_inclusive(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, str] = {}

    def capture(*args: object, **kwargs: object) -> pd.DataFrame:
        seen.update({"start": str(kwargs["start"]), "end": str(kwargs["end"])})
        return _multi_index_frame()

    monkeypatch.setattr(fetcher.yf, "download", capture)
    fetch_close_prices(("MSFT", "AAPL"), START, END)

    assert seen == {"start": "2024-01-02", "end": "2024-01-04"}


def test_empty_response_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(fetcher.yf, "download", lambda *a, **k: pd.DataFrame())

    with pytest.raises(PriceFetchError, match="no data"):
        fetch_close_prices(("MSFT",), START, END)


def test_upstream_exception_is_wrapped(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(*args: object, **kwargs: object) -> pd.DataFrame:
        raise ConnectionError("reset by peer")

    monkeypatch.setattr(fetcher.yf, "download", boom)

    with pytest.raises(PriceFetchError, match="reset by peer"):
        fetch_close_prices(("MSFT",), START, END)


def test_response_without_close_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        fetcher.yf,
        "download",
        lambda *a, **k: pd.DataFrame({"Volume": [1, 2]}, index=INDEX),
    )

    with pytest.raises(PriceFetchError, match="missing Close"):
        fetch_close_prices(("MSFT",), START, END)
