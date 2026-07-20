import { describe, expect, it } from 'vitest'

import type { ReturnsBySymbol } from '../types'
import { isRefreshing, viewState } from './viewState'

const data: ReturnsBySymbol = { MSFT: [{ date: '2024-01-03', return: 0.01 }] }

describe('viewState', () => {
	it('shows skeletons only on the first load', () => {
		expect(viewState({ data: null, loading: true, error: null })).toBe('skeleton')
	})

	it('keeps the grid mounted while refetching, so it is never displaced', () => {
		expect(viewState({ data, loading: true, error: null })).toBe('grid')
	})

	it('shows the grid when idle with data', () => {
		expect(viewState({ data, loading: false, error: null })).toBe('grid')
	})

	it('reports an empty range when the payload has no symbols', () => {
		expect(viewState({ data: {}, loading: false, error: null })).toBe('empty')
	})

	it('renders nothing under the banner when an error cleared the data', () => {
		expect(viewState({ data: null, loading: false, error: 'boom' })).toBe('blank')
	})
})

describe('isRefreshing', () => {
	it('is true only when loading over data that is already visible', () => {
		expect(isRefreshing({ data, loading: true })).toBe(true)
		expect(isRefreshing({ data, loading: false })).toBe(false)
		expect(isRefreshing({ data: null, loading: true })).toBe(false)
		expect(isRefreshing({ data: {}, loading: true })).toBe(false)
	})
})
