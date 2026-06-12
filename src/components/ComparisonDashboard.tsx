import { useState } from 'react'
import { Copy, CheckCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ReferenceLine, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import {
  useValuation, getDiscountRate, getSelectedGrowth, getDerivedCAPM,
} from '../context/ValuationContext'
import {
  calculateDCF, validateDCF, computeBaseFCFF, computeBaseFCFE,
} from '../lib/calculations/dcf'
import { calculatePE } from '../lib/calculations/pe'
import { calculateRI } from '../lib/calculations/residualIncome'
import { calculateEV } from '../lib/calculations/ev'
import { fmtRs0, fmtPct } from '../lib/format'

interface MethodResult { method: string; iv: number | null }

function useMethodResults(): { methods: MethodResult[]; cmp: number } {
  const { state } = useValuation()
  const { dcf, pe, ri, ev, fundamentals } = state

  const shares = fundamentals.sharesOutstanding.value !== '' ? (fundamentals.sharesOutstanding.value as number) : 0
  const cmp = fundamentals.price.value !== '' ? (fundamentals.price.value as number) : 0
  const gHelper = getSelectedGrowth(state)

  // ── DCF ──
  let dcfIV: number | null = null
  const isFCFF = dcf.mode === 'advanced' && dcf.fcfMode === 'fcff'
  const isFCFE = dcf.mode === 'advanced' && dcf.fcfMode === 'fcfe'

  let baseCF = 0
  if (dcf.mode === 'advanced' && isFCFF) {
    baseCF = computeBaseFCFF({
      ebit: fundamentals.ebit.value !== '' ? (fundamentals.ebit.value as number) : 0,
      taxRate: (fundamentals.taxRate.value !== '' ? (fundamentals.taxRate.value as number) : 25) / 100,
      da: fundamentals.depreciationAmortization.value !== '' ? (fundamentals.depreciationAmortization.value as number) : 0,
      capex: fundamentals.capex.value !== '' ? (fundamentals.capex.value as number) : 0,
      deltaWC: fundamentals.changeInWorkingCapital.value !== '' ? (fundamentals.changeInWorkingCapital.value as number) : 0,
    })
  } else if (dcf.mode === 'advanced' && isFCFE) {
    baseCF = computeBaseFCFE({
      ocf: fundamentals.operatingCashFlow.value !== '' ? (fundamentals.operatingCashFlow.value as number) : 0,
      capex: fundamentals.capex.value !== '' ? (fundamentals.capex.value as number) : 0,
      netBorrowings: fundamentals.netBorrowings.value !== '' ? (fundamentals.netBorrowings.value as number) : 0,
    })
  } else {
    baseCF = fundamentals.freeCashFlow.value !== '' ? (fundamentals.freeCashFlow.value as number) : 0
  }

  const debt = fundamentals.totalDebt.value !== '' ? (fundamentals.totalDebt.value as number) : 0
  const cash = fundamentals.cashAndEquivalents.value !== '' ? (fundamentals.cashAndEquivalents.value as number) : 0
  const netDebtAdj = (dcf.mode === 'advanced' && isFCFE) ? 0 : debt - cash
  const rDCF = getDiscountRate(state, dcf.discountRateOverride, dcf.useRateOverride, isFCFF)
  const stage1 = dcf.stage1Growth !== '' ? (dcf.stage1Growth as number) / 100 : gHelper
  const stage2 = dcf.stage2Growth !== '' ? (dcf.stage2Growth as number) / 100 : (stage1 + dcf.terminalGrowth / 100) / 2

  if (baseCF !== 0 && shares > 0 && rDCF > 0) {
    const inp = {
      baseCashFlow: baseCF,
      stage1Growth: stage1,
      stage2Growth: stage2,
      terminalGrowth: dcf.terminalGrowth / 100,
      discountRate: rDCF,
      netDebtAdjustment: netDebtAdj,
      sharesOutstanding: shares,
    }
    const { errors } = validateDCF(inp)
    if (errors.length === 0) dcfIV = calculateDCF(inp).intrinsicPerShare
  }

  // ── PE ──
  let peIV: number | null = null
  const epsGrowth = pe.epsGrowth !== '' ? (pe.epsGrowth as number) / 100 : gHelper
  const eps = fundamentals.trailingEps.value !== '' ? (fundamentals.trailingEps.value as number) : 0
  const rPE = getDiscountRate(state, pe.discountRateOverride, pe.useRateOverride, false)
  if (eps !== 0 && epsGrowth > 0 && pe.fairPE !== '' && rPE > 0) {
    peIV = calculatePE({ currentEPS: eps, epsGrowth, fairPE: pe.fairPE as number, discountRate: rPE }).intrinsicPerShare
  }

  // ── RI ──
  let riIV: number | null = null
  const bvps = fundamentals.bookValuePerShare.value !== '' ? (fundamentals.bookValuePerShare.value as number) : 0
  const roe = fundamentals.roe.value !== '' ? (fundamentals.roe.value as number) : 0
  const payout = fundamentals.payoutRatio.value !== '' ? (fundamentals.payoutRatio.value as number) : 0
  const rRI = getDiscountRate(state, ri.discountRateOverride, ri.useRateOverride, false)
  if (bvps > 0 && roe > 0 && rRI > 0) {
    riIV = calculateRI({ bookValuePerShare: bvps, roe: roe / 100, dividendPayout: payout / 100, costOfEquity: rRI, terminalTreatment: ri.terminalTreatment }).intrinsicPerShare
  }

  // ── EV ──
  let evIV: number | null = null
  const ebitda = fundamentals.ebitda.value !== '' ? (fundamentals.ebitda.value as number) : 0
  if (ebitda > 0 && ev.multiple !== '' && shares > 0) {
    evIV = calculateEV({ ebitda, multiple: ev.multiple as number, totalDebt: debt, cash, sharesOutstanding: shares }).intrinsicPerShare
  }

  return {
    methods: [
      { method: 'DCF', iv: dcfIV },
      { method: 'PE Multiple', iv: peIV },
      { method: 'Residual Income', iv: riIV },
      { method: 'EV/EBITDA', iv: evIV },
    ],
    cmp,
  }
}

function barColor(iv: number, cmp: number): string {
  if (!cmp) return '#6366f1'
  const gap = (iv - cmp) / cmp
  if (gap > 0.05) return '#22c55e'
  if (gap >= -0.05) return '#f59e0b'
  return '#ef4444'
}

export function ComparisonDashboard() {
  const { state, dispatch } = useValuation()
  const { blend, setup, fundamentals, fetch } = state
  const { methods, cmp } = useMethodResults()
  const [copied, setCopied] = useState(false)

  const completed = methods.filter(m => m.iv !== null)
  if (completed.length === 0) return null

  const totalWeight = blend.weights.dcf + blend.weights.pe + blend.weights.ri + blend.weights.ev
  const norm = {
    dcf: blend.weights.dcf / totalWeight,
    pe: blend.weights.pe / totalWeight,
    ri: blend.weights.ri / totalWeight,
    ev: blend.weights.ev / totalWeight,
  }

  const ivMap: Record<string, number | null> = {
    DCF: methods[0].iv,
    'PE Multiple': methods[1].iv,
    'Residual Income': methods[2].iv,
    'EV/EBITDA': methods[3].iv,
  }

  const keyToMethod = { dcf: 'DCF', pe: 'PE Multiple', ri: 'Residual Income', ev: 'EV/EBITDA' } as const
  const completedKeys = (['dcf', 'pe', 'ri', 'ev'] as const).filter(k => ivMap[keyToMethod[k]] !== null)
  const completedWeightTotal = completedKeys.reduce((s, k) => s + norm[k], 0)
  const blendedIV = completedKeys.reduce((sum, k) => sum + (ivMap[keyToMethod[k]]! * (norm[k] / completedWeightTotal)), 0)
  const buyBelow = blendedIV * (1 - blend.marginOfSafety / 100)
  const gapPct = cmp > 0 ? ((blendedIV - cmp) / cmp) * 100 : null

  const chartData = methods.map(m => ({ name: m.method, iv: m.iv ?? 0, hasValue: m.iv !== null }))

  const derived = getDerivedCAPM(state)
  const r = derived.costOfEquity ? (derived.costOfEquity * 100).toFixed(1) : '?'
  const wacc = derived.wacc ? (derived.wacc.wacc * 100).toFixed(1) : null

  function copySnapshot() {
    const provenanceLine = (fetch.status === 'success')
      ? `Data source: Yahoo Finance (fetched ${fetch.fetchedCount}/${fetch.totalFields} fields${fetch.reviewedAt ? ', reviewed' : ', NOT reviewed — verify before use'})`
      : 'All values entered manually'

    const lines = [
      `=== Intrinsic Value Workbench — ${new Date().toLocaleDateString('en-IN')} ===`,
      `Stock: ${setup.symbol || '—'} | Exchange: ${setup.exchange} | CMP: ${cmp ? fmtRs0(cmp) : 'not entered'}`,
      provenanceLine,
      '',
      '--- Method Results (your estimates) ---',
      ...methods.map(m => `${m.method}: ${m.iv !== null ? fmtRs0(m.iv) : 'Incomplete'}`),
      '',
      `Blended estimate: ${fmtRs0(blendedIV)}`,
      `Weights: DCF ${blend.weights.dcf}% | PE ${blend.weights.pe}% | RI ${blend.weights.ri}% | EV ${blend.weights.ev}%`,
      `Gap vs CMP: ${gapPct !== null ? `${gapPct >= 0 ? '+' : ''}${gapPct.toFixed(1)}%` : '—'}`,
      `Margin of safety: ${blend.marginOfSafety}% → buy-below: ${fmtRs0(buyBelow)}`,
      `Cost of equity: ${r}%${wacc ? ` | WACC: ${wacc}%` : ''}`,
      '',
      'DISCLAIMER: All values derived solely from numbers you confirmed and assumptions you chose.',
      'Pre-filled data from Yahoo Finance may be inaccurate — always verify.',
      'This is NOT investment advice. Not SEBI-registered.',
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg mt-6 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Comparison Dashboard</h2>
        <button
          onClick={copySnapshot}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {copied ? <CheckCircle size={14} className="text-green-600" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy Summary'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={['auto', 'auto']} tickFormatter={v => `₹${v}`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <RechartsTip formatter={(v: number, n: string) => [fmtRs0(v), n]} />
              {cmp > 0 && (
                <ReferenceLine x={cmp} stroke="#374151" strokeDasharray="4 4"
                  label={{ value: `CMP ₹${cmp}`, position: 'insideTopRight', fontSize: 10, fill: '#374151' }}
                />
              )}
              <Bar dataKey="iv" name="Your estimate" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.hasValue && entry.iv > 0 ? barColor(entry.iv, cmp) : '#d1d5db'} />
                ))}
              </Bar>
              <Legend content={() => (
                <div className="flex flex-wrap gap-3 text-xs mt-1 ml-2 text-gray-500">
                  <span><span className="inline-block w-3 h-3 rounded mr-1 bg-green-500" />Estimate &gt; CMP (+5%)</span>
                  <span><span className="inline-block w-3 h-3 rounded mr-1 bg-amber-400" />Within ±5%</span>
                  <span><span className="inline-block w-3 h-3 rounded mr-1 bg-red-500" />Estimate &lt; CMP (−5%)</span>
                </div>
              )} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-1">Colours reflect the gap between your estimate and the CMP you entered — not a recommendation.</p>
        </div>

        {/* Table + blended */}
        <div>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1 font-medium text-gray-600">Method</th>
                <th className="text-right py-1 font-medium text-gray-600">Your estimate</th>
                <th className="text-right py-1 font-medium text-gray-600">vs CMP</th>
              </tr>
            </thead>
            <tbody>
              {methods.map(m => (
                <tr key={m.method} className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-700">{m.method}</td>
                  <td className="py-1.5 text-right font-mono">
                    {m.iv !== null ? fmtRs0(m.iv) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className={`py-1.5 text-right font-mono text-sm ${
                    m.iv !== null && cmp > 0
                      ? m.iv > cmp * 1.05 ? 'text-green-600' : m.iv < cmp * 0.95 ? 'text-red-600' : 'text-amber-600'
                      : 'text-gray-300'
                  }`}>
                    {m.iv !== null && cmp > 0
                      ? `${(((m.iv - cmp) / cmp) * 100 >= 0 ? '+' : '')}${(((m.iv - cmp) / cmp) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Weights */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-600 mb-1 flex justify-between">
              <span>Method Weights</span>
              <span className={totalWeight !== 100 ? 'text-amber-600' : 'text-green-600'}>Total: {totalWeight}%</span>
            </div>
            <p className="text-xs text-gray-400 mb-2">Weight DCF higher for cash-generative businesses; RI higher for financials.</p>
            {(['dcf', 'pe', 'ri', 'ev'] as const).map(key => (
              <div key={key} className="flex items-center gap-2 mb-1">
                <span className="text-xs w-20 text-gray-600 capitalize">{{ dcf: 'DCF', pe: 'PE', ri: 'Residual', ev: 'EV/EBITDA' }[key]}</span>
                <input type="range" min={0} max={100} step={5} value={blend.weights[key]}
                  onChange={e => dispatch({ type: 'SET_BLEND', payload: { weights: { ...blend.weights, [key]: parseInt(e.target.value) } } })}
                  className="flex-1 accent-blue-600"
                  disabled={ivMap[keyToMethod[key]] === null}
                />
                <span className="text-xs w-8 text-right">{blend.weights[key]}%</span>
              </div>
            ))}
          </div>

          {/* Margin of safety */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span className="font-semibold">Margin of Safety</span>
              <span>{blend.marginOfSafety}%</span>
            </div>
            <input type="range" min={10} max={40} step={5} value={blend.marginOfSafety}
              onChange={e => dispatch({ type: 'SET_BLEND', payload: { marginOfSafety: parseInt(e.target.value) } })}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400"><span>10%</span><span>40%</span></div>
          </div>

          {/* Summary panel */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <p className="text-sm text-gray-800 leading-relaxed">
              Based on <strong>your inputs and assumptions</strong>, your blended estimated intrinsic value is{' '}
              <strong>{fmtRs0(blendedIV)}</strong>.{' '}
              {cmp > 0 && gapPct !== null ? (
                <>That is <strong>{Math.abs(gapPct).toFixed(1)}% {gapPct >= 0 ? 'above' : 'below'}</strong> the market price you entered (<strong>{fmtRs0(cmp)}</strong>).</>
              ) : (
                <>Enter a CMP in the Setup Panel to see the gap.</>
              )}{' '}
              With a {blend.marginOfSafety}% margin of safety, your buy-below threshold would be <strong>{fmtRs0(buyBelow)}</strong>.
            </p>
            <p className="text-xs text-gray-500 mt-2 italic">
              This is not a recommendation. All results are as good as the inputs you reviewed and confirmed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
