import { describe, expect, it } from 'vitest'

import { TOOLTIP_MARGIN, TOOLTIP_OFFSET, TOOLTIP_WIDTH, anchorX } from './tooltipAnchor'

const WIDE = 800

describe('anchorX', () => {
	it('sits a constant offset to the right of the cursor', () => {
		expect(anchorX({ cursorX: 100, containerWidth: WIDE })).toBe(100 + TOOLTIP_OFFSET)
		expect(anchorX({ cursorX: 250, containerWidth: WIDE })).toBe(250 + TOOLTIP_OFFSET)
	})

	it('keeps that offset constant across the whole safe zone — no drift', () => {
		const deltas = [0, 50, 120, 300, 500].map(
			(cursorX) => anchorX({ cursorX, containerWidth: WIDE }) - cursorX,
		)
		expect(new Set(deltas).size).toBe(1)
	})

	it('flips to the left only when the right placement would be clipped', () => {
		const lastRight = WIDE - TOOLTIP_MARGIN - TOOLTIP_WIDTH - TOOLTIP_OFFSET
		expect(anchorX({ cursorX: lastRight, containerWidth: WIDE })).toBe(
			lastRight + TOOLTIP_OFFSET,
		)

		const flipped = anchorX({ cursorX: lastRight + 1, containerWidth: WIDE })
		expect(flipped).toBe(lastRight + 1 - TOOLTIP_OFFSET - TOOLTIP_WIDTH)
	})

	it('never overflows either edge', () => {
		for (let cursorX = 0; cursorX <= WIDE; cursorX += 7) {
			const x = anchorX({ cursorX, containerWidth: WIDE })
			expect(x).toBeGreaterThanOrEqual(TOOLTIP_MARGIN)
			expect(x + TOOLTIP_WIDTH).toBeLessThanOrEqual(WIDE - TOOLTIP_MARGIN)
		}
	})

	it('flips at most once across a full left-to-right sweep', () => {
		const sides: string[] = []
		for (let cursorX = 0; cursorX <= WIDE; cursorX += 3) {
			sides.push(anchorX({ cursorX, containerWidth: WIDE }) > cursorX ? 'right' : 'left')
		}
		const transitions = sides.filter((side, i) => i > 0 && side !== sides[i - 1]).length
		expect(transitions).toBe(1)
	})

	it('stays inside a container narrower than the tooltip itself', () => {
		const narrow = TOOLTIP_WIDTH / 2
		const x = anchorX({ cursorX: narrow / 2, containerWidth: narrow })
		expect(x).toBe(TOOLTIP_MARGIN)
	})
})
