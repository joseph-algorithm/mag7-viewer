/** An inclusive index window into a series, shared by the chart and its brush. */
export interface IndexRange {
  startIndex: number
  endIndex: number
}

/** A date window shared by every chart brush in the grid. */
export interface BrushDateRange {
  start: string
  end: string
}

/** Minimum points a drag must cover; a narrower selection reads as a stray click. */
export const MIN_SELECTION_POINTS = 2

/**
 * Resolve a drag between two x-axis labels into an inclusive index range.
 *
 * Labels are used rather than the chart's own indices because those are relative to
 * whatever window the brush currently shows, while labels are unique across the whole
 * series. Dragging right-to-left is normalized to the same range as left-to-right.
 *
 * Returns `null` when the drag is incomplete, references unknown labels, or is too
 * short to be a deliberate selection.
 */
export function resolveDragSelection(
	labels: string[],
	startLabel: string | null,
	endLabel: string | null,
): IndexRange | null {
	if (startLabel === null || endLabel === null) return null

	const first = labels.indexOf(startLabel)
	const second = labels.indexOf(endLabel)
	if (first === -1 || second === -1) return null

	const startIndex = Math.min(first, second)
	const endIndex = Math.max(first, second)
	if (endIndex - startIndex + 1 < MIN_SELECTION_POINTS) return null

	return { startIndex, endIndex }
}

/** The full range of a series, used as the reset target. */
export function fullRange(length: number): IndexRange {
	return { startIndex: 0, endIndex: Math.max(0, length - 1) }
}

/** Whether `range` still covers the whole series, i.e. nothing is zoomed in. */
export function isFullRange(range: IndexRange, length: number): boolean {
	const full = fullRange(length)
	return range.startIndex === full.startIndex && range.endIndex === full.endIndex
}

/**
 * Clamp a range to a series length, keeping it ordered and non-empty.
 * Guards against stale indices after the series changes under a live selection.
 */
export function clampRange(range: IndexRange, length: number): IndexRange {
  if (length === 0) return { startIndex: 0, endIndex: 0 }
  const last = length - 1
  const startIndex = Math.min(Math.max(range.startIndex, 0), last)
  const endIndex = Math.min(Math.max(range.endIndex, startIndex), last)
  return { startIndex, endIndex }
}

/**
 * Convert one chart's index selection into the date window shared by all
 * brushes. `null` represents the full loaded range.
 */
export function brushDateRangeFromIndices(
  labels: string[],
  range: IndexRange,
): BrushDateRange | null {
  if (labels.length === 0) return null

  const visible = clampRange(range, labels.length)
  if (isFullRange(visible, labels.length)) return null

  return {
    start: labels[visible.startIndex],
    end: labels[visible.endIndex],
  }
}

/**
 * Project the shared date window onto one symbol's available points.
 *
 * Symbols can have different gaps, so sharing raw indices would make their
 * brushes show different dates. ISO dates sort lexicographically; selecting
 * the first point on/after the shared start and the last point on/before the
 * shared end keeps every chart aligned to the same time window.
 */
export function indicesFromBrushDateRange(
  labels: string[],
  range: BrushDateRange | null,
): IndexRange {
  if (labels.length === 0 || range === null) return fullRange(labels.length)

  const start = range.start <= range.end ? range.start : range.end
  const end = range.start <= range.end ? range.end : range.start
  const firstOnOrAfter = labels.findIndex((label) => label >= start)
  const startIndex = firstOnOrAfter === -1 ? labels.length - 1 : firstOnOrAfter

  let endIndex = labels.length - 1
  while (endIndex > 0 && labels[endIndex] > end) endIndex -= 1

  if (endIndex < startIndex) {
    return { startIndex, endIndex: startIndex }
  }
  return { startIndex, endIndex }
}
