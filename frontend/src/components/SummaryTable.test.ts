import { describe, expect, it } from 'vitest'

import { COLUMNS } from './SummaryTable'

describe('summary column widths', () => {
	it('declares a width for every column', () => {
		for (const column of COLUMNS) {
			expect(column.width, `${column.key} must declare a width`).toBeGreaterThan(0)
		}
	})

	it('sums to exactly 100% so <colgroup> fully determines the layout', () => {
		const total = COLUMNS.reduce((sum, column) => sum + column.width, 0)
		expect(total).toBe(100)
	})

	it('gives the widest label the widest column', () => {
		const widest = COLUMNS.reduce((a, b) => (b.width > a.width ? b : a))
		expect(widest.key).toBe('cumulative')
	})

	it('covers every sortable field exactly once', () => {
		const keys = COLUMNS.map((column) => column.key)
		expect(new Set(keys).size).toBe(keys.length)
		expect(keys).toEqual(['symbol', 'count', 'mean', 'min', 'max', 'volatility', 'cumulative'])
	})
})
