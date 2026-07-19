"""Tests for the TTL/LRU cache."""

from __future__ import annotations

from app.cache import TTLCache


class FakeClock:
    """Manually advanced clock so TTL tests never sleep."""

    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def test_hit_before_expiry_and_miss_after() -> None:
    clock = FakeClock()
    cache: TTLCache[str, int] = TTLCache(ttl_seconds=10, clock=clock)
    cache.set("k", 1)

    clock.advance(9)
    assert cache.get("k") == 1

    clock.advance(2)
    assert cache.get("k") is None
    assert len(cache) == 0


def test_distinct_keys_do_not_collide() -> None:
    cache: TTLCache[tuple[str, str], int] = TTLCache()
    cache.set(("2024-01-01", "2024-02-01"), 1)
    cache.set(("2024-01-01", "2024-03-01"), 2)

    assert cache.get(("2024-01-01", "2024-02-01")) == 1
    assert cache.get(("2024-01-01", "2024-03-01")) == 2


def test_lru_eviction_at_capacity() -> None:
    cache: TTLCache[str, int] = TTLCache(max_entries=2)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.get("a")  # "a" becomes most recently used, so "b" is next out.
    cache.set("c", 3)

    assert cache.get("a") == 1
    assert cache.get("b") is None
    assert cache.get("c") == 3


def test_missing_key_returns_none() -> None:
    assert TTLCache[str, int]().get("absent") is None


def test_clear_drops_all_entries() -> None:
    cache: TTLCache[str, int] = TTLCache()
    cache.set("a", 1)
    cache.clear()
    assert len(cache) == 0
