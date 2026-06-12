// ──────────────────────────── CAPM, WACC, Beta ────────────────────────────

export interface IndustryRow {
  industryId: string
  unleveredBeta: number
  weight: number  // 0–100
}

export interface BottomUpBetaInputs {
  industries: IndustryRow[]
  taxRate: number     // decimal e.g. 0.25
  debtToEquity: number  // D/E ratio (e.g. 0.40)
}

export interface CAPMInputs {
  riskFreeRate: number  // decimal
  beta: number
  erp: number           // equity risk premium, decimal
}

export interface WACCInputs {
  costOfEquity: number  // decimal
  costOfDebt: number    // decimal
  taxRate: number       // decimal
  totalDebt: number     // ₹ Cr
  marketCap: number     // ₹ Cr (proxy for equity)
}

export interface WACCResult {
  wacc: number
  equityWeight: number
  debtWeight: number
  afterTaxCostOfDebt: number
}

// ─── beta computations ───

/** Weighted average of unlevered betas; normalises weights to 100% automatically. */
export function computeUnleveredBeta(industries: IndustryRow[]): number {
  if (industries.length === 0) return 0
  const totalW = industries.reduce((s, r) => s + r.weight, 0)
  if (totalW === 0) return 0
  return industries.reduce((s, r) => s + r.unleveredBeta * (r.weight / totalW), 0)
}

/**
 * Re-lever an unlevered beta using the Hamada equation:
 *   β_L = β_U × (1 + (1 − T) × (D/E))
 */
export function releverBeta(
  unleveredBeta: number,
  taxRate: number,
  debtToEquity: number,
): number {
  return unleveredBeta * (1 + (1 - taxRate) * debtToEquity)
}

export function computeBottomUpBeta(inputs: BottomUpBetaInputs): number | null {
  const bU = computeUnleveredBeta(inputs.industries)
  if (bU === 0) return null
  return releverBeta(bU, inputs.taxRate, inputs.debtToEquity)
}

// ─── cost of equity ───

/** r_e = Rf + β × ERP */
export function computeCostOfEquity(inputs: CAPMInputs): number {
  return inputs.riskFreeRate + inputs.beta * inputs.erp
}

// ─── cost of debt ───

/** r_d = interestExpense / totalDebt; clamped 4–25% */
export function computeCostOfDebt(interestExpense: number, totalDebt: number): number {
  if (totalDebt <= 0) return 0.08  // fallback 8%
  const raw = interestExpense / totalDebt
  return Math.max(0.04, Math.min(0.25, raw))
}

// ─── WACC ───

export function computeWACC(inputs: WACCInputs): WACCResult | null {
  const V = inputs.totalDebt + inputs.marketCap
  if (V <= 0) return null
  const debtWeight = inputs.totalDebt / V
  const equityWeight = inputs.marketCap / V
  const afterTaxCostOfDebt = inputs.costOfDebt * (1 - inputs.taxRate)
  const wacc = equityWeight * inputs.costOfEquity + debtWeight * afterTaxCostOfDebt
  return { wacc, equityWeight, debtWeight, afterTaxCostOfDebt }
}

// ─── D/E from fundamentals ───

export function debtToEquityFromMarketCap(totalDebt: number, marketCap: number): number {
  if (marketCap <= 0) return 0
  return totalDebt / marketCap
}
