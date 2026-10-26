// HonestTimeline — log-proportional spacing, no ticks, no collisions
import { useReducedMotion, motion } from 'framer-motion'
import type { RoundData } from '../lib/types'
import type { Payslip, DueQuote } from '../lib/types'
import { fmtTime, fmtDate, fmtAggRound } from '../lib/format'

interface Props {
  payslip:  Payslip | null
  dueQuote: DueQuote | null
  prev:     RoundData | null
  next:     RoundData | null
  animKey:  number
}

const MIN_PX   = 120   // minimum gap between events
const HEIGHT   = 75
const Y_LINE   = 36    // y of the main line
const BREAK_GAP = 24 * 3600  // show "//" when gap > 24 h

/** Map a time gap (seconds) → display width px */
function gapToPx(gapSec: number): number {
  return MIN_PX + Math.log1p(gapSec / 60) * 18
}

interface Event {
  id: string
  ts: number
  kind: 'round' | 'asof' | 'payday' | 'settlement'
  label: string
  sublabel?: string
}

export function HonestTimeline({ payslip, dueQuote, prev, next, animKey }: Props) {
  const reduced = useReducedMotion()

  const isSettled = !!payslip

  const roundId      = payslip?.roundId ?? dueQuote?.roundId
  const roundUpdAt   = payslip?.roundUpdatedAt ?? dueQuote?.roundUpdatedAt
  const paydayTs     = payslip?.payday ?? dueQuote?.payday
  const settledTs    = payslip?.settledAt

  if (!paydayTs || !roundUpdAt || !roundId) {
    // Loading / empty state
    return (
      <div style={{ height: HEIGHT, display: 'flex', alignItems: 'center', paddingLeft: 67 }}>
        <div className="skeleton" style={{ width: 600, height: 12 }} />
      </div>
    )
  }

  // Build events list
  const events: Event[] = []

  if (prev) {
    events.push({
      id: 'prev',
      ts: prev.updatedAt,
      kind: 'round',
      label: fmtAggRound(prev.roundId),
    })
  }

  events.push({
    id: 'asof',
    ts: roundUpdAt,
    kind: 'asof',
    label: fmtAggRound(roundId),
    sublabel: fmtTime(roundUpdAt),
  })

  events.push({
    id: 'payday',
    ts: paydayTs,
    kind: 'payday',
    label: 'PAYDAY',
    sublabel: fmtTime(paydayTs),
  })

  if (next && next.updatedAt > 0) {
    events.push({
      id: 'next',
      ts: next.updatedAt,
      kind: 'round',
      label: fmtAggRound(next.roundId),
      sublabel: fmtTime(next.updatedAt),
    })
  } else {
    events.push({
      id: 'next',
      ts: paydayTs + 3600, // placeholder — shown as "No newer round"
      kind: 'round',
      label: '—',
      sublabel: 'No newer round',
    })
  }

  if (isSettled && settledTs) {
    events.push({
      id: 'settlement',
      ts: settledTs,
      kind: 'settlement',
      label: 'SETTLEMENT',
      sublabel: fmtDate(settledTs),
    })
  }

  // Compute x positions
  const PADDING = 67
  const xs: number[] = [PADDING]
  for (let i = 1; i < events.length; i++) {
    const gapSec = Math.max(0, events[i].ts - events[i - 1].ts)
    const showBreak = gapSec > BREAK_GAP && events[i].kind === 'settlement'
    const px = showBreak ? gapToPx(gapSec) * 0.6 : gapToPx(gapSec)
    xs.push(xs[i - 1] + px)
  }

  const totalWidth = Math.max(xs[xs.length - 1] + PADDING, 1213)

  // Render
  return (
    <div
      style={{ width: '100%', overflowX: 'auto', scrollbarWidth: 'thin' }}
      aria-label="Timeline"
    >
      <svg
        width={totalWidth}
        height={HEIGHT}
        style={{ display: 'block', minWidth: totalWidth }}
      >
        {/* Baseline */}
        <line
          x1={xs[0]} y1={Y_LINE}
          x2={xs[xs.length - 1] + (isSettled ? 0 : 20)} y2={Y_LINE}
          stroke="var(--rule)" strokeWidth={1.5}
        />

        {events.map((ev, i) => {
          const x = xs[i]
          const isAsof       = ev.kind === 'asof'
          const isPayday     = ev.kind === 'payday'
          const isSettlEv    = ev.kind === 'settlement'

          // "//" break mark before settlement
          const prevTs = events[i - 1]?.ts ?? 0
          const showBreak = isSettlEv && (ev.ts - prevTs) > BREAK_GAP

          return (
            <g key={ev.id}>
              {/* Break mark */}
              {showBreak && (
                <text
                  x={x - 34} y={Y_LINE + 5}
                  fontFamily="var(--font-mono)" fontSize={14}
                  fill="var(--secondary)" opacity={.6}
                >//</text>
              )}

              {/* Marker */}
              {isAsof && (
                <>
                  <circle cx={x} cy={Y_LINE} r={10} fill="none" stroke="var(--petrol)" strokeWidth={2} />
                  <circle cx={x} cy={Y_LINE} r={5}  fill="var(--petrol)" />
                </>
              )}
              {isPayday && (
                <g>
                  <circle cx={x} cy={Y_LINE} r={12} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
                  {/* Star */}

                  {/* Simple star polygon */}
                  <polygon
                    points={[0,1,2,3,4].flatMap(k => {
                      const a  = (k * 72 - 90) * Math.PI / 180
                      const a2 = (k * 72 - 90 + 36) * Math.PI / 180
                      return [
                        `${(x + 7 * Math.cos(a)).toFixed(1)},${(Y_LINE + 7 * Math.sin(a)).toFixed(1)}`,
                        `${(x + 3.5 * Math.cos(a2)).toFixed(1)},${(Y_LINE + 3.5 * Math.sin(a2)).toFixed(1)}`,
                      ]
                    }).join(' ')}
                    fill="var(--ink)" opacity={.85}
                  />
                </g>
              )}
              {isSettlEv && (
                <motion.circle
                  key={`settle-dot-${animKey}`}
                  cx={x} cy={Y_LINE} r={7}
                  fill="var(--carbon)"
                  initial={reduced ? { cx: x } : { cx: xs[events.findIndex(e => e.kind === 'payday')] }}
                  animate={{ cx: x }}
                  transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                />
              )}
              {ev.kind === 'round' && !isAsof && (
                <circle cx={x} cy={Y_LINE} r={6} fill="none" stroke="var(--rule)" strokeWidth={1.5} />
              )}

              {/* Label above */}
              {ev.sublabel && (
                <text
                  x={x} y={Y_LINE - 18}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize={11}
                  fill={isAsof ? 'var(--petrol)' : isPayday ? 'var(--ink)' : isSettlEv ? 'var(--carbon)' : 'var(--secondary)'}
                  fontWeight={isAsof || isPayday ? 600 : 400}
                >
                  {ev.sublabel}
                </text>
              )}

              {/* Label below */}
              <text
                x={x} y={Y_LINE + 20}
                textAnchor="middle"
                fontFamily={isPayday || isSettlEv ? 'var(--font-words)' : 'var(--font-mono)'}
                fontSize={isPayday || isSettlEv ? 10 : 12}
                fontWeight={isPayday || isSettlEv ? 600 : 400}
                letterSpacing={isPayday || isSettlEv ? '.06em' : '0'}
                fill={isAsof ? 'var(--petrol)' : isPayday ? 'var(--ink)' : isSettlEv ? 'var(--carbon)' : 'var(--secondary)'}
              >
                {ev.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
