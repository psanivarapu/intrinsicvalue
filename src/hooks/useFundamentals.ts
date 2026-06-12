import { useCallback } from 'react'
import { useValuation } from '../context/ValuationContext'
import type { Exchange, FundamentalsAPIResponse } from '../types'

export function useFundamentals() {
  const { state, dispatch } = useValuation()

  const fetchData = useCallback(async (symbol: string, exchange: Exchange) => {
    if (!symbol.trim()) return
    dispatch({ type: 'SET_FETCH_STATUS', status: 'loading' })

    try {
      const url = `/api/fundamentals?symbol=${encodeURIComponent(symbol.trim().toUpperCase())}&exchange=${exchange}`
      const resp = await fetch(url, { signal: AbortSignal.timeout(15000) })

      if (!resp.ok) {
        dispatch({ type: 'SET_FETCH_STATUS', status: 'error', error: `HTTP ${resp.status}` })
        return
      }

      const data: FundamentalsAPIResponse = await resp.json()
      dispatch({ type: 'APPLY_FETCH', payload: data })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      // On any network failure, silently degrade to manual mode
      dispatch({
        type: 'SET_FETCH_STATUS',
        status: 'manual',
        error: `${msg} — running in manual mode`,
      })
    }
  }, [dispatch])

  const refetch = useCallback(() => {
    fetchData(state.setup.symbol, state.setup.exchange)
  }, [fetchData, state.setup.symbol, state.setup.exchange])

  const switchToManual = useCallback(() => {
    dispatch({ type: 'SET_MANUAL_MODE', manual: true })
  }, [dispatch])

  return {
    status: state.fetch.status,
    error: state.fetch.error,
    fetchedCount: state.fetch.fetchedCount,
    totalFields: state.fetch.totalFields,
    dataNote: state.fetch.dataNote,
    histNiCagr: state.fetch.histNiCagr,
    reviewedAt: state.fetch.reviewedAt,
    fetchData,
    refetch,
    switchToManual,
    markReviewed: () => dispatch({ type: 'MARK_REVIEWED' }),
  }
}
