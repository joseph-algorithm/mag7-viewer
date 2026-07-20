import { useEffect, useRef } from 'react'

interface Shortcut {
	keys: string[]
	description: string
}

const KEYBOARD: Shortcut[] = [
	{ keys: ['?'], description: 'Show this help' },
	{ keys: ['Esc'], description: 'Close this help' },
	{ keys: ['Tab'], description: 'Move to the next control' },
	{ keys: ['Shift', 'Tab'], description: 'Move to the previous control' },
	{ keys: ['Enter'], description: 'Activate the focused control' },
]

/**
 * The gestures are the part worth documenting: they are conventional but
 * invisible, and nothing on screen announces them.
 */
const MOUSE: Shortcut[] = [
	{ keys: ['Chart'], description: 'Drag across it to zoom into that range' },
	{ keys: ['Chart'], description: 'Double-click to reset the zoom' },
	{ keys: ['Chart'], description: 'Hover for the value on that day' },
	{ keys: ['Slider'], description: 'Drag to select a range' },
	{ keys: ['Slider'], description: 'Drag the selected window to pan it, once zoomed' },
	{ keys: ['Handle'], description: 'Drag either end to resize the range' },
]

function Row({ shortcut, asKeys = true }: { shortcut: Shortcut; asKeys?: boolean }) {
	return (
		<div className="shortcut-row">
			<div className="shortcut-keys">
				{shortcut.keys.map((key) =>
					asKeys ? <kbd key={key}>{key}</kbd> : <span key={key} className="shortcut-target">{key}</span>,
				)}
			</div>
			<div>{shortcut.description}</div>
		</div>
	)
}

/**
 * Shortcuts overlay.
 *
 * Focus moves here on open and returns to the opener on close, so keyboard
 * users are not dropped at the top of the document.
 */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
	const dialogRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const previouslyFocused = document.activeElement as HTMLElement | null
		dialogRef.current?.focus()
		return () => previouslyFocused?.focus?.()
	}, [])

	return (
		<div className="shortcuts-backdrop" onClick={onClose}>
			<div
				className="shortcuts-dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby="shortcuts-title"
				tabIndex={-1}
				ref={dialogRef}
				// The backdrop closes on click; the panel must not.
				onClick={(event) => event.stopPropagation()}
			>
				<div className="shortcuts-header">
					<h2 id="shortcuts-title">Keyboard &amp; mouse</h2>
					<button type="button" className="shortcuts-close" onClick={onClose}>
						Close
					</button>
				</div>

				<h3>Keyboard</h3>
				{KEYBOARD.map((shortcut) => (
					<Row key={shortcut.keys.join('+')} shortcut={shortcut} />
				))}

				<h3>Mouse</h3>
				{MOUSE.map((shortcut) => (
					<Row key={shortcut.description} shortcut={shortcut} asKeys={false} />
				))}
			</div>
		</div>
	)
}
