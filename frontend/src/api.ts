import type { ReturnsBySymbol } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** An API failure carrying a message suitable for display to the user. */
export class ApiError extends Error {
	readonly status: number

	constructor(message: string, status: number) {
		super(message)
		this.name = 'ApiError'
		this.status = status
	}
}

/**
 * Fetch daily returns for the inclusive `start`..`end` range.
 * Backend error details are surfaced verbatim, since they are written for users.
 */
export async function fetchReturns(
	start: string,
	end: string,
	signal?: AbortSignal,
): Promise<ReturnsBySymbol> {
	const query = new URLSearchParams({ start, end })

	let response: Response
	try {
		response = await fetch(`${BASE_URL}/returns?${query}`, { signal })
	} catch (cause) {
		if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
		throw new ApiError('Could not reach the server. Is the backend running?', 0)
	}

	if (!response.ok) {
		throw new ApiError(await readErrorDetail(response), response.status)
	}

	return (await response.json()) as ReturnsBySymbol
}

async function readErrorDetail(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as { detail?: unknown }
		if (typeof body.detail === 'string') return body.detail
		// FastAPI validation errors arrive as an array of issue objects.
		if (Array.isArray(body.detail)) {
			const first = body.detail[0] as { msg?: string } | undefined
			if (first?.msg) return first.msg
		}
	} catch {
		// Fall through to the generic message below.
	}
	// A dev proxy with no backend behind it surfaces as a bodiless 5xx rather than a
	// network error, so name that case instead of showing a bare status code.
	if (response.status >= 500) {
		return 'The server is unavailable. Is the backend running?'
	}
	return `Request failed with status ${response.status}.`
}
