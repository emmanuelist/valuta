// CouponRow — one coupon per payday, scroll-snap, keyboard navigation
import { useEffect, useRef, useCallback } from 'react'
import { Clock } from 'lucide-react'
import type { Payroll, Payslip, DueQuote } from '../lib/types'
import { fmtDate, fmtTime } from '../lib/format'

type CouponState = 'HELD' | 'DUE' | 'CREDITED' | 'upcoming'

interface CouponData {
  index: number
  paydayTs: number
  state: CouponState
  label: string
}

function getCouponState(
  i: number,
  payroll: Payroll,
  payslips: Payslip[],
  dueQuotes: DueQuote[],
): CouponData {
  const paydayTs = payroll.start + i * payroll.period

  if (i < payslips.length) {
    const ps = payslips[i]
    const state: CouponState = ps.paid > 0n ? 'HELD' : 'CREDITED'
    return { index: i, paydayTs, state, label: state }
  }

  const dueIdx = i - payroll.settled
  if (dueIdx >= 0 && dueIdx < dueQuotes.length) {
    return { index: i, paydayTs, state: 'DUE', label: 'DUE' }
  }

  return { index: i, paydayTs, state: 'upcoming', label: fmtDate(paydayTs) }
}

const STATE_COLORS: Record<CouponState, { fg: string; border: string; bg: string }> = {
  HELD:     { fg: 'var(--state-held)',     border: 'var(--state-held)',     bg: 'var(--state-held-tint)' },
  DUE:      { fg: 'var(--state-due)',      border: 'var(--state-due)',      bg: 'var(--state-due-tint)' },
  CREDITED: { fg: 'var(--state-credited)', border: 'var(--state-credited)', bg: 'var(--ptint)' },
  upcoming: { fg: 'var(--secondary)',      border: 'var(--rule)',           bg: 'transparent' },
}

interface Props {
  payroll:      Payroll
  payslips:     Payslip[]
  dueQuotes:    DueQuote[]
  selected:     number
  onSelect:     (i: number) => void
  newlyDue?:    number | null
  newlyHeld?:   number | null
}

export function CouponRow({ payroll, payslips, dueQuotes, selected, onSelect, newlyDue, newlyHeld }: Props) {
  const rowRef     = useRef<HTMLDivElement>(null)
  const couponRefs = useRef<(HTMLButtonElement | null)[]>([])

  const coupons: CouponData[] = []
  for (let i = 0; i < payroll.count; i++) {
    coupons.push(getCouponState(i, payroll, payslips, dueQuotes))
  }

  // Scroll selected into view
  useEffect(() => {
    couponRefs.current[selected]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    })
  }, [selected])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'k') {
      e.preventDefault()
      onSelect(Math.max(0, selected - 1))
    } else if (e.key === 'ArrowRight' || e.key === 'j') {
      e.preventDefault()
      onSelect(Math.min(coupons.length - 1, selected + 1))
    }
  }, [selected, coupons.length, onSelect])

  return (
    <div
      ref={rowRef}
      className="coupon-row"
      role="tablist"
      aria-label="Paydays"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: 'none', minHeight: 96 }}
    >
      {coupons.map((c) => {
        const isSelected   = c.index === selected
        const colors       = STATE_COLORS[c.state]
        const isNewlyDue   = c.index === newlyDue
        const isNewlyHeld  = c.index === newlyHeld
        const isUpcoming   = c.state === 'upcoming'

        // Selected background tint by state
        const selectedBg = c.state === 'HELD' ? 'var(--state-held-tint)'
          : c.state === 'DUE'      ? 'var(--state-due-tint)'
          : c.state === 'CREDITED' ? 'var(--ptint)'
          : 'var(--ground)'

        // Upcoming: solid border; state coupons: dashed
        const borderStyle = isUpcoming
          ? `1px solid var(--rule)`
          : isSelected
            ? `2px solid var(--petrol)`
            : `1.5px dashed ${colors.border}`

        return (
          <button
            key={c.index}
            ref={el => { couponRefs.current[c.index] = el }}
            className="coupon-item"
            role="tab"
            aria-selected={isSelected}
            aria-current={isSelected ? 'true' : undefined}
            onClick={() => onSelect(c.index)}
            style={{
              width: 112,
              height: 96,
              background: isSelected && !isUpcoming ? selectedBg : 'var(--paper)',
              border: borderStyle,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isUpcoming ? 4 : 6,
              padding: 8,
              position: 'relative',
              transition: 'border-color .15s, background .15s',
              outline: 'none',
              animation: isNewlyDue ? 'shimmer .2s ease-in-out' : undefined,
              boxShadow: 'none',
            }}
          >
            {/* Number — full ink for upcoming, state colour when selected */}
            <div
              style={{
                fontFamily: 'var(--font-words)',
                fontWeight: 600,
                fontSize: 22,
                color: isUpcoming
                  ? 'var(--ink)'
                  : isSelected ? colors.fg : 'var(--ink)',
                lineHeight: 1,
              }}
            >
              {String(c.index + 1).padStart(2, '0')}
            </div>

            {isUpcoming ? (
              /* Upcoming: date + clock icon — real scheduled payday, not a stamp */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={10} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                  <span
                    className="mono"
                    style={{ fontSize: 10, color: 'var(--secondary)', lineHeight: 1 }}
                  >
                    {fmtDate(c.paydayTs)}
                  </span>
                </div>
                <span
                  className="mono"
                  style={{ fontSize: 9, color: 'var(--secondary)', lineHeight: 1 }}
                >
                  fixes {fmtTime(c.paydayTs)}
                </span>
              </div>
            ) : (
              /* State coupons: stamp */
              <div
                className="stamp"
                style={{
                  color: colors.fg,
                  borderColor: colors.fg,
                }}
              >
                {isNewlyHeld ? 'settled just now' : c.label}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
