import type {
	ChartReturnPoint,
	ChartReturnsBySymbol,
	ReturnPoint,
	ReturnsResponse,
	ReturnsState,
} from '../types'

/** Add the running compounded return without mutating the API response points. */
export function compoundReturnSeries(points: readonly ReturnPoint[]): ChartReturnPoint[] {
	let growth = 1

	return points.map((point) => {
		growth *= 1 + point.return
		return { ...point, compoundedReturn: growth - 1 }
	})
}

/** Normalize one API payload into the chart-ready state owned by `useReturns`. */
export function createReturnsState(payload: ReturnsResponse): ReturnsState {
	const data = Object.fromEntries(
		Object.entries(payload.data).map(([symbol, points]) => [
			symbol,
			compoundReturnSeries(points),
		]),
	) as ChartReturnsBySymbol

	return {
		data,
		unavailable: payload.unavailable,
	}
}
