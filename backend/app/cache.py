"""In-memory TTL cache for computed return series.

Deliberately dependency-free and keyed only by the query range, so it can be swapped
for a shared cache (Redis, memcached) by reimplementing :class:`TTLCache`'s two methods.
"""

from __future__ import annotations

import threading
import time
from collections import OrderedDict
from collections.abc import Callable, Hashable
from typing import Generic, TypeVar

K = TypeVar("K", bound=Hashable)
V = TypeVar("V")

DEFAULT_TTL_SECONDS = 15 * 60
DEFAULT_MAX_ENTRIES = 128


class TTLCache(Generic[K, V]):
    """Thread-safe cache with per-entry expiry and LRU eviction.

    yfinance is unauthenticated and rate limited, so repeated identical date ranges
    (the common case when a user tweaks the UI) must not reach the network.
    """

    def __init__(
        self,
        ttl_seconds: float = DEFAULT_TTL_SECONDS,
        max_entries: int = DEFAULT_MAX_ENTRIES,
        clock: Callable[[], float] | None = None,
    ) -> None:
        self._ttl = ttl_seconds
        self._max_entries = max_entries
        self._clock = clock or time.monotonic
        self._lock = threading.Lock()
        self._entries: OrderedDict[K, tuple[float, V]] = OrderedDict()

    def get(self, key: K) -> V | None:
        """Return the cached value for ``key``, or ``None`` if absent or expired."""
        now = self._clock()
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if expires_at <= now:
                del self._entries[key]
                return None
            self._entries.move_to_end(key)
            return value

    def set(self, key: K, value: V) -> None:
        """Store ``value`` under ``key``, evicting the least recently used entry if full."""
        expires_at = self._clock() + self._ttl
        with self._lock:
            self._entries[key] = (expires_at, value)
            self._entries.move_to_end(key)
            while len(self._entries) > self._max_entries:
                self._entries.popitem(last=False)

    def clear(self) -> None:
        """Drop every entry. Used by tests and by a future admin endpoint."""
        with self._lock:
            self._entries.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._entries)
