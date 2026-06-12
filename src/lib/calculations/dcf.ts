// ──────────────────────────── DCF (FCFF & FCFE) ────────────────────────────

export type DCFCashFlowMode = 'fcfe' | 'fcff'

// ─── FCFF building blocks ───

export interface FCFFComponents {
  ebit: number
  taxRate: number     // decimal
  da: number          // D&A
  capex: number       // absolute (positive)
  deltaWC: number     // change in WC; positive = WC rose = cash outflow
}

/** NOPAT + D&A − ΔWC − Capex */
export function computeBaseFCFF(c: FCFFComponents): number {
  return c.ebit * (1 - c.taxRate) + c.da - c.capex - c.deltaWC
}

// ─── FCFE building blocks ───

export interface FCFEComponents {
  ocf: number
  capex: number
  netBorrowings: number  // new debt minus repayments (can be negative)
}

/** OCF − Capex + Net Borrowings */
export function computeBaseFCFE(c: FCFEComponents): number {
  return c.ocf - c.capex + c.netBorrowings
}

// ─── Core 2-stage DCF engine ───

export interface DCFCoreInputs {
  baseCashFlow: number
  stage1Growth: number     // decimal
  stage2Growth: number     // decimal
  terminalGrowth: number   // decimal
  discountRate: number     // WACC for FCFF, cost-of-equity for FCFE
  // FCFF: totalDebt − cash (can be negative = net cash)
  // FCFE: must be 0 (equity value already direct)
  netDebtAdjustment: number
  sharesOutstanding: number  // crores
}

export interface YearProjection {
  year: number
  cashFlow: number
  pv: number
}

export interface DCFResult {
  intrinsicPerShare: number
  enterpriseOrEquityValue: number  // EV for FCFF, equity for FCFE
  equityValue: number
  pvCashFlows: number
  pvTerminalValue: number
  terminalValuePct: number
  yearlyProjections: YearProjection[]
  sensitivityGrid: SensitivityCell[][]
  // TV cross-check (FCFF advanced only)
  impliedExitMultiple?: number
}

export interface SensitivityCell {
  discountRate: number
  growth: number
  intrinsicPerShare: number
}

// ─── validation ───

export type DCFError =
  | { type: 'TERMINAL_G_GTE_R'; message: string }
  | { type: 'ZERO_SHARES'; message: string }

export type DCFWarning =
  | { type: 'NEGATIVE_FCF'; message: string }
  | { type: 'TERMINAL_G_HIGH'; message: string }
  | { type: 'HIGH_TV_PCT'; message: string }
  | { type: 'TV_MULTIPLE_HIGH'; message: string }

export function validateDCF(inputs: DCFCoreInputs): { errors: DCFError[]; warnings: DCFWarning[] } {
  const errors: DCFError[] = []
  const warnings: DCFWarning[] = []

  if (inputs.terminalGrowth >= inputs.discountRate) {
    errors.push({
      type: 'TERMINAL_G_GTE_R',
      message: `Terminal growth (${(inputs.terminalGrowth * 100).toFixed(1)}%) must be less than discount rate (${(inputs.discountRate * 100).toFixed(1)}%). When g ≥ r the Gordon Growth Model produces an infinite terminal value.`,
    })
  }
  if (inputs.sharesOutstanding <= 0) {
    errors.push({ type: 'ZERO_SHARES', message: 'Shares outstanding must be greater than zero.' })
  }
  if (inputs.terminalGrowth > 0.07) {
    warnings.push({
      type: 'TERMINAL_G_HIGH',
      message: `Terminal growth of ${(inputs.terminalGrowth * 100).toFixed(1)}% exceeds India's nominal GDP growth (~7%). This assumption is aggressive.`,
    })
  }
  if (inputs.baseCashFlow < 0) {
    warnings.push({
      type: 'NEGATIVE_FCF',
      message: 'Base cash flow is negative. DCF may not suit this company at this stage — consider the PE or EV/EBITDA methods.',
    })
  }
  return { errors, warnings }
}

// ─── core calculation (no sensitivity; used internally) ───

