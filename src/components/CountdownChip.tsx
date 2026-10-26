// CountdownChip — live countdown to next value date, never clips
import { Clock } from 'lucide-react'
import type { NextValueDate } from '../hooks/useCountdown'
import { fmtCountdown } from '../lib/format'

interface Props {
  next: NextValueDate | null
  /** When true, renders full-width (phone layout) */
  fullWidth?: boolean
}

export function CountdownChip({ next, fullWidth }: Props) {
  if (!next) {
    return (
      <div
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', color: 'var(--secondary)', fontSize: 15,
          fontFamily: 'var(--font-words)',
        }}
      >
        No value dates ahead
      </div>
    )
  }

  const isFixingNow = next.secondsLeft <= 0
  const label = isFixingNow
    ? 'Fixing now\u2026'
    : `Payroll\u00a0${next.payrollId}\u00a0\u00b7 next value date in ${fmtCountdown(next.secondsLeft)}`

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        border: '1.5px solid var(--amber)',
        borderRadius: 22,
        background: 'var(--ambtint)',
        color: 'var(--amber)',
        fontFamily: 'var(--font-words)',
        fontWeight: 500,
        fontSize: 15,
        // size to content — no fixed width, no overflow/ellipsis
        width: fullWidth ? '100%' : undefined,
        whiteSpace: 'nowrap',
      }}
      aria-live="polite"
      aria-label={label}
    >
      <Clock size={15} style={{ flexShrink: 0 }} />
      <span
        className="mono"
        style={{
          fontSize: 14,
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {label}
      </span>
    </div>
  )
}
