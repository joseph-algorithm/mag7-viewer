import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'

import { DateRangePicker } from './components/DateRangePicker'
import { ErrorBanner } from './components/ErrorBanner'
import { LoadingIndicator } from './components/LoadingIndicator'
import { MasterRangeSlider } from './components/MasterRangeSlider'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { SkeletonGrid } from './components/SkeletonGrid'
import { SummaryTable } from './components/SummaryTable'
import { TickerCard } from './components/TickerCard'
import { UnavailableNotice } from './components/UnavailableNotice'
import { useReturns } from './hooks/useReturns'
import { computeAllStats } from './lib/stats'
import { presetRange } from './lib/dateRange'
import type { BrushDateRange } from './lib/dragRange'
import { shouldCloseHelp, shouldOpenHelp } from './lib/helpKey'
import {
  createRangeSelection,
  type DateRange,
  rangeSelectionReducer,
} from './lib/rangeSelection'
import { rangeFromSearch, urlWithRange } from './lib/rangeUrl'
import { isRefreshing, viewState } from './lib/viewState'

function todayIso(): string {
	return new Date().toISOString().slice(0, 10)
}

/** Default window: the trailing 6 months, which covers ~125 trading days. */
function defaultRange(today: string): DateRange {
  return presetRange('6M', today)
}

function initialRange(today: string): DateRange {
  const fallback = defaultRange(today)
  if (typeof window === 'undefined') return fallback
  return rangeFromSearch(window.location.search, today) ?? fallback
}

export default function App() {
  const [today] = useState(todayIso)
  const [ranges, dispatchRange] = useReducer(
    rangeSelectionReducer,
    today,
    (initialToday) => createRangeSelection(initialRange(initialToday)),
  )
  const { data, loading, error, retry } = useReturns(
    ranges.committed.start,
    ranges.committed.end,
  )

	const stats = useMemo(() => (data ? computeAllStats(data.data) : []), [data])
  const symbols = data ? Object.keys(data.data) : []
  const unavailable = data?.unavailable ?? []
  const [helpOpen, setHelpOpen] = useState(false)
  const [brushSelection, setBrushSelection] = useState<{
    source: typeof data
    range: BrushDateRange | null
  }>({ source: data, range: null })
  /*
   * A fetched date range replaces every series. Treat a selection belonging
   * to the previous payload as reset during render, before the new points can
   * paint through stale dates.
   */
  const brushRange = brushSelection.source === data ? brushSelection.range : null

  const updateBrushRange = useCallback((next: BrushDateRange | null) => {
    setBrushSelection((current) => {
      if (
        current.source === data &&
        (current.range === next ||
          (current.range !== null &&
            next !== null &&
            current.range.start === next.start &&
            current.range.end === next.end))
      ) {
        return current
      }
      return { source: data, range: next }
    })
  }, [data])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
			const target = event.target as HTMLElement | null
			const context = {
				key: event.key,
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
				altKey: event.altKey,
				targetTag: target?.tagName,
				targetIsEditable: target?.isContentEditable,
			}
			if (shouldOpenHelp(context)) {
				event.preventDefault()
				setHelpOpen(true)
			} else if (shouldCloseHelp(context)) {
				setHelpOpen(false)
			}
		}
		window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    const nextUrl = urlWithRange(window.location, ranges.committed)
    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, '', nextUrl)
    }
  }, [ranges.committed.end, ranges.committed.start])

  const view = viewState({ data, loading, error })
  const refreshing = isRefreshing({ data, loading })

  function previewRange(range: DateRange) {
    dispatchRange({ type: 'preview', range })
  }

  function commitRange(range: DateRange) {
    dispatchRange({ type: 'commit', range })
  }

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Viewer controls">
        <div className="sidebar-inner">
          <header className="app-header">
            <p className="eyebrow">Market dashboard</p>
            <h1>MAG7 Return Viewer</h1>
            <p className="subtitle">
              Daily percentage returns from Yahoo Finance ·{' '}
              <button type="button" className="help-hint" onClick={() => setHelpOpen(true)}>
                press <kbd>?</kbd> for shortcuts
              </button>
            </p>
          </header>

          <section className="control-panel" aria-labelledby="time-window-heading">
            <div className="control-panel-heading">
              <p className="eyebrow">Controls</p>
              <h2 id="time-window-heading">Time window</h2>
              <p>Set the dates directly or choose a preset range.</p>
            </div>

            <DateRangePicker
              start={ranges.draft.start}
              end={ranges.draft.end}
              onChange={commitRange}
            />

            <MasterRangeSlider
              start={ranges.draft.start}
              end={ranges.draft.end}
              today={today}
              onChange={previewRange}
              onCommit={commitRange}
            />
          </section>
        </div>
      </aside>

      <main className="main-area">
        <header className="detail-header">
          <div>
            <p className="eyebrow">Performance detail</p>
            <h2>Magnificent Seven returns</h2>
          </div>
          <p>Compare daily moves and compounded performance across the full group.</p>
        </header>

        {error && <ErrorBanner message={error} onRetry={retry} />}

        {view === 'skeleton' && <SkeletonGrid />}

        {view === 'empty' && <p className="status">No symbols returned for this range.</p>}

        {unavailable.length > 0 && <UnavailableNotice symbols={unavailable} />}

        {view === 'grid' && data && (
          <div className="results" aria-busy={refreshing}>
            <div className="grid">
              {symbols.map((symbol) => (
                <TickerCard
                  key={symbol}
                  symbol={symbol}
                  points={data.data[symbol]}
                  brushRange={brushRange}
                  onBrushRangeChange={updateBrushRange}
                />
              ))}
            </div>
            <SummaryTable stats={stats} />
          </div>
        )}

        {loading && <LoadingIndicator label={refreshing ? 'Updating returns' : 'Loading returns'} />}
      </main>

      {helpOpen && <ShortcutsDialog onClose={() => setHelpOpen(false)} />}
    </div>
  )
}
