// /lookup — Rate at any moment, live rates board
import { useState, useId } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { arc } from 'viem/chains'
import { VALUTA_ADDRESS, VALUTA_ABI, FEEDS, AGGREGATOR_ABI } from '../contracts/abi'
import { fmtDateTime, fmtRate8, fmtAggRound, fmtRateInverse } from '../lib/format'
import { useNeighbourRoundsForProof } from '../hooks/useAsOfRate'
import { HonestTimeline } from './HonestTimeline'
import type { Payslip, DueQuote, RoundData } from '../lib/types'

const CHAIN_ID = arc.id
const CURRENCIES = Object.keys(FEEDS)
const CURRENCY_NAMES: Record<string, string> = {
  EUR: 'Euro', MXN: 'Mexican peso', BRL: 'Brazilian real', JPY: 'Japanese yen',
  CAD: 'Canadian dollar', AUD: 'Australian dollar', KRW: 'South Korean won', ARS: 'Argentine peso',
}

function toBytes3(c: string): `0x${string}` {
  const codes = Array.from(c.padEnd(3, '\0')).map(ch => ch.charCodeAt(0).toString(16).padStart(2, '0'))
  return (`0x${codes.join('')}` as unknown) as `0x${string}`
}

function toLocalDatetime(ts: number): string {
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

function fmtAge(updatedAt: number, maxAge: number): { text: string; stale: boolean } {
  const age = Math.floor(Date.now() / 1000) - updatedAt
  const stale = age > maxAge
  const h = Math.floor(age / 3600)
  const m = Math.floor((age % 3600) / 60)
  const text = h > 0 ? `${h} h ${m} m ago` : `${m} m ago`
  return { text, stale }
}

// ── Live rates board ──────────────────────────────────────────────────────

function RatesBoard({ maxAge }: { maxAge: number }) {
  const contracts = CURRENCIES.map(c => ({
    address: FEEDS[c].address,
    abi: AGGREGATOR_ABI,
    functionName: 'latestRoundData' as const,
    chainId: CHAIN_ID,
  }))

  const { data, isLoading } = useReadContracts({ contracts })

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 18, color: 'var(--ink)', marginBottom: 14, marginTop: 0 }}>
        Live rates
      </h2>
      <div style={{ border: '1px solid var(--rule)', borderRadius: 6, overflow: 'hidden' }}>
        {CURRENCIES.map((c, i) => {
          const res = data?.[i]
          const r   = res?.status === 'success'
            ? res.result as [bigint, bigint, bigint, bigint, bigint]
            : null
          const roundId  = r ? r[0] : null
          const answer   = r ? r[1] : null
          const updatedAt = r ? Number(r[3]) : 0
          const fi       = FEEDS[c]
          const { text: ageText, stale } = updatedAt > 0 ? fmtAge(updatedAt, maxAge) : { text: '\u2014', stale: false }

          return (
            <div
              key={c}
              style={{
                display: 'flex', alignItems: 'baseline', flexWrap: 'wrap',
                padding: '12px 16px', gap: '6px 16px',
                borderBottom: i < CURRENCIES.length - 1 ? '1px solid var(--rule)' : 'none',
                background: i % 2 === 0 ? 'var(--paper)' : 'var(--ground)',
              }}
            >
              {/* Name + code */}
              <div style={{ minWidth: 160, flex: '1 1 160px' }}>
                <span style={{ fontFamily: 'var(--font-words)', fontSize: 14, color: 'var(--ink)' }}>
                  {CURRENCY_NAMES[c] ?? c}
                </span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--secondary)', marginLeft: 6 }}>{c}</span>
                {fi.inverse && <span className="mono" style={{ fontSize: 11, color: 'var(--secondary)', marginLeft: 6 }}>(inverse)</span>}
              </div>

              {/* Rate */}
              <div style={{ minWidth: 160, flex: '1 1 160px' }}>
                {isLoading ? (
                  <div className="skeleton" style={{ width: 120, height: 14 }} />
                ) : answer !== null ? (
                  <span className="mono" style={{ fontSize: 14, color: 'var(--ink)' }}>
                    {fmtRate8(answer)}
                    <span style={{ color: 'var(--secondary)', fontSize: 12 }}>
                      {' '}&asymp;{' '}{fmtRateInverse(answer)} {c} per USD
                    </span>
                  </span>
                ) : (
                  <span style={{ color: 'var(--secondary)', fontSize: 13 }}>No data</span>
                )}
              </div>

              {/* Round */}
              <div style={{ minWidth: 80 }}>
                {roundId !== null && (
                  <span className="mono" style={{ fontSize: 12, color: 'var(--secondary)' }}>
                    round {fmtAggRound(roundId)}
                  </span>
                )}
              </div>

              {/* Published + age */}
              <div style={{ flex: '1 1 140px', textAlign: 'right' }}>
                {updatedAt > 0 && (
                  <>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--secondary)' }}>
                      {fmtDateTime(updatedAt)} UTC
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 12, marginLeft: 8, color: stale ? 'var(--amber)' : 'var(--secondary)' }}
                    >
                      {ageText}
                    </span>
                    {stale && (
                      <span style={{ display: 'block', fontFamily: 'var(--font-words)', fontSize: 11, color: 'var(--amber)' }}>
                        stale: a payday now would price at the next round
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export function LookupPage() {
  const uid = useId()
  const [currency,  setCurrency]  = useState('MXN')
  const [dateTime,  setDateTime]  = useState(() => toLocalDatetime(Date.now() / 1000 - 3600))
  const [showResult, setShowResult] = useState(false)

  const ts = dateTime ? Math.floor(new Date(dateTime + 'Z').getTime() / 1000) : 0
  const currencyBytes: `0x${string}` = currency ? toBytes3(currency) : '0x4d584e'

  const [nowTs] = useState(() => Math.floor(Date.now() / 1000))

  // Presets
  const presets = [
    { label: 'Now',                fn: () => toLocalDatetime(nowTs) },
    { label: '1 hour ago',         fn: () => toLocalDatetime(nowTs - 3600) },
    { label: 'Yesterday 14:00',    fn: () => toLocalDatetime(nowTs - 86400 - ((nowTs - 14*3600) % 86400)) },
    { label: 'MXN/USD 15 Oct 2026 14:00 UTC', fn: () => '2026-10-15T14:00' },
  ]

  const { data, isLoading, isError } = useReadContract({
    address: VALUTA_ADDRESS, abi: VALUTA_ABI,
    functionName: 'asOf',
    args: [currencyBytes, BigInt(ts)],
    chainId: CHAIN_ID,
    query: { enabled: ts > 0 && showResult },
  })

  // maxAge from contract
  const { data: maxAgeData } = useReadContract({
    address: VALUTA_ADDRESS, abi: VALUTA_ABI,
    functionName: 'maxAge',
    chainId: CHAIN_ID,
  })
  const maxAge = maxAgeData ? Number(maxAgeData) : 90_000

  const result = data as [bigint, bigint, bigint] | undefined
  const roundId   = result?.[0] ?? null
  const answer    = result?.[1] ?? 0n
  const updatedAt = result?.[2] ? Number(result[2]) : 0

  const { prev, next } = useNeighbourRoundsForProof(showResult ? currency : '', roundId)

  // Build fake payslip/dueQuote shapes for HonestTimeline
  const pseudoPayslip: Payslip | null = (showResult && roundId && updatedAt > 0) ? {
    index: 0, payday: ts, roundUpdatedAt: updatedAt, settledAt: 0, settledBlock: 0n,
    roundId, settler: '0x0000000000000000000000000000000000000000',
    answer: answer, usdc: 0n, paid: 0n, credited: 0n,
  } : null

  const pseudoDueQuote: DueQuote | null = null

  // Three proof facts
  const nextRoundData: RoundData | null = next ?? null
  const factPaydayLive = pseudoPayslip
    ? pseudoPayslip.roundUpdatedAt <= pseudoPayslip.payday
    : null
  const factNextCameAt = nextRoundData
    ? (nextRoundData.updatedAt > 0 ? `Round ${fmtAggRound(nextRoundData.roundId)} came at ${fmtDateTime(nextRoundData.updatedAt)} UTC` : 'No newer round yet')
    : null
  const factAge = pseudoPayslip && pseudoPayslip.roundUpdatedAt > 0
    ? (() => {
        const ageMin = Math.round(Math.abs(pseudoPayslip.payday - pseudoPayslip.roundUpdatedAt) / 60)
        const maxH   = Math.round(maxAge / 3600)
        if (pseudoPayslip.roundUpdatedAt > pseudoPayslip.payday) {
          return `Stale fallback: next round published ${ageMin} min after chosen time`
        }
        const ageH = ageMin >= 60 ? `${Math.round(ageMin/60)} h` : `${ageMin} min`
        return `${ageH} old at the chosen time, inside the ${maxH} h window`
      })()
    : null

  const handleLookup = () => setShowResult(true)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(16px,2vw,40px)' }}>
      <h1 style={{ fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 28, color: 'var(--ink)', marginBottom: 6, marginTop: 0 }}>
        Rate at any moment
      </h1>
      <p style={{ color: 'var(--secondary)', fontSize: 15, marginBottom: 28, fontFamily: 'var(--font-words)' }}>
        Find which Chainlink round was live at a specific UTC time, and see its neighbours.
      </p>

      {/* Input row */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            htmlFor={`${uid}-cur`}
            style={{ fontFamily: 'var(--font-words)', fontSize: 12, fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}
          >
            Currency
          </label>
          <select
            id={`${uid}-cur`} value={currency}
            onChange={e => { setCurrency(e.target.value); setShowResult(false) }}
            className="form-input" style={{ width: 160 }}
          >
            {CURRENCIES.map(c => (
              <option key={c} value={c}>{CURRENCY_NAMES[c] ?? c} ({c})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            htmlFor={`${uid}-dt`}
            style={{ fontFamily: 'var(--font-words)', fontSize: 12, fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '.05em' }}
          >
            Chosen time (UTC)
          </label>
          <input
            id={`${uid}-dt`} type="datetime-local" value={dateTime}
            onChange={e => { setDateTime(e.target.value); setShowResult(false) }}
            className="form-input" style={{ width: 240 }}
          />
        </div>

        <button
          onClick={handleLookup}
          disabled={!ts || isLoading}
          style={{
            background: 'var(--petrol)', color: '#fff', border: 'none', borderRadius: 6,
            padding: '0 22px', height: 40, cursor: ts ? 'pointer' : 'not-allowed', minHeight: 44,
            fontFamily: 'var(--font-words)', fontWeight: 500, fontSize: 15,
            opacity: (!ts || isLoading) ? 0.55 : 1,
          }}
        >
          {isLoading ? 'Looking up\u2026' : 'Look up'}
        </button>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
        {presets.map(({ label, fn }) => (
          <button
            key={label}
            type="button"
            onClick={() => { setDateTime(fn()); setCurrency(label.startsWith('MXN') ? 'MXN' : currency); setShowResult(false) }}
            style={{
              fontFamily: 'var(--font-words)', fontSize: 12, color: 'var(--petrol)',
              background: 'var(--ptint)', border: '1px solid var(--petrol)',
              borderRadius: 4, padding: '5px 12px', cursor: 'pointer', minHeight: 36,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Result */}
      {showResult && (
        <div style={{ marginBottom: 40 }} aria-live="polite">
          {isError && (
            <p style={{ color: 'var(--void)', fontSize: 14, fontFamily: 'var(--font-words)' }}>
              Failed to look up rate. Try again.
            </p>
          )}
          {!isLoading && !isError && !roundId && (
            <p style={{ color: 'var(--secondary)', fontSize: 14, fontFamily: 'var(--font-words)' }}>
              No round data for that time. The feed may not have existed yet.
            </p>
          )}
          {pseudoPayslip && roundId !== null && roundId > 0n && (
            <div>
              <div
                style={{
                  background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 6,
                  padding: '18px 22px', marginBottom: 20, boxShadow: 'var(--shadow-paper)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--secondary)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                  {currency} at {fmtDateTime(ts)} UTC &mdash; chosen time
                </div>
                <div className="mono" style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 300, color: 'var(--carbon)', lineHeight: 1, marginBottom: 8 }}>
                  {fmtRate8(answer)}
                  <span className="mono" style={{ fontSize: '0.6em', color: 'var(--secondary)', marginLeft: 8 }}>
                    {currency}/USD
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 13, color: 'var(--secondary)', marginBottom: 12 }}>
                  &asymp; {fmtRateInverse(answer)} {currency} per USD &nbsp;&middot;&nbsp;
                  round {fmtAggRound(roundId)} &nbsp;&middot;&nbsp;
                  published {fmtDateTime(updatedAt)} UTC
                </div>

                {/* Three facts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--rule)', paddingTop: 10 }}>
                  {[
                    factPaydayLive !== null
                      ? (factPaydayLive
                          ? `Round ${fmtAggRound(roundId)} was live at the chosen time`
                          : `Stale fallback: round published after the chosen time`)
                      : null,
                    factNextCameAt,
                    factAge,
                  ].filter(Boolean).map((f, i) => (
                    <div key={i} className="mono" style={{ fontSize: 13, color: 'var(--ink)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--petrol)', flexShrink: 0 }}>&bull;</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div style={{ marginBottom: 32 }}>
                <HonestTimeline
                  payslip={pseudoPayslip}
                  dueQuote={pseudoDueQuote}
                  prev={prev ?? null}
                  next={nextRoundData}
                  animKey={ts}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rates board */}
      <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 32 }}>
        <RatesBoard maxAge={maxAge} />
      </div>
    </div>
  )
}
