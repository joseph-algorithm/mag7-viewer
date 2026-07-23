import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import App from './App'

vi.mock('./hooks/useReturns', () => ({
	useReturns: () => ({
		data: null,
		loading: true,
		error: null,
		retry: vi.fn(),
	}),
}))

describe('App date range controls', () => {
  it('keeps the controls enabled while a committed request is loading', () => {
		const markup = renderToStaticMarkup(<App />)

		expect(markup).toContain('aria-label="Range start"')
		expect(markup).toContain('id="start-date"')
		expect(markup).not.toContain('disabled=""')
	})
})
