import { describe, expect, it } from 'vitest'

import { indexAtX, selectionFromDrag } from './brushSelect'

const GEOMETRY = { brushLeft: 40, brushWidth: 200, pointCount: 101 }

describe('indexAtX', () => {
	it('maps the track edges to the first and last index', () => {
		expect(indexAtX(40, GEOMETRY)).toBe(0)
		expect(indexAtX(240, GEOMETRY)).toBe(100)
	})

	it('maps the midpoint to the middle index', () => {
		expect(indexAtX(140, GEOMETRY)).toBe(50)
	})

	it('clamps outside the track rather than returning a bad index', () => {
		expect(indexAtX(-500, GEOMETRY)).toBe(0)
		expect(indexAtX(5000, GEOMETRY)).toBe(100)
	})

	it('degrades safely on empty or single-point series', () => {
		expect(indexAtX(140, { ...GEOMETRY, pointCount: 1 })).toBe(0)
		expect(indexAtX(140, { ...GEOMETRY, pointCount: 0 })).toBe(0)
		expect(indexAtX(140, { ...GEOMETRY, brushWidth: 0 })).toBe(0)
	})
})

describe('selectionFromDrag', () => {
	it('resolves a left-to-right drag', () => {
		expect(selectionFromDrag(60, 140, GEOMETRY)).toEqual({ startIndex: 10, endIndex: 50 })
	})

	it('resolves a right-to-left drag to the same range', () => {
		expect(selectionFromDrag(140, 60, GEOMETRY)).toEqual({ startIndex: 10, endIndex: 50 })
	})

	it('ignores a click, leaving the existing range alone', () => {
		expect(selectionFromDrag(140, 140, GEOMETRY)).toBeNull()
	})

	it('ignores a drag too narrow to resolve past one point', () => {
		expect(selectionFromDrag(140, 140.5, GEOMETRY)).toBeNull()
	})

	it('accepts the narrowest deliberate selection', () => {
		const selection = selectionFromDrag(140, 142, GEOMETRY)
		expect(selection).toEqual({ startIndex: 50, endIndex: 51 })
	})

	it('never produces an inverted or out-of-bounds range', () => {
		for (let a = -50; a <= 300; a += 7) {
			for (let b = -50; b <= 300; b += 11) {
				const selection = selectionFromDrag(a, b, GEOMETRY)
				if (!selection) continue
				expect(selection.startIndex).toBeLessThan(selection.endIndex)
				expect(selection.startIndex).toBeGreaterThanOrEqual(0)
				expect(selection.endIndex).toBeLessThanOrEqual(GEOMETRY.pointCount - 1)
			}
		}
	})
})
