// PayrollRegister — "Every payroll"
// A ruled table of all payrolls with live dueCount and nextPayday reads.
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

interface Props {
  payrolls:     Payroll[]
  payrollCount: number
  currentId:    number  // highlight with petrol outline
}

export function PayrollRegister({ payrolls, payrollCount, currentId }: Props) {
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
          {payrollCount} on Arc mainnet
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
        {/* Table header */}
        <div
          className="mono"
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
          const due  = getDue(i)
          const next = getNext(i)
          const isEnded   = p.endedAt > 0
          const isComplete = p.settled >= p.count && !isEnded
          const isCurrent = p.id === currentId

          let nextLabel: string
          if (isEnded)    nextLabel = `ended ${fmtDate(p.endedAt)}`
          else if (isComplete) nextLabel = 'complete'
          else if (next > 0)  nextLabel = `${fmtDate(next)} ${fmtTime(next)}`
          else nextLabel = '—'

          return (
            <a
              key={p.id}
              href={`/payroll/${p.id}`}
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
                outline: isCurrent ? '2px solid var(--petrol)' : 'none',
                outlineOffset: isCurrent ? '-2px' : 0,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ptint)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--paper)' }}
              aria-current={isCurrent ? 'page' : undefined}
            >
              <span className="mono" style={{ fontSize: 14, color: 'var(--secondary)' }}>
                {String(p.id).padStart(2, '0')}
              </span>
              <span style={{ fontFamily: 'var(--font-words)', fontSize: 15 }}>
                {CURRENCY_NAMES[p.currency] ?? p.currency}
              </span>
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
                  color: due > 0 ? 'var(--amber)' : 'var(--secondary)',
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
                  color: p.arrears > 0n ? 'var(--amber)' : 'var(--secondary)',
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
              background: 'var(--petrol)', color: '#fff',
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
              color: 'var(--petrol)',
            }}
          >
            Look up the rate at any moment →
          </a>
        </div>
      </div>
    </section>
  )
}
