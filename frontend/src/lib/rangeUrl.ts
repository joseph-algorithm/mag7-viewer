import { API_MAX_RANGE_DAYS, daysBetween } from './dateRange'
import type { DateRange } from './rangeSelection'

interface UrlLocation {
  pathname: string
  search: string
  hash: string
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/**
 * Read a complete, backend-valid range from the page query string.
 *
 * A partial or malformed pair is ignored as a unit so the app never combines
 * one URL endpoint with one default endpoint.
 */
export function rangeFromSearch(search: string, today: string): DateRange | null {
  const params = new URLSearchParams(search)
  const start = params.get('start')
  const end = params.get('end')

  if (!start || !end || !isIsoDate(start) || !isIsoDate(end)) return null

  const span = daysBetween(start, end)
  if (span < 0 || span > API_MAX_RANGE_DAYS || end > today) return null

  return { start, end }
}

/**
 * Replace only the range parameters while preserving the rest of the page URL.
 */
export function urlWithRange(location: UrlLocation, range: DateRange): string {
  const params = new URLSearchParams(location.search)
  params.set('start', range.start)
  params.set('end', range.end)

  const search = params.toString()
  return `${location.pathname}${search ? `?${search}` : ''}${location.hash}`
}
