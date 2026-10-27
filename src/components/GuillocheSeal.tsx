// GuillocheSeal — Seal A: notary seal (builder's choice, 2026-10-26)
// Double ring, arc ring-text from the payslip's own reads, N-petal
// hypotrochoid woven band deterministic on roundId+payday, brand centre.
// viewBox: -90 -90 180 180 — all geometry in that space.
// Sized to 171px on desktop, 96px on phones.

import { useMemo } from 'react'
import { fmtAggRound } from '../lib/format'

interface Props {
  roundId: bigint
  payday:  number
  /** 'full' = settled, 'outline' = due (no woven band), 'none' = upcoming */
  state:   'full' | 'outline' | 'none'
  size?:   number
}

const P = '#0B4F6C'

// ── Deterministic hash ──────────────────────────────────────────────────────
function hashBits(roundId: bigint, payday: number): number[] {
  // Mix roundId low 32 bits with payday seconds
  const a = Number(roundId & 0xFFFFFFFFn)
  const b = payday & 0xFFFFFFFF
  const bits: number[] = []
  for (let i = 0; i < 8; i++) {
    const v = ((a ^ (b << i) ^ (b >> (32 - i))) * 1_664_525 + 1_013_904_223) & 0xFFFFFFFF
    bits.push(((v >>> 0) % 1000) / 1000)
  }
  return bits
}

// ── Hypotrochoid path ───────────────────────────────────────────────────────
// x = (R-r)cos t + d cos(((R-r)/r) t)
// y = (R-r)sin t - d sin(((R-r)/r) t)
// turns = r / gcd(R, r)  (where R, r are integers — we use R=58, r=58/N)
// Since r = 58/N and N is integer, r is rational; to get integer turns we use
// turns = N / gcd(N, 1) = N, so we loop for N full turns of t, ~1600 steps.
function trochPath(R: number, N: number, d: number, steps = 1600): string {
  const r = R / N
  const k = (R - r) / r
  const turns = N
  let s = ''
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI * turns
    const x = (R - r) * Math.cos(t) + d * Math.cos(k * t)
    const y = (R - r) * Math.sin(t) - d * Math.sin(k * t)
    s += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2)
  }
  return s
}

// ── Date formatting for ring text ───────────────────────────────────────────
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
function sealDate(ts: number): string {
  const d = new Date(ts * 1000)
  const dd  = String(d.getUTCDate()).padStart(2, '0')
  const mon = MONTHS[d.getUTCMonth()]
  const yr  = d.getUTCFullYear()
  return `${dd} ${mon} ${yr}`
}
function sealTime(ts: number): string {
  const d = new Date(ts * 1000)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function GuillocheSeal({ roundId, payday, state, size = 171 }: Props) {
  // Hash → N, copies, d
  const [N, copies, d] = useMemo(() => {
    const h = hashBits(roundId, payday)
    const nVal  = 14 + Math.round(h[0] * 6)     // 14–20
    const cpVal = 4  + Math.round(h[1] * 2)      // 4–6
    const dVal  = 8  + Math.round(h[2] * 3)      // 8–11
    return [nVal, cpVal, dVal]
  }, [roundId, payday])

  // Trochoid paths — only for full state
  const trochPaths = useMemo(() => {
    if (state !== 'full') return []
    const base = trochPath(58, N, d)
    const paths: string[] = []
    for (let k = 0; k < copies; k++) {
      paths.push(base) // each copy is rotated via a <g transform="rotate(...)">
    }
    return paths
  }, [state, N, copies, d])

  if (state === 'none') return null

  const round = fmtAggRound(roundId)
  const dateStr = sealDate(payday)
  const timeStr = sealTime(payday)
  const isDue = state === 'outline'
  const ringText = isDue
    ? `RATE FIXED · ROUND ${round} · VALUE ${dateStr} · ${timeStr} UTC · `
    : `RATE HELD · CHAINLINK ROUND ${round} · VALUE ${dateStr} · ${timeStr} UTC · `

  // Skip ring text on very small seals (< 120px) — too small to read
  const showRingText = size >= 120

  // Scale: the reference uses a 180×180 viewBox (-90..90).
  // We render at `size` × `size` with viewBox="-90 -90 180 180".
  return (
    <svg
      width={size}
      height={size}
      viewBox="-90 -90 180 180"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
    >
      <defs>
        {/* Arc path for ring text — full circle r=77 */}
        <path
          id={`ring-${String(roundId)}-${payday}`}
          d="M -77 0 A 77 77 0 1 1 77 0 A 77 77 0 1 1 -77 0"
        />
      </defs>

      {/* Outer ring */}
      <circle r={86} fill="none" stroke={P} strokeWidth={1.4} />

      {/* Inner ring */}
      <circle r={68} fill="none" stroke={P} strokeWidth={0.8} />

      {/* Ring text — settled and due, at full size */}
      {showRingText && (
        <text
          fill={P}
          fontFamily="'Spline Sans Mono Variable', 'Spline Sans Mono', monospace"
          fontSize={8.6}
          letterSpacing="1.6"
        >
          <textPath href={`#ring-${String(roundId)}-${payday}`}>
            {ringText}
          </textPath>
        </text>
      )}

      {/* Woven band — settled only */}
      {state === 'full' && trochPaths.map((path, k) => (
        <g key={k} transform={`rotate(${((k * 360) / N / copies).toFixed(3)})`}>
          <path
            d={path}
            fill="none"
            stroke={P}
            strokeWidth={0.45}
            opacity={0.55}
          />
        </g>
      ))}

      {/* White centre disc */}
      <circle r={30} fill="var(--paper)" />

      {/* Brand: track stubs */}
      <path
        d="M -24 0 H -16 M 16 0 H 24"
        stroke={P}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.6}
      />

      {/* Brand: ring */}
      <circle r={11} fill="none" stroke={P} strokeWidth={3} />

      {/* Brand: dot */}
      <circle r={4.4} fill={P} />
    </svg>
  )
}
