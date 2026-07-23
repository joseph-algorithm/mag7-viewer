export interface DateRange {
  start: string
  end: string
}

export interface RangeSelection {
  draft: DateRange
  committed: DateRange
}

export type RangeSelectionAction =
  | { type: 'preview'; range: DateRange }
  | { type: 'commit'; range: DateRange }

function sameRange(left: DateRange, right: DateRange): boolean {
  return left.start === right.start && left.end === right.end
}

export function createRangeSelection(initial: DateRange): RangeSelection {
  return { draft: initial, committed: initial }
}

/**
 * Keep slider feedback separate from the range that drives the data request.
 *
 * Pointer movement previews locally. Only an explicit commit advances both
 * ranges, so pausing mid-drag can never start or publish an intermediate fetch.
 */
export function rangeSelectionReducer(
  state: RangeSelection,
  action: RangeSelectionAction,
): RangeSelection {
  if (action.type === 'preview') {
    return sameRange(state.draft, action.range) ? state : { ...state, draft: action.range }
  }

  if (sameRange(state.draft, action.range) && sameRange(state.committed, action.range)) {
    return state
  }
  return { draft: action.range, committed: action.range }
}
