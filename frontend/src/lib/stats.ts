import type { IndexRange } from './dragRange'
import type { ReturnPoint, ReturnsBySymbol, SymbolStats } from '../types'

/**
 * Descriptive statistics for one symbol's return series.
 * An empty series yields zeroed stats so the UI never renders NaN.
 */
export function computeStats(symbol: string, points: ReturnPoint[]): SymbolStats {
	if (points.length === 0) {
		return { symbol, count: 0, min: 0, max: 0, mean: 0, cumulative: 0, volatility: 0 }
	}

	const values = points.map((point) => point.return)
	const sum = values.reduce((acc, value) => acc + value, 0)
	const mean = sum / values.length
	const cumulative = values.reduce((acc, value) => acc * (1 + value), 1) - 1

	// Sample variance needs at least two observations; a single day has no spread.
	const variance =
		values.length > 1
			? values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / (values.length - 1)
			: 0

	return {
		symbol,
		count: values.length,
		min: Math.min(...values),
		max: Math.max(...values),
		mean,
		cumulative,
		volatility: Math.sqrt(variance),
	}
}

/**
 * Stats over an inclusive index window of a series — the brush selection.
 * Slices to [startIndex, endIndex] and defers to computeStats, so an empty
 * or single-point window is handled identically to the full series.
 */
export function computeVisibleStats(
	symbol: string,
	points: ReturnPoint[],
	{ startIndex, endIndex }: IndexRange,
): SymbolStats {
	return computeStats(symbol, points.slice(startIndex, endIndex + 1))
}

/** Stats for every symbol in the payload, in the payload's own key order. */
export function computeAllStats(data: ReturnsBySymbol): SymbolStats[] {
	return Object.entries(data).map(([symbol, points]) => computeStats(symbol, points))
}

/** Format a fraction as a signed percentage, e.g. 0.0123 -> "+1.23%". */
export function formatPercent(value: number, digits = 2): string {
	if (!Number.isFinite(value)) return '—'
	const sign = value > 0 ? '+' : ''
	return `${sign}${(value * 100).toFixed(digits)}%`
}
