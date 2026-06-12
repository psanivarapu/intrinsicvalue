export interface PEInputs {
  currentEPS: number        // ₹
  epsGrowth: number         // decimal e.g. 0.12
  fairPE: number            // multiple
  discountRate: number      // decimal
}

export interface PEResult {
  intrinsicPerShare: number  // discounted (primary)
  simpleValue: number        // EPS × PE (secondary, no time value)
  eps5: number               // projected EPS at year 5
  futureValue: number        // EPS_5 × FairPE
}

// Graham PE formula: 8.5 + 2g where g is growth as whole number (e.g. 12 for 12%)
// Cap at 40 for display purposes
export function grahamPE(growthPct: number): { pe: number; capped: boolean } {
  const raw = 8.5 + 2 * growthPct
  if (raw > 40) return { pe: 40, capped: true }
  return { pe: raw, capped: false }
}

export function calculatePE(inputs: PEInputs): PEResult {
  const { currentEPS, epsGrowth, fairPE, discountRate } = inputs

  const eps5 = currentEPS * Math.pow(1 + epsGrowth, 5)
  const futureValue = eps5 * fairPE
  const intrinsicPerShare = futureValue / Math.pow(1 + discountRate, 5)
  const simpleValue = currentEPS * fairPE

  return { intrinsicPerShare, simpleValue, eps5, futureValue }
}
