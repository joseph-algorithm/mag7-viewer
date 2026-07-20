import { useEffect, useMemo, useState } from 'react'

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
import { shouldCloseHelp, shouldOpenHelp } from './lib/helpKey'
import { isRefreshing, viewState } from './lib/viewState'

function todayIso(): string {
	return new Date().toISOString().slice(0, 10)
}

/** Default window: the trailing 6 months, which covers ~125 trading days. */
function defaultRange(): { start: string; end: string } {
	return presetRange('6M', todayIso())
}

export default function App() {
	const [range, setRange] = useState(defaultRange)
	const [today] = useState(todayIso)
	const { data, loading, error, retry } = useReturns(range.start, range.end)

	const stats = useMemo(() => (data ? computeAllStats(data.data) : []), [data])
	const symbols = data ? Object.keys(data.data) : []
	const unavailable = data?.unavailable ?? []
	const [helpOpen, setHelpOpen] = useState(false)

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
	const view = viewState({ data, loading, error })
	const refreshing = isRefreshing({ data, loading })

	return (
		<div className="app">
			<header className="app-header">
				<div>
					<h1>MAG7 Return Viewer</h1>
					<p className="subtitle">
						Daily percentage returns from Yahoo Finance ·{' '}
						<button type="button" className="help-hint" onClick={() => setHelpOpen(true)}>
							press <kbd>?</kbd> for shortcuts
						</button>
					</p>
				</div>
				<DateRangePicker
					start={range.start}
					end={range.end}
					onChange={setRange}
					disabled={loading}
				/>
			</header>

			<MasterRangeSlider
				start={range.start}
				end={range.end}
				today={today}
				disabled={loading}
				onChange={setRange}
			/>

			{error && <ErrorBanner message={error} onRetry={retry} />}

			{view === 'skeleton' && <SkeletonGrid />}

			{view === 'empty' && <p className="status">No symbols returned for this range.</p>}

			{unavailable.length > 0 && <UnavailableNotice symbols={unavailable} />}

			{view === 'grid' && data && (
				<div className="results" aria-busy={refreshing} data-refreshing={refreshing || undefined}>
					<div className="grid">
						{symbols.map((symbol) => (
							<TickerCard key={symbol} symbol={symbol} points={data.data[symbol]} />
						))}
					</div>
					<SummaryTable stats={stats} />
				</div>
			)}

			{helpOpen && <ShortcutsDialog onClose={() => setHelpOpen(false)} />}

			{loading && <LoadingIndicator label={refreshing ? 'Updating returns' : 'Loading returns'} />}
		</div>
	)
}
