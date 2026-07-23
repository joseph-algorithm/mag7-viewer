import { useEffect, useState } from 'react'

import { ApiError, fetchReturns } from '../api'
import type { ReturnsResponse } from '../types'

export interface UseReturnsResult {
	data: ReturnsResponse | null
	loading: boolean
	error: string | null
	/** Bump to re-run the request with the same range (used by the retry button). */
	retry: () => void
}

/** Debounce rapid committed changes such as repeated keyboard adjustments. */
const DEBOUNCE_MS = 300

export function returnsRequestKey(start: string, end: string, attempt: number): string {
  return `${start}\u0000${end}\u0000${attempt}`
}

export function isReturnsRequestPending(
  resolvedRequestKey: string | null,
  requestKey: string,
  start: string,
  end: string,
): boolean {
  return Boolean(start && end) && resolvedRequestKey !== requestKey
}

/**
 * Fetch returns whenever the range changes.
 *
 * In-flight requests are aborted on change, so a slow earlier response can never
 * overwrite the data for the range the user is currently looking at.
 */
export function useReturns(start: string, end: string): UseReturnsResult {
	const [data, setData] = useState<ReturnsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [resolvedRequestKey, setResolvedRequestKey] = useState<string | null>(null)
  const requestKey = returnsRequestKey(start, end, attempt)
  const requestPending = isReturnsRequestPending(resolvedRequestKey, requestKey, start, end)

  useEffect(() => {
    if (!start || !end) return
		if (start > end) {
      setError('Start date must be on or before the end date.')
      setData(null)
      setLoading(false)
      setResolvedRequestKey(requestKey)
      return
		}

		const controller = new AbortController()
		setLoading(true)
		setError(null)

		const timer = setTimeout(() => {
      fetchReturns(start, end, controller.signal)
        .then((payload) => {
          if (controller.signal.aborted) return
          setData(payload)
          setError(null)
          setResolvedRequestKey(requestKey)
        })
				.catch((cause: unknown) => {
					if (controller.signal.aborted) return
					setData(null)
          setError(
            cause instanceof ApiError ? cause.message : 'Something went wrong loading returns.',
          )
          setResolvedRequestKey(requestKey)
				})
				.finally(() => {
					if (!controller.signal.aborted) setLoading(false)
				})
		}, DEBOUNCE_MS)

		return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [start, end, requestKey])

  return {
    data,
    loading: loading || requestPending,
    error: requestPending ? null : error,
    retry: () => setAttempt((value) => value + 1),
  }
}
