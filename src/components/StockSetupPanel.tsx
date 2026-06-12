import { useState, useRef } from 'react'
import { ExternalLink, RefreshCw, Loader2, AlertTriangle, CheckCircle2, X, Trash2, WifiOff } from 'lucide-react'
import { useValuation } from '../context/ValuationContext'
import { useFundamentals } from '../hooks/useFundamentals'
import { searchStocks } from '../lib/data/stocks'
import { SCREENER_LINKS, screenerUrl } from '../types'

export function StockSetupPanel() {
  const { state, dispatch } = useValuation()
  const { setup, fundamentals, fetch } = state
  const [query, setQuery] = useState(setup.symbol)
  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([])
  const [showSug, setShowSug] = useState(false)
  const { fetchData, refetch, switchToManual, markReviewed } = useFundamentals()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleQuery(val: string) {
    setQuery(val)
    setSuggestions(searchStocks(val))
    setShowSug(true)
  }

  function selectSymbol(sym: string) {
    dispatch({ type: 'SET_SETUP', payload: { symbol: sym } })
    setQuery(sym)
    setShowSug(false)
  }

  function commitSymbol() {
    const s = query.trim().toUpperCase()
    if (s) dispatch({ type: 'SET_SETUP', payload: { symbol: s } })
    setShowSug(false)
  }

  const cmp = fundamentals.price.value
  const shares = fundamentals.sharesOutstanding.value

  const isFetching = fetch.status === 'loading'
  const showReviewBanner = fetch.status === 'success' && !fetch.reviewedAt
  const isManual = fetch.status === 'manual' || state.manualMode

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm px-4 py-2">
      {/* Sample banner */}
      {setup.symbol === 'SAMPLEDEMO' && (
        <div className="mb-2 flex items-center justify-between px-3 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          <span>⚠ <strong>Sample data</strong> — replace all values with your stock's actual fundamentals.</span>
          <button onClick={() => dispatch({ type: 'CLEAR' })}><X size={13} /></button>
        </div>
      )}

      {/* Review banner */}
      {showReviewBanner && (
        <div className="mb-2 flex items-center justify-between px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          <span>
            <strong>Fetched {fetch.fetchedCount} of {fetch.totalFields} fields from Yahoo Finance.</strong>
            {' '}These can be wrong or stale — please verify key figures against screener.in before relying on results.
          </span>
          <button onClick={markReviewed} className="ml-2 whitespace-nowrap px-2 py-0.5 bg-blue-100 hover:bg-blue-200 rounded text-blue-700 font-medium">
            Mark as reviewed
          </button>
        </div>
      )}

      {/* Error banner */}
      {fetch.status === 'error' && (
        <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <AlertTriangle size={12} />
          <span>{fetch.error}</span>
          <button onClick={switchToManual} className="ml-auto underline">Switch to manual mode</button>
        </div>
      )}

      {/* Manual mode notice */}
      {isManual && fetch.status !== 'error' && (
        <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
          <WifiOff size={12} /> <span>Manual mode — all fields must be entered by hand.</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        {/* Symbol search */}
        <div className="relative min-w-48 flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Stock Symbol</label>
          <div className="flex">
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleQuery(e.target.value)}
              onBlur={() => setTimeout(() => setShowSug(false), 150)}
              onKeyDown={e => { if (e.key === 'Enter') commitSymbol() }}
              placeholder="Search or type symbol…"
              className="w-full border border-gray-300 rounded-l-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={commitSymbol}
              className="border border-l-0 border-gray-300 rounded-r-md px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-xs text-gray-600"
            >
              Set
            </button>
          </div>
          {showSug && suggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-b-md shadow-lg max-h-52 overflow-y-auto">
              {suggestions.map(s => (
                <button
                  key={s.symbol}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  onMouseDown={() => selectSymbol(s.symbol)}
                >
                  <span className="font-mono font-semibold text-blue-700">{s.symbol}</span>
                  <span className="ml-2 text-gray-500 text-xs">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Exchange toggle */}
        <div className="flex items-center gap-1 text-xs">
          {(['NSE', 'BSE'] as const).map(ex => (
            <button
              key={ex}
              onClick={() => dispatch({ type: 'SET_SETUP', payload: { exchange: ex } })}
              className={`px-2.5 py-1.5 rounded border text-xs font-medium ${setup.exchange === ex ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Consolidated toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Standalone</span>
          <button
            onClick={() => dispatch({ type: 'SET_SETUP', payload: { isConsolidated: !setup.isConsolidated } })}
            className={`relative h-5 w-9 rounded-full transition-colors ${setup.isConsolidated ? 'bg-blue-600' : 'bg-gray-300'}`}
            title="Yahoo data is generally consolidated. Use consolidated for companies with subsidiaries."
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${setup.isConsolidated ? 'translate-x-4 left-0.5' : 'translate-x-0 left-0.5'}`} />
          </button>
          <span className="text-xs text-gray-500">Consolidated</span>
        </div>

        {/* CMP — auto-filled, editable */}
        <div className="min-w-28">
          <label className="block text-xs font-medium text-gray-600 mb-0.5">
            CMP (₹)
            {fundamentals.price.source === 'fetched' && (
              <span className="ml-1 text-blue-500 text-xs">[Y]</span>
            )}
          </label>
          {/* FUTURE: auto-fetch CMP via /api/quote endpoint — hook point here */}
          <input
            type="number"
            value={cmp === '' ? '' : cmp}
            onChange={e => dispatch({ type: 'SET_FIELD', key: 'price', value: e.target.value === '' ? '' : parseFloat(e.target.value) })}
            placeholder="e.g. 1200"
            className={`w-full border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${fundamentals.price.source === 'fetched' ? 'border-blue-300 bg-blue-50/30' : 'border-gray-300'}`}
          />
        </div>

        {/* Shares + market-cap mini-calc */}
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-600 mb-0.5">
            Shares (Cr)
            {fundamentals.sharesOutstanding.source === 'fetched' && (
              <span className="ml-1 text-blue-500 text-xs">[Y]</span>
            )}
          </label>
          <input
            type="number"
            value={shares === '' ? '' : shares}
            onChange={e => dispatch({ type: 'SET_FIELD', key: 'sharesOutstanding', value: e.target.value === '' ? '' : parseFloat(e.target.value) })}
            placeholder="e.g. 100"
            className={`w-full border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${fundamentals.sharesOutstanding.source === 'fetched' ? 'border-blue-300 bg-blue-50/30' : 'border-gray-300'}`}
          />
          {/* Mini-calc: mktcap ÷ CMP */}
          {cmp !== '' && (cmp as number) > 0 && (
            <input
              type="number"
              placeholder="Mkt Cap (₹Cr) → shares"
              className="mt-0.5 w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              onChange={e => {
                const mc = parseFloat(e.target.value)
                if (!isNaN(mc) && (cmp as number) > 0) {
                  dispatch({ type: 'SET_FIELD', key: 'sharesOutstanding', value: parseFloat((mc / (cmp as number)).toFixed(4)) })
                }
              }}
            />
          )}
        </div>

        {/* Fetch / Refetch button */}
        {!isManual && (
          <button
            onClick={() => setup.symbol ? fetchData(setup.symbol, setup.exchange) : undefined}
            disabled={isFetching || !setup.symbol}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-md transition-colors whitespace-nowrap"
          >
            {isFetching ? <Loader2 size={13} className="animate-spin" /> : fetch.status === 'success' ? <RefreshCw size={13} /> : <RefreshCw size={13} />}
            {isFetching ? 'Fetching…' : fetch.status === 'success' ? 'Refetch' : 'Fetch data'}
          </button>
        )}

        {/* Status indicator */}
        {fetch.status === 'success' && fetch.reviewedAt && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 size={13} /> Reviewed
          </div>
        )}

        {/* Clear */}
        <button
          onClick={() => dispatch({ type: 'CLEAR' })}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1.5"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {/* Screener deep links */}
      {setup.symbol && setup.symbol !== 'SAMPLEDEMO' && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 pt-1.5 border-t border-gray-100">
          <span className="text-xs text-gray-400 self-center">screener.in:</span>
          {SCREENER_LINKS.map(l => (
            <a
              key={l.section}
              href={screenerUrl(setup.symbol, setup.isConsolidated, l.section)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200 transition-colors"
            >
              {l.label} <ExternalLink size={10} />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
