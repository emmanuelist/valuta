// PayrollRegister — "Every payroll"
// A ruled table of all payrolls with live dueCount and nextPayday reads.
// Includes a payday strip using semantic state colours.
import { useMemo } from 'react'
import { useReadContracts } from 'wagmi'
import { arc } from 'viem/chains'
import type { Payroll } from '../lib/types'
import { fmtUsdc, fmtSalary, fmtDate, fmtTime } from '../lib/format'
import { VALUTA_ADDRESS, VALUTA_ABI } from '../contracts/abi'

const CHAIN_ID = arc.id

const CURRENCY_NAMES: Record<string, string> = {
  MXN: 'Mexican peso MXN',
  BRL: 'Brazilian real BRL',
  EUR: 'Euro EUR',
  JPY: 'Japanese yen JPY',
  CAD: 'Canadian dollar CAD',
  AUD: 'Australian dollar AUD',
  KRW: 'Korean won KRW',
  ARS: 'Argentine peso ARS',
}

function periodLabel(period: number): string {
  if (period === 86400)     return 'daily'
  if (period === 7 * 86400) return 'weekly'
  if (period < 3600)        return `every ${Math.round(period / 60)} min`
  if (period < 86400)       return `every ${Math.round(period / 3600)} h`
  return `every ${Math.round(period / 86400)} d`
}

