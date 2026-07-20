/**
 * Whether a keystroke should open the shortcuts overlay.
 *
 * `?` is a printable character, so a global listener must not steal it from the
 * date inputs or any other editable field — a user typing into a form should
 * get their character, not a dialog.
 */

export interface KeyContext {
	key: string
	ctrlKey?: boolean
	metaKey?: boolean
	altKey?: boolean
	/** Tag name of the event target, e.g. "INPUT". */
	targetTag?: string
	targetIsEditable?: boolean
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** True when the keystroke landed in something the user is typing into. */
export function isEditableTarget({ targetTag, targetIsEditable }: KeyContext): boolean {
	if (targetIsEditable) return true
	return EDITABLE_TAGS.has((targetTag ?? '').toUpperCase())
}

/**
 * `?` opens help. Modified chords are left alone — Ctrl/Cmd/Alt combinations
 * belong to the browser or the OS, not to this app.
 */
export function shouldOpenHelp(context: KeyContext): boolean {
	if (context.key !== '?') return false
	if (context.ctrlKey || context.metaKey || context.altKey) return false
	return !isEditableTarget(context)
}

/** Escape closes the overlay, including from inside a field. */
export function shouldCloseHelp(context: KeyContext): boolean {
	return context.key === 'Escape'
}
