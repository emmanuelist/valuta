// CountdownChip — live countdown to next value date
import { Clock } from 'lucide-react'
import type { NextValueDate } from '../hooks/useCountdown'
import { fmtCountdown } from '../lib/format'

interface Props {
  next: NextValueDate | null
}

export function CountdownChip({ next }: Props) {
  if (!next) {
    return (
      <div
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 16px',
          color: 'var(--secondary)', fontSize: 15,
          fontFamily: 'var(--font-words)',
        }}
      >
        No value dates ahead
      </div>
    )
  }

  const isFixingNow = next.secondsLeft <= 0
  const label = isFixingNow
    ? 'Fixing now…'
    : `Payroll ${next.payrollId} · next value date in ${fmtCountdown(next.secondsLeft)}`

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
        width: 340,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
      aria-live="polite"
      aria-label={label}
    >
      <Clock size={15} style={{ flexShrink: 0 }} />
      <span
        className="mono"
        style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {label}
      </span>
    </div>
  )
}
