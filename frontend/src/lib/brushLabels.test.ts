import { describe, expect, it } from 'vitest'

import { placeBrushLabels } from './brushLabels'

const W = 70
const CONTAINER = 300

function place(startX: number, endX: number, containerWidth = CONTAINER) {
	return placeBrushLabels({ startX, endX, labelWidth: W, containerWidth })
}

describe('placeBrushLabels', () => {
	it('centres each label under its handle when there is room', () => {
		const { left, right } = place(100, 220)
		expect(left).toBe(100 - W / 2)
		expect(right).toBe(220 - W / 2)
	})

	it('never runs off the left edge', () => {
		expect(place(2, 250).left).toBe(0)
	})

	it('never runs off the right edge', () => {
		expect(place(50, 298).right).toBe(CONTAINER - W)
	})

	it('keeps the labels apart when the handles are close together', () => {
		const { left, right } = place(150, 158)
		expect(right - left).toBeGreaterThanOrEqual(W)
	})

	it('keeps them apart even when the handles coincide', () => {
		const { left, right } = place(150, 150)
		expect(right - left).toBeGreaterThanOrEqual(W)
	})

	it('never overlaps anywhere across the full range of handle positions', () => {
		for (let startX = 0; startX <= CONTAINER; startX += 5) {
			for (let endX = startX; endX <= CONTAINER; endX += 5) {
				const { left, right } = place(startX, endX)
				expect(right - left).toBeGreaterThanOrEqual(W)
				expect(left).toBeGreaterThanOrEqual(0)
				expect(right + W).toBeLessThanOrEqual(CONTAINER)
			}
		}
	})

	it('pins to both edges when handles collide against the left edge', () => {
		const { left, right } = place(0, 4)
		expect(left).toBe(0)
		expect(right).toBeGreaterThanOrEqual(W)
	})

	it('pins to both edges when handles collide against the right edge', () => {
		const { left, right } = place(298, 300)
		expect(right).toBe(CONTAINER - W)
		expect(left).toBeLessThanOrEqual(CONTAINER - 2 * W)
	})

	it('degrades without going out of bounds when the container is too narrow', () => {
		const narrow = W + 10
		const { left, right } = place(20, 24, narrow)
		expect(left).toBeGreaterThanOrEqual(0)
		expect(right + W).toBeLessThanOrEqual(narrow)
	})
})
