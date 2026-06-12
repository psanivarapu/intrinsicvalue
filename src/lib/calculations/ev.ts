export interface EVInputs {
  ebitda: number             // ₹ Cr
  multiple: number           // EV/EBITDA multiple
  totalDebt: number          // ₹ Cr
  cash: number               // ₹ Cr
  sharesOutstanding: number  // crores
}

export interface EVResult {
  impliedEV: number
  impliedEquityValue: number
  intrinsicPerShare: number
  netCash: boolean  // true when cash > debt
}

export function calculateEV(inputs: EVInputs): EVResult {
  const { ebitda, multiple, totalDebt, cash, sharesOutstanding } = inputs

  const impliedEV = ebitda * multiple
  const impliedEquityValue = impliedEV - totalDebt + cash
  const intrinsicPerShare = impliedEquityValue / sharesOutstanding
  const netCash = cash > totalDebt

  return { impliedEV, impliedEquityValue, intrinsicPerShare, netCash }
}
