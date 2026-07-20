import type { ReturnsBySymbol } from '../types'

/**
 * What the main region should render.
 *
 * `skeleton` is only used for the very first load, when there is nothing on
 * screen yet. Once data exists we keep showing it through a refetch
 * (stale-while-revalidate) so the grid never collapses and reflows underneath
 * the user — the refresh is signalled by the ambient spinner instead.
 */
export type ViewState = 'skeleton' | 'grid' | 'empty' | 'blank'

export interface ViewStateInput {
	data: ReturnsBySymbol | null
	loading: boolean
	error: string | null
}

export function viewState({ data, loading, error }: ViewStateInput): ViewState {
	const symbols = data ? Object.keys(data) : []
	if (symbols.length > 0) return 'grid'
	if (loading) return 'skeleton'
	if (error) return 'blank'
	return data ? 'empty' : 'blank'
}

/** True while a refresh runs on top of data that is already on screen. */
export function isRefreshing({ data, loading }: Pick<ViewStateInput, 'data' | 'loading'>): boolean {
	return loading && data !== null && Object.keys(data).length > 0
}
