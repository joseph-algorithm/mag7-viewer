import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import App from './App'

vi.mock('./hooks/useReturns', () => ({
  useReturns: () => ({
    data: {
      data: { MSFT: [{ date: '2024-01-03', return: 0.01 }] },
      unavailable: [],
    },
		loading: true,
		error: null,
		retry: vi.fn(),
	}),
}))

describe('App date range controls', () => {
	it('keeps controls and existing results visible while a request is loading', () => {
		const markup = renderToStaticMarkup(<App />)

		expect(markup).toContain('aria-label="Range start"')
		expect(markup).toContain('id="start-date"')
		expect(markup).not.toContain('disabled=""')
		expect(markup).toContain('<div class="results" aria-busy="true">')
		expect(markup).not.toContain('data-refreshing')
	})
})
