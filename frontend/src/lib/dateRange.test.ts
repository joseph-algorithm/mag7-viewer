import { describe, expect, it } from 'vitest'

import {
	API_MAX_RANGE_DAYS,
	MAX_YEARS_BACK,
	MIN_SPAN_DAYS,
	PRESETS,
	addDays,
	addMonths,
	clampSpan,
	daysBetween,
	earliestDate,
	matchingPreset,
	presetRange,
} from './dateRange'

const TODAY = '2026-07-20'

describe('day arithmetic', () => {
	it('counts days in both directions', () => {
		expect(daysBetween('2026-07-01', '2026-07-20')).toBe(19)
		expect(daysBetween('2026-07-20', '2026-07-01')).toBe(-19)
		expect(daysBetween(TODAY, TODAY)).toBe(0)
	})

	it('adds days across a month boundary', () => {
		expect(addDays('2026-07-30', 3)).toBe('2026-08-02')
		expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
	})

	it('adds days across a leap day', () => {
		expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
		expect(daysBetween('2028-02-01', '2028-03-01')).toBe(29)
	})

	it('is stable across a DST boundary, which local-time maths is not', () => {
		// US DST starts 2026-03-08; a local-time implementation drifts here.
		expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
		expect(addDays('2026-03-07', 2)).toBe('2026-03-09')
	})
})

describe('addMonths', () => {
	it('shifts whole months', () => {
		expect(addMonths('2026-07-20', -1)).toBe('2026-06-20')
		expect(addMonths('2026-07-20', -12)).toBe('2025-07-20')
	})

	it('clamps to the last day when the target month is shorter', () => {
		expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
		expect(addMonths('2028-03-31', -1)).toBe('2028-02-29')
	})
})

describe('presetRange', () => {
	it('ends every preset today', () => {
		for (const preset of PRESETS) {
			expect(presetRange(preset, TODAY).end).toBe(TODAY)
		}
	})

	it('resolves the calendar presets', () => {
		expect(presetRange('1M', TODAY).start).toBe('2026-06-20')
		expect(presetRange('6M', TODAY).start).toBe('2026-01-20')
		expect(presetRange('1Y', TODAY).start).toBe('2025-07-20')
		expect(presetRange('YTD', TODAY).start).toBe('2026-01-01')
	})

	it('reaches exactly as far back as the slider does for Max', () => {
		expect(presetRange('Max', TODAY).start).toBe(earliestDate(TODAY))
		expect(daysBetween(earliestDate(TODAY), TODAY)).toBeGreaterThan(365 * MAX_YEARS_BACK - 3)
	})

	it('keeps Max distinct from 5Y, so the active chip is unambiguous', () => {
		expect(presetRange('Max', TODAY).start).not.toBe(presetRange('5Y', TODAY).start)
		expect(matchingPreset(presetRange('Max', TODAY), TODAY)).toBe('Max')
		expect(matchingPreset(presetRange('5Y', TODAY), TODAY)).toBe('5Y')
	})

	it('never asks for a range the backend would reject', () => {
		for (const preset of PRESETS) {
			const { start, end } = presetRange(preset, TODAY)
			expect(daysBetween(start, end)).toBeLessThanOrEqual(API_MAX_RANGE_DAYS)
		}
		expect(daysBetween(earliestDate(TODAY), TODAY)).toBeLessThanOrEqual(API_MAX_RANGE_DAYS)
	})

	it('produces ordered ranges', () => {
		for (const preset of PRESETS) {
			const { start, end } = presetRange(preset, TODAY)
			expect(daysBetween(start, end)).toBeGreaterThan(0)
		}
	})
})

describe('matchingPreset', () => {
	it('identifies a range that came from a preset', () => {
		expect(matchingPreset(presetRange('3M', TODAY), TODAY)).toBe('3M')
		expect(matchingPreset(presetRange('YTD', TODAY), TODAY)).toBe('YTD')
	})

	it('reports null once the range is dragged off a preset', () => {
		expect(matchingPreset({ start: '2026-02-03', end: '2026-06-11' }, TODAY)).toBeNull()
	})
})

describe('clampSpan', () => {
	const MAX = 1000

	it('leaves a valid pair alone', () => {
		expect(clampSpan(100, 400, MAX, 'start')).toEqual({ startOffset: 100, endOffset: 400 })
	})

	it('keeps offsets inside the bounds', () => {
		expect(clampSpan(-50, 400, MAX, 'start').startOffset).toBe(0)
		expect(clampSpan(100, 5000, MAX, 'end').endOffset).toBe(MAX)
	})

	it('pushes the other handle when the start is dragged into the end', () => {
		const { startOffset, endOffset } = clampSpan(400, 400, MAX, 'start')
		expect(endOffset - startOffset).toBe(MIN_SPAN_DAYS)
		expect(startOffset).toBe(400)
	})

	it('pushes the other handle when the end is dragged into the start', () => {
		const { startOffset, endOffset } = clampSpan(400, 400, MAX, 'end')
		expect(endOffset - startOffset).toBe(MIN_SPAN_DAYS)
		expect(endOffset).toBe(400)
	})

	it('keeps the minimum span wide enough to contain trading days', () => {
		// A two-day window landing on a weekend has no complete trading day and
		// the backend rejects it; a week always contains at least two.
		expect(MIN_SPAN_DAYS).toBeGreaterThanOrEqual(7)
	})

	it('never inverts or breaks the minimum span, anywhere in the space', () => {
		for (let start = -20; start <= MAX + 20; start += 37) {
			for (let end = -20; end <= MAX + 20; end += 41) {
				for (const moved of ['start', 'end'] as const) {
					const result = clampSpan(start, end, MAX, moved)
					expect(result.startOffset).toBeGreaterThanOrEqual(0)
					expect(result.endOffset).toBeLessThanOrEqual(MAX)
					expect(result.endOffset - result.startOffset).toBeGreaterThanOrEqual(MIN_SPAN_DAYS)
				}
			}
		}
	})
})
