import { describe, it, expect } from 'vitest'
import {
  computeBaseFCFF,
  computeBaseFCFE,
  calculateDCF,
  validateDCF,
} from './dcf'

/*
 * ─── HAND-VERIFIED WORKED EXAMPLE: FCFF mode ───────────────────────
 * EBIT = 2000 Cr, tax = 25%, D&A = 400 Cr, capex = 600 Cr, ΔWC = 100 Cr
 * FCFF_0 = 2000×0.75 + 400 − 600 − 100 = 1500 + 400 − 700 = 1200 Cr
 *
 * 2-stage DCF: g1=15%, g2=10%, g_t=5%, WACC=12%, netDebt=3000 Cr, shares=50 Cr
 * Stage 1 (t=1..5): PV sum ≈ 1200 × Σ (1.15^t / 1.12^t) for t=1..5
 *   t=1: CF=1380, PV=1232.14
 *   t=2: CF=1587, PV=1265.84
 *   t=3: CF=1825.05, PV=1299.11 (approx)
 *   t=4: CF=2098.8, PV=1332.97
 *   t=5: CF=2413.6, PV=1368.46
 * Stage1 sum ≈ 6498.52
 *
 * CF5 = 2413.6, Stage 2: base=2413.6, g2=10%
 *   t=6: CF=2654.96, PV=1345.27
 *   t=7: CF=2920.46, PV=1322.74
 *   t=8: CF=3212.50, PV=1300.74
 *   t=9: CF=3533.75, PV=1279.24
 *   t=10: CF=3887.13, PV=1258.23
 * Stage2 sum ≈ 6506.22
 *
 * CF10 = 3887.13
 * TV = 3887.13 × 1.05 / (0.12 - 0.05) = 4081.49 / 0.07 = 58307 Cr
 * PV_TV = 58307 / 1.12^10 = 58307 / 3.10585 = 18771 Cr
 *
 * EV = 6498.52 + 6506.22 + 18771 = 31775.74 (approx)
 * Equity = 31775.74 − 3000 = 28775.74
 * Per Share = 28775.74 / 50 = 575.51 (approx)
 *
 * ─── HAND-VERIFIED WORKED EXAMPLE: FCFE mode ───────────────────────
 * FCFE_0 = OCF − capex + netBorrowings = 1500 − 600 + 200 = 1100 Cr
 * g1=15%, g2=10%, g_t=5%, r_e=13%, netDebtAdj=0, shares=50 Cr
 * EV/equity ≈ per-share intrinsic (different number from FCFF example)
 */

describe('computeBaseFCFF', () => {
  it('NOPAT + D&A − capex − ΔWC (worked example)', () => {
    // FCFF = 2000×0.75 + 400 − 600 − 100 = 1200
    const result = computeBaseFCFF({ ebit: 2000, taxRate: 0.25, da: 400, capex: 600, deltaWC: 100 })
    expect(result).toBeCloseTo(1200, 4)
  })

  it('zero capex and DA returns just NOPAT', () => {
    const result = computeBaseFCFF({ ebit: 1000, taxRate: 0.30, da: 0, capex: 0, deltaWC: 0 })
    expect(result).toBeCloseTo(700, 4)
  })

  it('negative ΔWC (WC decreased) increases FCFF', () => {
    const base = computeBaseFCFF({ ebit: 1000, taxRate: 0.25, da: 200, capex: 300, deltaWC: 0 })
    const withNegDelta = computeBaseFCFF({ ebit: 1000, taxRate: 0.25, da: 200, capex: 300, deltaWC: -100 })
    expect(withNegDelta).toBeGreaterThan(base)
  })
})

describe('computeBaseFCFE', () => {
  it('OCF − capex + netBorrowings (worked example)', () => {
    // 1500 − 600 + 200 = 1100
    const result = computeBaseFCFE({ ocf: 1500, capex: 600, netBorrowings: 200 })
    expect(result).toBeCloseTo(1100, 4)
  })

  it('negative netBorrowings (net repayment) decreases FCFE', () => {
    const base = computeBaseFCFE({ ocf: 1500, capex: 600, netBorrowings: 0 })
    const withRepay = computeBaseFCFE({ ocf: 1500, capex: 600, netBorrowings: -300 })
    expect(withRepay).toBeLessThan(base)
  })
})

