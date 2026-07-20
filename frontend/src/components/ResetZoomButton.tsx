/**
 * Reset-zoom control, sat to the right of the brush.
 *
 * Icon-only: the label would crowd the card header, and its meaning is carried
 * by proximity to the slider it resets. The accessible name stays on the
 * button, and `title` gives sighted users the same text on hover.
 */
export function ResetZoomButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			className="reset-zoom"
			onClick={onClick}
			title="Reset zoom (or double-click the chart)"
		>
			<span className="sr-only">Reset zoom</span>
			<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
				{/* Circular arrow: the conventional "restore to full range" mark. */}
				<path
					d="M13 8a5 5 0 1 1-1.6-3.7"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.6"
					strokeLinecap="round"
				/>
				<path d="M13.4 1.9v3.4h-3.4z" fill="currentColor" />
			</svg>
		</button>
	)
}
