import { describe, expect, it } from 'vitest'

import { createRangeSelection, rangeSelectionReducer } from './rangeSelection'

const initial = { start: '2025-01-01', end: '2025-06-30' }
const dragged = { start: '2025-02-01', end: '2025-06-30' }

describe('range selection', () => {
  it('previews a drag without changing the range used for fetching', () => {
    const state = createRangeSelection(initial)

    expect(rangeSelectionReducer(state, { type: 'preview', range: dragged })).toEqual({
      draft: dragged,
      committed: initial,
    })
  })

  it('commits the settled range to both the control and the query', () => {
    const previewed = rangeSelectionReducer(createRangeSelection(initial), {
      type: 'preview',
      range: dragged,
    })

    expect(rangeSelectionReducer(previewed, { type: 'commit', range: dragged })).toEqual({
      draft: dragged,
      committed: dragged,
    })
  })

  it('deduplicates repeated release and blur commits', () => {
    const state = createRangeSelection(initial)

    expect(rangeSelectionReducer(state, { type: 'commit', range: initial })).toBe(state)
  })
})
