import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useValuation, getDiscountRate } from '../../context/ValuationContext'
import { calculateRI } from '../../lib/calculations/residualIncome'
import type { TerminalTreatment } from '../../lib/calculations/residualIncome'
import { NumberInput } from '../ui/NumberInput'
import { CAPMHelper } from '../CAPMHelper'
import { fmtRs0, fmtPct } from '../../lib/format'
import { screenerUrl } from '../../types'

export function RITab() {
  const { state, dispatch } = useValuation()
  const { ri, fundamentals, setup } = state
  const [showTable, setShowTable] = useState(false)

  const r = getDiscountRate(state, ri.discountRateOverride, ri.useRateOverride, false)
  const bvps = fundamentals.bookValuePerShare.value !== '' ? (fundamentals.bookValuePerShare.value as number) : 0
  const roe = fundamentals.roe.value !== '' ? (fundamentals.roe.value as number) : 0
  const payout = fundamentals.payoutRatio.value !== '' ? (fundamentals.payoutRatio.value as number) : 0
  const cmp = fundamentals.price.value !== '' ? (fundamentals.price.value as number) : 0

  const canCompute = bvps > 0 && roe > 0 && payout >= 0 && r > 0
  const result = canCompute ? calculateRI({
    bookValuePerShare: bvps,
    roe: roe / 100,
    dividendPayout: payout / 100,
    costOfEquity: r,
    terminalTreatment: ri.terminalTreatment,
  }) : null

  const pl = screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'profit-loss')
  const bs = screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'balance-sheet')

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="md:col-span-3 space-y-2">
        <div className="bg-blue-50 border border-blue-100 rounded p-2 text-xs text-blue-700">
          ℹ Best suited to <strong>banks, NBFCs, insurers</strong>, and asset-heavy businesses where earnings closely track book value.
        </div>

        <CAPMHelper />

        {/* Mode toggle */}
        <div className="flex gap-2 px-1">
          {(['simple', 'advanced'] as const).map(m => (
            <button key={m}
              onClick={() => dispatch({ type: 'SET_RI', payload: { mode: m } })}
              className={`px-3 py-1 rounded text-xs font-medium border ${ri.mode === m ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Residual Income Inputs</h3>
          <p className="text-xs text-gray-500 mb-3">Uses cost of equity (not WACC) — set it in the CAPM Helper above.</p>

          <NumberInput
            label="Book Value per Share"
            unit="₹"
            value={fundamentals.bookValuePerShare.value}
            onChange={v => dispatch({ type: 'SET_FIELD', key: 'bookValuePerShare', value: v })}
            source={fundamentals.bookValuePerShare.source}
            asOf={fundamentals.bookValuePerShare.asOf}
            screenerHref={bs}
            tooltip={<div>From screener.in header ratios — "Book Value".</div>}
          />

          <NumberInput
            label="Return on Equity (ROE)"
            unit="%"
            value={fundamentals.roe.value}
            onChange={v => dispatch({ type: 'SET_FIELD', key: 'roe', value: v })}
            source={fundamentals.roe.source}
            asOf={fundamentals.roe.asOf}
            screenerHref={bs}
            step={0.5}
            tooltip={<div>From screener.in header ratios — "Return on equity".</div>}
          />

          <NumberInput
            label="Dividend Payout Ratio"
            unit="%"
            value={fundamentals.payoutRatio.value}
            onChange={v => dispatch({ type: 'SET_FIELD', key: 'payoutRatio', value: v })}
            source={fundamentals.payoutRatio.source}
            asOf={fundamentals.payoutRatio.asOf}
            screenerHref={pl}
            step={1}
            tooltip={<div>From screener.in → P&L → "Dividend Payout %" row.</div>}
          />

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Terminal Treatment</label>
            <select
              value={ri.terminalTreatment}
              onChange={e => dispatch({ type: 'SET_RI', payload: { terminalTreatment: e.target.value as TerminalTreatment } })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="linear_fade">Linear fade to zero (yrs 11–15) — Default</option>
              <option value="perpetuity">Perpetuity at year-10 RI level</option>
              <option value="abrupt_stop">Abrupt stop after year 10</option>
            </select>
          </div>

          {ri.mode === 'advanced' && (
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
          )}

          {result?.roeLtR && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              ℹ ROE ({roe}%) ≤ cost of equity ({fmtPct(r * 100)}) — residual income is negative, so intrinsic value sits below book value. This is a valid result.
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-2">
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
              <div className="flex justify-between"><span>PV Residual Income (yrs 1–10)</span><span className="font-medium">{fmtRs0(result.pvResidualIncome)}</span></div>
              <div className="flex justify-between"><span>PV Terminal RI</span><span className="font-medium">{fmtRs0(result.pvTerminalRI)}</span></div>
              <div className="flex justify-between border-t border-purple-200 pt-1 font-semibold text-purple-700">
                <span>Total</span><span>{fmtRs0(result.intrinsicPerShare)}</span>
              </div>
            </div>

            <button
              className="w-full flex items-center justify-between text-xs font-medium text-purple-700 border border-purple-200 rounded px-3 py-2 bg-white hover:bg-purple-50"
              onClick={() => setShowTable(v => !v)}
            >
              <span>10-year projection table</span>
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
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400 text-sm">
            Fill Book Value, ROE, and Payout to see your estimate
          </div>
        )}
      </div>
    </div>
  )
}
