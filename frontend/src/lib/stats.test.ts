import { describe, expect, it } from 'vitest'

import type { ReturnPoint } from '../types'
import { computeAllStats, computeStats, computeVisibleStats, formatPercent } from './stats'

const points: ReturnPoint[] = [
	{ date: '2024-01-03', return: 0.01 },
	{ date: '2024-01-04', return: -0.02 },
	{ date: '2024-01-05', return: 0.03 },
]

describe('computeStats', () => {
	it('reports count, min, max, and mean', () => {
		const stats = computeStats('MSFT', points)

		expect(stats.count).toBe(3)
		expect(stats.min).toBe(-0.02)
		expect(stats.max).toBe(0.03)
		expect(stats.mean).toBeCloseTo(0.006666, 5)
	})

	it('compounds rather than sums the cumulative return', () => {
		const stats = computeStats('MSFT', points)
		const compounded = 1.01 * 0.98 * 1.03 - 1

		expect(stats.cumulative).toBeCloseTo(compounded, 10)
		expect(stats.cumulative).not.toBeCloseTo(0.02, 10) // the naive sum
	})

	it('computes sample standard deviation', () => {
		expect(computeStats('MSFT', points).volatility).toBeCloseTo(0.02516611, 6)
	})

	it('zeroes stats for an empty series instead of producing NaN', () => {
		const stats = computeStats('MSFT', [])

		expect(stats).toEqual({
			symbol: 'MSFT',
			count: 0,
			min: 0,
			max: 0,
			mean: 0,
			cumulative: 0,
			volatility: 0,
		})
	})

	it('reports zero spread for a single observation', () => {
		expect(computeStats('MSFT', [{ date: '2024-01-03', return: 0.01 }]).volatility).toBe(0)
	})
})

describe('computeVisibleStats', () => {
	it('matches full-series stats when the window covers the whole series', () => {
		const windowed = computeVisibleStats('MSFT', points, {
			startIndex: 0,
			endIndex: points.length - 1,
		})

		expect(windowed).toEqual(computeStats('MSFT', points))
	})

	it('includes both endpoints of a mid-series window', () => {
		const windowed = computeVisibleStats('MSFT', points, { startIndex: 1, endIndex: 2 })

		expect(windowed.count).toBe(2)
		expect(windowed.min).toBe(-0.02)
		expect(windowed.max).toBe(0.03)
		expect(windowed.mean).toBeCloseTo(0.005, 10)
	})

	it('collapses a single-point window to that day', () => {
		const windowed = computeVisibleStats('MSFT', points, { startIndex: 1, endIndex: 1 })

		expect(windowed.count).toBe(1)
		expect(windowed.min).toBe(-0.02)
		expect(windowed.max).toBe(-0.02)
		expect(windowed.mean).toBe(-0.02)
		expect(windowed.volatility).toBe(0)
	})

	it('zeroes stats for a window over an empty series instead of producing NaN', () => {
		const windowed = computeVisibleStats('MSFT', [], { startIndex: 0, endIndex: 0 })

		expect(windowed).toEqual(computeStats('MSFT', []))
		expect(Number.isNaN(windowed.mean)).toBe(false)
	})

	it('keeps min <= mean <= max and the inclusive count for every valid window', () => {
		const series: ReturnPoint[] = Array.from({ length: 12 }, (_, day) => ({
			date: `2024-02-${String(day + 1).padStart(2, '0')}`,
			return: Math.sin(day * 1.7) / 25,
		}))

		for (let start = 0; start < series.length; start++) {
			for (let end = start; end < series.length; end++) {
				const windowed = computeVisibleStats('MSFT', series, {
					startIndex: start,
					endIndex: end,
				})

				expect(windowed.count).toBe(end - start + 1)
				expect(windowed.min).toBeLessThanOrEqual(windowed.mean)
				expect(windowed.mean).toBeLessThanOrEqual(windowed.max)
			}
		}
	})
})

describe('computeAllStats', () => {
	it('produces one row per symbol', () => {
		const rows = computeAllStats({ MSFT: points, AAPL: [] })

		expect(rows.map((row) => row.symbol)).toEqual(['MSFT', 'AAPL'])
		expect(rows[1].count).toBe(0)
	})
})

describe('formatPercent', () => {
	it('signs positive values and scales to percent', () => {
		expect(formatPercent(0.0123)).toBe('+1.23%')
		expect(formatPercent(-0.0123)).toBe('-1.23%')
		expect(formatPercent(0)).toBe('0.00%')
	})

	it('honors a digit override', () => {
		expect(formatPercent(0.001234, 3)).toBe('+0.123%')
	})

	it('renders non-finite input as a dash', () => {
		expect(formatPercent(Number.NaN)).toBe('—')
	})
})
