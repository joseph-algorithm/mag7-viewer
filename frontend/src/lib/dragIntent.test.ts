import { describe, expect, it } from 'vitest'

import { DRAG_SLOP, isDragGesture } from './dragIntent'

describe('isDragGesture', () => {
	it('treats a stationary pointer as a click', () => {
		expect(isDragGesture(100, 100)).toBe(false)
	})

	it('absorbs tremor within the slop, in both directions', () => {
		expect(isDragGesture(100, 100 + DRAG_SLOP)).toBe(false)
		expect(isDragGesture(100, 100 - DRAG_SLOP)).toBe(false)
	})

	it('counts travel past the slop as a drag, in both directions', () => {
		expect(isDragGesture(100, 100 + DRAG_SLOP + 1)).toBe(true)
		expect(isDragGesture(100, 100 - DRAG_SLOP - 1)).toBe(true)
	})

	it('is not a drag when either end is unknown', () => {
		expect(isDragGesture(null, 100)).toBe(false)
		expect(isDragGesture(100, null)).toBe(false)
		expect(isDragGesture(null, null)).toBe(false)
	})

	it('honours a caller-supplied slop', () => {
		expect(isDragGesture(0, 10, 20)).toBe(false)
		expect(isDragGesture(0, 30, 20)).toBe(true)
	})
})
