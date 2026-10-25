// Value-time axis: shows round-1, round (petrol ring), round+1, and payday line.
// "The lock" framer-motion sequence plays on payday selection.

import { useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'
import type { RoundData } from '../lib/types'
import { fmtTime, fmtRate, aggRoundId } from '../lib/format'

interface Props {
  paydayTs:   number         // unix seconds
  cur:        { roundId: bigint; answer: bigint; updatedAt: number }
  prev:       RoundData | null
  next:       RoundData | null
  isSelected: boolean        // triggers the lock animation
}

const W = 549
const H = 159
const PAD_L = 4
const PAD_R = 4
const AXIS_Y = 100
const TICK_H = 12
const DOT_R  = 9

function tsToX(ts: number, tMin: number, tMax: number): number {
  return PAD_L + ((ts - tMin) / (tMax - tMin)) * (W - PAD_L - PAD_R)
}

function hourTicks(tMin: number, tMax: number): number[] {
  const ticks: number[] = []
  const start = Math.ceil(tMin / 3600) * 3600
  for (let t = start; t <= tMax; t += 3600) ticks.push(t)
  return ticks
}

export function ValueAxis({ paydayTs, cur, prev, next, isSelected }: Props) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Time range: 10% padding either side
  const allTs = [cur.updatedAt, paydayTs, ...(prev ? [prev.updatedAt] : []), ...(next ? [next.updatedAt] : [])]
  const rawMin = Math.min(...allTs)
  const rawMax = Math.max(...allTs)
  const span = rawMax - rawMin || 3600
  const tMin = rawMin - span * 0.1
  const tMax = rawMax + span * 0.1

  const curX    = tsToX(cur.updatedAt, tMin, tMax)
  const pdX     = tsToX(paydayTs,      tMin, tMax)
  const prevX   = prev ? tsToX(prev.updatedAt, tMin, tMax) : null
  const nextX   = next ? tsToX(next.updatedAt, tMin, tMax) : null
  const ticks   = hourTicks(tMin, tMax)

  // Animation controls
  const ticksCtrl = useAnimation()
  const lineCtrl  = useAnimation()
  const ringCtrl  = useAnimation()

  useEffect(() => {
    if (!isSelected) return
    if (prefersReduced) {
      ticksCtrl.set({ opacity: 1 })
      lineCtrl.set({ scaleY: 1 })
      ringCtrl.set({ scale: 1 })
      return
    }
    const ease = [0.16, 1, 0.3, 1] as [number, number, number, number]
    void (async () => {
      await ticksCtrl.start({ opacity: 1, transition: { duration: 0.12 } })
      await lineCtrl.start({ scaleY: 1, transition: { duration: 0.22, ease } })
      await ringCtrl.start({ scale: 1, transition: { duration: 0.24, ease, type: 'spring', stiffness: 300, damping: 18 } })
    })()
  }, [isSelected, ticksCtrl, lineCtrl, ringCtrl, prefersReduced])

  useEffect(() => {
    ticksCtrl.set({ opacity: prefersReduced ? 1 : 0 })
    lineCtrl.set({ scaleY: prefersReduced ? 1 : 0 })
    ringCtrl.set({ scale: prefersReduced ? 1 : 0.6 })
  }, [cur.roundId, ticksCtrl, lineCtrl, ringCtrl, prefersReduced])

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      {/* Axis line */}
      <line x1={PAD_L} y1={AXIS_Y} x2={W - PAD_R} y2={AXIS_Y}
        stroke="var(--rules)" strokeWidth={1} />

      {/* Hour ticks */}
      <motion.g animate={ticksCtrl} initial={{ opacity: 0 }}>
        {ticks.map(t => {
          const x = tsToX(t, tMin, tMax)
          return (
            <g key={t}>
              <line x1={x} y1={AXIS_Y - TICK_H / 2} x2={x} y2={AXIS_Y + TICK_H / 2}
                stroke="var(--secondary)" strokeWidth={1} />
              <text x={x} y={AXIS_Y + 24} textAnchor="middle"
                fontSize={11} fill="var(--secondary)"
                fontFamily='"Geist Mono", monospace'>
                {fmtTime(t)}
              </text>
            </g>
          )
        })}
      </motion.g>

      {/* Payday line */}
      <motion.line
        x1={pdX} y1={AXIS_Y - 45}
        x2={pdX} y2={AXIS_Y + 8}
        stroke="var(--ink)" strokeWidth={1.5}
        animate={lineCtrl} initial={{ scaleY: 0 }}
        style={{ transformOrigin: `${pdX}px ${AXIS_Y}px` }}
      />
      <text x={pdX} y={AXIS_Y + 45} textAnchor="middle"
        fontSize={11} fill="var(--ink)" fontWeight={500}
        fontFamily='"Radio Canada Big", sans-serif' letterSpacing="0.06em">
        PAYDAY
      </text>
      <text x={pdX} y={AXIS_Y + 58} textAnchor="middle"
        fontSize={11} fill="var(--ink)"
        fontFamily='"Geist Mono", monospace'>
        {fmtTime(paydayTs)}
      </text>

      {/* Prev round */}
      {prev && prevX !== null && (
        <RoundMarker x={prevX} answer={prev.answer} roundId={prev.roundId} updatedAt={prev.updatedAt} current={false} />
      )}

      {/* Next round */}
      {next && nextX !== null && (
        <RoundMarker x={nextX} answer={next.answer} roundId={next.roundId} updatedAt={next.updatedAt} current={false} />
      )}
      {!next && (
        <text x={W - PAD_R} y={AXIS_Y - 20} textAnchor="end"
          fontSize={10} fill="var(--secondary)" fontFamily='"Geist Mono", monospace'>
          next round not yet published
        </text>
      )}

      {/* Current round — petrol ring with lock animation */}
      <motion.g animate={ringCtrl} initial={{ scale: 0.6 }}
        style={{ transformOrigin: `${curX}px ${AXIS_Y}px` }}>
        <circle cx={curX} cy={AXIS_Y} r={DOT_R}
          fill="white" stroke="var(--petrol)" strokeWidth={2.5} />
        {/* Inner fill dot */}
        <circle cx={curX} cy={AXIS_Y} r={4}
          fill="var(--petrol)" />
      </motion.g>
      {/* Label above current round */}
      <text x={curX} y={AXIS_Y - 18} textAnchor="middle"
        fontSize={11} fill="var(--petrol)" fontWeight={500}
        fontFamily='"Geist Mono", monospace'>
        {aggRoundId(cur.roundId).toString()} · {fmtTime(cur.updatedAt)} · {fmtRate(cur.answer)}
      </text>
    </svg>
  )
}

function RoundMarker({ x, answer, roundId, updatedAt, current }: {
  x: number; answer: bigint; roundId: bigint; updatedAt: number; current: boolean
}) {
  return (
    <g>
      <circle cx={x} cy={AXIS_Y} r={DOT_R}
        fill="white"
        stroke={current ? 'var(--petrol)' : 'var(--rules)'}
        strokeWidth={current ? 2.5 : 1.5}
      />
      <text x={x} y={AXIS_Y - 18} textAnchor="middle"
        fontSize={11} fill="var(--secondary)"
        fontFamily='"Geist Mono", monospace'>
        {aggRoundId(roundId).toString()} · {fmtTime(updatedAt)} · {fmtRate(answer)}
      </text>
    </g>
  )
}
