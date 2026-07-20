import { describe, expect, it } from 'vitest'

import { groupByReason } from './groupByReason'

describe('groupByReason', () => {
	it('returns nothing for an empty list', () => {
		expect(groupByReason([])).toEqual([])
	})

	it('collapses symbols that share a reason', () => {
		expect(
			groupByReason([
				{ symbol: 'MSFT', reason: 'no data' },
				{ symbol: 'TSLA', reason: 'no data' },
			]),
		).toEqual([{ reason: 'no data', symbols: ['MSFT', 'TSLA'] }])
	})

	it('keeps differing reasons apart rather than reporting only the first', () => {
		expect(
			groupByReason([
				{ symbol: 'MSFT', reason: 'no data' },
				{ symbol: 'AAPL', reason: 'no complete day' },
				{ symbol: 'TSLA', reason: 'no data' },
			]),
		).toEqual([
			{ reason: 'no data', symbols: ['MSFT', 'TSLA'] },
			{ reason: 'no complete day', symbols: ['AAPL'] },
		])
	})

	it('preserves first-seen order of reasons', () => {
		const groups = groupByReason([
			{ symbol: 'TSLA', reason: 'b' },
			{ symbol: 'MSFT', reason: 'a' },
		])
		expect(groups.map((group) => group.reason)).toEqual(['b', 'a'])
	})
})
