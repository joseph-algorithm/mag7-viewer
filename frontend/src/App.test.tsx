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
  it('keeps controls enabled and hides stale results while a request is loading', () => {
		const markup = renderToStaticMarkup(<App />)

		expect(markup).toContain('aria-label="Range start"')
    expect(markup).toContain('id="start-date"')
    expect(markup).not.toContain('disabled=""')
    expect(markup).toContain('class="results"')
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('data-refreshing="true"')
  })
})
