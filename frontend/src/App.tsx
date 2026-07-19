import { useMemo, useState } from 'react'

import { DateRangePicker } from './components/DateRangePicker'
import { ErrorBanner } from './components/ErrorBanner'
import { SummaryTable } from './components/SummaryTable'
import { TickerCard } from './components/TickerCard'
import { useReturns } from './hooks/useReturns'
import { computeAllStats } from './lib/stats'

/** Default window: the trailing 6 months, which covers ~125 trading days. */
function defaultRange(): { start: string; end: string } {
	const end = new Date()
	const start = new Date(end)
	start.setMonth(start.getMonth() - 6)
	return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export default function App() {
	const [range, setRange] = useState(defaultRange)
	const { data, loading, error, retry } = useReturns(range.start, range.end)

	const stats = useMemo(() => (data ? computeAllStats(data) : []), [data])
	const symbols = data ? Object.keys(data) : []

	return (
		<div className="app">
			<header className="app-header">
				<div>
					<h1>MAG7 Return Viewer</h1>
					<p className="subtitle">Daily percentage returns from Yahoo Finance</p>
				</div>
				<DateRangePicker
					start={range.start}
					end={range.end}
					onChange={setRange}
					disabled={loading}
				/>
			</header>

			{error && <ErrorBanner message={error} onRetry={retry} />}

			{loading && <p className="status">Loading returns…</p>}

			{!loading && !error && data && symbols.length === 0 && (
				<p className="status">No symbols returned for this range.</p>
			)}

			{data && symbols.length > 0 && (
				<>
					<div className="grid">
						{symbols.map((symbol) => (
							<TickerCard key={symbol} symbol={symbol} points={data[symbol]} />
						))}
					</div>
					<SummaryTable stats={stats} />
				</>
			)}
		</div>
	)
}
