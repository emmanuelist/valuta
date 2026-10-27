// CountdownChip — live countdown to next value date, never clips
import { Clock } from 'lucide-react'
import type { NextValueDate } from '../hooks/useCountdown'
import { fmtCountdown } from '../lib/format'

interface Props {
  next: NextValueDate | null
  /** When true, data is still loading — show a skeleton instead of "No value dates ahead" */
  isLoading?: boolean
  /** When true, renders full-width (phone layout) */
  fullWidth?: boolean
}

export function CountdownChip({ next, isLoading, fullWidth }: Props) {
  if (!next) {
    if (isLoading) {
      return (
        <div className="skeleton" style={{ width: 320, height: 44, borderRadius: 22 }} aria-busy="true" />
      )
    }
    return null
  }

  const isFixingNow = next.secondsLeft <= 0
  const label = isFixingNow
    ? 'Fixing now\u2026'
    : `Payroll\u00a0${next.payrollId}\u00a0\u00b7 next value date in ${fmtCountdown(next.secondsLeft)}`

  return (
    <div
      className="countdown-chip-due"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        border: '1.5px solid var(--state-due-ink)',
        borderRadius: 22,
        background: 'var(--state-due-tint)',
        color: 'var(--state-due-ink)',
        fontFamily: 'var(--font-words)',
        fontWeight: 500,
        fontSize: 15,
        // size to content — no fixed width, no overflow/ellipsis
        width: fullWidth ? '100%' : undefined,
        whiteSpace: fullWidth ? 'normal' : 'nowrap',
        minWidth: fullWidth ? 'unset' : undefined,
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
