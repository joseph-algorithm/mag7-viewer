/**
 * Drag-to-select inside the brush track.
 *
 * Recharts' brush only supports dragging its handles and sliding the selected
 * window; pressing on the empty track does nothing, even though the track shows
 * a crosshair. This maps a raw pointer drag across the track onto a range,
 * matching the drag-to-zoom gesture the plot already supports.
 */

export interface TrackGeometry {
	/** Left edge of the brush track, in the same space as the pointer x. */
	brushLeft: number
	brushWidth: number
	/** Number of points in the series. */
	pointCount: number
}

export interface Selection {
	startIndex: number
	endIndex: number
}

/** Smallest window a drag may produce; anything narrower is treated as a click. */
export const MIN_SELECTION_POINTS = 2

function clamp(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high)
}

/** Map a pointer x onto the nearest series index. */
export function indexAtX(x: number, { brushLeft, brushWidth, pointCount }: TrackGeometry): number {
	if (pointCount <= 1 || brushWidth <= 0) return 0
	const ratio = (x - brushLeft) / brushWidth
	return clamp(Math.round(ratio * (pointCount - 1)), 0, pointCount - 1)
}

/**
 * Resolve a track drag into a range.
 *
 * Returns null when the gesture is too narrow to be a deliberate selection, so
 * a stray click on the track leaves the current range alone rather than
 * collapsing it to a single point.
 */
export function selectionFromDrag(
	startX: number,
	endX: number,
	geometry: TrackGeometry,
): Selection | null {
	const a = indexAtX(startX, geometry)
	const b = indexAtX(endX, geometry)
	const startIndex = Math.min(a, b)
	const endIndex = Math.max(a, b)

	if (endIndex - startIndex + 1 < MIN_SELECTION_POINTS) return null
	return { startIndex, endIndex }
}
