/**
 * Telling a drag apart from a click.
 *
 * Drag-to-zoom and double-click-to-reset share the same pointer. Without a
 * distinction, a fast drag whose mousedown/mouseup land close together — or two
 * quick zoom drags in the same spot — register as a double-click and throw the
 * zoom the user just made straight back out.
 */

/**
 * Pointer travel, in pixels, above which a gesture counts as a drag.
 *
 * Small enough that a deliberate range selection always clears it, large enough
 * to absorb the hand tremor in an ordinary click.
 */
export const DRAG_SLOP = 4

/** True when the pointer moved far enough for this to be a drag, not a click. */
export function isDragGesture(
	startX: number | null,
	endX: number | null,
	slop: number = DRAG_SLOP,
): boolean {
	if (startX === null || endX === null) return false
	return Math.abs(endX - startX) > slop
}
