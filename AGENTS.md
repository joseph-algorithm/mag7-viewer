# mag7-viewer — agent guide

MAG7 daily-return dashboard. FastAPI + pandas + yfinance backend, React 18 +
TypeScript + Recharts frontend. Behaviour contract lives in [SPEC.md](SPEC.md);
read it before changing interaction code.

## Verify before you claim

`make check` — backend pytest + mypy, frontend vitest + typecheck + production
build. It must be green before any change is called done.

`make check` is necessary but **not sufficient for UI work**. The interaction
bugs in this repo's history all passed the suite and failed in the browser.
Drive the real app for anything touching layout, pointer handling, or chart
internals.

## Verifying UI changes

Run `make dev` and drive the page. Two traps, both of which have produced
false passes here:

- **`element.click()` proves a handler is wired, never that a control is
  reachable.** It bypasses hit-testing, so it passes on a button buried under
  an overlay. For anything positioned or overlaid, resolve the target with
  `document.elementFromPoint(x, y)` and dispatch there.
- **Recharts does not respond to synthetic pointer events** for brush drags or
  plot drags, and does not deliver `onMouseMove` while a button is held. A
  gesture that "does nothing" in a script may work fine for a user, and a guard
  derived from Recharts' `chartX` during a drag will be inert. Use native DOM
  coordinates for gesture maths, and force state in code when a gesture cannot
  be driven — then revert and confirm the revert.

## Layout invariants

The chart card packs several absolutely-positioned pieces into one container.
**Anything anchored to the chart container's bottom edge drifts when a row is
added below the chart** — this has caused two separate bugs. Anchor to the
element you belong to, measured, not to the container.

Measurements of Recharts internals belong in the layout effect in
`TickerCard.tsx`, which already measures the brush and its handles.
`ResponsiveContainer` settles its width asynchronously, so a measurement on
mount can run before the chart exists — retry on an animation frame rather than
waiting for a resize that may never arrive.

## Code shape

Interaction geometry lives in `frontend/src/lib/` as pure functions with unit
tests — tooltip anchoring, brush label placement, drag-vs-click classification,
track selection, zoom range resolution. Keep new geometry there: it is the only
part of the UI that can be tested without a browser, so it is where the
generalising assertions go (sweep the whole input space, not three examples).

The backend is split so each layer is independently testable and injectable:
`fetcher` → `returns` → `cache` → `service` → `api`. Tests inject a fixture
frame, so the suite never touches the network. Keep it that way.

## Data contract

`GET /returns` answers `{data, unavailable}`. Every requested symbol appears in
exactly one of the two, and an unavailable symbol carries a reason. **Never
drop a symbol silently** — absence must not be the only signal that something
is missing. This was a real defect, not a hypothetical.
