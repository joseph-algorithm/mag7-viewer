import { describe, expect, it } from 'vitest'

import { shouldCloseHelp, shouldOpenHelp } from './helpKey'

describe('shouldOpenHelp', () => {
	it('opens on a bare ?', () => {
		expect(shouldOpenHelp({ key: '?' })).toBe(true)
	})

	it('ignores other keys', () => {
		expect(shouldOpenHelp({ key: '/' })).toBe(false)
		expect(shouldOpenHelp({ key: 'h' })).toBe(false)
	})

	it('leaves modified chords to the browser', () => {
		expect(shouldOpenHelp({ key: '?', ctrlKey: true })).toBe(false)
		expect(shouldOpenHelp({ key: '?', metaKey: true })).toBe(false)
		expect(shouldOpenHelp({ key: '?', altKey: true })).toBe(false)
	})

	it('does not steal the character from a field the user is typing in', () => {
		expect(shouldOpenHelp({ key: '?', targetTag: 'INPUT' })).toBe(false)
		expect(shouldOpenHelp({ key: '?', targetTag: 'textarea' })).toBe(false)
		expect(shouldOpenHelp({ key: '?', targetTag: 'SELECT' })).toBe(false)
		expect(shouldOpenHelp({ key: '?', targetIsEditable: true })).toBe(false)
	})

	it('still opens from an ordinary element', () => {
		expect(shouldOpenHelp({ key: '?', targetTag: 'BUTTON' })).toBe(true)
		expect(shouldOpenHelp({ key: '?', targetTag: 'DIV' })).toBe(true)
	})
})

describe('shouldCloseHelp', () => {
	it('closes on Escape, including from inside a field', () => {
		expect(shouldCloseHelp({ key: 'Escape' })).toBe(true)
		expect(shouldCloseHelp({ key: 'Escape', targetTag: 'INPUT' })).toBe(true)
	})

	it('ignores other keys', () => {
		expect(shouldCloseHelp({ key: 'Enter' })).toBe(false)
	})
})
