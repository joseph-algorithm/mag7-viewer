# MAG7 Interactive Return Viewer

A full-stack app for exploring daily percentage returns of the MAG7 stocks
(MSFT, AAPL, GOOGL, AMZN, NVDA, META, TSLA).

- **Backend** — FastAPI + pandas + yfinance, exposing `/returns?start=&end=` with an
  in-memory TTL cache.
- **Frontend** — React 18 + TypeScript + Recharts, rendering a responsive grid with one
  interactive chart per ticker, a date-range picker, per-ticker summary stats, and a
  sortable cross-ticker summary table.

## Requirements

- Python 3.12+ and [uv](https://docs.astral.sh/uv/) (or plain `pip` + `venv`)
- Node.js 20+

## Setup and run

Two terminals, or `make dev` to run both at once.

### Backend

```bash
cd backend
uv venv
uv pip install -e '.[dev]'
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

The API is then on <http://localhost:8000> (interactive docs at `/docs`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI is on <http://localhost:5173>. Vite proxies `/api/*` to the backend on port 8000,
so both run on one origin in development and CORS never comes into play.

### Everything at once

```bash
make install   # backend venv + npm install
make dev       # run backend and frontend together
make check     # backend tests + mypy, frontend tests + typecheck + build
```

## API

### `GET /returns?start=YYYY-MM-DD&end=YYYY-MM-DD`

Daily fractional returns per symbol over the inclusive range:

```json
{
  "MSFT": [{ "date": "2024-05-02", "return": 0.007343 }],
  "AAPL": [{ "date": "2024-05-02", "return": 0.002381 }]
}
```

| Status | Meaning                                                   |
| ------ | --------------------------------------------------------- |
| 200    | Success                                                   |
| 400    | `start` after `end`, or a range longer than 10 years      |
| 422    | Malformed or missing date parameters                      |
| 502    | Upstream price data unavailable or too thin to difference |

Supporting endpoints: `GET /symbols` (the ticker universe, so the UI does not hardcode
it) and `GET /health`.

## Architecture

The backend is split so each concern is independently testable:

| Module       | Responsibility                                                 |
| ------------ | -------------------------------------------------------------- |
| `fetcher.py` | yfinance access; normalizes single- and multi-symbol responses |
| `returns.py` | Pure pandas transforms from close prices to return records     |
| `cache.py`   | Generic thread-safe TTL + LRU cache                            |
| `service.py` | Composes fetch → compute → cache                               |
| `api.py`     | HTTP surface: validation and error mapping                     |
| `main.py`    | App factory, CORS, configuration                               |

`create_app(service=...)` accepts an injected service, and `ReturnsService(fetch=...)`
accepts an injected fetcher, so the whole suite runs without network access.

Adding a symbol universe, a different price provider, or a shared cache each touch one
module: change `MAG7` in `models.py`, swap the `Fetcher` callable, or reimplement
`TTLCache`'s `get`/`set`.

## Tests

```bash
cd backend  && .venv/bin/python -m pytest && .venv/bin/python -m mypy
cd frontend && npm test && npm run typecheck
```

29 backend tests cover the return math (including NaN gaps, rounding, and unsorted
input), cache TTL/LRU behavior, service caching and error propagation, yfinance response
normalization, and every endpoint status path. 9 frontend tests cover the statistics
helpers. The backend is fully type-annotated and passes `mypy` with
`disallow_untyped_defs`.

## Configuration

| Variable            | Default                 | Applies to | Purpose                       |
| ------------------- | ----------------------- | ---------- | ----------------------------- |
| `CACHE_TTL_SECONDS` | `900`                   | backend    | Cache entry lifetime          |
| `ALLOWED_ORIGINS`   | `http://localhost:5173` | backend    | Comma-separated CORS origins  |
| `BACKEND_URL`       | `http://127.0.0.1:8000` | frontend   | Vite dev proxy target         |
| `VITE_API_BASE_URL` | `/api`                  | frontend   | API base when not using proxy |

## Assumptions

- **Returns are simple daily percentage changes** of the adjusted close
  (`auto_adjust=True`), so splits and dividends are already reflected.
- **The first day of a range has no return.** A return needs a prior close, so a range
  of N trading days yields N−1 points. A range with fewer than two trading days returns
  502 with a message saying to widen it.
- **Only trading days appear.** Weekends and holidays are absent rather than zero-filled.
- **Per-symbol gaps are skipped, not nulled.** If a symbol lacks a close on some day,
  that point is omitted so each series stays numerically clean for charting.
- **Caching is per-process and in-memory**, keyed by the exact date range, with a 15
  minute TTL and LRU eviction at 128 entries. That satisfies the "avoid excessive
  requests" requirement without adding infrastructure; a multi-process deployment would
  want a shared cache.
- **Summary statistics are computed client-side** from the series already fetched, which
  keeps the API surface to the one endpoint the spec defines. Cumulative return is
  compounded (`∏(1 + r) − 1`), not summed, and standard deviation is the sample
  (n−1) form.
- **Ranges are capped at 10 years** as a guard against an accidental decades-long query.
- **The default view is the trailing six months**, chosen to show enough points for the
  charts to be interesting on first load.
- **yfinance is unauthenticated** and rate-limits aggressively; the cache is the
  mitigation. Sustained production use would need a licensed data provider.
