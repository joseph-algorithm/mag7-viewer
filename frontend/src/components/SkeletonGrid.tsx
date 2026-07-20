/** The seven names always come back together, so the first paint can reserve their cells. */
const PLACEHOLDER_SYMBOLS = ['MSFT', 'AAPL', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA']

/**
 * First-load placeholder.
 *
 * Mirrors the real card's box model (header, 180px plot, three-up stats footer)
 * so the grid occupies its final geometry before the data lands and the cards
 * swap in without a reflow.
 */
export function SkeletonGrid() {
	return (
		<div className="grid" aria-hidden="true">
			{PLACEHOLDER_SYMBOLS.map((symbol) => (
				<article key={symbol} className="card card-skeleton">
					<div className="card-header">
						<span className="skeleton-bar skeleton-title" />
						<span className="skeleton-bar skeleton-badge" />
					</div>
					<div className="skeleton-chart" />
					<dl className="card-stats">
						{['min', 'max', 'mean'].map((slot) => (
							<div key={slot}>
								<dt>
									<span className="skeleton-bar skeleton-stat-label" />
								</dt>
								<dd>
									<span className="skeleton-bar skeleton-stat-value" />
								</dd>
							</div>
						))}
					</dl>
				</article>
			))}
		</div>
	)
}
