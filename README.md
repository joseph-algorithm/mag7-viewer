# MAG7 Interactive Return Viewer

A full-stack app for exploring daily percentage returns of the MAG7 stocks
(MSFT, AAPL, GOOGL, AMZN, NVDA, META, TSLA).

FastAPI + pandas + yfinance on the back end, React 18 + TypeScript + Recharts on the front.

Behaviour contract: [SPEC.md](SPEC.md). Working on this repo with an agent: [AGENTS.md](AGENTS.md).

## Features

**Charts**

- One interactive line chart per ticker, in a responsive grid
- Drag across a chart to zoom; double-click it or hit the reset icon to restore
- Range slider under each chart, synced with the chart's zoom — drag it to select a
  range, or drag the selected window to pan
- Tooltip pinned at a fixed offset from the cursor, so it does not jitter
- Min, max, mean and cumulative return per ticker

**Data**

- Daily returns for all seven tickers over a chosen date range (up to 10 years)
- Symbols with no usable data are reported with a reason, never silently dropped
- In-memory TTL cache, so a repeated range costs no upstream request
- Async HTTP handlers offload the blocking provider pipeline to worker threads

**Interface**

- Master range slider and preset chips (`1M`…`Max`) driving what gets fetched
- Date-range picker, debounced, with in-flight requests aborted on change
- Sortable cross-ticker summary table with stable column widths
- Data stays on screen during a refresh; an ambient spinner signals the fetch
- Error banner with retry
- Light and dark themes, screen-reader labels, and `?` for a keyboard/mouse cheatsheet

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
uv run dev
```

The API is then on <http://localhost:8000> (interactive docs at `/docs`).

`uv run dev` is a `[project.scripts]` entry point that starts uvicorn with autoreload.
It takes `--host`, `--port`, and `--no-reload`, and reads `HOST`/`PORT` from the
environment — for example `uv run dev --port 8010`.

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
  "data": {
    "MSFT": [{ "date": "2024-05-02", "return": 0.007343 }],
    "AAPL": [{ "date": "2024-05-02", "return": 0.002381 }]
  },
  "unavailable": [
    { "symbol": "TSLA", "reason": "no data returned by the price provider for this range" }
  ]
}
```

Every requested symbol appears in exactly one of `data` or `unavailable`. A symbol
with no usable series is reported with a reason rather than omitted, so a caller can
tell a data gap from a smaller universe — absence alone carries no information.

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
| `api.py`     | Async HTTP surface: validation, worker offload, error mapping   |
| `main.py`    | App factory, CORS, configuration                               |
| `models.py`  | Typed payload shapes and the `MAG7` symbol universe            |

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

35 backend tests cover the return math (including NaN gaps, rounding, and unsorted
input), cache TTL/LRU behavior, service caching and error propagation, unavailable-symbol
reporting, async request concurrency, yfinance response normalization, and every endpoint
status path. 93 frontend
tests cover the statistics helpers and the interaction geometry — zoom range resolution,
tooltip anchoring, brush label placement, drag-vs-click classification, and track
selection. The backend is fully type-annotated and passes `mypy` with
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
