import type { ReturnsResponse } from '../types'

/**
 * What the main region should render.
 *
 * `skeleton` is only used for the very first load, when there is nothing on
 * screen yet. Once data exists we keep the grid mounted through a refetch so
 * its geometry never collapses, while App hides its stale contents until the
 * matching response is ready.
 */
export type ViewState = 'skeleton' | 'grid' | 'empty' | 'blank'

export interface ViewStateInput {
	data: ReturnsResponse | null
	loading: boolean
	error: string | null
}

export function viewState({ data, loading, error }: ViewStateInput): ViewState {
	const symbols = data ? Object.keys(data.data) : []
	if (symbols.length > 0) return 'grid'
	if (loading) return 'skeleton'
	if (error) return 'blank'
	return data ? 'empty' : 'blank'
}

/** True while a refresh runs with a stale grid mounted for layout only. */
export function isRefreshing({ data, loading }: Pick<ViewStateInput, 'data' | 'loading'>): boolean {
	return loading && data !== null && Object.keys(data.data).length > 0
}
