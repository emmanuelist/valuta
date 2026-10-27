// PricingClauses — "How a payday is priced"
// Four numbered clauses, all filled from the selected payslip's chain reads.
import type { Payroll, Payslip, DueQuote, RoundData } from '../lib/types'
import {
  fmtRate8, fmtAggRound, fmtTime, fmtDateMixed, fmtDateTimeStamp,
  fmtUsdc, fmtSalary, truncAddr,
} from '../lib/format'

interface Props {
  payroll:  Payroll
  payslip:  Payslip | null
  dueQuote: DueQuote | null
  next:     RoundData | null
  maxAge:   number
}

function Clause({ n, lead, body }: { n: string; lead: string; body: string }) {
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div
        className="mono"
        style={{
          fontSize: 18, fontWeight: 300, color: 'var(--petrol)',
          marginBottom: 10, letterSpacing: '-.01em',
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-words)',
          fontWeight: 600,
          fontSize: 17,
          color: 'var(--ink)',
          marginBottom: 6,
          lineHeight: 1.35,
        }}
      >
        {lead}
      </div>
      <div style={{ fontFamily: 'var(--font-words)', fontSize: 16, color: 'var(--secondary)', lineHeight: 1.55 }}>
        {body}
      </div>
    </div>
  )
}

export function PricingClauses({ payroll, payslip, dueQuote, next, maxAge }: Props) {
  const currency   = payroll.currency
  const roundId    = payslip?.roundId ?? dueQuote?.roundId ?? null
  const answer     = payslip?.answer  ?? dueQuote?.answer  ?? null
  const roundUpdAt = payslip?.roundUpdatedAt ?? dueQuote?.roundUpdatedAt ?? null
  const paydayTs   = payslip?.payday  ?? dueQuote?.payday  ?? null
  const usdc       = payslip?.usdc    ?? dueQuote?.usdc    ?? null

  // Clause 1: value date fixes the rate
  const c1Body = roundId && answer && paydayTs && roundUpdAt
    ? `The Chainlink round live at that second decides: round ${fmtAggRound(roundId)} for ${fmtDateMixed(paydayTs)} ${fmtTime(paydayTs)} UTC, ${currency}/USD ${fmtRate8(answer)}.`
    : "The Chainlink round live at the payday's second decides the rate. Any other round is refused by name."

  // Clause 2: contract proves the round
  const nextCameAt = next && next.updatedAt > 0
    ? `round ${fmtAggRound(next.roundId)} at ${fmtTime(next.updatedAt)}`
    : 'no newer round yet'
  const ageMin  = paydayTs && roundUpdAt ? Math.round((paydayTs - roundUpdAt) / 60) : null
  const maxH    = Math.round(maxAge / 3600)
  const ageDesc = ageMin !== null
    ? (ageMin < 60 ? `${ageMin} minutes old, inside the ${maxH} h limit` : `${Math.round(ageMin / 60)} h old, inside the ${maxH} h limit`)
    : `inside the ${maxH} h staleness limit`
  const c2Body = roundId && paydayTs && roundUpdAt
    ? `Round ${fmtAggRound(roundId)} was published at ${fmtTime(roundUpdAt)}, before payday, and ${nextCameAt}, after it. It was ${ageDesc}. Any other round is refused by name.`
    : `The contract checks that the supplied round was published before payday and that the next one came after it. It was ${ageDesc}. Any other round is refused by name.`

  // Clause 3: anyone settles, any time, for the same amount
  let c3Body: string
  if (payslip) {
    // Lateness as "N d N h after its value date"
    const diffSec   = payslip.settledAt - payslip.payday
    const d         = Math.floor(diffSec / 86400)
    const h         = Math.floor((diffSec % 86400) / 3600)
    const lateStr   = d > 0 ? `${d} d ${h} h` : `${h} h`
    const byWhom    = payslip.settler.toLowerCase() === payroll.employer.toLowerCase()
      ? 'by the employer'
      : `by ${truncAddr(payslip.settler, 6, 4)}, not the employer`
    c3Body = `No. ${String(payslip.index + 1).padStart(2,'0')} was settled ${lateStr} after its value date ${byWhom}: ${usdc ? fmtUsdc(usdc) : '\u2014'} USDC, the payday\u2019s amount to the micro-USDC.`
  } else if (dueQuote && usdc) {
    c3Body = `Anyone can settle it now, or a year from now, for ${fmtUsdc(usdc)} USDC. The rate is already fixed.`
  } else {
    const paydayStr = paydayTs ? fmtDateTimeStamp(paydayTs) : 'the next value date'
    c3Body = `It will be fixed at ${paydayStr} by the round live then. Settling early or late makes no difference.`
  }

  // Clause 4: pay is never skipped
  const c4Body = payroll.arrears > 0n
    ? `The reserve can't leave while a payday is due. This payroll currently has ${fmtUsdc(payroll.arrears)} USDC in arrears, which the next funding pays first.`
    : `The reserve can't leave while a payday is due. A shortfall becomes public arrears, which the next funding pays first. Currently: no arrears.`

  // Salary line for clause 3 lead
  const salaryStr = `${currency} ${fmtSalary(payroll.salary, currency)}`

  return (
    <section
      style={{ maxWidth: 1344, margin: '0 auto', padding: '56px 27px 0' }}
      aria-labelledby="pricing-heading"
    >
      <h2
        id="pricing-heading"
        style={{
          fontFamily: 'var(--font-words)',
          fontWeight: 600,
          fontSize: 34,
          color: 'var(--ink)',
          margin: '0 0 32px',
        }}
      >
        How a payday is priced
      </h2>

      <div
        style={{
          display: 'flex',
          gap: 40,
          flexWrap: 'wrap',
        }}
      >
        <Clause
          n="01"
          lead="The value date fixes the rate."
          body={c1Body}
        />
        <Clause
          n="02"
          lead="The contract proves the round."
          body={c2Body}
        />
        <Clause
          n="03"
          lead={`Anyone settles, any time, for the same amount (${salaryStr}).`}
          body={c3Body}
        />
        <Clause
          n="04"
          lead="Pay is never skipped."
          body={c4Body}
        />
      </div>
    </section>
  )
}
