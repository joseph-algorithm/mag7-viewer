import { useEffect, useMemo, useRef, useState } from 'react'
import {
	Brush,
	CartesianGrid,
	Line,
	LineChart,
	ReferenceArea,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'

import { clampRange, fullRange, isFullRange, resolveDragSelection } from '../lib/dragRange'
import { computeStats, formatPercent } from '../lib/stats'
import { TOOLTIP_Y, anchorX } from '../lib/tooltipAnchor'
import type { ReturnPoint } from '../types'

interface TickerCardProps {
	symbol: string
	points: ReturnPoint[]
}

/** Recharts hands mouse callbacks the active category label for the hovered point. */
interface ChartMouseState {
	activeLabel?: string | number
	/** Cursor x within the chart container, in pixels. */
	chartX?: number
}

function labelOf(state: ChartMouseState | null): string | null {
	const label = state?.activeLabel
	return typeof label === 'string' ? label : null
}

/** One grid cell: a symbol's return series plus its min/max/mean footer. */
export function TickerCard({ symbol, points }: TickerCardProps) {
	const stats = computeStats(symbol, points)
	const positive = stats.cumulative >= 0

	const labels = useMemo(() => points.map((point) => point.date), [points])
	const [range, setRange] = useState(() => fullRange(points.length))
	const [dragStart, setDragStart] = useState<string | null>(null)
	const [dragEnd, setDragEnd] = useState<string | null>(null)
	const chartRef = useRef<HTMLDivElement>(null)
	const [cursorX, setCursorX] = useState<number | null>(null)

	// A new date range replaces the series, so any existing zoom no longer applies.
	useEffect(() => {
		setRange(fullRange(points.length))
		setDragStart(null)
		setDragEnd(null)
	}, [points])

	const visible = clampRange(range, points.length)
	const zoomed = !isFullRange(visible, points.length)

	function beginDrag(state: ChartMouseState | null) {
		const label = labelOf(state)
		if (label === null) return
		setDragStart(label)
		setDragEnd(label)
	}

	function extendDrag(state: ChartMouseState | null) {
		if (typeof state?.chartX === 'number') setCursorX(state.chartX)
		if (dragStart === null) return
		const label = labelOf(state)
		if (label !== null) setDragEnd(label)
	}

	/**
	 * The last cursor x is deliberately retained. Clearing it would drop the
	 * tooltip back to Recharts' default placement for the first frame of the
	 * next hover, which shows up as a visible jump on re-entry.
	 */
	function leaveChart() {
		commitDrag()
	}

	/**
	 * Pin the tooltip relative to the cursor rather than to the active point, at a
	 * constant vertical position. Recharts' own placement tracks the data point and
	 * flips on its own, which reads as jitter.
	 */
	const tooltipPosition =
		cursorX === null
			? undefined
			: {
					x: anchorX({
						cursorX,
						containerWidth: chartRef.current?.clientWidth ?? 0,
					}),
					y: TOOLTIP_Y,
				}

	/**
	 * Commit the drag. Because the brush is controlled by the same `range` state, the
	 * slider handles land on the dragged window without any extra wiring.
	 */
	function commitDrag() {
		const selection = resolveDragSelection(labels, dragStart, dragEnd)
		if (selection) setRange(selection)
		setDragStart(null)
		setDragEnd(null)
	}

	function resetZoom() {
		setRange(fullRange(points.length))
	}

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
				<div className="card-header-right">
					{zoomed && (
						<button type="button" className="reset-zoom" onClick={resetZoom}>
							Reset zoom
						</button>
					)}
					<span className={positive ? 'delta positive' : 'delta negative'}>
						{formatPercent(stats.cumulative)}
					</span>
				</div>
			</header>

			<div className="card-chart" ref={chartRef}>
				<ResponsiveContainer width="100%" height={180}>
					<LineChart
						data={points}
						margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
						style={{ cursor: 'crosshair' }}
						onMouseDown={beginDrag}
						onMouseMove={extendDrag}
						onMouseUp={commitDrag}
						onMouseLeave={leaveChart}
					>
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
							position={tooltipPosition}
							// The wrapper animates its transform by default, so the panel
							// glides after the cursor instead of tracking it.
							isAnimationActive={false}
							allowEscapeViewBox={{ x: false, y: false }}
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
						{/* Live preview of the range being dragged across the plot area. */}
						{dragStart !== null && dragEnd !== null && dragStart !== dragEnd && (
							<ReferenceArea
								x1={dragStart}
								x2={dragEnd}
								strokeOpacity={0.3}
								fill="var(--axis)"
								fillOpacity={0.25}
							/>
						)}
						{/*
						 * Controlled by the same state the drag writes, so the slider and the
						 * plot always agree; dragging its handles feeds `range` straight back.
						 */}
						<Brush
							dataKey="date"
							height={18}
							travellerWidth={8}
							stroke="var(--axis)"
							startIndex={visible.startIndex}
							endIndex={visible.endIndex}
							onChange={(next: { startIndex?: number; endIndex?: number }) => {
								if (next.startIndex === undefined || next.endIndex === undefined) return
								setRange({ startIndex: next.startIndex, endIndex: next.endIndex })
							}}
						/>
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
