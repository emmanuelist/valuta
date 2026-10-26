// RATE HELD guilloché seal — concentric banknote wave-line rosette
// Dense circular lines around a clear centre disc.  Every radius is
// capped at 85 px so nothing spills outside its container.

import { useMemo } from 'react'
import { aggRoundId } from '../lib/format'

interface Props {
  roundId: bigint
  payday:  number
  /** 'full' = settled (filled), 'outline' = due (strokes only), 'none' = upcoming */
  state:   'full' | 'outline' | 'none'
  size?:   number
}

function hashParam(rid: bigint, payday: number, slot: number): number {
  const v = Number((rid ^ BigInt(payday)) % 100_000n) + slot * 137
  return ((v * 48271) % 99991) / 99991
}

function buildRosette(size: number, roundId: bigint, payday: number) {
  const cx   = size / 2
  const cy   = size / 2
  // hard cap: never exceed 85 px radius regardless of size
  const maxR = Math.min(size * 0.46, 85)
  // centre disc: ~34px at size=171, proportional but min 20px
  const minR = Math.max(20, size * 0.20)

  const h    = (slot: number) => hashParam(aggRoundId(roundId), payday, slot)
  const lineCount = Math.round(40 + h(0) * 50)  // 40–90 wave lines
  const freq1     = 4  + Math.round(h(1) * 6)   // 4–10  primary frequency
  const freq2     = 9  + Math.round(h(2) * 9)   // 9–18  secondary frequency
  const phase     = h(3) * Math.PI * 2
  const amp       = (maxR - minR) * (0.08 + h(4) * 0.10) // 8–18 % of ring
  const sw        = 0.5 + h(5) * 0.25           // 0.5–0.75 px stroke

  const STEPS = 300
  const paths: string[] = []

  for (let li = 0; li < lineCount; li++) {
    const t01    = li / (lineCount - 1)          // 0 → 1 across the ring
    const baseR  = minR + (maxR - minR) * t01
    const phOff  = t01 * Math.PI * 2 * 1.5       // slight phase shift per line

    const pts: string[] = []
    for (let si = 0; si <= STEPS; si++) {
      const theta = (si / STEPS) * Math.PI * 2
      const r     = baseR
        + amp * Math.sin(freq1 * theta + phase + phOff)
        + amp * 0.4 * Math.cos(freq2 * theta - phase)
      const rx = cx + r * Math.cos(theta)
      const ry = cy + r * Math.sin(theta)
      pts.push(si === 0 ? `M${rx.toFixed(1)},${ry.toFixed(1)}` : `L${rx.toFixed(1)},${ry.toFixed(1)}`)
    }
    pts.push('Z')
    paths.push(pts.join(' '))
  }

  return { paths, strokeW: sw, cx, cy, maxR, minR }
}

export function GuillocheSeal({ roundId, payday, state, size = 171 }: Props) {
  const rosette = useMemo(
    () => buildRosette(size, roundId, payday),
    [size, roundId, payday],
  )

  if (state === 'none') return null

  const { paths, strokeW, cx, cy, maxR, minR } = rosette
  const stroke  = '#0B4F6C'
  // lighter lines: 35–55% opacity so the centre text reads clearly
  const opacity = state === 'full' ? 0.52 : 0.38
  const fontSize = Math.round(size * 0.115)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, overflow: 'hidden' }}
    >
      {/* Outer ring fill (settled only) */}
      {state === 'full' && (
        <circle cx={cx} cy={cy} r={maxR + 3} fill="#E3EEF3" opacity={0.45} />
      )}

      {/* Wave lines */}
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeW}
          opacity={opacity}
        />
      ))}

      {/* Outer border ring */}
      <circle cx={cx} cy={cy} r={maxR + 3} fill="none" stroke={stroke} strokeWidth={1} opacity={0.4} />

      {/* Clear centre disc — always paper-white so text reads clearly */}
      <circle
        cx={cx} cy={cy} r={minR - 1}
        fill="var(--paper)"
        stroke={stroke} strokeWidth={0.8} opacity={0.5}
      />

      {/* "RATE HELD" text — two lines centred in the clear disc */}
      <text
        x={cx} y={cy - fontSize * 0.6}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Hanken Grotesk Variable', sans-serif"
        fontWeight={700}
        fontSize={fontSize}
        fill={stroke}
        letterSpacing="0.06em"
      >RATE</text>
      <text
        x={cx} y={cy + fontSize * 0.7}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Hanken Grotesk Variable', sans-serif"
        fontWeight={700}
        fontSize={fontSize}
        fill={stroke}
        letterSpacing="0.06em"
      >HELD</text>
    </svg>
  )
}
