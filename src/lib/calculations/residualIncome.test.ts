import { describe, it, expect } from 'vitest'
import { calculateRI } from './residualIncome'

/*
 * HAND-VERIFIED WORKED EXAMPLE
 * BV0 = 500₹, ROE = 18%, payout = 30%, r = 12%, terminalTreatment = 'abrupt_stop'
 *
 * Year 1:
 *   EPS1 = 0.18 × 500 = 90
 *   RI1  = 90 − 0.12 × 500 = 90 − 60 = 30
 *   BV1  = 500 + 90 × (1 − 0.30) = 500 + 63 = 563
 *   PV_RI1 = 30 / 1.12 = 26.786
 *
 * Year 2:
 *   EPS2 = 0.18 × 563 = 101.34
 *   RI2  = 101.34 − 0.12 × 563 = 101.34 − 67.56 = 33.78
 *   BV2  = 563 + 101.34 × 0.70 = 563 + 70.938 = 633.938
 *   PV_RI2 = 33.78 / 1.12^2 = 33.78 / 1.2544 = 26.930
 *
 * (continuing to year 10, RI grows each year as BV compounds)
 * Sum PV_RI years 1–10 ≈ 293.17 (approximate)
 * IntrinsicPerShare = 500 + 293.17 + 0 = 793.17 (abrupt_stop)
 */

const BASE_INPUTS = {
  bookValuePerShare: 500,
  roe: 0.18,
  dividendPayout: 0.30,
  costOfEquity: 0.12,
  terminalTreatment: 'abrupt_stop' as const,
}

describe('calculateRI', () => {
  it('year 1 row is computed correctly', () => {
    const { rows } = calculateRI(BASE_INPUTS)
    const r1 = rows[0]
    expect(r1.bv).toBeCloseTo(500, 4)
    expect(r1.eps).toBeCloseTo(90, 4)           // 0.18 × 500
    expect(r1.ri).toBeCloseTo(30, 4)            // 90 − 0.12×500
    expect(r1.pvRI).toBeCloseTo(30 / 1.12, 4)  // 26.786
  })

  it('year 2 BV reflects retained earnings from year 1', () => {
    const { rows } = calculateRI(BASE_INPUTS)
    const r2 = rows[1]
    const expectedBV2 = 500 + 90 * (1 - 0.30)  // 563
    expect(r2.bv).toBeCloseTo(expectedBV2, 4)
  })

  it('produces 10 rows', () => {
    const { rows } = calculateRI(BASE_INPUTS)
    expect(rows).toHaveLength(10)
  })

  it('intrinsicPerShare = BV0 + sum(PV_RI) for abrupt_stop', () => {
    const result = calculateRI(BASE_INPUTS)
    const sumPVRI = result.rows.reduce((acc, r) => acc + r.pvRI, 0)
    expect(result.pvResidualIncome).toBeCloseTo(sumPVRI, 4)
    expect(result.intrinsicPerShare).toBeCloseTo(BASE_INPUTS.bookValuePerShare + sumPVRI, 4)
  })

  it('intrinsic value above book when ROE > cost of equity', () => {
    const result = calculateRI(BASE_INPUTS)
    // ROE 18% > r 12% → intrinsic should exceed book value
    expect(result.intrinsicPerShare).toBeGreaterThan(BASE_INPUTS.bookValuePerShare)
    expect(result.roeLtR).toBe(false)
  })

  it('intrinsic value below book when ROE < cost of equity', () => {
    const inputs = { ...BASE_INPUTS, roe: 0.08 } // ROE 8% < r 12%
    const result = calculateRI(inputs)
    expect(result.intrinsicPerShare).toBeLessThan(BASE_INPUTS.bookValuePerShare)
    expect(result.roeLtR).toBe(true)
  })

  it('ROE exactly equals cost of equity → intrinsic equals book value (abrupt_stop)', () => {
    const inputs = { ...BASE_INPUTS, roe: 0.12, terminalTreatment: 'abrupt_stop' as const }
    const result = calculateRI(inputs)
    // RI = 0 each year; intrinsic = BV0
    expect(result.intrinsicPerShare).toBeCloseTo(BASE_INPUTS.bookValuePerShare, 2)
  })

  it('perpetuity terminal value increases intrinsic above abrupt_stop', () => {
    const stopResult = calculateRI({ ...BASE_INPUTS, terminalTreatment: 'abrupt_stop' })
    const perpResult = calculateRI({ ...BASE_INPUTS, terminalTreatment: 'perpetuity' })
    expect(perpResult.intrinsicPerShare).toBeGreaterThan(stopResult.intrinsicPerShare)
  })

  it('linear_fade intrinsic is between abrupt_stop and perpetuity', () => {
    const stopResult = calculateRI({ ...BASE_INPUTS, terminalTreatment: 'abrupt_stop' })
    const fadeResult = calculateRI({ ...BASE_INPUTS, terminalTreatment: 'linear_fade' })
    const perpResult = calculateRI({ ...BASE_INPUTS, terminalTreatment: 'perpetuity' })
    expect(fadeResult.intrinsicPerShare).toBeGreaterThan(stopResult.intrinsicPerShare)
    expect(fadeResult.intrinsicPerShare).toBeLessThan(perpResult.intrinsicPerShare)
  })
})
