"""Endpoint tests against a stubbed price source."""

from __future__ import annotations

from datetime import date

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.fetcher import PriceFetchError
from app.main import create_app
from app.models import MAG7
from app.service import ReturnsService


@pytest.fixture
def client(stub_fetch) -> TestClient:
    return TestClient(create_app(service=ReturnsService(fetch=stub_fetch)))


def test_returns_payload_matches_spec_shape(client: TestClient) -> None:
    response = client.get("/returns", params={"start": "2024-01-02", "end": "2024-01-05"})

    assert response.status_code == 200
    body = response.json()
    assert set(body) == set(MAG7)
    assert body["MSFT"][0] == {"date": "2024-01-03", "return": 0.01}
    assert all(
        set(point) == {"date", "return"} for points in body.values() for point in points
    )


def test_malformed_date_is_rejected(client: TestClient) -> None:
    response = client.get("/returns", params={"start": "not-a-date", "end": "2024-01-05"})
    assert response.status_code == 422


def test_missing_parameter_is_rejected(client: TestClient) -> None:
    assert client.get("/returns", params={"start": "2024-01-02"}).status_code == 422


def test_inverted_range_is_rejected(client: TestClient) -> None:
    response = client.get("/returns", params={"start": "2024-02-01", "end": "2024-01-01"})

    assert response.status_code == 400
    assert "on or before" in response.json()["detail"]


def test_excessive_range_is_rejected(client: TestClient) -> None:
    response = client.get("/returns", params={"start": "1900-01-01", "end": "2024-01-01"})
    assert response.status_code == 400


def test_upstream_failure_maps_to_502_with_message() -> None:
    def failing_fetch(symbols: tuple[str, ...], start: date, end: date) -> pd.DataFrame:
        raise PriceFetchError("price provider request failed: connection reset")

    client = TestClient(create_app(service=ReturnsService(fetch=failing_fetch)))
    response = client.get("/returns", params={"start": "2024-01-02", "end": "2024-01-05"})

    assert response.status_code == 502
    assert "connection reset" in response.json()["detail"]


def test_symbols_and_health_endpoints(client: TestClient) -> None:
    assert client.get("/symbols").json() == {"symbols": list(MAG7)}
    assert client.get("/health").json() == {"status": "ok"}
