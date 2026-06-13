import { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import {
  type Field, type FundamentalKey, type Fundamentals, type Exchange,
  emptyField, sampleField, emptyFundamentals, type FundamentalsAPIResponse,
} from '../types'
import { DEFAULT_ERP } from '../lib/data/valuationConfig'
import type { IndustryRow } from '../lib/calculations/capm'
import type { TerminalTreatment } from '../lib/calculations/residualIncome'

// ──────────────────────────── Setup ────────────────────────────

export interface SetupState {
  symbol: string
  exchange: Exchange
  isConsolidated: boolean
}

// ──────────────────────────── CAPM helper ────────────────────────────

export type BetaMode = 'bottom_up' | 'direct'

export interface CAPMState {
  rfRate: number          // %
  betaMode: BetaMode
  industries: IndustryRow[]  // bottom-up
  erp: number             // %
  // D/E override (auto-computed from fundamentals otherwise)
  debtEquityOverride: number | ''
  useDeOverride: boolean
  // cost of debt override
  costOfDebtOverride: number | ''
  useCodOverride: boolean
}

// ──────────────────────────── Growth helper ────────────────────────────

export interface GrowthState {
  manualHistCAGR: number | ''   // screener 5-yr CAGR (manual entry)
  analystConsensus: number | ''
  selectedGrowth: number | ''   // the user's chosen Stage 1 g
}

// ──────────────────────────── Per-tab states ────────────────────────────

export type DCFMode = 'simple' | 'advanced'
export type FCFMode = 'fcfe' | 'fcff'

export interface DCFTabState {
  mode: DCFMode
  fcfMode: FCFMode
  stage1Growth: number | ''
  stage2Growth: number | ''
  terminalGrowth: number
  discountRateOverride: number | ''
  useRateOverride: boolean
  sectorNormEVEBITDA: number | ''
}

export interface PETabState {
  mode: DCFMode
  epsGrowth: number | ''
  fairPE: number | ''
  discountRateOverride: number | ''
  useRateOverride: boolean
}

export interface RITabState {
  mode: DCFMode
  discountRateOverride: number | ''
  useRateOverride: boolean
  terminalTreatment: TerminalTreatment
}

export interface EVTabState {
  mode: DCFMode
  multiple: number | ''
}

export interface BlendState {
  weights: { dcf: number; pe: number; ri: number; ev: number }
  marginOfSafety: number
}

// ──────────────────────────── Fetch state ────────────────────────────

export interface FetchState {
  status: 'idle' | 'loading' | 'success' | 'error' | 'manual'
  error: string | null
  fetchedCount: number
  totalFields: number
  dataNote: string | null
  histNiCagr: number | null
  reviewedAt: string | null  // ISO date when user clicked "Mark as reviewed"
}

// ──────────────────────────── Full valuation state ────────────────────────────

export interface ValuationState {
  setup: SetupState
  fundamentals: Fundamentals
  fetch: FetchState
  capm: CAPMState
  growth: GrowthState
  dcf: DCFTabState
  pe: PETabState
  ri: RITabState
  ev: EVTabState
  blend: BlendState
  activeTab: 'dcf' | 'pe' | 'ri' | 'ev'
  manualMode: boolean  // user explicitly chose manual mode
}

// ──────────────────────────── Defaults ────────────────────────────

const DEFAULT_STATE: ValuationState = {
  setup: { symbol: '', exchange: 'NSE', isConsolidated: true },
  fundamentals: emptyFundamentals(),
  fetch: { status: 'idle', error: null, fetchedCount: 0, totalFields: 20, dataNote: null, histNiCagr: null, reviewedAt: null },
  capm: {
    rfRate: 7.0,
    betaMode: 'bottom_up',
    industries: [],
    erp: DEFAULT_ERP,
    debtEquityOverride: '',
    useDeOverride: false,
    costOfDebtOverride: '',
    useCodOverride: false,
  },
  growth: { manualHistCAGR: '', analystConsensus: '', selectedGrowth: '' },
  dcf: {
    mode: 'simple',
    fcfMode: 'fcfe',
    stage1Growth: '',
    stage2Growth: '',
    terminalGrowth: 5,
    discountRateOverride: '',
    useRateOverride: false,
    sectorNormEVEBITDA: '',
  },
  pe: { mode: 'simple', epsGrowth: '', fairPE: '', discountRateOverride: '', useRateOverride: false },
  ri: { mode: 'simple', discountRateOverride: '', useRateOverride: false, terminalTreatment: 'linear_fade' },
  ev: { mode: 'simple', multiple: '' },
  blend: { weights: { dcf: 25, pe: 25, ri: 25, ev: 25 }, marginOfSafety: 20 },
  activeTab: 'dcf',
  manualMode: false,
}

// ──────────────────────────── Sample data ────────────────────────────

export function buildSampleState(): ValuationState {
  const f = emptyFundamentals()
  const s = (v: number) => sampleField(v)
  const fields: Partial<Fundamentals> = {
    price:                    s(1200),
    sharesOutstanding:        s(100),
    marketCap:                s(120000),
    beta:                     s(0.9),
    trailingEps:              s(50),
    bookValuePerShare:        s(280),
    roe:                      s(18),
    payoutRatio:              s(30),
    ebitda:                   s(1500),
    ebit:                     s(1250),
    depreciationAmortization: s(250),
    taxRate:                  s(25),
    interestExpense:          s(80),
    operatingCashFlow:        s(1200),
    capex:                    s(200),
    freeCashFlow:             s(1000),
    netBorrowings:            s(100),
    totalDebt:                s(2000),
    cashAndEquivalents:       s(500),
    changeInWorkingCapital:   s(50),
  }
  const fundamentals: Fundamentals = { ...f, ...fields } as Fundamentals
  return {
    ...DEFAULT_STATE,
    setup: { symbol: 'SAMPLEDEMO', exchange: 'NSE', isConsolidated: true },
    fundamentals,
    fetch: { ...DEFAULT_STATE.fetch, status: 'idle', histNiCagr: 15 },
    capm: { ...DEFAULT_STATE.capm, rfRate: 7.0, industries: [{ industryId: 'comp_services', unleveredBeta: 0.87, weight: 100 }], erp: DEFAULT_ERP },
    growth: { manualHistCAGR: 15, analystConsensus: 14, selectedGrowth: 15 },
    dcf: { ...DEFAULT_STATE.dcf, stage1Growth: 15, stage2Growth: 10, terminalGrowth: 5 },
    pe: { ...DEFAULT_STATE.pe, epsGrowth: 15, fairPE: 25 },
    ri: { ...DEFAULT_STATE.ri },
    ev: { ...DEFAULT_STATE.ev, multiple: 15 },
  }
}

// ──────────────────────────── Actions ────────────────────────────

type Action =
  | { type: 'SET_SETUP'; payload: Partial<SetupState> }
  | { type: 'SET_FIELD'; key: FundamentalKey; value: number | '' }
  | { type: 'APPLY_FETCH'; payload: FundamentalsAPIResponse }
  | { type: 'SET_FETCH_STATUS'; status: FetchState['status']; error?: string }
  | { type: 'MARK_REVIEWED' }
  | { type: 'SET_CAPM'; payload: Partial<CAPMState> }
  | { type: 'SET_GROWTH'; payload: Partial<GrowthState> }
  | { type: 'SET_DCF'; payload: Partial<DCFTabState> }
  | { type: 'SET_PE'; payload: Partial<PETabState> }
  | { type: 'SET_RI'; payload: Partial<RITabState> }
  | { type: 'SET_EV'; payload: Partial<EVTabState> }
  | { type: 'SET_BLEND'; payload: Partial<BlendState> }
  | { type: 'SET_TAB'; tab: ValuationState['activeTab'] }
  | { type: 'LOAD_STATE'; payload: ValuationState }
  | { type: 'LOAD_SAMPLE' }
  | { type: 'CLEAR' }
  | { type: 'SET_MANUAL_MODE'; manual: boolean }

function reducer(state: ValuationState, action: Action): ValuationState {
  switch (action.type) {
    case 'SET_SETUP': {
      const newSetup = { ...state.setup, ...action.payload }
      // Symbol change → reset fetch state (don't reset inputs — we'll load from localStorage)
      if (action.payload.symbol !== undefined && action.payload.symbol !== state.setup.symbol) {
        return { ...state, setup: newSetup, fetch: { ...DEFAULT_STATE.fetch } }
      }
      return { ...state, setup: newSetup }
    }

    case 'SET_FIELD': {
      const updatedField: Field = {
        ...state.fundamentals[action.key],
        value: action.value,
        source: 'edited',
      }
      return {
        ...state,
        fundamentals: { ...state.fundamentals, [action.key]: updatedField },
      }
    }

    case 'APPLY_FETCH': {
      const resp = action.payload
      if (!resp.ok || !resp.fields) {
        return {
          ...state,
          fetch: {
            ...state.fetch,
            status: 'error',
            error: resp.error || 'Fetch failed',
            dataNote: null,
            histNiCagr: null,
          },
        }
      }

      // Merge fetched fields — only update fields that came back non-null
      const asOf = resp.asOf || new Date().toISOString().split('T')[0]
      const newFundamentals = { ...state.fundamentals }
      const fieldKeys = Object.keys(resp.fields) as FundamentalKey[]
      for (const key of fieldKeys) {
        const raw = resp.fields[key]
        if (raw != null && raw.value != null) {
          newFundamentals[key] = { value: raw.value, source: 'fetched', asOf }
        }
      }

      // Auto-set growth helper if hist cagr is available
      const newGrowth = { ...state.growth }
      if (resp.histNiCagr != null && state.growth.selectedGrowth === '') {
        newGrowth.selectedGrowth = resp.histNiCagr
      }

      return {
        ...state,
        fundamentals: newFundamentals,
        growth: newGrowth,
        fetch: {
          status: 'success',
          error: null,
          fetchedCount: resp.fetchedCount || 0,
          totalFields: resp.totalFields || 20,
          dataNote: resp.dataNote || null,
          histNiCagr: resp.histNiCagr ?? null,
          reviewedAt: null,
        },
      }
    }

    case 'SET_FETCH_STATUS':
      return { ...state, fetch: { ...state.fetch, status: action.status, error: action.error || null } }

    case 'MARK_REVIEWED':
      return { ...state, fetch: { ...state.fetch, reviewedAt: new Date().toISOString() } }

    case 'SET_CAPM':   return { ...state, capm: { ...state.capm, ...action.payload } }
    case 'SET_GROWTH': return { ...state, growth: { ...state.growth, ...action.payload } }
    case 'SET_DCF':    return { ...state, dcf: { ...state.dcf, ...action.payload } }
    case 'SET_PE':     return { ...state, pe: { ...state.pe, ...action.payload } }
    case 'SET_RI':     return { ...state, ri: { ...state.ri, ...action.payload } }
    case 'SET_EV':     return { ...state, ev: { ...state.ev, ...action.payload } }
    case 'SET_BLEND':  return { ...state, blend: { ...state.blend, ...action.payload } }
    case 'SET_TAB':    return { ...state, activeTab: action.tab }
    case 'LOAD_STATE': return action.payload
    case 'LOAD_SAMPLE':return buildSampleState()
    case 'CLEAR':      return { ...DEFAULT_STATE }
    case 'SET_MANUAL_MODE': return { ...state, manualMode: action.manual, fetch: { ...state.fetch, status: action.manual ? 'manual' : 'idle' } }

    default: return state
  }
}

// ──────────────────────────── Context ────────────────────────────

interface Ctx {
  state: ValuationState
  dispatch: React.Dispatch<Action>
}

const ValuationCtx = createContext<Ctx | null>(null)

function storageKey(symbol: string) {
  return `ivw2_${symbol || '__default__'}`
}

export function ValuationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE, (init) => {
    try {
      const saved = localStorage.getItem(storageKey(''))
      if (saved) return JSON.parse(saved) as ValuationState
    } catch { /* ignore */ }
    return init
  })

  // Persist on every state change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(state.setup.symbol), JSON.stringify(state))
    } catch { /* ignore */ }
  }, [state])

  // Load per-symbol state when symbol changes
  const prevSymbol = useRef(state.setup.symbol)
  useEffect(() => {
    if (state.setup.symbol && state.setup.symbol !== prevSymbol.current) {
      prevSymbol.current = state.setup.symbol
      try {
        const saved = localStorage.getItem(storageKey(state.setup.symbol))
        if (saved) {
          dispatch({ type: 'LOAD_STATE', payload: JSON.parse(saved) as ValuationState })
        }
      } catch { /* ignore */ }
    }
  }, [state.setup.symbol])

  return <ValuationCtx.Provider value={{ state, dispatch }}>{children}</ValuationCtx.Provider>
}

