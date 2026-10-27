// Countdown to next value date across all payrolls
import { useState, useEffect, useMemo } from 'react'
import type { Payroll } from '../lib/types'

export interface NextValueDate {
  payrollId: number
  paydayTs: number     // unix seconds
  secondsLeft: number
}

/** Find the soonest upcoming payday across payrolls (not yet due or settled) */
function findNext(payrolls: Payroll[], nowTs: number): NextValueDate | null {
  let best: NextValueDate | null = null
  for (const p of payrolls) {
    if (p.endedAt > 0 && p.endedAt <= nowTs) continue
    for (let i = p.settled; i < p.count; i++) {
      const ts = p.start + i * p.period
      if (p.endedAt > 0 && ts >= p.endedAt) break
      if (ts > nowTs) {
        const secs = ts - nowTs
        if (!best || secs < best.secondsLeft) {
          best = { payrollId: p.id, paydayTs: ts, secondsLeft: secs }
        }
        break // first upcoming per payroll is enough
      }
    }
  }
  return best
}

export function useCountdown(payrolls: Payroll[]) {
  const [nowTs, setNowTs] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const id = setInterval(() => setNowTs(Math.floor(Date.now() / 1000)), 1_000)
    return () => clearInterval(id)
  }, [])

  const next = useMemo(() => findNext(payrolls, nowTs), [payrolls, nowTs])
  return { next, nowTs }
}
