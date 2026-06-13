import { useValuation, getDiscountRate, getSelectedGrowth, getDerivedCAPM } from '../../context/ValuationContext'
import { calculateDCF, validateDCF, computeBaseFCFF, computeBaseFCFE } from '../../lib/calculations/dcf'
import { NumberInput } from '../ui/NumberInput'
import { ToggleSwitch } from '../ui/ToggleSwitch'
import { CAPMHelper } from '../CAPMHelper'
import { GrowthHelper } from '../GrowthHelper'
import { fmtRs0, fmtCr, fmtPct } from '../../lib/format'
import { screenerUrl } from '../../types'

export function DCFTab() {
  const { state, dispatch } = useValuation()
  const { dcf, fundamentals, setup } = state
  const isAdv = dcf.mode === 'advanced'
  const isFCFF = dcf.fcfMode === 'fcff'

  const gHelper = getSelectedGrowth(state)
  const stage1  = dcf.stage1Growth !== '' ? (dcf.stage1Growth as number) / 100 : gHelper
  const stage2  = dcf.stage2Growth !== '' ? (dcf.stage2Growth as number) / 100 : (stage1 + dcf.terminalGrowth / 100) / 2
  const termG   = dcf.terminalGrowth / 100
  const r       = getDiscountRate(state, dcf.discountRateOverride, dcf.useRateOverride, isFCFF && isAdv)

  const ebit  = fundamentals.ebit.value !== '' ? (fundamentals.ebit.value as number) : 0
  const tax   = (fundamentals.taxRate.value !== '' ? (fundamentals.taxRate.value as number) : 25) / 100
  const da    = fundamentals.depreciationAmortization.value !== '' ? (fundamentals.depreciationAmortization.value as number) : 0
  const capex = fundamentals.capex.value !== '' ? (fundamentals.capex.value as number) : 0
  const dwc   = fundamentals.changeInWorkingCapital.value !== '' ? (fundamentals.changeInWorkingCapital.value as number) : 0
  const baseFCFF = computeBaseFCFF({ ebit, taxRate: tax, da, capex, deltaWC: dwc })

  const ocf  = fundamentals.operatingCashFlow.value !== '' ? (fundamentals.operatingCashFlow.value as number) : 0
  const nb   = fundamentals.netBorrowings.value !== '' ? (fundamentals.netBorrowings.value as number) : 0
  const baseFCFE = computeBaseFCFE({ ocf, capex, netBorrowings: nb })

  const simpleFCF  = fundamentals.freeCashFlow.value !== '' ? (fundamentals.freeCashFlow.value as number) : 0
  const baseCF     = isAdv ? (isFCFF ? baseFCFF : baseFCFE) : simpleFCF
  const debt       = fundamentals.totalDebt.value !== '' ? (fundamentals.totalDebt.value as number) : 0
  const cash       = fundamentals.cashAndEquivalents.value !== '' ? (fundamentals.cashAndEquivalents.value as number) : 0
  const netDebtAdj = isAdv && !isFCFF ? 0 : debt - cash
  const shares     = fundamentals.sharesOutstanding.value !== '' ? (fundamentals.sharesOutstanding.value as number) : 0

  const canCompute = baseCF !== 0 && shares > 0 && r > 0
  const inputs     = canCompute ? { baseCashFlow: baseCF, stage1Growth: stage1, stage2Growth: stage2, terminalGrowth: termG, discountRate: r, netDebtAdjustment: netDebtAdj, sharesOutstanding: shares } : null
  const validation = inputs ? validateDCF(inputs) : { errors: [], warnings: [] }
  const result     = inputs && validation.errors.length === 0 ? calculateDCF(inputs) : null

  const cf = screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'cash-flow')
  const bs = screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'balance-sheet')
  const pl = screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'profit-loss')
  const derived = getDerivedCAPM(state)

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
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                DCF — {isAdv ? (isFCFF ? 'FCFF' : 'FCFE') : 'Simple'}
              </div>
              <div className="text-3xl font-bold text-gray-900">{fmtRs0(result.intrinsicPerShare)}</div>
              {fundamentals.price.value !== '' && (
                <div className={`text-sm font-medium mt-1 mb-3 ${result.intrinsicPerShare > (fundamentals.price.value as number) ? 'text-green-700' : 'text-red-600'}`}>
                  {(((result.intrinsicPerShare - (fundamentals.price.value as number)) / (fundamentals.price.value as number)) * 100).toFixed(1)}% vs CMP {fmtRs0(fundamentals.price.value as number)}
                </div>
              )}
              <div className="space-y-1 text-xs text-gray-600 border-t border-blue-200 pt-2 mb-2">
                <div className="flex justify-between"><span>{isAdv && isFCFF ? 'Enterprise Value' : 'Equity Value'}</span><span className="font-medium">{fmtCr(result.enterpriseOrEquityValue)}</span></div>
                {isAdv && isFCFF && <div className="flex justify-between"><span>Equity Value</span><span className="font-medium">{fmtCr(result.equityValue)}</span></div>}
                <div className="flex justify-between"><span>PV Cash Flows</span><span>{fmtCr(result.pvCashFlows)}</span></div>
                <div className={`flex justify-between ${result.terminalValuePct > 0.75 ? 'text-amber-600 font-semibold' : ''}`}>
                  <span>PV Terminal Value</span>
                  <span>{fmtCr(result.pvTerminalValue)} ({fmtPct(result.terminalValuePct * 100)})</span>
                </div>
              </div>
              {result.terminalValuePct > 0.75 && (
                <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  ⚠ {fmtPct(result.terminalValuePct * 100)} of value in terminal period.
                </div>
              )}
              {result.impliedExitMultiple !== undefined && (
                <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                  Implied EV/EBITDA: <strong>{result.impliedExitMultiple.toFixed(1)}×</strong>
                  {dcf.sectorNormEVEBITDA !== '' && result.impliedExitMultiple > (dcf.sectorNormEVEBITDA as number) && (
                    <span className="ml-1 text-amber-600">⚠ exceeds {dcf.sectorNormEVEBITDA}× norm</span>
                  )}
                </div>
              )}
              <div className="border-t border-blue-200 pt-2">
                <div className="text-xs font-semibold text-gray-600 mb-1">Sensitivity (r ± 1%, g ± 2%)</div>
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-gray-400 p-0.5 text-left font-normal">r \ g</th>
                      {[-2, 0, 2].map(g => <th key={g} className="text-center text-gray-600 p-0.5 font-medium">g{g >= 0 ? '+' : ''}{g}%</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.sensitivityGrid.map((row, ri) => (
                      <tr key={ri}>
                        <td className="text-gray-600 p-0.5 font-medium">r{ri === 0 ? '-1' : ri === 2 ? '+1' : ''}%</td>
                        {row.map((cell, ci) => (
                          <td key={ci} className={`text-center p-0.5 rounded ${ri === 1 && ci === 1 ? 'bg-blue-100 font-bold text-blue-800' : 'text-gray-700'}`}>
                            {isNaN(cell.intrinsicPerShare) ? '—' : fmtRs0(cell.intrinsicPerShare)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400 text-sm">
              Fill required fields to see your DCF estimate
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2 Col 1+2: DCF Inputs ── */}
      <div className="col-span-2 border border-gray-200 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-700">DCF Inputs</h3>
          <ToggleSwitch
            checked={isAdv}
            onChange={v => dispatch({ type: 'SET_DCF', payload: { mode: v ? 'advanced' : 'simple' } })}
          />
        </div>

        {/* ── Simple ── */}
        {!isAdv && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Base Free Cash Flow" unit="₹ Cr"
                value={fundamentals.freeCashFlow.value}
                onChange={v => dispatch({ type: 'SET_FIELD', key: 'freeCashFlow', value: v })}
                source={fundamentals.freeCashFlow.source} asOf={fundamentals.freeCashFlow.asOf} screenerHref={cf}
                tooltip={<div>OCF minus Capex. Screener → Cash Flow tab.</div>} compact />
              <NumberInput label="Growth (yrs 1–10)" unit="%"
                value={dcf.stage1Growth !== '' ? dcf.stage1Growth : (gHelper > 0 ? gHelper * 100 : '')}
                onChange={v => dispatch({ type: 'SET_DCF', payload: { stage1Growth: v } })}
                placeholder={gHelper > 0 ? `${(gHelper * 100).toFixed(1)} (helper)` : 'e.g. 15'}
                step={0.5} compact />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Terminal Growth: {dcf.terminalGrowth}%
                {dcf.terminalGrowth > 7 && <span className="ml-1 text-amber-600">⚠ high</span>}
              </label>
              <input type="range" min={0} max={8} step={0.25} value={dcf.terminalGrowth}
                onChange={e => dispatch({ type: 'SET_DCF', payload: { terminalGrowth: parseFloat(e.target.value) } })}
                className="w-full accent-blue-600" />
              <div className="flex justify-between text-xs text-gray-400"><span>0%</span><span>8%</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Total Debt" unit="₹ Cr"
                value={fundamentals.totalDebt.value}
                onChange={v => dispatch({ type: 'SET_FIELD', key: 'totalDebt', value: v })}
                source={fundamentals.totalDebt.source} asOf={fundamentals.totalDebt.asOf} screenerHref={bs} compact />
              <NumberInput label="Cash & Equivalents" unit="₹ Cr"
                value={fundamentals.cashAndEquivalents.value}
                onChange={v => dispatch({ type: 'SET_FIELD', key: 'cashAndEquivalents', value: v })}
                source={fundamentals.cashAndEquivalents.source} asOf={fundamentals.cashAndEquivalents.asOf} screenerHref={bs} compact />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={dcf.useRateOverride}
                onChange={e => dispatch({ type: 'SET_DCF', payload: { useRateOverride: e.target.checked } })}
                className="accent-blue-600" />
              <span className="text-xs text-gray-600">Override discount rate</span>
              {dcf.useRateOverride && (
                <input type="number" value={dcf.discountRateOverride === '' ? '' : dcf.discountRateOverride}
                  onChange={e => dispatch({ type: 'SET_DCF', payload: { discountRateOverride: e.target.value === '' ? '' : parseFloat(e.target.value) } })}
                  placeholder="%" step={0.25} className="w-20 border border-gray-300 rounded px-2 py-1 text-xs" />
              )}
            </div>
            <p className="text-xs text-gray-400">Uses cost of equity and subtracts net debt. Switch to Advanced for WACC/FCFF.</p>
          </div>
        )}

        {/* ── Advanced ── */}
        {isAdv && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {(['fcfe', 'fcff'] as const).map(m => (
                  <button key={m}
                    onClick={() => dispatch({ type: 'SET_DCF', payload: { fcfMode: m } })}
                    className={`px-3 py-1 rounded text-xs font-medium border ${dcf.fcfMode === m ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600'}`}
                  >{m.toUpperCase()}</button>
                ))}
              </div>
              <span className="text-xs text-gray-500">
                {isFCFF ? 'FCFF → EV − net debt → equity · Uses WACC' : 'FCFE → equity directly · Uses cost of equity'}
                {isFCFF && !derived.wacc && <span className="ml-1 text-amber-600">⚠ set beta + mkt cap for WACC</span>}
              </span>
            </div>

            {isFCFF && (
              <>
                <p className="text-xs text-gray-500">FCFF = EBIT × (1−T) + D&A − ΔWC − Capex</p>
                <div className="grid grid-cols-4 gap-2">
                  {([['ebit','EBIT',pl],['depreciationAmortization','D&A',cf],['capex','Capex',cf],['changeInWorkingCapital','ΔWC',cf]] as const).map(([key,label,href]) => (
                    <NumberInput key={key} label={label} unit="₹ Cr"
                      value={fundamentals[key].value} onChange={v => dispatch({ type: 'SET_FIELD', key, value: v })}
                      source={fundamentals[key].source} asOf={fundamentals[key].asOf} screenerHref={href} compact />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <NumberInput label="Tax Rate" unit="%"
                    value={fundamentals.taxRate.value} onChange={v => dispatch({ type: 'SET_FIELD', key: 'taxRate', value: v })}
                    source={fundamentals.taxRate.source} asOf={fundamentals.taxRate.asOf} screenerHref={pl} compact
                    tooltip={<div>Effective tax rate = Tax ÷ Pretax Income. Clamped 15–35%.</div>} />
                  {baseCF !== 0 && <div className="text-xs px-2 py-1.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700">FCFF: <strong>{fmtCr(baseFCFF)}</strong></div>}
                </div>
              </>
            )}

            {!isFCFF && (
              <>
                <p className="text-xs text-gray-500">FCFE = OCF − Capex + Net Borrowings</p>
                <div className="grid grid-cols-3 gap-2">
                  {([['operatingCashFlow','Op. Cash Flow',cf],['capex','Capex',cf],['netBorrowings','Net Borrowings',cf]] as const).map(([key,label,href]) => (
                    <NumberInput key={key} label={label} unit="₹ Cr"
                      value={fundamentals[key].value} onChange={v => dispatch({ type: 'SET_FIELD', key, value: v })}
                      source={fundamentals[key].source} asOf={fundamentals[key].asOf} screenerHref={href} compact />
                  ))}
                </div>
                {baseCF !== 0 && <div className="text-xs px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 inline-block">FCFE: <strong>{fmtCr(baseFCFE)}</strong></div>}
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Stage 1 Growth (yrs 1–5)" unit="%"
                value={dcf.stage1Growth !== '' ? dcf.stage1Growth : (gHelper > 0 ? gHelper * 100 : '')}
                onChange={v => dispatch({ type: 'SET_DCF', payload: { stage1Growth: v } })}
                placeholder={gHelper > 0 ? `${(gHelper * 100).toFixed(1)} (helper)` : 'e.g. 15'} step={0.5} compact />
              <NumberInput label="Stage 2 Growth (yrs 6–10)" unit="%"
                value={dcf.stage2Growth} onChange={v => dispatch({ type: 'SET_DCF', payload: { stage2Growth: v } })}
                placeholder={`${(stage2 * 100).toFixed(1)} (auto)`} step={0.5} compact />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Terminal Growth: {dcf.terminalGrowth}%
                {dcf.terminalGrowth > 7 && <span className="ml-1 text-amber-600">⚠ high</span>}
              </label>
              <input type="range" min={0} max={8} step={0.25} value={dcf.terminalGrowth}
                onChange={e => dispatch({ type: 'SET_DCF', payload: { terminalGrowth: parseFloat(e.target.value) } })}
                className="w-full accent-blue-600" />
              <div className="flex justify-between text-xs text-gray-400"><span>0%</span><span>8%</span></div>
            </div>

            <div className="grid grid-cols-2 gap-2 items-start">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={dcf.useRateOverride}
                  onChange={e => dispatch({ type: 'SET_DCF', payload: { useRateOverride: e.target.checked } })}
                  className="accent-blue-600" />
                <span className="text-xs text-gray-600">Override {isFCFF ? 'WACC' : 'discount rate'}</span>
                {dcf.useRateOverride && (
                  <input type="number" value={dcf.discountRateOverride === '' ? '' : dcf.discountRateOverride}
                    onChange={e => dispatch({ type: 'SET_DCF', payload: { discountRateOverride: e.target.value === '' ? '' : parseFloat(e.target.value) } })}
                    placeholder="%" step={0.25} className="w-16 border border-gray-300 rounded px-2 py-1 text-xs" />
                )}
              </div>
              <NumberInput label="Sector EV/EBITDA norm" value={dcf.sectorNormEVEBITDA}
                onChange={v => dispatch({ type: 'SET_DCF', payload: { sectorNormEVEBITDA: v } })}
                placeholder="e.g. 20"
                tooltip={<div>Cross-checks terminal value via implied exit multiple.</div>} compact />
            </div>

            {isFCFF && (
              <div className="grid grid-cols-2 gap-2">
                <NumberInput label="Total Debt" unit="₹ Cr"
                  value={fundamentals.totalDebt.value} onChange={v => dispatch({ type: 'SET_FIELD', key: 'totalDebt', value: v })}
                  source={fundamentals.totalDebt.source} asOf={fundamentals.totalDebt.asOf} screenerHref={bs} compact />
                <NumberInput label="Cash & Equivalents" unit="₹ Cr"
                  value={fundamentals.cashAndEquivalents.value} onChange={v => dispatch({ type: 'SET_FIELD', key: 'cashAndEquivalents', value: v })}
                  source={fundamentals.cashAndEquivalents.source} asOf={fundamentals.cashAndEquivalents.asOf} screenerHref={bs} compact />
              </div>
            )}
          </div>
        )}

        {validation.errors.map((e, i) => <div key={i} className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{e.message}</div>)}
        {validation.warnings.map((w, i) => <div key={i} className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">{w.message}</div>)}
      </div>
    </div>
  )
}