describe('calculateDCF — FCFF mode', () => {
  const FCFF_INPUTS = {
    baseCashFlow: 1200,
    stage1Growth: 0.15,
    stage2Growth: 0.10,
    terminalGrowth: 0.05,
    discountRate: 0.12,
    netDebtAdjustment: 3000,  // FCFF: subtract net debt
    sharesOutstanding: 50,
  }

  it('produces correct per-share value for worked example (within 1%)', () => {
    const result = calculateDCF(FCFF_INPUTS)
    // Hand-computed ≈ 575.51
    expect(result.intrinsicPerShare).toBeCloseTo(575.51, 0)
  })

  it('equity value = enterprise value − net debt', () => {
    const result = calculateDCF(FCFF_INPUTS)
    expect(result.equityValue).toBeCloseTo(
      result.enterpriseOrEquityValue - FCFF_INPUTS.netDebtAdjustment, 2
    )
  })

  it('net cash (negative netDebt) increases equity value', () => {
    const netCash = calculateDCF({ ...FCFF_INPUTS, netDebtAdjustment: -500 })
    const netDebt = calculateDCF(FCFF_INPUTS)
    expect(netCash.equityValue).toBeGreaterThan(netDebt.equityValue)
  })
})

describe('calculateDCF — FCFE mode', () => {
  const FCFE_INPUTS = {
    baseCashFlow: 1100,
    stage1Growth: 0.15,
    stage2Growth: 0.10,
    terminalGrowth: 0.05,
    discountRate: 0.13,   // cost of equity for FCFE
    netDebtAdjustment: 0, // FCFE: no net-debt subtraction
    sharesOutstanding: 50,
  }

  it('equity value equals enterprise value when netDebtAdjustment is 0', () => {
    const result = calculateDCF(FCFE_INPUTS)
    expect(result.equityValue).toBeCloseTo(result.enterpriseOrEquityValue, 2)
  })

  it('FCFE at higher r produces lower value than FCFF at WACC', () => {
    const fcfResult = calculateDCF(FCFE_INPUTS)  // r=13%
    const fcffResult = calculateDCF({ ...FCFE_INPUTS, discountRate: 0.11 })  // r=11%
    expect(fcffResult.intrinsicPerShare).toBeGreaterThan(fcfResult.intrinsicPerShare)
  })
})

describe('calculateDCF — sensitivity grid', () => {
  const BASE = {
    baseCashFlow: 1000, stage1Growth: 0.12, stage2Growth: 0.08,
    terminalGrowth: 0.04, discountRate: 0.11, netDebtAdjustment: 0, sharesOutstanding: 100,
  }

  it('produces 3×3 grid', () => {
    const { sensitivityGrid } = calculateDCF(BASE)
    expect(sensitivityGrid).toHaveLength(3)
    expect(sensitivityGrid[0]).toHaveLength(3)
  })

  it('higher r → lower IV (each column)', () => {
    const { sensitivityGrid } = calculateDCF(BASE)
    const lowR = sensitivityGrid[0][1].intrinsicPerShare   // r−1%
    const highR = sensitivityGrid[2][1].intrinsicPerShare  // r+1%
    expect(lowR).toBeGreaterThan(highR)
  })

  it('higher g1 → higher IV (each row)', () => {
    const { sensitivityGrid } = calculateDCF(BASE)
    const lowG = sensitivityGrid[1][0].intrinsicPerShare   // g−2%
    const highG = sensitivityGrid[1][2].intrinsicPerShare  // g+2%
    expect(highG).toBeGreaterThan(lowG)
  })

  it('center cell equals the base result', () => {
    const result = calculateDCF(BASE)
    expect(result.sensitivityGrid[1][1].intrinsicPerShare)
      .toBeCloseTo(result.intrinsicPerShare, 2)
  })
})

describe('validateDCF', () => {
  const VALID = {
    baseCashFlow: 1000, stage1Growth: 0.12, stage2Growth: 0.08,
    terminalGrowth: 0.04, discountRate: 0.11, netDebtAdjustment: 0, sharesOutstanding: 100,
  }

  it('no errors for valid inputs', () => {
    expect(validateDCF(VALID).errors).toHaveLength(0)
  })

  it('blocks when terminal g ≥ r', () => {
    const { errors } = validateDCF({ ...VALID, terminalGrowth: 0.11 })
    expect(errors.some(e => e.type === 'TERMINAL_G_GTE_R')).toBe(true)
  })

  it('blocks when terminal g exactly equals r', () => {
    const { errors } = validateDCF({ ...VALID, terminalGrowth: 0.11, discountRate: 0.11 })
    expect(errors.some(e => e.type === 'TERMINAL_G_GTE_R')).toBe(true)
  })

  it('blocks when shares = 0', () => {
    const { errors } = validateDCF({ ...VALID, sharesOutstanding: 0 })
    expect(errors.some(e => e.type === 'ZERO_SHARES')).toBe(true)
  })

  it('warns when terminal g > 7%', () => {
    const { warnings } = validateDCF({ ...VALID, terminalGrowth: 0.08, discountRate: 0.15 })
    expect(warnings.some(w => w.type === 'TERMINAL_G_HIGH')).toBe(true)
  })

  it('warns on negative base cash flow (path for negative FCF)', () => {
    const { warnings } = validateDCF({ ...VALID, baseCashFlow: -100 })
    expect(warnings.some(w => w.type === 'NEGATIVE_FCF')).toBe(true)
  })
})
