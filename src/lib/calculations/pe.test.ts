import { describe, it, expect } from 'vitest'
import { calculatePE, grahamPE } from './pe'

/*
 * HAND-VERIFIED WORKED EXAMPLE
 * currentEPS = 50₹, epsGrowth = 15%, fairPE = 25, discountRate = 12%
 *
 * EPS_5 = 50 × 1.15^5 = 50 × 2.011357 = 100.568
 * FutureValue = 100.568 × 25 = 2514.19
 * IntrinsicToday = 2514.19 / 1.12^5 = 2514.19 / 1.762342 = 1426.64
 * SimpleValue = 50 × 25 = 1250
 */

const BASE_INPUTS = {
  currentEPS: 50,
  epsGrowth: 0.15,
  fairPE: 25,
  discountRate: 0.12,
}

describe('calculatePE', () => {
  it('produces correct discounted intrinsic value for worked example', () => {
    const result = calculatePE(BASE_INPUTS)
    expect(result.intrinsicPerShare).toBeCloseTo(1426.64, 0)
  })

  it('produces correct simple (no-discount) value', () => {
    const result = calculatePE(BASE_INPUTS)
    expect(result.simpleValue).toBeCloseTo(1250, 0)
  })

  it('eps5 equals EPS compounded at growth for 5 years', () => {
    const result = calculatePE(BASE_INPUTS)
    expect(result.eps5).toBeCloseTo(50 * Math.pow(1.15, 5), 4)
  })

  it('futureValue = eps5 × fairPE', () => {
    const result = calculatePE(BASE_INPUTS)
    expect(result.futureValue).toBeCloseTo(result.eps5 * BASE_INPUTS.fairPE, 4)
  })

  it('discounted value < simple value when discount rate > 0', () => {
    const result = calculatePE(BASE_INPUTS)
    expect(result.intrinsicPerShare).toBeLessThan(result.simpleValue * Math.pow(1 + BASE_INPUTS.epsGrowth, 5))
  })

  it('higher growth increases intrinsic value', () => {
    const lowG = calculatePE({ ...BASE_INPUTS, epsGrowth: 0.10 })
    const highG = calculatePE({ ...BASE_INPUTS, epsGrowth: 0.20 })
    expect(highG.intrinsicPerShare).toBeGreaterThan(lowG.intrinsicPerShare)
  })

  it('higher discount rate decreases intrinsic value', () => {
    const lowR = calculatePE({ ...BASE_INPUTS, discountRate: 0.10 })
    const highR = calculatePE({ ...BASE_INPUTS, discountRate: 0.14 })
    expect(lowR.intrinsicPerShare).toBeGreaterThan(highR.intrinsicPerShare)
  })

  it('zero growth: eps5 equals currentEPS, future value = EPS × PE', () => {
    const result = calculatePE({ ...BASE_INPUTS, epsGrowth: 0 })
    expect(result.eps5).toBeCloseTo(BASE_INPUTS.currentEPS, 4)
    expect(result.futureValue).toBeCloseTo(BASE_INPUTS.currentEPS * BASE_INPUTS.fairPE, 4)
  })
})

describe('grahamPE', () => {
  it('returns 8.5 + 2g for growth = 12', () => {
    // Graham PE = 8.5 + 2×12 = 32.5
    const { pe, capped } = grahamPE(12)
    expect(pe).toBeCloseTo(32.5)
    expect(capped).toBe(false)
  })

  it('caps at 40 for high growth', () => {
    // g=20 → 8.5 + 40 = 48.5, capped at 40
    const { pe, capped } = grahamPE(20)
    expect(pe).toBe(40)
    expect(capped).toBe(true)
  })

  it('exactly 40 is not capped', () => {
    // g=15.75 → 8.5 + 31.5 = 40.0 — exactly at cap, not capped
    const { pe, capped } = grahamPE(15.75)
    expect(pe).toBeCloseTo(40)
    expect(capped).toBe(false)
  })

  it('returns 8.5 for zero growth', () => {
    const { pe } = grahamPE(0)
    expect(pe).toBeCloseTo(8.5)
  })
})
