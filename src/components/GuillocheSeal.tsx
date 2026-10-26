// RATE HELD guilloché seal — generative SVG rosette
// Parameters are derived from a hash of (roundId, payday) so every payslip's seal is unique.

import { useMemo } from 'react'
import { aggRoundId } from '../lib/format'

interface Props {
  roundId: bigint
  payday:  number
  /** 'full' = settled (filled), 'outline' = due (strokes only), 'none' = upcoming */
  state:   'full' | 'outline' | 'none'
  size?:   number
}

/** Simple deterministic hash: produces a number in [0,1) */
function hashParam(rid: bigint, payday: number, slot: number): number {
  const v = Number((rid ^ BigInt(payday)) % 100_000n) + slot * 137
  return ((v * 48271) % 99991) / 99991
}

function buildPaths(size: number, roundId: bigint, payday: number) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.44
  const innerR = size * 0.24
  const h = (slot: number) => hashParam(aggRoundId(roundId), payday, slot)
  const loops1 = 5  + Math.round(h(0) * 4)
  const loops2 = 11 + Math.round(h(1) * 6)
  const r1     = 28 + h(2) * 10
  const r2     = 18 + h(3) * 8
  const phase  = h(4) * Math.PI * 2
  const sw     = 0.65 + h(5) * 0.35

  const steps = 360
  const outer: string[] = []
  const inner: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const rO = outerR + r1 * Math.sin(loops1 * t + phase) + r2 * Math.cos(loops2 * t)
    const rI = innerR + (r1 * 0.4) * Math.sin(loops2 * t - phase)
    const xO = cx + rO * Math.cos(t)
    const yO = cy + rO * Math.sin(t)
    const xI = cx + rI * Math.cos(t)
    const yI = cy + rI * Math.sin(t)
    outer.push(i === 0 ? `M ${xO.toFixed(2)} ${yO.toFixed(2)}` : `L ${xO.toFixed(2)} ${yO.toFixed(2)}`)
    inner.push(i === 0 ? `M ${xI.toFixed(2)} ${yI.toFixed(2)}` : `L ${xI.toFixed(2)} ${yI.toFixed(2)}`)
  }
  outer.push('Z')
  inner.push('Z')
  return { wavePath: outer.join(' '), innerPath: inner.join(' '), strokeW: sw, cx, cy, outerR, innerR }
}

export function GuillocheSeal({ roundId, payday, state, size = 171 }: Props) {
  // All computation in one memoised call — hooks are always called, never conditional
  const paths = useMemo(
    () => buildPaths(size, roundId, payday),
    [size, roundId, payday],
  )

  if (state === 'none') return null

  const { wavePath, innerPath, strokeW, cx, cy, outerR, innerR } = paths
  const stroke = '#0B4F6C'
  const fillOpacity = state === 'full' ? 0.05 : 0

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ overflow: 'visible', flexShrink: 0 }}
    >
      {state === 'full' && (
        <circle cx={cx} cy={cy} r={outerR + 4} fill="#E3EEF3" opacity={0.4} />
      )}
      <circle cx={cx} cy={cy} r={outerR + 6} fill="none" stroke={stroke} strokeWidth={1} opacity={0.4} />
      <path d={wavePath} fill={state === 'full' ? stroke : 'none'}
        fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeW} opacity={0.75} />
      <circle cx={cx} cy={cy} r={innerR + 4} fill="none" stroke={stroke} strokeWidth={0.8} opacity={0.5} />
      <path d={innerPath} fill="none" stroke={stroke} strokeWidth={strokeW * 0.7} opacity={0.5} />
      <circle cx={cx} cy={cy} r={innerR - 4}
        fill={state === 'full' ? '#E3EEF3' : 'none'}
        stroke={stroke} strokeWidth={1} opacity={0.6} />
      <text
        x={cx} y={cy - 5}
        textAnchor="middle"
        fontFamily="'Hanken Grotesk Variable', sans-serif"
        fontWeight={700}
        fontSize={size * 0.11}
        fill={stroke}
        letterSpacing="0.08em"
      >RATE</text>
      <text
        x={cx} y={cy + size * 0.12}
        textAnchor="middle"
        fontFamily="'Hanken Grotesk Variable', sans-serif"
        fontWeight={700}
        fontSize={size * 0.11}
        fill={stroke}
        letterSpacing="0.08em"
      >HELD</text>
    </svg>
  )
}
