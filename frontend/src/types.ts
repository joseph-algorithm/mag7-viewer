/** One trading day's fractional return for a symbol. */
export interface ReturnPoint {
	date: string
	return: number
	compoundedReturn?: number
}

/** Symbol -> ordered daily series. */
export type ReturnsBySymbol = Record<string, ReturnPoint[]>

/** A requested symbol that produced no usable series, and why. */
export interface UnavailableSymbol {
	symbol: string
	reason: string
}

/**
 * The `/returns` payload.
 *
 * `unavailable` exists so a data gap is distinguishable from a shrunken
 * universe — a symbol missing from `data` is always explained here.
 */
export interface ReturnsResponse {
	data: ReturnsBySymbol
	unavailable: UnavailableSymbol[]
}

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
