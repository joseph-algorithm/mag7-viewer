"""Endpoint tests against a stubbed price source."""

from __future__ import annotations

import asyncio
import inspect
import threading
from datetime import date

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient, Response

from app.api import get_returns, get_service, get_symbols, health
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
    assert set(body) == {"data", "unavailable"}
    assert set(body["data"]) == set(MAG7)
    assert body["unavailable"] == []
    assert body["data"]["MSFT"][0] == {"date": "2024-01-03", "return": 0.01}
    assert all(
        set(point) == {"date", "return"}
        for points in body["data"].values()
        for point in points
    )


def test_symbol_with_no_prices_is_reported_not_omitted(close_frame: pd.DataFrame) -> None:
    """The regression this contract exists for: absence must never be silent."""
    partial = close_frame.drop(columns=["MSFT"])
    client = TestClient(
        create_app(service=ReturnsService(fetch=lambda symbols, start, end: partial))
    )

    body = client.get(
        "/returns", params={"start": "2024-01-02", "end": "2024-01-05"}
    ).json()

    assert "MSFT" not in body["data"]
    assert [item["symbol"] for item in body["unavailable"]] == ["MSFT"]
    assert body["unavailable"][0]["reason"]
    # Every requested symbol is accounted for in exactly one of the two buckets.
    assert set(body["data"]) | {item["symbol"] for item in body["unavailable"]} == set(MAG7)


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


def test_all_fastapi_handlers_and_dependencies_are_async() -> None:
    assert inspect.iscoroutinefunction(get_service)
    assert inspect.iscoroutinefunction(get_returns)
    assert inspect.iscoroutinefunction(get_symbols)
    assert inspect.iscoroutinefunction(health)


def test_concurrent_returns_requests_offload_blocking_service_work(
    close_frame: pd.DataFrame,
) -> None:
    second_request_entered_fetch = threading.Event()
    call_lock = threading.Lock()
    call_count = 0
    requests_overlapped = False

    def blocking_fetch(
        symbols: tuple[str, ...], start: date, end: date
    ) -> pd.DataFrame:
        nonlocal call_count, requests_overlapped
        with call_lock:
            call_count += 1
            call_number = call_count

        if call_number == 1:
            requests_overlapped = second_request_entered_fetch.wait(timeout=1)
        else:
            second_request_entered_fetch.set()
        return close_frame

    app = create_app(service=ReturnsService(fetch=blocking_fetch))

    async def request_two_ranges() -> list[Response]:
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            return await asyncio.gather(
                client.get(
                    "/returns",
                    params={"start": "2024-01-02", "end": "2024-01-05"},
                ),
                client.get(
                    "/returns",
                    params={"start": "2024-01-02", "end": "2024-01-06"},
                ),
            )

    responses = asyncio.run(request_two_ranges())

    assert [response.status_code for response in responses] == [200, 200]
    assert requests_overlapped
