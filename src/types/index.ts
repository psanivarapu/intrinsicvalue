// ──────────────────────────── Provenance ────────────────────────────

export type FieldSource = 'fetched' | 'edited' | 'manual' | 'sample'
export type Exchange = 'NSE' | 'BSE'

export interface Field {
  value: number | ''
  source: FieldSource
  asOf?: string
}

export function emptyField(): Field {
  return { value: '', source: 'manual' }
}

export function sampleField(value: number): Field {
  return { value, source: 'sample', asOf: new Date().toISOString().split('T')[0] }
}

export function fetchedField(value: number | null | undefined, asOf: string): Field | null {
  if (value == null) return null
  return { value, source: 'fetched', asOf }
}

// ──────────────────────────── Fundamentals ────────────────────────────

/** All fetchable fundamentals share the same namespace. */
export type FundamentalKey =
  | 'price'
  | 'sharesOutstanding'
  | 'marketCap'
  | 'beta'
  | 'trailingEps'
  | 'bookValuePerShare'
  | 'roe'
  | 'payoutRatio'
  | 'ebitda'
  | 'ebit'
  | 'depreciationAmortization'
  | 'taxRate'
  | 'interestExpense'
  | 'operatingCashFlow'
  | 'capex'
  | 'freeCashFlow'
  | 'netBorrowings'
  | 'totalDebt'
  | 'cashAndEquivalents'
  | 'changeInWorkingCapital'

export type Fundamentals = Record<FundamentalKey, Field>

export function emptyFundamentals(): Fundamentals {
  const keys: FundamentalKey[] = [
    'price', 'sharesOutstanding', 'marketCap', 'beta', 'trailingEps',
    'bookValuePerShare', 'roe', 'payoutRatio', 'ebitda', 'ebit',
    'depreciationAmortization', 'taxRate', 'interestExpense',
    'operatingCashFlow', 'capex', 'freeCashFlow', 'netBorrowings',
    'totalDebt', 'cashAndEquivalents', 'changeInWorkingCapital',
  ]
  return Object.fromEntries(keys.map(k => [k, emptyField()])) as Fundamentals
}

/** API response shape for /api/fundamentals */
export interface FundamentalsAPIResponse {
  ok: boolean
  symbol?: string
  rawSymbol?: string
  asOf?: string
  fields?: Partial<Record<FundamentalKey, { value: number; source: string; asOf: string } | null>>
  histNiCagr?: number | null
  histYears?: number
  fetchedCount?: number
  totalFields?: number
  dataNote?: string
  error?: string
  manualMode?: boolean
  partial?: boolean
}

// ──────────────────────────── Screener links ────────────────────────────

export interface ScreenerLink {
  label: string
  section: string
}

export const SCREENER_LINKS: ScreenerLink[] = [
  { label: 'Analysis', section: 'analysis' },
  { label: 'P&L', section: 'profit-loss' },
  { label: 'Balance Sheet', section: 'balance-sheet' },
  { label: 'Cash Flow', section: 'cash-flow' },
]

export function screenerUrl(symbol: string, consolidated: boolean, section: string): string {
  const base = `https://www.screener.in/company/${symbol}${consolidated ? '/consolidated' : ''}`
  return `${base}/#${section}`
}
