import { useState, useRef } from 'react'
import { Search, ExternalLink, RefreshCw, Loader2, AlertTriangle, CheckCircle2, X, WifiOff, Download } from 'lucide-react'
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
  const { fetchData, switchToManual, markReviewed } = useFundamentals()
  const inputRef = useRef<HTMLInputElement>(null)

  const hasSymbol      = !!setup.symbol
  const isFetching     = fetch.status === 'loading'
  const isFetched      = fetch.status === 'success'
  const hasError       = fetch.status === 'error'
  const isManual       = fetch.status === 'manual' || state.manualMode
  // Show the big Fetch CTA only when a symbol is set but no fetch has happened or completed
  const showFetchCTA   = hasSymbol && fetch.status === 'idle'

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

  function clearAll() {
    dispatch({ type: 'CLEAR' })
    setQuery('')
    setShowSug(false)
  }

  function handleFetch() {
    if (setup.symbol) fetchData(setup.symbol, setup.exchange)
  }

  const cmp    = fundamentals.price.value
  const shares = fundamentals.sharesOutstanding.value

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">

      {/* ── Sample data warning banner ── */}
      {setup.symbol === 'SAMPLEDEMO' && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-800">
          <span>⚠ <strong>Sample data loaded.</strong> Replace all values with your stock's actual fundamentals before relying on results.</span>
          <button onClick={clearAll} className="text-amber-600 hover:text-amber-800 p-0.5 rounded hover:bg-amber-100"><X size={13} /></button>
        </div>
      )}

      {/* ── Post-fetch review banner ── */}
      {isFetched && !fetch.reviewedAt && setup.symbol !== 'SAMPLEDEMO' && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-blue-50 border-b border-blue-200 text-xs text-blue-800">
          <span>
            <strong>{fetch.fetchedCount} of {fetch.totalFields} fields auto-filled from Yahoo Finance.</strong>
            {' '}Verify key figures against screener.in — data may be stale or inaccurate.
          </span>
          <button
            onClick={markReviewed}
            className="ml-3 px-2.5 py-0.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 whitespace-nowrap transition-colors"
          >
            Mark reviewed ✓
          </button>
        </div>
      )}

      <div className="px-4 py-3 space-y-2">

        {/* ── Row 1: Search + Exchange + CMP + Shares ── */}
        <div className="flex flex-wrap gap-3 items-end">

          {/* Stock symbol search */}
          <div className="relative" style={{ flexBasis: '280px', flexGrow: 3 }}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {hasSymbol ? `Stock: ${setup.symbol}` : 'Search Stock'}
            </label>
            <div className={`flex items-center border-2 rounded-xl transition-all focus-within:shadow-md ${
              hasSymbol
                ? 'border-blue-400 bg-blue-50/40'
                : 'border-gray-300 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100'
            }`}>
              <Search size={15} className={`ml-3 shrink-0 ${hasSymbol ? 'text-blue-500' : 'text-gray-400'}`} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => handleQuery(e.target.value)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                onKeyDown={e => { if (e.key === 'Enter') commitSymbol() }}
                placeholder="Search by name or symbol…"
                className="flex-1 px-2 py-2 text-sm bg-transparent focus:outline-none"
              />
              {hasSymbol && (
                <button
                  onClick={clearAll}
                  title="Clear stock and reset"
                  className="mr-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Autocomplete dropdown */}
            {showSug && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                {suggestions.map(s => (
                  <button
                    key={s.symbol}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                    onMouseDown={() => selectSymbol(s.symbol)}
                  >
                    <span className="font-mono font-bold text-blue-700 text-sm">{s.symbol}</span>
                    <span className="text-gray-400 text-xs ml-3 truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Exchange toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Exchange</label>
            <div className="flex gap-1">
              {(['NSE', 'BSE'] as const).map(ex => (
                <button
                  key={ex}
                  onClick={() => dispatch({ type: 'SET_SETUP', payload: { exchange: ex } })}
                  className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                    setup.exchange === ex
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'border-gray-300 text-gray-500 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* ── Consolidated toggle — commented out ──
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Standalone</span>
            <button
              onClick={() => dispatch({ type: 'SET_SETUP', payload: { isConsolidated: !setup.isConsolidated } })}
              className={`relative h-5 w-9 rounded-full transition-colors ${setup.isConsolidated ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${setup.isConsolidated ? 'translate-x-4 left-0.5' : 'translate-x-0 left-0.5'}`} />
            </button>
            <span className="text-xs text-gray-500">Consolidated</span>
          </div>
          ── end consolidated toggle ── */}

          {/* CMP */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              CMP (₹)
              {fundamentals.price.source === 'fetched' && (
                <span className="ml-1 normal-case text-blue-500 font-normal">auto</span>
              )}
            </label>
            <input
              type="number"
              value={cmp === '' ? '' : cmp}
              onChange={e => dispatch({ type: 'SET_FIELD', key: 'price', value: e.target.value === '' ? '' : parseFloat(e.target.value) })}
              placeholder="e.g. 3500"
              className={`w-28 border-2 rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all ${
                fundamentals.price.source === 'fetched'
                  ? 'border-blue-200 bg-blue-50/40 text-blue-900'
                  : 'border-gray-300'
              }`}
            />
          </div>

          {/* Shares */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Shares (Cr)
              {fundamentals.sharesOutstanding.source === 'fetched' && (
                <span className="ml-1 normal-case text-blue-500 font-normal">auto</span>
              )}
            </label>
            <input
              type="number"
              value={shares === '' ? '' : shares}
              onChange={e => dispatch({ type: 'SET_FIELD', key: 'sharesOutstanding', value: e.target.value === '' ? '' : parseFloat(e.target.value) })}
              placeholder="e.g. 362"
              className={`w-28 border-2 rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all ${
                fundamentals.sharesOutstanding.source === 'fetched'
                  ? 'border-blue-200 bg-blue-50/40 text-blue-900'
                  : 'border-gray-300'
              }`}
            />
            {/* Mkt cap helper */}
            {cmp !== '' && (cmp as number) > 0 && (
              <input
                type="number"
                placeholder="Or: Mkt Cap (₹ Cr)"
                title="Enter market cap to compute shares outstanding"
                className="mt-1 w-36 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 text-gray-500 placeholder:text-gray-300"
                onChange={e => {
                  const mc = parseFloat(e.target.value)
                  if (!isNaN(mc) && (cmp as number) > 0)
                    dispatch({ type: 'SET_FIELD', key: 'sharesOutstanding', value: parseFloat((mc / (cmp as number)).toFixed(4)) })
                }}
              />
            )}
          </div>

          {/* Reviewed badge */}
          {isFetched && fetch.reviewedAt && (
            <div className="flex items-center gap-1 text-xs text-green-600 font-medium px-2 py-1 bg-green-50 border border-green-200 rounded-full">
              <CheckCircle2 size={12} /> Reviewed
            </div>
          )}
        </div>

        {/* ── Row 2: Contextual action area ── */}

        {/* No stock selected: onboarding hint */}
        {!hasSymbol && (
          <div className="text-xs text-gray-400 py-0.5">
            ↑ Search or type a stock symbol (NSE/BSE) to unlock the valuation sections.
          </div>
        )}

        {/* Fetch Data CTA — shown when stock is set but data not yet fetched */}
        {showFetchCTA && (
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl px-5 py-3 shadow-lg shadow-blue-100 border border-blue-500">
            <div className="text-white min-w-0">
              <div className="font-semibold text-sm">
                Step 2 &mdash; Fetch live data for{' '}
                <span className="text-yellow-300 font-bold">{setup.symbol}</span>{' '}
                <span className="text-blue-200 font-normal">({setup.exchange})</span>
              </div>
              <div className="text-xs text-blue-200 mt-0.5 truncate">
                Auto-fills CMP · EPS · Book Value · FCF · EBITDA · Beta and 15+ more metrics from Yahoo Finance
              </div>
            </div>
            <button
              onClick={handleFetch}
              className="ml-5 flex items-center gap-2 bg-white text-blue-700 font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-50 hover:shadow-md transition-all text-sm shrink-0 shadow"
            >
              <Download size={15} />
              Fetch Data
            </button>
          </div>
        )}

        {/* Loading */}
        {isFetching && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <Loader2 size={16} className="animate-spin text-blue-600 shrink-0" />
            <div className="text-sm text-blue-700">
              <span className="font-semibold">Fetching data for {setup.symbol}…</span>
              <span className="text-xs text-blue-400 ml-2">Connecting to Yahoo Finance, please wait.</span>
            </div>
          </div>
        )}

        {/* Error with retry */}
        {hasError && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-red-700 text-sm min-w-0">
              <AlertTriangle size={15} className="shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold">Could not fetch data.</span>
                <span className="text-xs text-red-400 ml-2 truncate">{fetch.error}</span>
              </div>
            </div>
            <div className="flex gap-2 ml-4 shrink-0">
              <button
                onClick={handleFetch}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                <RefreshCw size={12} /> Retry
              </button>
              <button
                onClick={switchToManual}
                className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 transition-colors"
              >
                Manual mode
              </button>
            </div>
          </div>
        )}

        {/* Manual mode notice */}
        {isManual && !hasError && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-500">
            <WifiOff size={12} className="shrink-0" />
            <span>Manual mode — all fields must be entered by hand. No auto-fill from Yahoo Finance.</span>
          </div>
        )}

        {/* Success row: field count + screener links + refetch */}
        {isFetched && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <CheckCircle2 size={12} />
                {fetch.fetchedCount}/{fetch.totalFields} fields loaded
              </span>
              {setup.symbol !== 'SAMPLEDEMO' && (
                <>
                  <span className="text-gray-300 select-none">|</span>
                  <span className="text-gray-400 text-xs">Verify at screener.in:</span>
                  {SCREENER_LINKS.map(l => (
                    <a
                      key={l.section}
                      href={screenerUrl(setup.symbol, setup.isConsolidated, l.section)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 px-2.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200 transition-colors"
                    >
                      {l.label} <ExternalLink size={9} />
                    </a>
                  ))}
                </>
              )}
            </div>
            <button
              onClick={handleFetch}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <RefreshCw size={11} /> Refetch
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
