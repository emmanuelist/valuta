// HonestTimeline — log-proportional spacing, scaled to fill available width
import { useReducedMotion, motion } from 'framer-motion'
import type { RoundData, Payslip, DueQuote } from '../lib/types'
import { fmtTime, fmtDate, fmtAggRound } from '../lib/format'

interface Props {
  payslip:  Payslip | null
  dueQuote: DueQuote | null
  prev:     RoundData | null
  next:     RoundData | null
  animKey:  number
  /** When true, renders vertically (phone layout) */
  vertical?: boolean
}

const HEIGHT      = 80
const Y_LINE      = 40
const BREAK_GAP   = 24 * 3600
const MIN_PX      = 80
const LEFT_PAD    = 50
const RIGHT_PAD   = 50
// The target total width is the container width; we scale to fit.
const TARGET_W    = 1213

interface Event {
  id:       string
  ts:       number
  kind:     'round' | 'asof' | 'payday' | 'settlement'
  label:    string
  sublabel?: string
}

function gapToPx(gapSec: number): number {
  return MIN_PX + Math.log1p(gapSec / 60) * 18
}

export function HonestTimeline({ payslip, dueQuote, prev, next, animKey, vertical }: Props) {
  const reduced = useReducedMotion()

  const roundId    = payslip?.roundId ?? dueQuote?.roundId
  const roundUpdAt = payslip?.roundUpdatedAt ?? dueQuote?.roundUpdatedAt
  const paydayTs   = payslip?.payday ?? dueQuote?.payday
  const settledTs  = payslip?.settledAt
  const isSettled  = !!payslip

  if (!paydayTs || !roundUpdAt || !roundId) {
    return (
      <div style={{ height: HEIGHT, display: 'flex', alignItems: 'center', paddingLeft: LEFT_PAD }}>
        <div className="skeleton" style={{ width: '70%', height: 12 }} />
      </div>
    )
  }

  // Build events
  const events: Event[] = []

  if (prev) {
    events.push({ id: 'prev', ts: prev.updatedAt, kind: 'round', label: fmtAggRound(prev.roundId) })
  }
  events.push({ id: 'asof',   ts: roundUpdAt, kind: 'asof',   label: fmtAggRound(roundId), sublabel: fmtTime(roundUpdAt) })
  events.push({ id: 'payday', ts: paydayTs,   kind: 'payday', label: 'VALUE DATE',          sublabel: fmtTime(paydayTs) })
  if (next && next.updatedAt > 0) {
    events.push({ id: 'next', ts: next.updatedAt, kind: 'round', label: fmtAggRound(next.roundId), sublabel: fmtTime(next.updatedAt) })
  } else {
    events.push({ id: 'next', ts: paydayTs + 3600, kind: 'round', label: '\u2014', sublabel: 'No newer round' })
  }
  if (isSettled && settledTs) {
    events.push({ id: 'settlement', ts: settledTs, kind: 'settlement', label: 'SETTLED', sublabel: fmtDate(settledTs) })
  }

  // Compute raw x positions
  const rawXs: number[] = [LEFT_PAD]
  for (let i = 1; i < events.length; i++) {
    const gapSec   = Math.max(1, events[i].ts - events[i - 1].ts)
    const isSettlEv = events[i].kind === 'settlement'
    const showBreak = isSettlEv && gapSec > BREAK_GAP
    const px = showBreak ? gapToPx(gapSec) * 0.55 : gapToPx(gapSec)
    rawXs.push(rawXs[i - 1] + px)
  }

  // Scale so first event is at LEFT_PAD and last is at TARGET_W - RIGHT_PAD
  const rawSpan   = rawXs[rawXs.length - 1] - rawXs[0]
  const targetSpan = TARGET_W - LEFT_PAD - RIGHT_PAD
  const scale = rawSpan > 0 ? targetSpan / rawSpan : 1
  const xs = rawXs.map(x => LEFT_PAD + (x - LEFT_PAD) * scale)

  const totalWidth = TARGET_W

  // Vertical mode (phone)
  if (vertical) {
    const ROW_H = 52
    const totalVH = events.length * ROW_H
    return (
      <div
        style={{ width: '100%', overflowX: 'hidden' }}
        role="img"
        aria-label={`Timeline: ${events.map(e => `${e.label}${e.sublabel ? ' ' + e.sublabel : ''}`).join(', ')}`}
      >
        <svg width="100%" height={totalVH} viewBox={`0 0 260 ${totalVH}`} preserveAspectRatio="xMinYMin meet">
          {/* Vertical line */}
          <line x1={30} y1={10} x2={30} y2={totalVH - 10} stroke="var(--rule)" strokeWidth={1.5} />
          {events.map((ev, i) => {
            const y     = 10 + i * ROW_H + ROW_H / 2
            const isAsof = ev.kind === 'asof'; const isPayday = ev.kind === 'payday'; const isSettlEv = ev.kind === 'settlement'
            const col = isAsof ? 'var(--petrol)' : isPayday ? 'var(--ink)' : isSettlEv ? 'var(--carbon)' : 'var(--secondary)'
            return (
              <g key={ev.id}>
                {isAsof && (<><circle cx={30} cy={y} r={9} fill="none" stroke="var(--petrol)" strokeWidth={2} /><circle cx={30} cy={y} r={4} fill="var(--petrol)" /></>)}
                {isPayday && (<circle cx={30} cy={y} r={9} fill="none" stroke="var(--ink)" strokeWidth={1.5} />)}
                {isSettlEv && (<motion.circle key={`vs-${animKey}`} cx={30} cy={y} r={6} fill="var(--carbon)" initial={reduced ? {} : { cy: 10 + events.findIndex(e=>e.kind==='payday') * ROW_H + ROW_H/2 }} animate={{ cy: y }} transition={{ duration: reduced ? 0 : 0.45, ease: [0.22,1,0.36,1] }} />)}
                {ev.kind === 'round' && !isAsof && (<circle cx={30} cy={y} r={5} fill="none" stroke="var(--rule)" strokeWidth={1.5} />)}
                <text x={46} y={y - 7} fontFamily="var(--font-words)" fontSize={12} fontWeight={600} fill={col}>{ev.label}</text>
                {ev.sublabel && (<text x={46} y={y + 8} fontFamily="var(--font-mono)" fontSize={11} fill="var(--secondary)">{ev.sublabel}</text>)}
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  // Horizontal mode
  return (
    <div
      style={{ width: '100%', overflowX: 'auto', scrollbarWidth: 'thin' }}
      role="img"
      aria-label={`Timeline: ${events.map(e => `${e.label}${e.sublabel ? ' ' + e.sublabel : ''}`).join(', ')}`}
    >
      <svg
        width={totalWidth}
        height={HEIGHT}
        style={{ display: 'block', minWidth: totalWidth }}
        preserveAspectRatio="xMinYMid meet"
      >
        {/* Baseline */}
        <line
          x1={xs[0]} y1={Y_LINE}
          x2={xs[xs.length - 1] + (isSettled ? 0 : 20)} y2={Y_LINE}
          stroke="var(--rule)" strokeWidth={1.5}
        />

        {events.map((ev, i) => {
          const x = xs[i]
          const isAsof    = ev.kind === 'asof'
          const isPayday  = ev.kind === 'payday'
          const isSettlEv = ev.kind === 'settlement'
          const prevTs    = events[i - 1]?.ts ?? 0
          const showBreak = isSettlEv && (ev.ts - prevTs) > BREAK_GAP
          const col = isAsof ? 'var(--petrol)' : isPayday ? 'var(--ink)' : isSettlEv ? 'var(--carbon)' : 'var(--secondary)'

          return (
            <g key={ev.id}>
              {showBreak && (
                <text x={x - 32} y={Y_LINE + 5} fontFamily="var(--font-mono)" fontSize={13} fill="var(--secondary)" opacity={.6}>//</text>
              )}

              {isAsof && (
                <>
                  <circle cx={x} cy={Y_LINE} r={10} fill="none" stroke="var(--petrol)" strokeWidth={2} />
                  <circle cx={x} cy={Y_LINE} r={5}  fill="var(--petrol)" />
                </>
              )}
              {isPayday && (
                <>
                  <circle cx={x} cy={Y_LINE} r={12} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
                  <polygon
                    points={[0,1,2,3,4].flatMap(k => {
                      const a  = (k * 72 - 90) * Math.PI / 180
                      const a2 = (k * 72 - 90 + 36) * Math.PI / 180
                      return [`${(x + 7 * Math.cos(a)).toFixed(1)},${(Y_LINE + 7 * Math.sin(a)).toFixed(1)}`, `${(x + 3.5 * Math.cos(a2)).toFixed(1)},${(Y_LINE + 3.5 * Math.sin(a2)).toFixed(1)}`]
                    }).join(' ')}
                    fill="var(--ink)" opacity={.85}
                  />
                </>
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

              {ev.sublabel && (
                <text x={x} y={Y_LINE - 18} textAnchor="middle"
                  fontFamily="var(--font-mono)" fontSize={11}
                  fill={col} fontWeight={isAsof || isPayday ? 600 : 400}
                >{ev.sublabel}</text>
              )}
              <text x={x} y={Y_LINE + 20} textAnchor="middle"
                fontFamily={isPayday || isSettlEv ? 'var(--font-words)' : 'var(--font-mono)'}
                fontSize={isPayday || isSettlEv ? 10 : 12}
                fontWeight={isPayday || isSettlEv ? 600 : 400}
                letterSpacing={isPayday || isSettlEv ? '.06em' : '0'}
                fill={col}
              >{ev.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