function paydayTime(start: number, _period: number): string {
  const d = new Date(start * 1000)
  const h = String(d.getUTCHours()).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m} UTC`
}

/** Payday strip: up to 36 segments, each coloured by state */
function PaydayStrip({ p, due }: { p: Payroll; due: number }) {
  const total = Math.min(p.count, 36)
  if (total === 0) return null

  const segments: { color: string }[] = []
  for (let i = 0; i < total; i++) {
    let color: string
    if (i < p.settled) {
      color = 'var(--state-held)'           // settled (HELD)
    } else if (i < p.settled + due) {
      color = 'var(--state-due)'            // due (amber)
    } else {
      color = 'var(--rule)'                 // upcoming (light rule)
    }
    segments.push({ color })
  }

  return (
    <div className="payday-strip" aria-hidden="true">
      {segments.map((s, i) => (
        <div
          key={i}
          className="payday-segment"
          style={{ background: s.color, opacity: 0.85 }}
        />
      ))}
    </div>
  )
}

interface Props {
  payrolls:     Payroll[]
  payrollCount: number
  isLoading?:   boolean
  currentId:    number  // highlight with petrol outline
}

export function PayrollRegister({ payrolls, payrollCount, isLoading, currentId }: Props) {
  // Batch dueCount + nextPayday for each payroll
  const contracts = useMemo(() =>
    payrolls.flatMap(p => [
      {
        address: VALUTA_ADDRESS,
        abi: VALUTA_ABI,
        functionName: 'dueCount' as const,
        args: [BigInt(p.id)] as const,
        chainId: CHAIN_ID,
      },
      {
        address: VALUTA_ADDRESS,
        abi: VALUTA_ABI,
        functionName: 'nextPayday' as const,
        args: [BigInt(p.id)] as const,
        chainId: CHAIN_ID,
      },
    ]),
  [payrolls])

  const { data } = useReadContracts({ contracts, query: { enabled: payrolls.length > 0 } })

  function getDue(i: number): number {
    const r = data?.[i * 2]
    return r?.status === 'success' ? Number(r.result) : 0
  }
  function getNext(i: number): number {
    const r = data?.[i * 2 + 1]
    return r?.status === 'success' ? Number(r.result) : 0
  }

  return (
    <section
      style={{ maxWidth: 1344, margin: '0 auto', padding: '56px 27px 0' }}
      aria-labelledby="register-heading"
    >
      {/* Heading */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24 }}>
        <h2
          id="register-heading"
          style={{ fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 34, color: 'var(--ink)', margin: 0 }}
        >
          Every payroll
        </h2>
        <span className="mono" style={{ fontSize: 15, color: 'var(--secondary)' }}>
          {isLoading ? '\u2026' : `${payrollCount} on Arc mainnet`}
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {/* Table header — hidden on phones via .register-table-head */}
        <div
          className="mono register-table-head"
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 80px 120px 80px 60px 120px 80px 120px',
            padding: '10px 20px',
            borderBottom: '1px solid var(--rule)',
            fontSize: 11,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: 'var(--secondary)',
            gap: 8,
          }}
        >
          <div>No.</div>
          <div>Pays</div>
          <div style={{ textAlign: 'right' }}>Salary</div>
          <div>Schedule</div>
          <div style={{ textAlign: 'right' }}>Paydays</div>
          <div style={{ textAlign: 'right' }}>Due</div>
          <div style={{ textAlign: 'right' }}>Reserve</div>
          <div style={{ textAlign: 'right' }}>Arrears</div>
          <div>Next value date</div>
        </div>

        {/* Rows */}
        {payrolls.map((p, i) => {
          const due      = getDue(i)
          const next     = getNext(i)
          const isEnded   = p.endedAt > 0
          const isComplete = p.settled >= p.count && !isEnded
          const isCurrent = p.id === currentId

          let nextLabel: string
          if (isEnded)         nextLabel = `ended ${fmtDate(p.endedAt)}`
          else if (isComplete) nextLabel = 'complete'
          else if (next > 0)   nextLabel = `${fmtDate(next)} ${fmtTime(next)}`
          else                 nextLabel = '\u2014'

          const statusLabel = isEnded
            ? 'ended'
            : isComplete
            ? 'complete'
            : due > 0
            ? null   // shown separately
            : null

          return (
            <a
              key={p.id}
              href={`/payroll/${p.id}`}
              className="register-table-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 80px 120px 80px 60px 120px 80px 120px',
                padding: '13px 20px',
                borderBottom: '1px solid var(--rule)',
                textDecoration: 'none',
                color: 'var(--ink)',
                gap: 8,
                alignItems: 'center',
                background: 'var(--paper)',
                outline: isCurrent ? '2px solid var(--state-held)' : 'none',
                outlineOffset: isCurrent ? '-2px' : 0,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--state-held-tint)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--paper)' }}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {/* Visible on phone only — title line */}
              <div className="register-row-title" style={{ gridColumn: '1 / -1' }}>
                <span className="mono" style={{ fontSize: 13, color: 'var(--secondary)', marginRight: 6 }}>
                  {String(p.id).padStart(2, '0')}
                </span>
                {CURRENCY_NAMES[p.currency] ?? p.currency}
                <PaydayStrip p={p} due={due} />
              </div>
              {/* Phone grid: key-value pairs */}
              <div className="register-row-grid" style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--secondary)', fontFamily: 'var(--font-words)', fontSize: 12 }}>Salary</span>
                <span className="mono" style={{ fontSize: 12 }}>{p.currency} {fmtSalary(p.salary, p.currency)}</span>
                <span style={{ color: 'var(--secondary)', fontFamily: 'var(--font-words)', fontSize: 12 }}>Schedule</span>
                <span className="mono" style={{ fontSize: 12 }}>{periodLabel(p.period)}, {paydayTime(p.start, p.period)}</span>
                <span style={{ color: 'var(--secondary)', fontFamily: 'var(--font-words)', fontSize: 12 }}>Paydays</span>
                <span className="mono" style={{ fontSize: 12 }}>{p.settled} of {p.count}</span>
                <span style={{ color: 'var(--secondary)', fontFamily: 'var(--font-words)', fontSize: 12 }}>Due</span>
                <span className="mono" style={{ fontSize: 12, color: due > 0 ? 'var(--state-due)' : 'var(--secondary)', fontWeight: due > 0 ? 600 : 400 }}>{due > 0 ? due : '0'}</span>
                <span style={{ color: 'var(--secondary)', fontFamily: 'var(--font-words)', fontSize: 12 }}>Reserve</span>
                <span className="mono" style={{ fontSize: 12 }}>{fmtUsdc(p.reserve)} USDC</span>
                <span style={{ color: 'var(--secondary)', fontFamily: 'var(--font-words)', fontSize: 12 }}>Arrears</span>
                <span className="mono" style={{ fontSize: 12, color: p.arrears > 0n ? 'var(--state-due)' : 'var(--secondary)' }}>{p.arrears > 0n ? fmtUsdc(p.arrears) : '0'}</span>
                <span style={{ color: 'var(--secondary)', fontFamily: 'var(--font-words)', fontSize: 12 }}>Next value date</span>
                <span className="mono" style={{ fontSize: 12 }}>{nextLabel}</span>
              </div>

              {/* Desktop columns */}
              <span className="mono" style={{ fontSize: 14, color: 'var(--secondary)' }}>
                {String(p.id).padStart(2, '0')}
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-words)', fontSize: 15 }}>
                  {CURRENCY_NAMES[p.currency] ?? p.currency}
                </div>
                <PaydayStrip p={p} due={due} />
                {(statusLabel || due > 0 || p.arrears > 0n) && (
                  <div className="mono" style={{ fontSize: 11, marginTop: 2, display: 'flex', gap: 6 }}>
                    {due > 0 && (
                      <span style={{ color: 'var(--state-due)', fontWeight: 600 }}>{due} due</span>
                    )}
                    {p.arrears > 0n && (
                      <span style={{ color: 'var(--state-due)' }}>{fmtUsdc(p.arrears)} arrears</span>
                    )}
                    {statusLabel && (
                      <span style={{ color: 'var(--state-upcoming)' }}>{statusLabel}</span>
                    )}
                  </div>
                )}
              </div>
              <span className="mono" style={{ fontSize: 14, textAlign: 'right' }}>
                {fmtSalary(p.salary, p.currency)}
              </span>
              <span className="mono" style={{ fontSize: 14, color: 'var(--secondary)' }}>
                {periodLabel(p.period)}, {paydayTime(p.start, p.period)}
              </span>
              <span className="mono" style={{ fontSize: 14, textAlign: 'right' }}>
                {p.settled} of {p.count}
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 14, textAlign: 'right',
                  color: due > 0 ? 'var(--state-due)' : 'var(--secondary)',
                  fontWeight: due > 0 ? 600 : 400,
                }}
              >
                {due > 0 ? due : '0'}
              </span>
              <span className="mono" style={{ fontSize: 14, textAlign: 'right' }}>
                {fmtUsdc(p.reserve)} USDC
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 14, textAlign: 'right',
                  color: p.arrears > 0n ? 'var(--state-due)' : 'var(--secondary)',
                }}
              >
                {p.arrears > 0n ? fmtUsdc(p.arrears) : '0'}
              </span>
              <span className="mono" style={{ fontSize: 14, color: 'var(--secondary)' }}>
                {nextLabel}
              </span>
            </a>
          )
        })}
      </div>

      {/* Under-table note + actions */}
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--secondary)', fontFamily: 'var(--font-words)' }}>
          These are the builder's own demo payrolls. The contract is open: anyone can create one.
        </p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a
            href="/new"
            style={{
              display: 'inline-block',
              background: 'var(--state-held)', color: '#fff',
              borderRadius: 4, padding: '8px 20px',
              fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 15,
              textDecoration: 'none',
            }}
          >
            Create a payroll
          </a>
          <a
            href="/lookup"
            style={{
              fontFamily: 'var(--font-words)', fontSize: 15,
              color: 'var(--state-held)',
            }}
          >
            Look up the rate at any moment →
          </a>
        </div>
      </div>
    </section>
  )
}
