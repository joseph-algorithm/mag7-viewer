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

<!-- tsift:code-navigation v=0.1.77 -->
## Code Navigation

Keep this block self-contained for Codex/OpenCode prompt reuse. If this repository also ships current `.claude/skills/tsift/SKILL.md` or `runbooks/code-navigation.md`, use those deeper runbooks for command detail instead of expanding this block.

Run `tsift status` at session start from the owning repo root. If the task or file lives under a git submodule (for example `src/tsift/...`), switch to that submodule root first so the harness loads the narrower local instructions and repo state instead of the superproject root. If status prints a `run:` recommendation for stale or missing tsift state, run `tsift status --fix` before relying on tsift results; when the harness cannot perform write commands, ask the user to run the printed command instead. Codex projects can install a prompt-time auto-reindex hook with `tsift init --codex`; OpenCode projects can install per-project tsift command shortcuts with `tsift init --opencode`.

Use the commands listed in its `use:` output:
- `tsift --envelope source-read <file> --budget normal` — AST-symbol projection with span metadata and source-window expansion commands (prefer over cat/head for source code files)
- `tsift --envelope symbol-read <symbol> --budget normal` — token-budgeted symbol body, AST span metadata, child refs, and graph/source expansion commands
- `tsift --envelope search <query> --budget normal` — AST-aware hybrid search preview (prefer over grep/rg)
- `tsift --envelope explain <symbol> --budget normal` — callers, callees, community preview
- `tsift graph <symbol> --callers` / `--callees` — call graph navigation
- `tsift summarize <symbol>` — cached summary (only when listed in `use:`)
- `tsift workflow search` — ordered exact/search/explain/summarize/digest recipe that preserves result handles across expansions

When a search envelope includes `report.scale_guard`, run one of its `narrow_commands` before dispatching parallel agents. The guard means the original result set or corpus is broad enough that fan-out should start from a narrower cited handle, path, or exact query.

Prefer bounded digest commands over raw transcript, diff, and verbose-log reads:
- `tsift --envelope session-review <path> --next-context --budget normal` or `tsift --envelope context-pack <path> --budget normal` instead of replaying long session docs, JSONL transcripts, or agent-doc runtime logs with `cat`, `tail`, or `sed`.
- `tsift diff-digest [path]` (`--cached`, `--revision <rev>`) instead of `git diff`, `git show`, or patch-style `git log`.
- `tsift --envelope digest-runner --kind test --path . --shell-command '<test command>'` / `tsift --envelope digest-runner --kind log --path . --shell-command '<build command>'` for noisy test/build/install output, or let the rewrite/hooks create those artifact-backed envelopes for `cargo test`, `pytest`, and verbose cargo commands.
- If RTK is installed, digest-runner delegates supported generic command families through `rtk rewrite` and records the chosen compact filter in `report.filter` while preserving tsift artifact handles.
- Codex, OpenCode, and other harnesses without Claude-style `PreToolUse` hooks should run `tsift rewrite --run '<command>'` before broad `rg`/recursive grep, raw transcript/session/log reads, `git diff`/`git show`/single-patch `git log`, `cargo test`/`pytest`, and cargo build/check/clippy/install commands so the same search, session-digest, diff-digest, and digest-runner rewrites apply manually. OpenCode can install this path as `/tsift-rewrite-run` with `tsift init --opencode`.

For local verification, run `make check` before committing. After local changes, check the latest GitHub Actions CI run with `gh run list --workflow CI --limit 1` and fix any failing tests before calling the work complete.

Only read full source files when tsift results are insufficient.
<!-- /tsift:code-navigation -->
