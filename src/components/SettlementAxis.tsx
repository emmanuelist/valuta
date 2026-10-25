// Settlement time axis: payday + axis break + settledAt (vermilion dot)
// The marker travels from payday position to settledAt on selection.

import { useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { fmtTime, fmtDate } from '../lib/format'

interface Props {
  paydayTs:   number
  settledAt:  number
  isSelected: boolean
}

const W = 549
const H = 92
const PAD   = 4
const AXIS_Y = 50
const BREAK_W = 16   // width of axis break symbol

function segmentedX(ts: number, paydayTs: number, settledAt: number, W: number): number {
  // Left segment: covers ±3h around paydayTs (3h before to 3h after)
  // Right segment: covers settledAt ±1h
  const leftMin  = paydayTs - 3 * 3600
  const leftMax  = paydayTs + 3 * 3600
  const rightMin = settledAt - 1 * 3600
  const rightMax = settledAt + 1 * 3600

  const leftEnd  = (W - PAD * 2) * 0.45 + PAD
  const rightStart = leftEnd + BREAK_W + 4
  const rightEnd   = W - PAD

  if (ts <= leftMax) {
    const frac = (ts - leftMin) / (leftMax - leftMin)
    return PAD + frac * (leftEnd - PAD)
  }
  const frac = (ts - rightMin) / (rightMax - rightMin)
  return rightStart + frac * (rightEnd - rightStart)
}

export function SettlementAxis({ paydayTs, settledAt, isSelected }: Props) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const pdX = segmentedX(paydayTs,  paydayTs, settledAt, W)
  const stX = segmentedX(settledAt, paydayTs, settledAt, W)
  const leftEnd   = (W - PAD * 2) * 0.45 + PAD
  const rightStart = leftEnd + BREAK_W + 4

  const dotCtrl = useAnimation()

  useEffect(() => {
    if (!isSelected) return
    if (prefersReduced) {
      dotCtrl.set({ x: 0, opacity: 1 })
      return
    }
    void dotCtrl.start({
      x: [pdX - stX, 0],
      opacity: [0.6, 1],
      transition: {
        duration: 0.42,
        ease: [0.16, 1, 0.3, 1],
      },
    })
  }, [isSelected, dotCtrl, pdX, stX, prefersReduced])

  useEffect(() => {
    dotCtrl.set({ x: pdX - stX, opacity: prefersReduced ? 1 : 0.6 })
  }, [paydayTs, settledAt, dotCtrl, pdX, stX, prefersReduced])

  // Hour ticks for payday day
  const dayStart = Math.floor(paydayTs / 86400) * 86400
  const ticks: number[] = []
  for (let t = dayStart; t <= dayStart + 86400; t += 3600) ticks.push(t)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      {/* Left segment axis */}
      <line x1={PAD} y1={AXIS_Y} x2={leftEnd} y2={AXIS_Y}
        stroke="var(--rules)" strokeWidth={1} />

      {/* Axis break // */}
      <text x={leftEnd + BREAK_W / 2} y={AXIS_Y + 4} textAnchor="middle"
        fontSize={13} fill="var(--secondary)"
        fontFamily='"Geist Mono", monospace'>
        //
      </text>

      {/* Right segment axis */}
      <line x1={rightStart} y1={AXIS_Y} x2={W - PAD} y2={AXIS_Y}
        stroke="var(--rules)" strokeWidth={1} />

      {/* Hour ticks on left */}
      {ticks.filter(t => {
        const x = segmentedX(t, paydayTs, settledAt, W)
        return x > PAD && x < leftEnd
      }).map(t => (
        <g key={t}>
          <line x1={segmentedX(t, paydayTs, settledAt, W)} y1={AXIS_Y - 5}
            x2={segmentedX(t, paydayTs, settledAt, W)} y2={AXIS_Y + 5}
            stroke="var(--secondary)" strokeWidth={1} />
          <text x={segmentedX(t, paydayTs, settledAt, W)} y={AXIS_Y + 18}
            textAnchor="middle" fontSize={10} fill="var(--secondary)"
            fontFamily='"Geist Mono", monospace'>
            {fmtTime(t)}
          </text>
        </g>
      ))}

      {/* Right tick at settledAt */}
      <line x1={stX} y1={AXIS_Y - 5} x2={stX} y2={AXIS_Y + 5}
        stroke="var(--secondary)" strokeWidth={1} />
      <text x={stX} y={AXIS_Y + 18} textAnchor="middle" fontSize={10} fill="var(--secondary)"
        fontFamily='"Geist Mono", monospace'>
        {fmtDate(settledAt)} {fmtTime(settledAt)}
      </text>

      {/* Vermilion dot at settledAt, animated from payday */}
      <motion.g animate={dotCtrl} initial={{ x: pdX - stX, opacity: 0.6 }}
        style={{ originX: `${stX}px`, originY: `${AXIS_Y}px` }}>
        <circle cx={stX} cy={AXIS_Y} r={7}
          fill="var(--vermilion)" />
        {/* Label above */}
        <text x={stX} y={AXIS_Y - 14} textAnchor="end"
          fontSize={11} fill="var(--vermilion)"
          fontFamily='"Geist Mono", monospace'>
          settled {fmtDate(settledAt)} {fmtTime(settledAt)}
        </text>
        <text x={stX} y={AXIS_Y - 3} textAnchor="end"
          fontSize={10} fill="var(--vermilion)"
          fontFamily='"Geist Mono", monospace'>
          {(() => {
            const delta = settledAt - paydayTs
            const days  = Math.floor(delta / 86400)
            const hours = Math.floor((delta % 86400) / 3600)
            const mins  = Math.floor((delta % 3600) / 60)
            if (delta <= 15 * 60) return 'on time'
            if (days >= 1)  return `${days} days later`
            if (hours >= 1) return `${hours}h later`
            return `${mins}m later`
          })()}
        </text>
      </motion.g>
    </svg>
  )
}
