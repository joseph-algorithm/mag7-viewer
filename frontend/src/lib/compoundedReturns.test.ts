import { describe, expect, it } from 'vitest'

import type { ReturnsResponse } from '../types'
import { compoundReturnSeries, createReturnsState } from './compoundedReturns'

describe('compoundReturnSeries', () => {
	it('adds the running compounded return to every point', () => {
		const result = compoundReturnSeries([
			{ date: '2024-01-03', return: 0.1 },
			{ date: '2024-01-04', return: -0.05 },
			{ date: '2024-01-05', return: 0.02 },
		])

		expect(result[0].compoundedReturn).toBeCloseTo(0.1, 12)
		expect(result[1].compoundedReturn).toBeCloseTo(0.045, 12)
		expect(result[2].compoundedReturn).toBeCloseTo(0.0659, 12)
	})

	it('does not mutate the API response points', () => {
		const points = [{ date: '2024-01-03', return: 0.1 }]
		const result = compoundReturnSeries(points)

		expect(points).toEqual([{ date: '2024-01-03', return: 0.1 }])
		expect(result[0]).not.toBe(points[0])
	})
})

describe('createReturnsState', () => {
	it('compounds each symbol independently and preserves unavailable symbols', () => {
		const payload: ReturnsResponse = {
			data: {
				MSFT: [
					{ date: '2024-01-03', return: 0.1 },
					{ date: '2024-01-04', return: 0.1 },
				],
				AAPL: [{ date: '2024-01-03', return: -0.2 }],
			},
			unavailable: [{ symbol: 'TSLA', reason: 'No usable data' }],
		}

		const state = createReturnsState(payload)

		expect(state.data.MSFT[0].compoundedReturn).toBeCloseTo(0.1, 12)
		expect(state.data.MSFT[1].compoundedReturn).toBeCloseTo(0.21, 12)
		expect(state.data.AAPL[0].compoundedReturn).toBeCloseTo(-0.2, 12)
		expect(state.unavailable).toEqual(payload.unavailable)
	})
})
