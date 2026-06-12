export type TerminalTreatment = 'perpetuity' | 'linear_fade' | 'abrupt_stop'

export interface RIInputs {
  bookValuePerShare: number   // ₹
  roe: number                 // decimal e.g. 0.18
  dividendPayout: number      // decimal e.g. 0.30
  costOfEquity: number        // decimal
  terminalTreatment: TerminalTreatment
}

export interface RIYearRow {
  year: number
  bv: number    // Book Value per share start of year
  eps: number
  ri: number    // Residual Income = EPS - r × BV
  pvRI: number  // PV of RI
}

export interface RIResult {
  intrinsicPerShare: number
  pvResidualIncome: number
  pvTerminalRI: number
  rows: RIYearRow[]
  roeLtR: boolean   // true when ROE ≤ cost of equity
}

export function calculateRI(inputs: RIInputs): RIResult {
  const { bookValuePerShare, roe, dividendPayout, costOfEquity, terminalTreatment } = inputs

  const rows: RIYearRow[] = []
  let bv = bookValuePerShare
  let pvResidualIncome = 0

  for (let t = 1; t <= 10; t++) {
    const eps = roe * bv
    const ri = eps - costOfEquity * bv
    const pvRI = ri / Math.pow(1 + costOfEquity, t)
    pvResidualIncome += pvRI
    rows.push({ year: t, bv, eps, ri, pvRI })
    bv = bv + eps * (1 - dividendPayout)
  }

  const ri10 = rows[9].ri
  let pvTerminalRI = 0

  if (terminalTreatment === 'perpetuity') {
    // RI continues as perpetuity at year-10 level: PV = RI_10 / r, discounted 10 years
    const terminalValue = ri10 / costOfEquity
    pvTerminalRI = terminalValue / Math.pow(1 + costOfEquity, 10)
  } else if (terminalTreatment === 'linear_fade') {
    // RI fades linearly to 0 over years 11–15 (5 years)
    for (let t = 11; t <= 15; t++) {
      const fadeFraction = 1 - (t - 10) / 5 // 0.8, 0.6, 0.4, 0.2, 0
      const ri_t = ri10 * fadeFraction
      pvTerminalRI += ri_t / Math.pow(1 + costOfEquity, t)
    }
  }
  // 'abrupt_stop': pvTerminalRI remains 0

  const intrinsicPerShare = bookValuePerShare + pvResidualIncome + pvTerminalRI

  return {
    intrinsicPerShare,
    pvResidualIncome,
    pvTerminalRI,
    rows,
    roeLtR: roe <= costOfEquity,
  }
}
