import type { UnavailableSymbol } from '../types'

export interface ReasonGroup {
	reason: string
	symbols: string[]
}

/**
 * Group unavailable symbols by their reason.
 *
 * Symbols can be unavailable for different reasons in the same response (no
 * prices at all vs. prices with no complete trading day), so rendering one
 * symbol's reason for the whole list would misreport the others. Insertion
 * order is preserved so the notice reads in the universe's declared order.
 */
export function groupByReason(items: UnavailableSymbol[]): ReasonGroup[] {
	const groups = new Map<string, string[]>()
	for (const item of items) {
		const symbols = groups.get(item.reason)
		if (symbols) symbols.push(item.symbol)
		else groups.set(item.reason, [item.symbol])
	}
	return [...groups].map(([reason, symbols]) => ({ reason, symbols }))
}
