const inFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
const inFmt0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const inFmtRs = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

export function fmtNum(n: number): string {
  return inFmt.format(n)
}

export function fmtRs(n: number): string {
  return inFmtRs.format(n)
}

export function fmtCr(n: number): string {
  return `₹${inFmt.format(n)} Cr`
}

export function fmtPct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`
}

export function fmtRs0(n: number): string {
  return `₹${inFmt0.format(n)}`
}

export function fmtGap(iv: number, cmp: number): string {
  if (!cmp) return '—'
  const pct = ((iv - cmp) / cmp) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}
