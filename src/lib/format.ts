// Formatting helpers for Valuta
// All amounts are 18-decimal native USDC unless noted.

/** Currencies with 0 decimal display (JPY, KRW) */
const ZERO_DEC_CURRENCIES = new Set(['JPY', 'KRW'])

/** bytes3 hex → 3-letter ASCII currency code */
export function bytes3ToCode(b: string): string {
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
  if (ZERO_DEC_CURRENCIES.has(currency)) return int
  return `${int}.${frac.slice(0, 2)}`
}

/** oracle answer (uint128/int256, 8 decimals) → "0.05389760" (all 8 dp) */
export function fmtRate8(answer: bigint): string {
  const abs = answer < 0n ? -answer : answer
  const s = abs.toString().padStart(9, '0')
  const int  = s.slice(0, s.length - 8) || '0'
  const frac = s.slice(-8)                 // all 8 digits
  return `${answer < 0n ? '-' : ''}${int}.${frac}`
}

/** oracle answer → inverse "18.55" (2 dp) for display */
export function fmtRateInverse(answer: bigint): string {
  if (answer <= 0n) return '?'
  // answer is X/USD with 8 decimals; USD per X = 1e8/answer
  const inv = (100_000_000n * 100n) / answer   // 2 dp precision
  const s = inv.toString().padStart(3, '0')
  const int  = s.slice(0, s.length - 2) || '0'
  const frac = s.slice(-2)
  return `${int}.${frac}`
}

/** unix seconds → "15 OCT 2026 · HH:MM UTC" */
export function fmtDateTimeStamp(ts: number): string {
  const d = new Date(ts * 1000)
  const day   = d.getUTCDate()
  const month = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()]
  const year  = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${day} ${month} ${year} · ${hh}:${mm} UTC`
}

/** unix seconds → "15 OCT 14:00" UTC (compact, for timeline) */
export function fmtDateTime(ts: number): string {
  const d = new Date(ts * 1000)
  const day   = d.getUTCDate()
  const month = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()]
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${day} ${month} ${hh}:${mm}`
}

/** unix seconds → "14:00" UTC, or "14:00:16" when seconds ≠ 0 */
export function fmtTime(ts: number): string {
  const d = new Date(ts * 1000)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = d.getUTCSeconds()
  if (ss !== 0) return `${hh}:${mm}:${String(ss).padStart(2, '0')}`
  return `${hh}:${mm}`
}

/**
 * Format a round's publish time relative to a payday.
 * Within 60 s either side: always HH:MM:SS with a signed gap.
 * Otherwise: fmtTime (HH:MM or HH:MM:SS per the rule above).
 */
export function fmtNearPayday(roundTs: number, paydayTs: number): string {
  const gap = roundTs - paydayTs          // positive = after, negative = before
  const exact = fmtTimeExact(roundTs)
  if (Math.abs(gap) < 60) {
    const absSec = Math.abs(gap)
    const sign   = gap >= 0 ? '+' : '-'
    return `${exact} (${sign}${absSec} s)`
  }
  return fmtTime(roundTs)
}

/** Always HH:MM:SS regardless of seconds value */
function fmtTimeExact(ts: number): string {
  const d = new Date(ts * 1000)
  return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':')
}

/** unix seconds → "25 Oct" (mixed case) */
export function fmtDateMixed(ts: number): string {
  const d = new Date(ts * 1000)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`
}

/** unix seconds → "25 OCT" all caps */
export function fmtDate(ts: number): string {
  const d = new Date(ts * 1000)
  const month = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()]
  return `${d.getUTCDate()} ${month}`
}

/** Lateness in verbose form: "booked 9 d 23 h after the value date" */
export function fmtLatenessVerbose(settledAt: number, payday: number): string {
  const delta = settledAt - payday
  if (delta <= 15 * 60) return 'settled on time'
  const days  = Math.floor(delta / 86400)
  const hours = Math.floor((delta % 86400) / 3600)
  if (days > 0 && hours > 0)
    return `booked ${days} d ${hours} h after the value date`
  if (days > 0)
    return `booked ${days} d after the value date`
  const mins = Math.floor((delta % 3600) / 60)
  if (hours > 0)
    return `booked ${hours} h ${mins} m after the value date`
  return `booked ${mins} m after the value date`
}

/** Convert salary × rate → USDC, floor to 1e12 (same as contract) */
export function convertUsdc(salary: bigint, answer: bigint, inverse: boolean): bigint {
  // salary: 18-decimal; answer: 8-decimal; result: 18-decimal
  let raw: bigint
  if (!inverse) {
    // usdc = salary * answer / 1e8
    raw = (salary * answer) / 100_000_000n
  } else {
    // usdc = salary * 1e8 / answer
    raw = (salary * 100_000_000n) / answer
  }
  // Floor to 1e12
  return (raw / 1_000_000_000_000n) * 1_000_000_000_000n
}

/** aggregator round id (low 64 bits of uint80) */
export function aggRoundId(rid: bigint): bigint {
  return rid & ((1n << 64n) - 1n)
}

/** format round id for display: "292" (just the number) */
export function fmtAggRound(rid: bigint): string {
  return String(aggRoundId(rid))
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

/** Duration seconds → "HH:MM:SS" countdown */
export function fmtCountdown(secs: number): string {
  if (secs <= 0) return '00:00:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

/** Number → locale string with commas: "27,861,402" */
export function fmtNumber(n: number): string {
  return n.toLocaleString('en-US')
}
