import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const { useReturns } = vi.hoisted(() => ({
  useReturns: vi.fn(() => ({
    data: {
      data: { MSFT: [{ date: '2024-01-03', return: 0.01 }] },
      unavailable: [],
    },
    loading: true,
    error: null,
    retry: vi.fn(),
  })),
}))

vi.mock('./hooks/useReturns', () => ({
  useReturns,
}))

describe('App date range controls', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    useReturns.mockClear()
  })

  it('keeps controls and existing results visible while a request is loading', () => {
    const markup = renderToStaticMarkup(<App />)

		expect(markup).toContain('aria-label="Range start"')
		expect(markup).toContain('id="start-date"')
		expect(markup).not.toContain('disabled=""')
		expect(markup).toContain('<div class="results" aria-busy="true">')
    expect(markup).not.toContain('data-refreshing')
  })

  it('uses a valid URL range for the first request after a refresh', () => {
    vi.stubGlobal('window', {
      location: {
        pathname: '/',
        search: '?start=2025-01-02&end=2026-06-30',
        hash: '',
      },
    })

    renderToStaticMarkup(<App />)

    expect(useReturns).toHaveBeenCalledWith('2025-01-02', '2026-06-30')
  })
})
