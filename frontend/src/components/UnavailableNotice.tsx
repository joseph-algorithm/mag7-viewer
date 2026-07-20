import { groupByReason } from '../lib/groupByReason'
import type { UnavailableSymbol } from '../types'

/**
 * Names the symbols the backend could not serve, grouped by why.
 *
 * Without this the grid would just render fewer cards, which reads as "the
 * universe is six names" rather than "one name is missing data". It is a
 * notice, not an error — the rest of the range is still valid.
 */
export function UnavailableNotice({ symbols }: { symbols: UnavailableSymbol[] }) {
	return (
		<div className="unavailable-notice" role="status">
			<span className="unavailable-notice-lead">Not charted:</span>
			<ul>
				{groupByReason(symbols).map((group) => (
					<li key={group.reason}>
						<strong>{group.symbols.join(', ')}</strong> — {group.reason}
					</li>
				))}
			</ul>
		</div>
	)
}
