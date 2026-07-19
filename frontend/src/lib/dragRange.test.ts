import { describe, expect, it } from 'vitest'

import { clampRange, fullRange, isFullRange, resolveDragSelection } from './dragRange'

const labels = ['2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-08']

describe('resolveDragSelection', () => {
	it('resolves a left-to-right drag to an inclusive index range', () => {
		expect(resolveDragSelection(labels, '2024-01-03', '2024-01-05')).toEqual({
			startIndex: 1,
			endIndex: 3,
		})
	})

	it('normalizes a right-to-left drag to the same range', () => {
		expect(resolveDragSelection(labels, '2024-01-05', '2024-01-03')).toEqual(
			resolveDragSelection(labels, '2024-01-03', '2024-01-05'),
		)
	})

	it('rejects a click, which starts and ends on one point', () => {
		expect(resolveDragSelection(labels, '2024-01-03', '2024-01-03')).toBeNull()
	})

	it('rejects an incomplete drag', () => {
		expect(resolveDragSelection(labels, null, '2024-01-03')).toBeNull()
		expect(resolveDragSelection(labels, '2024-01-03', null)).toBeNull()
	})

	it('rejects labels that are not in the series', () => {
		expect(resolveDragSelection(labels, '2024-01-03', '1999-12-31')).toBeNull()
	})

	it('accepts the smallest deliberate selection, two adjacent points', () => {
		expect(resolveDragSelection(labels, '2024-01-02', '2024-01-03')).toEqual({
			startIndex: 0,
			endIndex: 1,
		})
	})
})

describe('fullRange and isFullRange', () => {
	it('spans the whole series', () => {
		expect(fullRange(5)).toEqual({ startIndex: 0, endIndex: 4 })
		expect(isFullRange({ startIndex: 0, endIndex: 4 }, 5)).toBe(true)
	})

	it('detects a zoomed range', () => {
		expect(isFullRange({ startIndex: 1, endIndex: 4 }, 5)).toBe(false)
		expect(isFullRange({ startIndex: 0, endIndex: 3 }, 5)).toBe(false)
	})

	it('does not produce a negative end index for an empty series', () => {
		expect(fullRange(0)).toEqual({ startIndex: 0, endIndex: 0 })
	})
})

describe('clampRange', () => {
	it('leaves a valid range untouched', () => {
		expect(clampRange({ startIndex: 1, endIndex: 3 }, 5)).toEqual({ startIndex: 1, endIndex: 3 })
	})

	it('clamps indices left over from a longer series', () => {
		expect(clampRange({ startIndex: 7, endIndex: 9 }, 5)).toEqual({ startIndex: 4, endIndex: 4 })
	})

	it('keeps the range ordered when the end precedes the start', () => {
		expect(clampRange({ startIndex: 3, endIndex: 1 }, 5)).toEqual({ startIndex: 3, endIndex: 3 })
	})

	it('handles an empty series', () => {
		expect(clampRange({ startIndex: 2, endIndex: 4 }, 0)).toEqual({ startIndex: 0, endIndex: 0 })
	})
})
