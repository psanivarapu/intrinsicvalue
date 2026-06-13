import { useState } from 'react'
import { useValuation, getDerivedCAPM } from '../context/ValuationContext'
import { Collapsible } from './ui/Collapsible'
import { NumberInput } from './ui/NumberInput'
import { INDUSTRY_BETAS, searchIndustries, BETA_DATA_DATE } from '../lib/data/industryBetas'
import { screenerUrl } from '../types'
import { ExternalLink, Plus, X } from 'lucide-react'

export function CAPMHelper() {
  const { state, dispatch } = useValuation()
  const { capm, setup, fundamentals } = state
  const derived = getDerivedCAPM(state)
  const [indSearch, setIndSearch] = useState('')

  const re = derived.costOfEquity
  const rePct = re ? re * 100 : null
  const waccPct = derived.wacc ? derived.wacc.wacc * 100 : null
  const sanity = rePct !== null && (rePct < 9 || rePct > 18)

  const yahooSuffix = setup.exchange === 'BSE' ? 'BO' : 'NS'
  const yahooUrl = setup.symbol
    ? `https://finance.yahoo.com/quote/${setup.symbol}.${yahooSuffix}/`
    : 'https://finance.yahoo.com/'

  function addIndustry(id: string, beta: number) {
    const exists = capm.industries.find(i => i.industryId === id)
    if (exists) return
    const totalW = capm.industries.reduce((s, i) => s + i.weight, 0)
    const remaining = Math.max(0, 100 - totalW)
    dispatch({ type: 'SET_CAPM', payload: { industries: [...capm.industries, { industryId: id, unleveredBeta: beta, weight: remaining }] } })
    setIndSearch('')
  }

  function updateWeight(id: string, w: number) {
    dispatch({ type: 'SET_CAPM', payload: { industries: capm.industries.map(i => i.industryId === id ? { ...i, weight: w } : i) } })
  }

  function removeIndustry(id: string) {
    dispatch({ type: 'SET_CAPM', payload: { industries: capm.industries.filter(i => i.industryId !== id) } })
  }

  const totalWeight = capm.industries.reduce((s, i) => s + i.weight, 0)

  const badgeContent = rePct !== null
    ? <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${sanity ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
        Ke = {rePct.toFixed(1)}%{waccPct ? ` | WACC = ${waccPct.toFixed(1)}%` : ''}
      </span>
    : undefined

  const screenerLink = screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'analysis')

  return (
    <Collapsible title="CAPM / Discount Rate Helper" defaultOpen={false} badge={badgeContent}>
      <div className="space-y-3">
        {/* Rf and ERP — stacked for narrow column */}
        <NumberInput
          label="Risk-free Rate (Rf)"
          unit="%"
          value={capm.rfRate}
          onChange={v => dispatch({ type: 'SET_CAPM', payload: { rfRate: v === '' ? 7.0 : v as number } })}
          step={0.1}
          compact
          tooltip={<div>Use the current 10-year G-Sec yield from <a href="https://www.rbi.org.in" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">RBI.org.in</a>. Default: 7.0%.</div>}
        />
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            ERP: {capm.erp.toFixed(2)}%
          </label>
          <input type="range" min={4} max={20} step={0.25} value={capm.erp}
            onChange={e => dispatch({ type: 'SET_CAPM', payload: { erp: parseFloat(e.target.value) } })}
            className="w-full accent-blue-600" />
          <div className="flex justify-between text-xs text-gray-400 mb-0.5"><span>4%</span><span>20%</span></div>
          <div className="text-xs text-gray-400">
            Damodaran India, {BETA_DATA_DATE}. Edit <code>input_data/valuation_config.json</code> to change default.
          </div>
        </div>

        {/* Beta mode toggle */}
        <div className="flex gap-2 text-xs">
          <span className="text-gray-600 self-center font-medium">Beta:</span>
          {(['bottom_up', 'direct'] as const).map(m => (
            <button key={m}
              onClick={() => dispatch({ type: 'SET_CAPM', payload: { betaMode: m } })}
              className={`px-2.5 py-1 rounded border font-medium ${capm.betaMode === m ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}
            >
              {m === 'bottom_up' ? 'Bottom-up (Damodaran)' : 'Direct entry'}
            </button>
          ))}
        </div>

        {/* Bottom-up beta */}
        {capm.betaMode === 'bottom_up' && (
          <div className="bg-gray-50 rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">
                Industry Betas (Damodaran India, {BETA_DATA_DATE})
              </span>
              <a href="https://pages.stern.nyu.edu/~adamodar/" target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                Source <ExternalLink size={10} />
              </a>
            </div>

            {/* Industry search + add */}
            <div className="relative">
              <input
                value={indSearch}
                onChange={e => setIndSearch(e.target.value)}
                placeholder="Search industry to add…"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {indSearch && (
                <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-b shadow-lg max-h-40 overflow-y-auto">
                  {searchIndustries(indSearch).slice(0, 8).map(ind => (
                    <button key={ind.id}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs flex justify-between"
                      onMouseDown={() => addIndustry(ind.id, ind.unleveredBeta)}
                    >
                      <span>{ind.name}</span>
                      <span className="text-gray-400">β_U={ind.unleveredBeta}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected industries */}
            {capm.industries.length > 0 ? (
              <div className="space-y-1">
                {capm.industries.map(ind => {
                  const meta = INDUSTRY_BETAS.find(i => i.id === ind.industryId)
                  return (
                    <div key={ind.industryId} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 text-gray-700 truncate">{meta?.name || ind.industryId}</span>
                      <span className="text-gray-400 w-16">β_U={ind.unleveredBeta.toFixed(2)}</span>
                      <input type="number" value={ind.weight} min={0} max={100} step={5}
                        onChange={e => updateWeight(ind.industryId, parseFloat(e.target.value) || 0)}
                        className="w-16 border border-gray-300 rounded px-1.5 py-0.5 text-xs"
                      />
                      <span className="text-gray-400">%</span>
                      <button onClick={() => removeIndustry(ind.industryId)}><X size={12} className="text-red-400" /></button>
                    </div>
                  )
                })}
                <div className={`text-xs ${totalWeight === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                  Total weight: {totalWeight}% {totalWeight !== 100 && '(auto-normalises to 100%)'}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Plus size={12} /> Search and add industries above
              </div>
            )}

            {/* D/E ratio */}
            <div className="pt-1 border-t border-gray-200 space-y-1">
              <div className="text-xs text-gray-500">D/E Ratio</div>
              <div className="flex items-center gap-1">
                <input type="checkbox" checked={capm.useDeOverride}
                  onChange={e => dispatch({ type: 'SET_CAPM', payload: { useDeOverride: e.target.checked } })}
                  className="accent-blue-600"
                />
                <span className="text-xs text-gray-600">Override</span>
                {capm.useDeOverride
                  ? <input type="number" value={capm.debtEquityOverride === '' ? '' : capm.debtEquityOverride} step={0.05}
                      onChange={e => dispatch({ type: 'SET_CAPM', payload: { debtEquityOverride: e.target.value === '' ? '' : parseFloat(e.target.value) } })}
                      className="w-20 border border-gray-300 rounded px-1.5 py-0.5 text-xs"
                      placeholder="e.g. 0.30"
                    />
                  : <span className="text-xs font-mono text-blue-600">{derived.deRaw.toFixed(2)} (auto)</span>
                }
              </div>
              {derived.betaUnlevered !== null && derived.beta !== null && (
                <div className="text-xs text-gray-600 bg-blue-50 rounded p-1.5">
                  β_U={derived.betaUnlevered.toFixed(3)} → β_L={derived.beta.toFixed(3)}<br/>
                  <span className="text-gray-400">Hamada: β_L = β_U × (1+(1−T)×D/E)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Direct beta */}
        {capm.betaMode === 'direct' && (
          <div className="space-y-1.5">
            <NumberInput
              label="Beta (β)"
              value={fundamentals.beta.value}
              onChange={v => dispatch({ type: 'SET_FIELD', key: 'beta', value: v })}
              source={fundamentals.beta.source}
              asOf={fundamentals.beta.asOf}
              screenerHref={screenerUrl(setup.symbol || 'SYMBOL', setup.isConsolidated, 'analysis')}
              placeholder="e.g. 1.1"
              step={0.05}
              tooltip={<div>
                On Yahoo Finance, scroll below the price chart on the quote page — the field labelled
                <strong> "Beta (5Y Monthly)"</strong> is the value to enter here.
                <br/>
                <a href={yahooUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  Open Yahoo Finance →
                </a>
              </div>}
            />
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <a href={yahooUrl} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-0.5">
                {setup.symbol ? `Yahoo Finance: ${setup.symbol}.${yahooSuffix}` : 'Open Yahoo Finance'}
                <ExternalLink size={10} />
              </a>
              <span className="text-gray-400">— look for "Beta (5Y Monthly)" below the chart</span>
            </div>
          </div>
        )}

        {/* Live Cost of Equity result */}
        {rePct !== null && (
          <div className={`p-2 rounded text-sm ${sanity ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-100'}`}>
            <div className="font-semibold text-gray-800">
              Cost of Equity = {capm.rfRate}% + {derived.beta?.toFixed(3) || '?'} × {capm.erp}% = <span className={sanity ? 'text-amber-700' : 'text-blue-700'}>{rePct.toFixed(2)}%</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Rf ({capm.rfRate}%) + Levered β × ERP ({capm.erp}%)
            </div>
            {sanity && (
              <div className="text-xs text-amber-700 mt-0.5">
                ⚠ Outside the typical 9–18% range for Indian equities — double-check beta and ERP.
              </div>
            )}
          </div>
        )}

        {/* WACC sub-panel */}
        {derived.wacc && (
          <div className="bg-gray-50 rounded p-2.5 text-xs">
            <div className="font-semibold text-gray-700 mb-1">WACC</div>
            <div className="grid grid-cols-3 gap-x-3 text-gray-600">
              <div>Equity Weight (E/V) = {(derived.wacc.equityWeight * 100).toFixed(1)}%</div>
              <div>Debt Weight (D/V) = {(derived.wacc.debtWeight * 100).toFixed(1)}%</div>
              <div>Cost of Debt (after-tax) = {(derived.wacc.afterTaxCostOfDebt * 100).toFixed(1)}%</div>
            </div>
            <div className="mt-1 font-semibold text-blue-700">
              WACC = {waccPct?.toFixed(2)}%
              <span className="ml-1 font-normal text-gray-500">(used as discount rate in FCFF mode)</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <input type="checkbox" checked={capm.useCodOverride}
                onChange={e => dispatch({ type: 'SET_CAPM', payload: { useCodOverride: e.target.checked } })}
                className="accent-blue-600"
              />
              <span className="text-gray-600">Override Cost of Debt</span>
              {capm.useCodOverride && (
                <input type="number" value={capm.costOfDebtOverride === '' ? '' : capm.costOfDebtOverride}
                  onChange={e => dispatch({ type: 'SET_CAPM', payload: { costOfDebtOverride: e.target.value === '' ? '' : parseFloat(e.target.value) } })}
                  placeholder="%"
                  step={0.25}
                  className="w-16 border border-gray-300 rounded px-1.5 py-0.5 ml-1"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </Collapsible>
  )
}
