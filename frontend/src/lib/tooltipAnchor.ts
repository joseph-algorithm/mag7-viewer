/**
 * Where to pin the tooltip for a given cursor position.
 *
 * Recharts' default tooltip placement is derived from the *active data point*
 * and flips sides on its own, so it visibly jitters as the pointer moves
 * between points. Here the tooltip keeps a constant offset from the cursor and
 * a constant vertical position, and only changes side when it would otherwise
 * be clipped by the chart's right edge.
 */

/** Horizontal gap between the cursor and the nearest tooltip edge. */
export const TOOLTIP_OFFSET = 14

/** Minimum gap between the tooltip and the container edge. */
export const TOOLTIP_MARGIN = 4

/**
 * Fixed vertical anchor, near the top of the plot.
 *
 * Holding y constant is what removes the vertical "dancing": the tooltip is a
 * readout panel, not something attached to the line.
 */
export const TOOLTIP_Y = 6

/**
 * Rendered tooltip width.
 *
 * Not an estimate: `.recharts-default-tooltip` is pinned to this exact width in
 * `styles.css`. Keep the two in sync — if the panel could size to its own
 * content, the gap between cursor and panel would change with the value being
 * shown, which is the jitter this module exists to remove.
 */
export const TOOLTIP_WIDTH = 118

export interface AnchorInput {
	/** Cursor x within the chart container. */
	cursorX: number
	containerWidth: number
	tooltipWidth?: number
	offset?: number
	margin?: number
}

/**
 * Resolve the tooltip's x within the container.
 *
 * Right of the cursor by default; left only when the right placement would
 * overflow; clamped to the container when neither side fits.
 */
export function anchorX({
	cursorX,
	containerWidth,
	tooltipWidth = TOOLTIP_WIDTH,
	offset = TOOLTIP_OFFSET,
	margin = TOOLTIP_MARGIN,
}: AnchorInput): number {
	const right = cursorX + offset
	if (right + tooltipWidth <= containerWidth - margin) return right

	const left = cursorX - offset - tooltipWidth
	if (left >= margin) return left

	// Neither side fits (container narrower than the tooltip): stay inside.
	return Math.max(margin, Math.min(right, containerWidth - tooltipWidth - margin))
}
