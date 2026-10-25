// Formatting helpers for Valuta
// All amounts are 18-decimal native USDC unless noted.

/** Currencies with 0 decimal display (JPY, KRW) */
const ZERO_DEC_CURRENCIES = new Set(['JPY', 'KRW'])

/** bytes3 hex → 3-letter ASCII currency code */
export function bytes3ToCode(b: string): string {
  // b is "0x4d584e" etc.
  const hex = b.startsWith('0x') ? b.slice(2) : b
  let s = ''
  for (let i = 0; i < 6; i += 2) {
    const code = parseInt(hex.slice(i, i + 2), 16)
    if (code > 0) s += String.fromCharCode(code)
  }
  return s
}

/** 18-decimal USDC bigint → "0.053897" (6 dp) */
export function fmtUsdc(raw: bigint): string {
  if (raw < 0n) raw = 0n
  const s = raw.toString().padStart(19, '0')
  const int  = s.slice(0, s.length - 18) || '0'
  const frac = s.slice(-18).slice(0, 6)
  return `${int}.${frac}`
}

/** 18-decimal salary bigint → "1.00" or "50" for JPY */
export function fmtSalary(raw: bigint, currency: string): string {
  const s = raw.toString().padStart(19, '0')
  const int  = s.slice(0, s.length - 18) || '0'
  const frac = s.slice(-18)
  if (ZERO_DEC_CURRENCIES.has(currency)) {
    return int
  }
  return `${int}.${frac.slice(0, 2)}`
}

/** oracle answer (uint128/int256, 8 decimals) → "0.0538976" (7 dp) */
export function fmtRate(answer: bigint): string {
  const abs = answer < 0n ? -answer : answer
  const s = abs.toString().padStart(9, '0')
  const int  = s.slice(0, s.length - 8) || '0'
  const frac = s.slice(-8).slice(0, 7)
  return `${answer < 0n ? '-' : ''}${int}.${frac}`
}

/** unix seconds → "15 OCT 14:00" UTC */
export function fmtDateTime(ts: number): string {
  const d = new Date(ts * 1000)
  const day   = d.getUTCDate()
  const month = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()]
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${day} ${month} ${hh}:${mm}`
}

/** unix seconds → "14:00" UTC */
export function fmtTime(ts: number): string {
  const d = new Date(ts * 1000)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** unix seconds → "25 OCT" UTC */
export function fmtDate(ts: number): string {
  const d = new Date(ts * 1000)
  const month = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()]
  return `${d.getUTCDate()} ${month}`
}

/** Lateness label: settledAt - payday */
export function fmtLateness(settledAt: number, payday: number): { label: string; late: boolean } {
  const delta = settledAt - payday
  if (delta <= 15 * 60) return { label: 'on time', late: false }
  const days  = Math.floor(delta / 86400)
  const hours = Math.floor((delta % 86400) / 3600)
  const mins  = Math.floor((delta % 3600) / 60)
  if (days >= 1)  return { label: `settled ${days}d late`,  late: true }
  if (hours >= 1) return { label: `settled ${hours}h late`, late: true }
  return { label: `settled ${mins}m late`, late: true }
}

/** aggregator round id from phase-encoded uint80 */
export function aggRoundId(rid: bigint): bigint {
  return rid & ((1n << 64n) - 1n)
}

/** format round id for display: "R292" */
export function fmtRoundShort(rid: bigint): string {
  return `R${aggRoundId(rid)}`
}

/** Truncate address: "0x1234…5678" */
export function truncAddr(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail) return addr
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}

/** Truncate hash: "0x82ff…38b7" */
export function truncHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}
