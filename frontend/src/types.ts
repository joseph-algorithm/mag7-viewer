/** One trading day's fractional return for a symbol. */
export interface ReturnPoint {
	date: string
	return: number
}

/** The `/returns` payload: symbol -> ordered daily series. */
export type ReturnsBySymbol = Record<string, ReturnPoint[]>

/** Per-symbol descriptive statistics rendered in cards and the summary table. */
export interface SymbolStats {
	symbol: string
	count: number
	min: number
	max: number
	mean: number
	/** Compounded return over the window, i.e. prod(1 + r) - 1. */
	cumulative: number
	/** Sample standard deviation of daily returns. */
	volatility: number
}
