/**
 * Date arithmetic for the master range control.
 *
 * Everything is a `YYYY-MM-DD` string on the outside and a UTC day offset on
 * the inside. Local-time `Date` maths silently shifts by a day either side of a
 * DST boundary, which would show up as a range that drifts when you drag it.
 */

const MS_PER_DAY = 86_400_000

export type Preset = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'Max'

export const PRESETS: Preset[] = ['1M', '3M', '6M', 'YTD', '1Y', '5Y', 'Max']

/**
 * How far back the master slider reaches, and the span of `Max`.
 *
 * Nine years, not ten: the API rejects ranges over `365 * 10` days, and ten
 * calendar years is 3652–3653 days — over the cap. Nine keeps `Max` a request
 * the backend will actually serve, and keeps it distinct from the `5Y` preset.
 */
export const MAX_YEARS_BACK = 9

/** The backend's own limit, mirrored so the cap invariant can be tested. */
export const API_MAX_RANGE_DAYS = 365 * 10

/**
 * Smallest window the slider may produce.
 *
 * Seven calendar days, not two. A return needs a prior close, so a two-day
 * window that lands on a weekend has no complete trading day and the backend
 * answers 502 — the slider could drag itself into an error state. A week always
 * contains at least two trading days, so this bound keeps every reachable
 * slider position a request that succeeds.
 */
export const MIN_SPAN_DAYS = 7

function toUtc(date: string): number {
	const [year, month, day] = date.split('-').map(Number)
	return Date.UTC(year, (month ?? 1) - 1, day ?? 1)
}

function fromUtc(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10)
}

/** Whole days from `from` to `to`; negative when `to` precedes `from`. */
export function daysBetween(from: string, to: string): number {
	return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY)
}

export function addDays(date: string, days: number): string {
	return fromUtc(toUtc(date) + days * MS_PER_DAY)
}

export function addMonths(date: string, months: number): string {
	const base = new Date(toUtc(date))
	const day = base.getUTCDate()
	const shifted = new Date(
		Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, 1),
	)
	// Clamp to the last valid day when the target month is shorter (Jan 31 → Feb 28).
	const lastDay = new Date(
		Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0),
	).getUTCDate()
	shifted.setUTCDate(Math.min(day, lastDay))
	return fromUtc(shifted.getTime())
}

/** Earliest date the slider reaches, given today. */
export function earliestDate(today: string): string {
	return addMonths(today, -12 * MAX_YEARS_BACK)
}

/** Resolve a preset into a concrete range ending today. */
export function presetRange(preset: Preset, today: string): { start: string; end: string } {
	switch (preset) {
		case '1M':
			return { start: addMonths(today, -1), end: today }
		case '3M':
			return { start: addMonths(today, -3), end: today }
		case '6M':
			return { start: addMonths(today, -6), end: today }
		case 'YTD':
			return { start: `${today.slice(0, 4)}-01-01`, end: today }
		case '1Y':
			return { start: addMonths(today, -12), end: today }
		case '5Y':
			return { start: addMonths(today, -60), end: today }
		case 'Max':
			return { start: earliestDate(today), end: today }
	}
}

/**
 * Which preset, if any, a range corresponds to.
 *
 * Lets the chips show the active selection instead of being write-only, and
 * keeps them honest once the slider has been dragged off a preset.
 */
export function matchingPreset(
	range: { start: string; end: string },
	today: string,
): Preset | null {
	return (
		PRESETS.find((preset) => {
			const candidate = presetRange(preset, today)
			return candidate.start === range.start && candidate.end === range.end
		}) ?? null
	)
}

/**
 * Keep a dragged pair ordered, inside the bounds, and at least `MIN_SPAN_DAYS`
 * apart. `moved` says which handle the user is dragging, so the *other* one
 * yields rather than the drag stalling against it.
 */
export function clampSpan(
	startOffset: number,
	endOffset: number,
	maxOffset: number,
	moved: 'start' | 'end',
): { startOffset: number; endOffset: number } {
	const limit = (value: number) => Math.min(Math.max(value, 0), maxOffset)
	let start = limit(startOffset)
	let end = limit(endOffset)

	if (end - start < MIN_SPAN_DAYS) {
		if (moved === 'start') {
			end = Math.min(start + MIN_SPAN_DAYS, maxOffset)
			start = Math.min(start, end - MIN_SPAN_DAYS)
		} else {
			start = Math.max(end - MIN_SPAN_DAYS, 0)
			end = Math.max(end, start + MIN_SPAN_DAYS)
		}
	}

	return { startOffset: start, endOffset: end }
}
