interface ErrorBannerProps {
	message: string
	onRetry?: () => void
}

/** Inline, dismissible-free error surface. `role="alert"` announces it to screen readers. */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
	return (
		<div className="error-banner" role="alert">
			<span>{message}</span>
			{onRetry && (
				<button type="button" onClick={onRetry}>
					Retry
				</button>
			)}
		</div>
	)
}
