"""Tests for the pure price -> returns transforms."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from app.returns import compute_daily_returns, to_records


def test_first_row_is_dropped(close_frame: pd.DataFrame) -> None:
    returns = compute_daily_returns(close_frame)
    assert len(returns) == len(close_frame) - 1
    assert returns.index[0] == pd.Timestamp("2024-01-03")


def test_return_values_are_fractional_changes(close_frame: pd.DataFrame) -> None:
    returns = compute_daily_returns(close_frame)
    # MSFT 100 -> 101 is +1%, then 101 -> 100 is a bit under -1%.
    assert returns["MSFT"].iloc[0] == pytest.approx(0.01)
    assert returns["MSFT"].iloc[1] == pytest.approx((100.0 - 101.0) / 101.0)


def test_unsorted_input_is_sorted_before_differencing(close_frame: pd.DataFrame) -> None:
    shuffled = close_frame.iloc[::-1]
    assert compute_daily_returns(shuffled)["MSFT"].iloc[0] == pytest.approx(0.01)


def test_empty_frame_round_trips() -> None:
    empty = pd.DataFrame()
    assert compute_daily_returns(empty).empty
    assert to_records(compute_daily_returns(empty)) == {}


def test_records_shape_matches_api_contract(close_frame: pd.DataFrame) -> None:
    records = to_records(compute_daily_returns(close_frame))
    assert set(records) == set(close_frame.columns)

    point = records["MSFT"][0].model_dump(by_alias=True)
    assert point == {"date": "2024-01-03", "return": 0.01}


def test_nan_points_are_skipped_not_emitted_as_null(close_frame: pd.DataFrame) -> None:
    gapped = close_frame.copy()
    gapped.loc[pd.Timestamp("2024-01-04"), "TSLA"] = np.nan

    records = to_records(compute_daily_returns(gapped))

    tsla_dates = [point.date for point in records["TSLA"]]
    # The gap removes both the day itself and the day differenced against it.
    assert "2024-01-04" not in tsla_dates
    assert "2024-01-05" not in tsla_dates
    assert "2024-01-03" in tsla_dates
    # Other symbols are unaffected.
    assert len(records["MSFT"]) == 3


def test_returns_are_rounded_to_six_decimals() -> None:
    index = pd.to_datetime(["2024-01-02", "2024-01-03"])
    frame = pd.DataFrame({"MSFT": [3.0, 3.0000001234]}, index=index)

    value = to_records(compute_daily_returns(frame))["MSFT"][0].return_

    assert value == round(value, 6)