export function useValuation() {
  const ctx = useContext(ValuationCtx)
  if (!ctx) throw new Error('useValuation must be inside ValuationProvider')
  return ctx
}

// ──────────────────────────── Derived helpers ────────────────────────────

import {
  computeBottomUpBeta, computeCostOfEquity, computeWACC,
  computeCostOfDebt, debtToEquityFromMarketCap, releverBeta, computeUnleveredBeta,
} from '../lib/calculations/capm'

export function getDerivedCAPM(state: ValuationState) {
  const { capm, fundamentals } = state
  const rf = capm.rfRate / 100
  const erp = capm.erp / 100
  const taxRate = (fundamentals.taxRate.value !== '' ? (fundamentals.taxRate.value as number) : 25) / 100

  // D/E ratio
  const mktCap = fundamentals.marketCap.value !== '' ? (fundamentals.marketCap.value as number) : 0
  const totalDebt = fundamentals.totalDebt.value !== '' ? (fundamentals.totalDebt.value as number) : 0
  const deRaw = capm.useDeOverride && capm.debtEquityOverride !== ''
    ? (capm.debtEquityOverride as number)
    : debtToEquityFromMarketCap(totalDebt, mktCap)

  // Beta
  let beta: number | null = null
  let betaUnlevered: number | null = null
  if (capm.betaMode === 'bottom_up') {
    betaUnlevered = capm.industries.length > 0 ? computeUnleveredBeta(capm.industries) : null
    if (betaUnlevered !== null) {
      beta = releverBeta(betaUnlevered, taxRate, deRaw)
    }
  } else {
    beta = fundamentals.beta.value !== '' ? (fundamentals.beta.value as number) : null
    betaUnlevered = beta !== null ? beta / (1 + (1 - taxRate) * deRaw) : null
  }

  const costOfEquity = beta !== null ? computeCostOfEquity({ riskFreeRate: rf, beta, erp }) : null

  // Cost of debt
  const intExp = fundamentals.interestExpense.value !== '' ? (fundamentals.interestExpense.value as number) : 0
  const costOfDebt = capm.useCodOverride && capm.costOfDebtOverride !== ''
    ? (capm.costOfDebtOverride as number) / 100
    : computeCostOfDebt(intExp, totalDebt)

  // WACC
  const wacc = costOfEquity !== null && mktCap > 0
    ? computeWACC({ costOfEquity, costOfDebt, taxRate, totalDebt, marketCap: mktCap })
    : null

  return { beta, betaUnlevered, costOfEquity, costOfDebt, wacc, deRaw, taxRate }
}

export function getDiscountRate(
  state: ValuationState,
  override: number | '',
  useOverride: boolean,
  useWACC = false,
): number {
  if (useOverride && override !== '') return (override as number) / 100
  const derived = getDerivedCAPM(state)
  if (useWACC && derived.wacc) return derived.wacc.wacc
  return derived.costOfEquity ?? 0
}

export function getSelectedGrowth(state: ValuationState): number {
  const g = state.growth.selectedGrowth
  return g !== '' ? (g as number) / 100 : 0
}
