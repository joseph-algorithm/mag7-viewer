# mag7-viewer — behaviour spec

What the app must do, stated so a change can be checked against it. Rationale
for how it is built lives in [AGENTS.md](AGENTS.md); setup lives in
[README.md](README.md).

## Universe

The seven MAG7 tickers, in a fixed order: MSFT, AAPL, GOOGL, AMZN, NVDA, META,
TSLA. Order is stable so the grid renders deterministically.

## API

### `GET /returns?start=&end=`

Returns `{data, unavailable}` for the inclusive date range.

| Rule | |
|---|---|
| Accounting | Every requested symbol appears in exactly one of `data` or `unavailable` |
| Unavailable | Each entry carries a human-readable `reason`; a symbol is never omitted silently |
| Reasons are distinct | "no data at all" and "prices but no complete trading day" are different causes and must not be collapsed |
| Returns | Simple daily fractional change of the adjusted close, rounded to 6 decimals |
| First day | Dropped — a return needs a prior close, so N trading days yield N−1 points |
| Gaps | Per-symbol NaN days are skipped, not emitted as null |
| Empty result | 502 when *no* symbol produced a usable series |

Validation: `start > end` → 400; range > 10 years → 400; malformed or missing
dates → 422.

Caching is per-process, keyed by the exact `(start, end)` pair, 15-minute TTL,
LRU eviction at 128 entries. A repeated range must not reach the provider.

## Chart card

One card per symbol in the `data` map. Each card shows a line chart, a range
slider beneath it, the selected range's dates, and min/max/mean plus cumulative
return.

### Zoom

| Gesture | Effect |
|---|---|
| Drag across the plot | Zoom to the dragged range |
| Drag the slider track | Select that range |
| Drag the slider window, unzoomed | Select that range |
| Drag the slider window, zoomed | Pan the window |
| Drag a slider handle | Resize the window |
| Double-click the plot | Reset to full range |
| Reset icon | Reset to full range |

Invariants:

- The slider and the chart always agree — they are driven by one piece of state.
- A drag whose pointer travel exceeds the slop threshold is a drag, not a
  click. A double-click must never undo a zoom the same gesture just created.
- A click with no travel leaves the range unchanged; it must not collapse the
  range to a point.
- Zoom is per card. Zooming one card must not affect the other six.
- The reset control appears only when zoomed, so its presence is also the
  signal that there is something to reset.

### Tooltip

Pinned at a constant offset from the cursor, at a constant vertical position,
at a fixed width. It changes side only when the right edge would clip it, and
flips at most once across a sweep. No transition — the panel tracks the cursor
rather than gliding after it.

### Slider labels

The two range dates render below the slider, never on it. They are centred
under their handles, clamped inside the container, and pushed apart when the
handles are close enough that they would collide. **They must never overlap and
never leave the container**, at any handle position.

## Layout

- Responsive grid, reflowing from four columns to one.
- The plot's geometry does not change when the reset control appears or
  disappears; its gutter is reserved unconditionally.
- Nothing that is anchored to the chart container may shift when a row is added
  below the chart.

## Loading and failure

| State | Behaviour |
|---|---|
| First load | Skeleton cards holding the grid's final geometry — no reflow when data lands |
| Refresh | Existing data stays on screen and dims; the grid must not be displaced |
| Any fetch in flight | Ambient spinner fixed to the viewport edge, out of document flow |
| Range change | Debounced; in-flight requests aborted so a slow reply cannot overwrite a newer range |
| Error | Banner with a retry control; the backend's message is shown verbatim, as it is written for users |
| Unavailable symbols | Named in a notice, grouped by reason |

## Accessibility

- Sort state exposed via `aria-sort`; refresh state via `aria-busy`.
- Icon-only controls carry an accessible name and a `title`.
- The loading indicator is a live region, replacing the announcement the old
  inline text provided.
- `prefers-reduced-motion` disables the skeleton pulse and slows the spinner.
