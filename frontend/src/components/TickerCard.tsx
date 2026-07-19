import {
	Brush,
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'

import { computeStats, formatPercent } from '../lib/stats'
import type { ReturnPoint } from '../types'

interface TickerCardProps {
	symbol: string
	points: ReturnPoint[]
}

/** One grid cell: a symbol's return series plus its min/max/mean footer. */
export function TickerCard({ symbol, points }: TickerCardProps) {
	const stats = computeStats(symbol, points)
	const positive = stats.cumulative >= 0

	if (points.length === 0) {
		return (
			<article className="card">
				<header className="card-header">
					<h2>{symbol}</h2>
				</header>
				<p className="card-empty">No return data in this range.</p>
			</article>
		)
	}

	return (
		<article className="card">
			<header className="card-header">
				<h2>{symbol}</h2>
				<span className={positive ? 'delta positive' : 'delta negative'}>
					{formatPercent(stats.cumulative)}
				</span>
			</header>

			<div className="card-chart">
				<ResponsiveContainer width="100%" height={180}>
					<LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
						<XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={28} />
						<YAxis
							tick={{ fontSize: 11 }}
							width={52}
							tickFormatter={(value: number) => `${(value * 100).toFixed(1)}%`}
						/>
						<Tooltip
							formatter={(value: number) => [formatPercent(value), 'Return']}
							labelFormatter={(label: string) => label}
							contentStyle={{ fontSize: 12 }}
						/>
						<ReferenceLine y={0} stroke="var(--axis)" />
						<Line
							type="monotone"
							dataKey="return"
							stroke={positive ? 'var(--up)' : 'var(--down)'}
							strokeWidth={1.6}
							dot={false}
							isAnimationActive={false}
						/>
						{/* Brush is the zoom affordance: drag its handles to narrow the window. */}
						<Brush dataKey="date" height={18} travellerWidth={8} stroke="var(--axis)" />
					</LineChart>
				</ResponsiveContainer>
			</div>

			<dl className="card-stats">
				<div>
					<dt>Min</dt>
					<dd className="negative">{formatPercent(stats.min)}</dd>
				</div>
				<div>
					<dt>Max</dt>
					<dd className="positive">{formatPercent(stats.max)}</dd>
				</div>
				<div>
					<dt>Mean</dt>
					<dd>{formatPercent(stats.mean)}</dd>
				</div>
			</dl>
		</article>
	)
}
