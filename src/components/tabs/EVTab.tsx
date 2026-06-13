import { useValuation } from '../../context/ValuationContext'
import { calculateEV } from '../../lib/calculations/ev'
import { NumberInput } from '../ui/NumberInput'
import { ToggleSwitch } from '../ui/ToggleSwitch'
import { fmtRs0, fmtCr } from '../../lib/format'
import { screenerUrl } from '../../types'

const SECTOR_RANGES = [
  { sector: 'FMCG', range: '18–25×' },
  { sector: 'IT Services', range: '14–20×' },
  { sector: 'Pharma', range: '12–18×' },
  { sector: 'Autos', range: '8–12×' },
  { sector: 'Utilities', range: '7–10×' },
  { sector: 'Metals', range: '5–8×' },
]

export function EVTab() {
  const { state, dispatch } = useValuation()
  const { ev, fundamentals, setup } = state
  const isAdv = ev.mode === 'advanced'

  const ebitda    = fundamentals.ebitda.value !== '' ? (fundamentals.ebitda.value as number) : 0
  const multiple  = ev.multiple !== '' ? (ev.multiple as number) : 0
  const totalDebt = fundamentals.totalDebt.value !== '' ? (fundamentals.totalDebt.value as number) : 0
  const cash      = fundamentals.cashAndEquivalents.value !== '' ? (fundamentals.cashAndEquivalents.value as number) : 0
  const shares    = fundamentals.sharesOutstanding.value !== '' ? (fundamentals.sharesOutstanding.value as number) : 0
  const cmp       = fundamentals.price.value !== '' ? (fundamentals.price.value as number) : 0

  const canCompute = ebitda > 0 && multiple > 0 && shares > 0
  const result     = canCompute ? calculateEV({ ebitda, multiple, totalDebt, cash, sharesOutstanding: shares }) : null

  const pl = screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'profit-loss')
  const bs = screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'balance-sheet')

  return (
    <div className="space-y-3">

      {/* ── Warning row (no top helpers for EV) ── */}
      <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
        ⚠ EV/EBITDA is <strong>not meaningful for banks and NBFCs</strong> — use the Residual Income tab for financial businesses.
      </div>

      {/* ── Main: Inputs + Result ── */}
      <div className="grid grid-cols-3 gap-4 items-start">

        {/* Inputs panel */}
        <div className="col-span-2 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-700">EV/EBITDA Inputs</h3>
            <ToggleSwitch
              checked={isAdv}
              onChange={v => dispatch({ type: 'SET_EV', payload: { mode: v ? 'advanced' : 'simple' } })}
            />
          </div>

          {/* ── Simple mode ── */}
          {!isAdv && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label="EBITDA" unit="₹ Cr"
                  value={fundamentals.ebitda.value}
                  onChange={v => dispatch({ type: 'SET_FIELD', key: 'ebitda', value: v })}
                  source={fundamentals.ebitda.source} asOf={fundamentals.ebitda.asOf} screenerHref={pl}
                  tooltip={<div>Screener.in → P&L → "Operating Profit" row (≈ EBITDA).</div>}
                  compact
                />
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fair EV/EBITDA Multiple</label>
                  <input
                    type="number"
                    value={ev.multiple === '' ? '' : ev.multiple}
                    onChange={e => dispatch({ type: 'SET_EV', payload: { multiple: e.target.value === '' ? '' : parseFloat(e.target.value) } })}
                    placeholder="Enter multiple"
                    step={0.5}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {SECTOR_RANGES.map(s => (
                  <span key={s.sector} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {s.sector}: {s.range}
                  </span>
                ))}
              </div>
              {shares > 0 ? (
                <p className="text-xs text-gray-500">Using {shares} Cr shares, {fmtCr(totalDebt)} debt, {fmtCr(cash)} cash from fundamentals.</p>
              ) : (
                <p className="text-xs text-amber-600">⚠ Enter shares outstanding in the Setup Panel above.</p>
              )}
              {!canCompute && (
                <p className="text-xs text-gray-400">Enter EBITDA, multiple, and ensure shares are filled.</p>
              )}
            </div>
          )}

          {/* ── Advanced mode ── */}
          {isAdv && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label="EBITDA" unit="₹ Cr"
                  value={fundamentals.ebitda.value}
                  onChange={v => dispatch({ type: 'SET_FIELD', key: 'ebitda', value: v })}
                  source={fundamentals.ebitda.source} asOf={fundamentals.ebitda.asOf} screenerHref={pl}
                  tooltip={<div>Screener.in → P&L → "Operating Profit" row (≈ EBITDA).</div>}
                  compact
                />
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fair EV/EBITDA Multiple</label>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {SECTOR_RANGES.map(s => (
                      <span key={s.sector} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {s.sector}: {s.range}
                      </span>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={ev.multiple === '' ? '' : ev.multiple}
                    onChange={e => dispatch({ type: 'SET_EV', payload: { multiple: e.target.value === '' ? '' : parseFloat(e.target.value) } })}
                    placeholder="Enter multiple"
                    step={0.5}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label="Total Debt" unit="₹ Cr"
                  value={fundamentals.totalDebt.value}
                  onChange={v => dispatch({ type: 'SET_FIELD', key: 'totalDebt', value: v })}
                  source={fundamentals.totalDebt.source} asOf={fundamentals.totalDebt.asOf} screenerHref={bs} compact
                />
                <NumberInput
                  label="Cash & Equivalents" unit="₹ Cr"
                  value={fundamentals.cashAndEquivalents.value}
                  onChange={v => dispatch({ type: 'SET_FIELD', key: 'cashAndEquivalents', value: v })}
                  source={fundamentals.cashAndEquivalents.source} asOf={fundamentals.cashAndEquivalents.asOf} screenerHref={bs} compact
                />
              </div>
              {shares > 0 ? (
                <p className="text-xs text-gray-500">Using {shares} Cr shares from fundamentals.</p>
              ) : (
                <p className="text-xs text-amber-600">⚠ Enter shares outstanding in the Setup Panel above.</p>
              )}
              {!canCompute && (
                <p className="text-xs text-gray-400">Enter EBITDA, multiple, and ensure shares are filled.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Result card ── */}
        <div className="col-span-1">
          {result ? (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4 sticky top-4">
              <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">EV/EBITDA Value</div>
              <div className="text-3xl font-bold text-gray-900">{fmtRs0(result.intrinsicPerShare)}</div>
              {cmp > 0 && (
                <div className={`text-sm font-medium mt-1 mb-3 ${result.intrinsicPerShare > cmp ? 'text-green-700' : 'text-red-600'}`}>
                  {(((result.intrinsicPerShare - cmp) / cmp) * 100).toFixed(1)}% vs CMP {fmtRs0(cmp)}
                </div>
              )}
              <div className="space-y-1 text-xs text-gray-600 border-t border-orange-200 pt-2">
                <div className="flex justify-between"><span>EBITDA × {multiple}× = Implied EV</span><span className="font-medium">{fmtCr(result.impliedEV)}</span></div>
                <div className="flex justify-between text-red-600"><span>Minus Debt</span><span>−{fmtCr(totalDebt)}</span></div>
                <div className="flex justify-between text-green-600"><span>Plus Cash</span><span>+{fmtCr(cash)}</span></div>
                <div className="flex justify-between border-t border-orange-200 pt-1 font-semibold">
                  <span>Implied Equity Value</span><span>{fmtCr(result.impliedEquityValue)}</span>
                </div>
                <div className="flex justify-between text-orange-700 font-bold">
                  <span>÷ {shares} Cr shares</span><span>{fmtRs0(result.intrinsicPerShare)}</span>
                </div>
              </div>
              {result.netCash && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                  ✓ Net cash position.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400 text-sm sticky top-4">
              Fill EBITDA, multiple, and shares to see your estimate
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
