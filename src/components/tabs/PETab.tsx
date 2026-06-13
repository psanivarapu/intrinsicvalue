import { useValuation, getDiscountRate, getSelectedGrowth } from '../../context/ValuationContext'
import { calculatePE, grahamPE } from '../../lib/calculations/pe'
import { NumberInput } from '../ui/NumberInput'
import { ToggleSwitch } from '../ui/ToggleSwitch'
import { CAPMHelper } from '../CAPMHelper'
import { GrowthHelper } from '../GrowthHelper'
import { fmtRs0, fmtRs, fmtPct } from '../../lib/format'
import { screenerUrl } from '../../types'

export function PETab() {
  const { state, dispatch } = useValuation()
  const { pe, fundamentals, setup } = state

  const eps       = fundamentals.trailingEps.value !== '' ? (fundamentals.trailingEps.value as number) : 0
  const gHelper   = getSelectedGrowth(state)
  const epsGrowth = pe.epsGrowth !== '' ? (pe.epsGrowth as number) / 100 : gHelper
  const fairPE    = pe.fairPE !== '' ? (pe.fairPE as number) : 0
  const r         = getDiscountRate(state, pe.discountRateOverride, pe.useRateOverride, false)
  const cmp       = fundamentals.price.value !== '' ? (fundamentals.price.value as number) : 0
  const isAdv     = pe.mode === 'advanced'
  const graham    = grahamPE(epsGrowth * 100)

  const canCompute = eps !== 0 && fairPE > 0 && r > 0 && epsGrowth > 0
  const result     = canCompute ? calculatePE({ currentEPS: eps, epsGrowth, fairPE, discountRate: r }) : null

  const pl = screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'profit-loss')

  return (
    <div className="grid grid-cols-3 gap-3 items-start">

      {/* ── Row 1 Col 1: CAPM Helper ── */}
      <CAPMHelper />

      {/* ── Row 1 Col 2: Growth Helper ── */}
      <GrowthHelper />

      {/* ── Col 3 rows 1+2: Result card ── */}
      <div className="row-span-2">
        <div className="sticky top-3">
          {result ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">PE Multiple</div>
              <div className="text-3xl font-bold text-gray-900">{fmtRs0(result.intrinsicPerShare)}</div>
              {cmp > 0 && (
                <div className={`text-sm font-medium mt-1 mb-3 ${result.intrinsicPerShare > cmp ? 'text-green-700' : 'text-red-600'}`}>
                  {(((result.intrinsicPerShare - cmp) / cmp) * 100).toFixed(1)}% vs CMP {fmtRs0(cmp)}
                </div>
              )}
              <div className="space-y-1 text-xs text-gray-600 border-t border-green-200 pt-2 mb-2">
                <div className="flex justify-between"><span>Current EPS</span><span className="font-medium">{fmtRs(eps)}</span></div>
                <div className="flex justify-between"><span>EPS in 5 years</span><span className="font-medium">{fmtRs(result.eps5)}</span></div>
                <div className="flex justify-between"><span>Future price (EPS₅ × PE)</span><span className="font-medium">{fmtRs0(result.futureValue)}</span></div>
                <div className="flex justify-between"><span>Discount rate</span><span>{fmtPct(r * 100)}</span></div>
                <div className="flex justify-between border-t border-green-100 pt-1 text-gray-400">
                  <span>Simple (EPS × PE)</span><span>{fmtRs0(result.simpleValue)}</span>
                </div>
              </div>
              <div className="text-xs text-gray-400 pt-2 border-t border-green-100">
                Projects EPS 5 years out, applies Fair PE, then discounts to today.
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400 text-sm">
              Fill EPS, growth, and Fair PE to see your estimate
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2 Col 1+2: PE Inputs ── */}
      <div className="col-span-2 border border-gray-200 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-700">PE Inputs</h3>
          <ToggleSwitch
            checked={isAdv}
            onChange={v => dispatch({ type: 'SET_PE', payload: { mode: v ? 'advanced' : 'simple' } })}
          />
        </div>

        {/* ── Simple mode ── */}
        {!isAdv && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="Trailing EPS" unit="₹"
                value={fundamentals.trailingEps.value}
                onChange={v => dispatch({ type: 'SET_FIELD', key: 'trailingEps', value: v })}
                source={fundamentals.trailingEps.source} asOf={fundamentals.trailingEps.asOf} screenerHref={pl}
                tooltip={<div>TTM EPS. Screener.in → P&L → Net Profit ÷ Shares.</div>}
                compact
              />
              <NumberInput
                label="EPS Growth (5 yrs)" unit="%"
                value={pe.epsGrowth !== '' ? pe.epsGrowth : (gHelper > 0 ? gHelper * 100 : '')}
                onChange={v => dispatch({ type: 'SET_PE', payload: { epsGrowth: v } })}
                placeholder={gHelper > 0 ? `${(gHelper * 100).toFixed(1)} (helper)` : 'e.g. 15'}
                step={0.5} compact
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fair PE Multiple</label>
              {epsGrowth > 0 && (
                <button
                  className="mb-1.5 flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
                  onClick={() => dispatch({ type: 'SET_PE', payload: { fairPE: graham.pe } })}
                  title="Graham PE = 8.5 + 2g"
                >
                  Graham PE: {graham.pe.toFixed(1)}{graham.capped ? ' (capped at 40)' : ''}
                </button>
              )}
              <input
                type="number"
                value={pe.fairPE === '' ? '' : pe.fairPE}
                onChange={e => dispatch({ type: 'SET_PE', payload: { fairPE: e.target.value === '' ? '' : parseFloat(e.target.value) } })}
                placeholder="Enter your chosen Fair PE"
                step={0.5}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            {!canCompute && (
              <p className="text-xs text-gray-400">Enter Trailing EPS, EPS Growth, and Fair PE to compute.</p>
            )}
          </div>
        )}

        {/* ── Advanced mode ── */}
        {isAdv && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="Trailing EPS" unit="₹"
                value={fundamentals.trailingEps.value}
                onChange={v => dispatch({ type: 'SET_FIELD', key: 'trailingEps', value: v })}
                source={fundamentals.trailingEps.source} asOf={fundamentals.trailingEps.asOf} screenerHref={pl}
                tooltip={<div>TTM EPS. Screener.in → P&L → Net Profit ÷ Shares.</div>}
                compact
              />
              <NumberInput
                label="EPS Growth (5 yrs)" unit="%"
                value={pe.epsGrowth !== '' ? pe.epsGrowth : (gHelper > 0 ? gHelper * 100 : '')}
                onChange={v => dispatch({ type: 'SET_PE', payload: { epsGrowth: v } })}
                placeholder={gHelper > 0 ? `${(gHelper * 100).toFixed(1)} (helper)` : 'e.g. 15'}
                step={0.5} compact
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fair PE Multiple</label>
              {epsGrowth > 0 && (
                <button
                  className="mb-1.5 flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
                  onClick={() => dispatch({ type: 'SET_PE', payload: { fairPE: graham.pe } })}
                >
                  Graham PE: {graham.pe.toFixed(1)}{graham.capped ? ' (capped at 40)' : ''}
                </button>
              )}
              <input
                type="number"
                value={pe.fairPE === '' ? '' : pe.fairPE}
                onChange={e => dispatch({ type: 'SET_PE', payload: { fairPE: e.target.value === '' ? '' : parseFloat(e.target.value) } })}
                placeholder="Enter your chosen Fair PE"
                step={0.5}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pe-rate-override" checked={pe.useRateOverride}
                onChange={e => dispatch({ type: 'SET_PE', payload: { useRateOverride: e.target.checked } })}
                className="accent-blue-600"
              />
              <label htmlFor="pe-rate-override" className="text-xs text-gray-600">Override discount rate</label>
              {pe.useRateOverride && (
                <input type="number" value={pe.discountRateOverride === '' ? '' : pe.discountRateOverride}
                  onChange={e => dispatch({ type: 'SET_PE', payload: { discountRateOverride: e.target.value === '' ? '' : parseFloat(e.target.value) } })}
                  placeholder="%" step={0.25}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-xs"
                />
              )}
            </div>
            {!canCompute && (
              <p className="text-xs text-gray-400">Enter Trailing EPS, EPS Growth, and Fair PE to compute.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
