import { describe, expect, it } from 'vitest'

import { isReturnsRequestPending, returnsRequestKey } from './useReturns'

describe('returns request identity', () => {
  it('marks a new committed range pending before its effect starts', () => {
    const previous = returnsRequestKey('2025-01-01', '2025-06-30', 0)
    const current = returnsRequestKey('2025-02-01', '2025-06-30', 0)

    expect(isReturnsRequestPending(previous, current, '2025-02-01', '2025-06-30')).toBe(true)
  })

  it('settles only when the current request key has resolved', () => {
    const current = returnsRequestKey('2025-02-01', '2025-06-30', 1)

    expect(isReturnsRequestPending(current, current, '2025-02-01', '2025-06-30')).toBe(false)
    expect(isReturnsRequestPending(null, current, '', '2025-06-30')).toBe(false)
  })
})
