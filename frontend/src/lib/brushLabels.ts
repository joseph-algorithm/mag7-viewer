/**
 * Placement for the two brush date labels.
 *
 * Recharts draws these inline on the brush row, where they crowd the slider and
 * collide with anything sharing that row. Rendering them below the brush needs
 * explicit placement, and placement has two failure modes worth solving up
 * front: a label running off the container edge, and the two labels colliding
 * when the handles are close together.
 */

export interface PlacementInput {
	/** Centre x of the start handle, relative to the container. */
	startX: number
	/** Centre x of the end handle, relative to the container. */
	endX: number
	labelWidth: number
	containerWidth: number
	/** Minimum clear space between the two labels. */
	gap?: number
}

export interface Placement {
	/** Left offset of the start label. */
	left: number
	/** Left offset of the end label. */
	right: number
}

function clamp(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high)
}

/**
 * Resolve both label positions.
 *
 * Each label is centred under its handle, clamped inside the container, then —
 * if the two would overlap — pushed apart symmetrically about their midpoint
 * and re-clamped. When the container cannot fit both side by side the pair is
 * pinned to the two edges, which is the most legible degradation available.
 */
export function placeBrushLabels({
	startX,
	endX,
	labelWidth,
	containerWidth,
	gap = 6,
}: PlacementInput): Placement {
	const max = Math.max(0, containerWidth - labelWidth)
	let left = clamp(startX - labelWidth / 2, 0, max)
	let right = clamp(endX - labelWidth / 2, 0, max)

	const minSeparation = Math.min(labelWidth + gap, max)
	if (right - left < minSeparation) {
		const midpoint = (left + right) / 2
		left = midpoint - minSeparation / 2
		right = midpoint + minSeparation / 2

		// Re-clamp while preserving the separation rather than the centring.
		if (left < 0) {
			left = 0
			right = minSeparation
		} else if (right > max) {
			right = max
			left = max - minSeparation
		}
	}

	return { left, right }
}
