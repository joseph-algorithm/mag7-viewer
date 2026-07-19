/** An inclusive index window into a series, shared by the chart and its brush. */
export interface IndexRange {
	startIndex: number
	endIndex: number
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
