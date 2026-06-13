import { useValuation } from '../context/ValuationContext'
import { Collapsible } from './ui/Collapsible'
import { NumberInput } from './ui/NumberInput'
import { screenerUrl } from '../types'

export function GrowthHelper() {
  const { state, dispatch } = useValuation()
  const { growth, fetch, setup, fundamentals } = state

  const roe = fundamentals.roe.value !== '' ? (fundamentals.roe.value as number) : null
  const payout = fundamentals.payoutRatio.value !== '' ? (fundamentals.payoutRatio.value as number) : null
  const sustainableG = roe !== null && payout !== null ? roe * (1 - payout / 100) : null

  const selected = growth.selectedGrowth
  const badge = selected !== '' ? <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">g = {selected}%</span> : undefined

  return (
    <Collapsible title="Growth Helper" defaultOpen={false} badge={badge}>
      <p className="text-xs text-gray-500 mb-2">Review anchors, then set your chosen growth rate.</p>

      <div className="space-y-2 mb-2">
        {/* 1. Historical */}
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">Historical CAGR</div>
          {fetch.histNiCagr !== null && (
            <div className="text-xs text-blue-700 mb-1">
              Net income CAGR (Yahoo): <strong>{fetch.histNiCagr}%</strong>
            </div>
          )}
          <NumberInput
            label="Screener 5-yr Profit CAGR"
            unit="%"
            value={growth.manualHistCAGR}
            onChange={v => dispatch({ type: 'SET_GROWTH', payload: { manualHistCAGR: v } })}
            placeholder="from screener"
            step={0.5}
            compact
            tooltip={<div>
              Screener.in → Company → <strong>"Compounded Profit Growth"</strong> → 5-yr.<br />
              <a href={screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'analysis')} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open screener →</a>
            </div>}
          />
        </div>

        {/* 2. Sustainable */}
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">Sustainable g = ROE × (1−payout)</div>
          {sustainableG !== null ? (
            <div className="text-xs font-semibold text-green-700">
              {roe}% × (1 − {payout}%) = {sustainableG.toFixed(1)}%
            </div>
          ) : (
            <div className="text-xs text-gray-400">Needs ROE & payout from fundamentals</div>
          )}
        </div>

        {/* 3. Analyst */}
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">Analyst Consensus</div>
          <NumberInput
            label="Analyst estimate"
            unit="%"
            value={growth.analystConsensus}
            onChange={v => dispatch({ type: 'SET_GROWTH', payload: { analystConsensus: v } })}
            placeholder="optional"
            step={0.5}
            compact
            tooltip={<div>Available on Trendlyne.com or Moneycontrol → Estimates tab.</div>}
          />
        </div>
      </div>

      <NumberInput
        label="Your chosen Stage 1 Growth"
        unit="%"
        value={growth.selectedGrowth}
        onChange={v => dispatch({ type: 'SET_GROWTH', payload: { selectedGrowth: v } })}
        placeholder="Enter g to use across tabs"
        step={0.5}
        compact
      />

      {/* Quick-fill chips */}
      <div className="flex flex-wrap gap-1 mt-1">
        {[
          fetch.histNiCagr !== null ? { label: `Yahoo: ${fetch.histNiCagr}%`, v: fetch.histNiCagr } : null,
          growth.manualHistCAGR !== '' ? { label: `Screener: ${growth.manualHistCAGR}%`, v: growth.manualHistCAGR as number } : null,
          sustainableG !== null ? { label: `Sust: ${sustainableG.toFixed(1)}%`, v: sustainableG } : null,
          growth.analystConsensus !== '' ? { label: `Analyst: ${growth.analystConsensus}%`, v: growth.analystConsensus as number } : null,
        ].filter(Boolean).map((chip) => (
          <button key={chip!.label}
            onClick={() => dispatch({ type: 'SET_GROWTH', payload: { selectedGrowth: chip!.v } })}
            className="px-2 py-0.5 text-xs bg-white border border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-300 text-gray-600"
          >
            {chip!.label}
          </button>
        ))}
      </div>
    </Collapsible>
  )
}
