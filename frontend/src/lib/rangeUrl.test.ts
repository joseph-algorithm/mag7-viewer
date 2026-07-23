import { describe, expect, it } from 'vitest'

import { rangeFromSearch, urlWithRange } from './rangeUrl'

const TODAY = '2026-07-23'

describe('range URL state', () => {
  it('restores a complete valid range from the query string', () => {
    expect(rangeFromSearch('?start=2025-01-02&end=2026-06-30', TODAY)).toEqual({
      start: '2025-01-02',
      end: '2026-06-30',
    })
  })

  it.each([
    '',
    '?start=2025-01-02',
    '?end=2026-06-30',
    '?start=not-a-date&end=2026-06-30',
    '?start=2026-02-30&end=2026-06-30',
    '?start=2026-06-30&end=2025-01-02',
    '?start=2026-01-01&end=2026-07-24',
    '?start=2016-01-01&end=2026-01-02',
  ])('rejects an incomplete or backend-invalid pair: %s', (search) => {
    expect(rangeFromSearch(search, TODAY)).toBeNull()
  })

  it('writes the range without dropping unrelated query state or the hash', () => {
    expect(
      urlWithRange(
        {
          pathname: '/viewer',
          search: '?theme=dark&start=2024-01-01&end=2024-06-01',
          hash: '#summary',
        },
        { start: '2025-01-02', end: '2026-06-30' },
      ),
    ).toBe('/viewer?theme=dark&start=2025-01-02&end=2026-06-30#summary')
  })
})
