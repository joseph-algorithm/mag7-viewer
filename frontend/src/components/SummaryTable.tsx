import { useMemo, useState } from 'react'

import { formatPercent } from '../lib/stats'
import type { SymbolStats } from '../types'

type SortKey = keyof Pick<
	SymbolStats,
	'symbol' | 'count' | 'min' | 'max' | 'mean' | 'cumulative' | 'volatility'
>

export interface SummaryColumn {
	key: SortKey
	label: string
	numeric: boolean
	/** Percentage of the table width. Drives <colgroup> under table-layout: fixed. */
	width: number
}

/**
 * Column widths are declared, not measured.
 *
 * With the browser's default auto table layout, widths are derived from cell
 * content — so re-sorting (which moves the sort arrow to a different header)
 * re-solved the layout and made the columns jump. Fixed widths make the grid
 * stable across every sort key and direction.
 */
export const COLUMNS: SummaryColumn[] = [
	{ key: 'symbol', label: 'Symbol', numeric: false, width: 14 },
	{ key: 'count', label: 'Days', numeric: true, width: 10 },
	{ key: 'mean', label: 'Mean', numeric: true, width: 14 },
	{ key: 'min', label: 'Min', numeric: true, width: 14 },
	{ key: 'max', label: 'Max', numeric: true, width: 14 },
	{ key: 'volatility', label: 'Std dev', numeric: true, width: 14 },
	{ key: 'cumulative', label: 'Cumulative', numeric: true, width: 20 },
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
					<colgroup>
						{COLUMNS.map((column) => (
							<col key={column.key} style={{ width: `${column.width}%` }} />
						))}
					</colgroup>
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
										{/*
										 * The arrow slot is always present, so moving the sort to
										 * another column cannot change any header's width.
										 */}
										<span className="sort-arrow" aria-hidden="true">
											{sortKey === column.key ? (descending ? '↓' : '↑') : ''}
										</span>
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