function _coreCalc(inputs: DCFCoreInputs): Omit<DCFResult, 'sensitivityGrid'> {
  const { baseCashFlow, stage1Growth, stage2Growth, terminalGrowth, discountRate, netDebtAdjustment, sharesOutstanding } = inputs

  const projections: YearProjection[] = []
  let pvCashFlows = 0

  // Stage 1: years 1–5
  for (let t = 1; t <= 5; t++) {
    const cf = baseCashFlow * Math.pow(1 + stage1Growth, t)
    const pv = cf / Math.pow(1 + discountRate, t)
    pvCashFlows += pv
    projections.push({ year: t, cashFlow: cf, pv })
  }

  // Stage 2: years 6–10 (grow from year-5 base at stage2Growth)
  const cf5 = baseCashFlow * Math.pow(1 + stage1Growth, 5)
  for (let t = 6; t <= 10; t++) {
    const cf = cf5 * Math.pow(1 + stage2Growth, t - 5)
    const pv = cf / Math.pow(1 + discountRate, t)
    pvCashFlows += pv
    projections.push({ year: t, cashFlow: cf, pv })
  }

  const cf10 = cf5 * Math.pow(1 + stage2Growth, 5)
  const terminalValue = (cf10 * (1 + terminalGrowth)) / (discountRate - terminalGrowth)
  const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, 10)

  const enterpriseOrEquityValue = pvCashFlows + pvTerminalValue
  const equityValue = enterpriseOrEquityValue - netDebtAdjustment
  const intrinsicPerShare = equityValue / sharesOutstanding
  const terminalValuePct = pvTerminalValue / (pvCashFlows + pvTerminalValue)

  return {
    intrinsicPerShare,
    enterpriseOrEquityValue,
    equityValue,
    pvCashFlows,
    pvTerminalValue,
    terminalValuePct,
    yearlyProjections: projections,
  }
}

export function calculateDCF(
  inputs: DCFCoreInputs,
  projectedEBITDA10?: number,
  sectorNormMultiple?: number,
): DCFResult {
  const core = _coreCalc(inputs)

  // Sensitivity: r ± 1%, stage1Growth ± 2%
  const sensitivityGrid: SensitivityCell[][] = []
  for (const rOff of [-0.01, 0, 0.01]) {
    const row: SensitivityCell[] = []
    for (const gOff of [-0.02, 0, 0.02]) {
      const adjR = inputs.discountRate + rOff
      const adjG = inputs.stage1Growth + gOff
      if (inputs.terminalGrowth >= adjR) {
        row.push({ discountRate: adjR, growth: adjG, intrinsicPerShare: NaN })
        continue
      }
      const scenCore = _coreCalc({ ...inputs, discountRate: adjR, stage1Growth: adjG })
      row.push({ discountRate: adjR, growth: adjG, intrinsicPerShare: scenCore.intrinsicPerShare })
    }
    sensitivityGrid.push(row)
  }

  // TV exit-multiple cross-check
  let impliedExitMultiple: number | undefined
  if (projectedEBITDA10 && projectedEBITDA10 > 0) {
    const cf10 = inputs.baseCashFlow * Math.pow(1 + inputs.stage1Growth, 5) * Math.pow(1 + inputs.stage2Growth, 5)
    const tv = (cf10 * (1 + inputs.terminalGrowth)) / (inputs.discountRate - inputs.terminalGrowth)
    impliedExitMultiple = tv / projectedEBITDA10
  }

  const warnings: DCFWarning[] = []
  if (core.terminalValuePct > 0.75) {
    warnings.push({
      type: 'HIGH_TV_PCT',
      message: `${(core.terminalValuePct * 100).toFixed(0)}% of value is terminal — treat with caution.`,
    })
  }
  if (impliedExitMultiple !== undefined && sectorNormMultiple && impliedExitMultiple > sectorNormMultiple) {
    warnings.push({
      type: 'TV_MULTIPLE_HIGH',
      message: `Your terminal growth implies an exit EV/EBITDA of ${impliedExitMultiple.toFixed(1)}× vs ${sectorNormMultiple}× sector norm — consider lowering terminal growth.`,
    })
  }

  return { ...core, sensitivityGrid, impliedExitMultiple }
}
