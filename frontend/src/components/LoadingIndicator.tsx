/**
 * Ambient activity indicator.
 *
 * Pinned to the bottom edge of the viewport rather than placed in the document
 * flow, so a refresh never pushes the chart grid around. This is the pattern
 * trading dashboards use: the data you are reading stays put and stays
 * readable, and the fetch announces itself quietly at the boundary of the view.
 */
export function LoadingIndicator({ label = 'Loading returns' }: { label?: string }) {
	return (
		<div className="loading-indicator" role="status" aria-live="polite">
			<span className="spinner" aria-hidden="true" />
			<span className="loading-indicator-label">{label}…</span>
		</div>
	)
}
