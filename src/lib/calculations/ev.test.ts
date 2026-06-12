import { describe, it, expect } from 'vitest'
import { calculateEV } from './ev'

/*
 * HAND-VERIFIED WORKED EXAMPLE
 * EBITDA = 1500 Cr, multiple = 15×, totalDebt = 3000 Cr, cash = 800 Cr, shares = 50 Cr
 *
 * EV = 1500 × 15 = 22500 Cr
 * EquityValue = 22500 − 3000 + 800 = 20300 Cr
 * IntrinsicPerShare = 20300 / 50 = 406 ₹
 */

const BASE_INPUTS = {
  ebitda: 1500,
  multiple: 15,
  totalDebt: 3000,
  cash: 800,
  sharesOutstanding: 50,
}

describe('calculateEV', () => {
  it('produces correct intrinsic value for worked example', () => {
    const result = calculateEV(BASE_INPUTS)
    expect(result.intrinsicPerShare).toBeCloseTo(406, 2)
  })

  it('implied EV = EBITDA × multiple', () => {
    const result = calculateEV(BASE_INPUTS)
    expect(result.impliedEV).toBeCloseTo(1500 * 15, 4)
  })

  it('equity value = EV - debt + cash', () => {
    const result = calculateEV(BASE_INPUTS)
    expect(result.impliedEquityValue).toBeCloseTo(22500 - 3000 + 800, 4)
  })

  it('net cash flag is false when debt > cash', () => {
    const result = calculateEV(BASE_INPUTS) // debt 3000 > cash 800
    expect(result.netCash).toBe(false)
  })

  it('net cash flag is true when cash > debt', () => {
    const result = calculateEV({ ...BASE_INPUTS, cash: 4000, totalDebt: 1000 })
    expect(result.netCash).toBe(true)
  })

  it('net cash increases equity value vs net debt', () => {
    const netDebtResult = calculateEV(BASE_INPUTS)
    const netCashResult = calculateEV({ ...BASE_INPUTS, cash: 4000, totalDebt: 1000 })
    // net cash adds to equity: EV - 1000 + 4000 vs EV - 3000 + 800
    expect(netCashResult.impliedEquityValue).toBeGreaterThan(netDebtResult.impliedEquityValue)
  })

  it('higher multiple produces higher intrinsic value', () => {
    const low = calculateEV({ ...BASE_INPUTS, multiple: 10 })
    const high = calculateEV({ ...BASE_INPUTS, multiple: 20 })
    expect(high.intrinsicPerShare).toBeGreaterThan(low.intrinsicPerShare)
  })

  it('intrinsic per share scales linearly with shares outstanding (inverse)', () => {
    const result50 = calculateEV(BASE_INPUTS)
    const result100 = calculateEV({ ...BASE_INPUTS, sharesOutstanding: 100 })
    expect(result50.intrinsicPerShare).toBeCloseTo(result100.intrinsicPerShare * 2, 4)
  })

  it('works with zero debt (pure equity)', () => {
    const result = calculateEV({ ...BASE_INPUTS, totalDebt: 0, cash: 0 })
    expect(result.impliedEquityValue).toBeCloseTo(BASE_INPUTS.ebitda * BASE_INPUTS.multiple, 4)
    expect(result.netCash).toBe(false)
  })
})
