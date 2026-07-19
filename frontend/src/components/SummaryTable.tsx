import { useMemo, useState } from 'react'

import { formatPercent } from '../lib/stats'
import type { SymbolStats } from '../types'

type SortKey = keyof Pick<
	SymbolStats,
	'symbol' | 'count' | 'min' | 'max' | 'mean' | 'cumulative' | 'volatility'
>

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
	{ key: 'symbol', label: 'Symbol', numeric: false },
	{ key: 'count', label: 'Days', numeric: true },
	{ key: 'mean', label: 'Mean', numeric: true },
	{ key: 'min', label: 'Min', numeric: true },
	{ key: 'max', label: 'Max', numeric: true },
	{ key: 'volatility', label: 'Std dev', numeric: true },
	{ key: 'cumulative', label: 'Cumulative', numeric: true },
]

/** Cross-ticker performance table. Click a header to sort; click again to reverse. */
export function SummaryTable({ stats }: { stats: SymbolStats[] }) {
	const [sortKey, setSortKey] = useState<SortKey>('cumulative')
	const [descending, setDescending] = useState(true)

	const sorted = useMemo(() => {
		return [...stats].sort((a, b) => {
			const left = a[sortKey]
			const right = b[sortKey]
			const comparison =
				typeof left === 'string' && typeof right === 'string'
					? left.localeCompare(right)
					: Number(left) - Number(right)
			return descending ? -comparison : comparison
		})
	}, [stats, sortKey, descending])

	function toggleSort(key: SortKey) {
		if (key === sortKey) {
			setDescending((value) => !value)
			return
		}
		setSortKey(key)
		setDescending(key !== 'symbol')
	}

	return (
		<section className="summary">
			<h2>Summary</h2>
			<div className="summary-scroll">
				<table>
					<thead>
						<tr>
							{COLUMNS.map((column) => (
								<th
									key={column.key}
									scope="col"
									className={column.numeric ? 'numeric' : undefined}
									aria-sort={
										sortKey === column.key
											? descending
												? 'descending'
												: 'ascending'
											: 'none'
									}
								>
									<button type="button" onClick={() => toggleSort(column.key)}>
										{column.label}
										{sortKey === column.key ? (descending ? ' ↓' : ' ↑') : ''}
									</button>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{sorted.map((row) => (
							<tr key={row.symbol}>
								<th scope="row">{row.symbol}</th>
								<td className="numeric">{row.count}</td>
								<td className="numeric">{formatPercent(row.mean, 3)}</td>
								<td className="numeric negative">{formatPercent(row.min)}</td>
								<td className="numeric positive">{formatPercent(row.max)}</td>
								<td className="numeric">{formatPercent(row.volatility, 3)}</td>
								<td className={row.cumulative >= 0 ? 'numeric positive' : 'numeric negative'}>
									{formatPercent(row.cumulative)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	)
}
