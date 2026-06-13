import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useValuation, getDiscountRate } from '../../context/ValuationContext'
import { calculateRI } from '../../lib/calculations/residualIncome'
import type { TerminalTreatment } from '../../lib/calculations/residualIncome'
import { NumberInput } from '../ui/NumberInput'
import { ToggleSwitch } from '../ui/ToggleSwitch'
import { CAPMHelper } from '../CAPMHelper'
import { fmtRs0, fmtPct } from '../../lib/format'
import { screenerUrl } from '../../types'

export function RITab() {
  const { state, dispatch } = useValuation()
  const { ri, fundamentals, setup } = state
  const [showTable, setShowTable] = useState(false)

  const r      = getDiscountRate(state, ri.discountRateOverride, ri.useRateOverride, false)
  const bvps   = fundamentals.bookValuePerShare.value !== '' ? (fundamentals.bookValuePerShare.value as number) : 0
  const roe    = fundamentals.roe.value !== '' ? (fundamentals.roe.value as number) : 0
  const payout = fundamentals.payoutRatio.value !== '' ? (fundamentals.payoutRatio.value as number) : 0
  const cmp    = fundamentals.price.value !== '' ? (fundamentals.price.value as number) : 0
  const isAdv  = ri.mode === 'advanced'

  const canCompute = bvps > 0 && roe > 0 && payout >= 0 && r > 0
  const result = canCompute ? calculateRI({
    bookValuePerShare: bvps, roe: roe / 100,
    dividendPayout: payout / 100, costOfEquity: r,
    terminalTreatment: ri.terminalTreatment,
  }) : null

  const pl = screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'profit-loss')
  const bs = screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'balance-sheet')

  return (
    <div className="space-y-3">

      {/* ── Row 1: CAPM + info ── */}
      <div className="grid grid-cols-2 gap-3">
        <CAPMHelper />
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
          <span className="text-base leading-none mt-0.5">ℹ</span>
          <div>
            <strong>Best suited to:</strong> banks, NBFCs, insurers, and asset-heavy businesses where earnings closely track book value.
            <div className="mt-1 text-blue-500">Uses cost of equity from the CAPM Helper (left). Not WACC.</div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Inputs + Result ── */}
      <div className="grid grid-cols-3 gap-4 items-start">

        {/* Inputs panel */}
        <div className="col-span-2 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-700">Residual Income Inputs</h3>
            <ToggleSwitch
              checked={isAdv}
              onChange={v => dispatch({ type: 'SET_RI', payload: { mode: v ? 'advanced' : 'simple' } })}
            />
          </div>

          {/* ── Simple mode ── */}
          {!isAdv && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label="Book Value / Share" unit="₹"
                  value={fundamentals.bookValuePerShare.value}
                  onChange={v => dispatch({ type: 'SET_FIELD', key: 'bookValuePerShare', value: v })}
                  source={fundamentals.bookValuePerShare.source} asOf={fundamentals.bookValuePerShare.asOf} screenerHref={bs}
                  tooltip={<div>Screener.in → header ratios → "Book Value".</div>}
                  compact
                />
                <NumberInput
                  label="Return on Equity (ROE)" unit="%"
                  value={fundamentals.roe.value}
                  onChange={v => dispatch({ type: 'SET_FIELD', key: 'roe', value: v })}
                  source={fundamentals.roe.source} asOf={fundamentals.roe.asOf} screenerHref={bs}
                  step={0.5}
                  tooltip={<div>Screener.in → header ratios → "Return on equity".</div>}
                  compact
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label="Dividend Payout" unit="%"
                  value={fundamentals.payoutRatio.value}
                  onChange={v => dispatch({ type: 'SET_FIELD', key: 'payoutRatio', value: v })}
                  source={fundamentals.payoutRatio.source} asOf={fundamentals.payoutRatio.asOf} screenerHref={pl}
                  step={1}
                  tooltip={<div>Screener.in → P&L → "Dividend Payout %" row.</div>}
                  compact
                />
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Terminal Treatment</label>
                  <select
                    value={ri.terminalTreatment}
                    onChange={e => dispatch({ type: 'SET_RI', payload: { terminalTreatment: e.target.value as TerminalTreatment } })}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="linear_fade">Linear fade to zero (yrs 11–15)</option>
                    <option value="perpetuity">Perpetuity at year-10 RI level</option>
                    <option value="abrupt_stop">Abrupt stop after year 10</option>
                  </select>
                </div>
              </div>
              {result?.roeLtR && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  ℹ ROE ({roe}%) ≤ cost of equity ({fmtPct(r * 100)}) — residual income is negative; intrinsic value sits below book value. Valid result.
                </div>
              )}
              {!canCompute && (
                <p className="text-xs text-gray-400">Enter Book Value, ROE, and Payout Ratio to compute.</p>
              )}
            </div>
          )}

          {/* ── Advanced mode ── */}
          {isAdv && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label="Book Value / Share" unit="₹"
                  value={fundamentals.bookValuePerShare.value}
                  onChange={v => dispatch({ type: 'SET_FIELD', key: 'bookValuePerShare', value: v })}
                  source={fundamentals.bookValuePerShare.source} asOf={fundamentals.bookValuePerShare.asOf} screenerHref={bs}
                  tooltip={<div>Screener.in → header ratios → "Book Value".</div>}
                  compact
                />
                <NumberInput
                  label="Return on Equity (ROE)" unit="%"
                  value={fundamentals.roe.value}
                  onChange={v => dispatch({ type: 'SET_FIELD', key: 'roe', value: v })}
                  source={fundamentals.roe.source} asOf={fundamentals.roe.asOf} screenerHref={bs}
                  step={0.5}
                  tooltip={<div>Screener.in → header ratios → "Return on equity".</div>}
                  compact
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label="Dividend Payout" unit="%"
                  value={fundamentals.payoutRatio.value}
                  onChange={v => dispatch({ type: 'SET_FIELD', key: 'payoutRatio', value: v })}
                  source={fundamentals.payoutRatio.source} asOf={fundamentals.payoutRatio.asOf} screenerHref={pl}
                  step={1}
                  tooltip={<div>Screener.in → P&L → "Dividend Payout %" row.</div>}
                  compact
                />
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Terminal Treatment</label>
                  <select
                    value={ri.terminalTreatment}
                    onChange={e => dispatch({ type: 'SET_RI', payload: { terminalTreatment: e.target.value as TerminalTreatment } })}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="linear_fade">Linear fade to zero (yrs 11–15)</option>
                    <option value="perpetuity">Perpetuity at year-10 RI level</option>
                    <option value="abrupt_stop">Abrupt stop after year 10</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ri-rate-override" checked={ri.useRateOverride}
                  onChange={e => dispatch({ type: 'SET_RI', payload: { useRateOverride: e.target.checked } })}
                  className="accent-blue-600"
                />
                <label htmlFor="ri-rate-override" className="text-xs text-gray-600">Override cost of equity</label>
                {ri.useRateOverride && (
                  <input type="number" value={ri.discountRateOverride === '' ? '' : ri.discountRateOverride}
                    onChange={e => dispatch({ type: 'SET_RI', payload: { discountRateOverride: e.target.value === '' ? '' : parseFloat(e.target.value) } })}
                    placeholder="%" step={0.25}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                )}
              </div>
              {result?.roeLtR && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  ℹ ROE ({roe}%) ≤ cost of equity ({fmtPct(r * 100)}) — residual income is negative; intrinsic value sits below book value. Valid result.
                </div>
              )}
              {!canCompute && (
                <p className="text-xs text-gray-400">Enter Book Value, ROE, and Payout Ratio to compute.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Result card ── */}
        <div className="col-span-1">
          {result ? (
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4 sticky top-4">
              <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Residual Income Value</div>
              <div className="text-3xl font-bold text-gray-900">{fmtRs0(result.intrinsicPerShare)}</div>
              {cmp > 0 && (
                <div className={`text-sm font-medium mt-1 mb-3 ${result.intrinsicPerShare > cmp ? 'text-green-700' : 'text-red-600'}`}>
                  {(((result.intrinsicPerShare - cmp) / cmp) * 100).toFixed(1)}% vs CMP {fmtRs0(cmp)}
                </div>
              )}
              <div className="space-y-1 text-xs text-gray-600 border-t border-purple-200 pt-2 mb-3">
                <div className="flex justify-between"><span>Book Value (BV₀)</span><span className="font-medium">{fmtRs0(bvps)}</span></div>
                <div className="flex justify-between"><span>PV Residual Income (1–10)</span><span className="font-medium">{fmtRs0(result.pvResidualIncome)}</span></div>
                <div className="flex justify-between"><span>PV Terminal RI</span><span className="font-medium">{fmtRs0(result.pvTerminalRI)}</span></div>
                <div className="flex justify-between border-t border-purple-200 pt-1 font-semibold text-purple-700">
                  <span>Total</span><span>{fmtRs0(result.intrinsicPerShare)}</span>
                </div>
              </div>
              <button
                className="w-full flex items-center justify-between text-xs font-medium text-purple-700 border border-purple-200 rounded px-3 py-2 bg-white hover:bg-purple-50"
                onClick={() => setShowTable(v => !v)}
              >
                <span>10-year projection</span>
                {showTable ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {showTable && (
                <div className="mt-2 overflow-x-auto">
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr className="bg-purple-100 text-purple-800">
                        {['Yr', 'BV', 'EPS', 'RI', 'PV(RI)'].map(h => (
                          <th key={h} className="p-1 text-right first:text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map(row => (
                        <tr key={row.year} className="border-b border-purple-100">
                          <td className="p-1">{row.year}</td>
                          <td className="p-1 text-right">{row.bv.toFixed(0)}</td>
                          <td className="p-1 text-right">{row.eps.toFixed(1)}</td>
                          <td className={`p-1 text-right ${row.ri < 0 ? 'text-red-600' : 'text-green-700'}`}>{row.ri.toFixed(1)}</td>
                          <td className={`p-1 text-right ${row.pvRI < 0 ? 'text-red-600' : 'text-green-700'}`}>{row.pvRI.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400 text-sm sticky top-4">
              Fill Book Value, ROE, and Payout to see your estimate
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
