import { describe, it, expect } from 'vitest'
import {
  computeUnleveredBeta,
  releverBeta,
  computeBottomUpBeta,
  computeCostOfEquity,
  computeCostOfDebt,
  computeWACC,
  debtToEquityFromMarketCap,
} from './capm'

/*
 * HAND-VERIFIED WORKED EXAMPLES
 *
 * Example 1 — Bottom-up beta (single industry):
 *   Industry: IT Services, β_U = 0.87
 *   Tax = 25%, D/E = 0.20 (totalDebt/marketCap)
 *   β_L = 0.87 × (1 + (1−0.25) × 0.20) = 0.87 × 1.15 = 1.0005
 *
 * Example 2 — Multi-industry (conglomerate):
 *   IT 60% (β_U=0.87) + Engineering 40% (β_U=0.79)
 *   β_U_combined = 0.60×0.87 + 0.40×0.79 = 0.522 + 0.316 = 0.838
 *   β_L = 0.838 × (1 + 0.75 × 0.30) = 0.838 × 1.225 = 1.0265
 *
 * Example 3 — WACC:
 *   r_e = 13%, r_d = 8%, tax = 25%, E = 80000 Cr, D = 20000 Cr
 *   E/V = 0.80, D/V = 0.20
 *   WACC = 0.80×0.13 + 0.20×0.08×0.75 = 0.104 + 0.012 = 0.116 = 11.6%
 */

describe('computeUnleveredBeta', () => {
  it('returns industry beta directly for single industry', () => {
    const result = computeUnleveredBeta([{ industryId: 'it', unleveredBeta: 0.87, weight: 100 }])
    expect(result).toBeCloseTo(0.87, 5)
  })

  it('computes weighted average for multi-industry (Example 2)', () => {
    const industries = [
      { industryId: 'it',  unleveredBeta: 0.87, weight: 60 },
      { industryId: 'eng', unleveredBeta: 0.79, weight: 40 },
    ]
    // 0.60×0.87 + 0.40×0.79 = 0.838
    expect(computeUnleveredBeta(industries)).toBeCloseTo(0.838, 4)
  })

  it('normalises weights that do not sum to 100', () => {
    const industries = [
      { industryId: 'a', unleveredBeta: 1.0, weight: 1 },
      { industryId: 'b', unleveredBeta: 0.5, weight: 1 },
    ]
    // equal weights → average = 0.75
    expect(computeUnleveredBeta(industries)).toBeCloseTo(0.75, 5)
  })

  it('returns 0 for empty list', () => {
    expect(computeUnleveredBeta([])).toBe(0)
  })
})

describe('releverBeta', () => {
  it('computes correctly for Example 1', () => {
    // β_L = 0.87 × (1 + (1−0.25) × 0.20) = 0.87 × 1.15 = 1.0005
    expect(releverBeta(0.87, 0.25, 0.20)).toBeCloseTo(1.0005, 3)
  })

  it('equals unlevered beta when D/E = 0 (all equity firm)', () => {
    expect(releverBeta(0.75, 0.25, 0)).toBeCloseTo(0.75, 5)
  })

  it('increases with higher leverage', () => {
    const low = releverBeta(0.80, 0.25, 0.10)
    const high = releverBeta(0.80, 0.25, 0.50)
    expect(high).toBeGreaterThan(low)
  })

  it('decreases with higher tax rate (tax shield reduces leverage effect)', () => {
    const lowTax = releverBeta(0.80, 0.10, 0.30)
    const highTax = releverBeta(0.80, 0.40, 0.30)
    expect(lowTax).toBeGreaterThan(highTax)
  })
})

describe('computeBottomUpBeta', () => {
  it('computes multi-industry levered beta (Example 2)', () => {
    // β_U = 0.838, tax=25%, D/E=0.30
    // β_L = 0.838 × (1 + 0.75 × 0.30) = 0.838 × 1.225 = 1.0265
    const result = computeBottomUpBeta({
      industries: [
        { industryId: 'it',  unleveredBeta: 0.87, weight: 60 },
        { industryId: 'eng', unleveredBeta: 0.79, weight: 40 },
      ],
      taxRate: 0.25,
      debtToEquity: 0.30,
    })
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(1.0265, 3)
  })

  it('returns null when no industries provided', () => {
    const result = computeBottomUpBeta({ industries: [], taxRate: 0.25, debtToEquity: 0.20 })
    expect(result).toBeNull()
  })
})

describe('computeCostOfEquity', () => {
  it('computes correctly: r = Rf + β × ERP', () => {
    // Rf=7%, β=1.1, ERP=5.5% → r = 7 + 1.1×5.5 = 13.05%
    const r = computeCostOfEquity({ riskFreeRate: 0.07, beta: 1.1, erp: 0.055 })
    expect(r * 100).toBeCloseTo(13.05, 3)
  })

  it('equals Rf when beta is zero', () => {
    const r = computeCostOfEquity({ riskFreeRate: 0.07, beta: 0, erp: 0.055 })
    expect(r).toBeCloseTo(0.07, 5)
  })
})

describe('computeCostOfDebt', () => {
  it('interest / debt simple case', () => {
    // 1000 Cr interest / 12500 Cr debt = 8%
    const r = computeCostOfDebt(1000, 12500)
    expect(r).toBeCloseTo(0.08, 4)
  })

  it('clamps minimum at 4%', () => {
    expect(computeCostOfDebt(100, 100000)).toBe(0.04)
  })

  it('clamps maximum at 25%', () => {
    expect(computeCostOfDebt(10000, 10000)).toBe(0.25)  // 100% unclamped → clamped 25%
  })

  it('returns fallback 8% when debt is zero', () => {
    expect(computeCostOfDebt(500, 0)).toBe(0.08)
  })
})

describe('computeWACC', () => {
  it('computes correctly for Example 3', () => {
    // r_e=13%, r_d=8%, tax=25%, E=80000, D=20000
    // WACC = 0.80×0.13 + 0.20×0.08×0.75 = 11.6%
    const result = computeWACC({
      costOfEquity: 0.13,
      costOfDebt: 0.08,
      taxRate: 0.25,
      totalDebt: 20000,
      marketCap: 80000,
    })
    expect(result).not.toBeNull()
    expect(result!.wacc * 100).toBeCloseTo(11.6, 2)
    expect(result!.equityWeight).toBeCloseTo(0.80, 4)
    expect(result!.debtWeight).toBeCloseTo(0.20, 4)
  })

  it('returns null when total V = 0', () => {
    const result = computeWACC({ costOfEquity: 0.13, costOfDebt: 0.08, taxRate: 0.25, totalDebt: 0, marketCap: 0 })
    expect(result).toBeNull()
  })

  it('WACC < cost of equity when there is debt (tax shield benefit)', () => {
    const result = computeWACC({
      costOfEquity: 0.13,
      costOfDebt: 0.08,
      taxRate: 0.25,
      totalDebt: 30000,
      marketCap: 70000,
    })
    expect(result!.wacc).toBeLessThan(0.13)
  })
})

describe('debtToEquityFromMarketCap', () => {
  it('computes D/E correctly', () => {
    // D=20000 Cr, E(=mktcap)=80000 Cr → D/E = 0.25
    expect(debtToEquityFromMarketCap(20000, 80000)).toBeCloseTo(0.25, 5)
  })

  it('returns 0 when market cap is zero', () => {
    expect(debtToEquityFromMarketCap(5000, 0)).toBe(0)
  })
})
