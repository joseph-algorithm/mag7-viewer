import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

import { ResetZoomButton } from './ResetZoomButton'
import { placeBrushLabels } from '../lib/brushLabels'
import { isDragGesture } from '../lib/dragIntent'
import { clampRange, fullRange, isFullRange, resolveDragSelection } from '../lib/dragRange'
import { computeStats, formatPercent } from '../lib/stats'
import { TOOLTIP_Y, anchorX } from '../lib/tooltipAnchor'
import type { ReturnPoint } from '../types'

interface TickerCardProps {
	symbol: string
	points: ReturnPoint[]
}

/**
 * Width reserved at the right edge for the reset-zoom control.
 *
 * Applied unconditionally so the plot and the brush keep the same geometry
 * whether or not the control is currently shown.
 */
const RESET_GUTTER = 26

/** Width of a `YYYY-MM-DD` label at the size the brush labels render. */
const BRUSH_LABEL_WIDTH = 72

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
	const [labelPlacement, setLabelPlacement] = useState<{ left: number; right: number } | null>(
		null,
	)
	/**
	 * Native pointer x at mousedown, for telling a zoom drag from a click.
	 *
	 * Deliberately taken from the DOM event on the container rather than from
	 * Recharts' `chartX`: Recharts does not deliver onMouseMove while the button
	 * is held, so a chartX-derived travel distance stays pinned at its press
	 * value and the gesture always classifies as a click.
	 */
	const pressX = useRef<number | null>(null)
	/** Whether the gesture that just finished was a drag; gates the reset. */
	const lastGestureWasDrag = useRef(false)

	// A new date range replaces the series, so any existing zoom no longer applies.
	useEffect(() => {
		setRange(fullRange(points.length))
		setDragStart(null)
		setDragEnd(null)
	}, [points])

	const visible = clampRange(range, points.length)
	const zoomed = !isFullRange(visible, points.length)

	/**
	 * Measure the brush handles and place the labels under them.
	 *
	 * The handle positions come from the rendered SVG rather than being derived
	 * from indices, so the labels stay correct regardless of the chart's internal
	 * margins. Runs in a layout effect so the labels never paint at a stale spot.
	 */
	useLayoutEffect(() => {
		const container = chartRef.current
		if (!container) return

		let frame = 0

		function measure() {
			const host = chartRef.current
			if (!host) return
			const travellers = host.querySelectorAll('.recharts-brush-traveller')
			if (travellers.length < 2) {
				// ResponsiveContainer settles its width asynchronously, so the brush can
				// render after this effect runs. Retry on the next frame rather than
				// waiting for a resize that may never arrive — otherwise the labels are
				// simply absent for the lifetime of the card.
				frame = requestAnimationFrame(measure)
				return
			}

			const hostBox = host.getBoundingClientRect()
			const [startBox, endBox] = [travellers[0], travellers[1]].map((node) =>
				node.getBoundingClientRect(),
			)
			setLabelPlacement(
				placeBrushLabels({
					startX: startBox.left + startBox.width / 2 - hostBox.left,
					endX: endBox.left + endBox.width / 2 - hostBox.left,
					labelWidth: BRUSH_LABEL_WIDTH,
					containerWidth: hostBox.width,
				}),
			)
		}

		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(container)
		return () => {
			cancelAnimationFrame(frame)
			observer.disconnect()
		}
	}, [visible.startIndex, visible.endIndex, points.length])

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

	/**
	 * Double-click anywhere on the plot resets the zoom — the convention Plotly,
	 * Highcharts, and TradingView share, so it is the gesture users try first.
	 *
	 * Gated on the preceding gesture: a drag-to-zoom whose endpoints land close
	 * together would otherwise read as a double-click and immediately undo the
	 * zoom the user just made.
	 */
	function handleDoubleClick() {
		if (lastGestureWasDrag.current) {
			lastGestureWasDrag.current = false
			return
		}
		resetZoom()
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
					<span className={positive ? 'delta positive' : 'delta negative'}>
						{formatPercent(stats.cumulative)}
					</span>
				</div>
			</header>

			<div
				className="card-chart"
				ref={chartRef}
				onMouseDown={(event) => {
					pressX.current = event.clientX
				}}
				onMouseUp={(event) => {
					lastGestureWasDrag.current = isDragGesture(pressX.current, event.clientX)
					pressX.current = null
				}}
				onDoubleClick={handleDoubleClick}
			>
				{/*
				 * Overlaid rather than placed in flow, and the chart's right margin is a
				 * constant, so the plot geometry does not change when the control appears.
				 */}
				{zoomed && <ResetZoomButton onClick={resetZoom} />}
				<ResponsiveContainer width="100%" height={180}>
					<LineChart
						data={points}
						margin={{ top: 4, right: RESET_GUTTER, bottom: 0, left: -12 }}
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

				{/*
				 * Rendered below the brush rather than on it. Recharts' own labels sit
				 * inline on the slider row, where they crowd the handles and collide
				 * with the reset control; those are hidden in CSS.
				 */}
				{labelPlacement && (
					<div className="brush-labels">
						<span className="brush-label" style={{ left: labelPlacement.left }}>
							{labels[visible.startIndex]}
						</span>
						<span className="brush-label" style={{ left: labelPlacement.right }}>
							{labels[visible.endIndex]}
						</span>
					</div>
				)}
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
