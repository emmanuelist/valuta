import type { Payroll, Payslip, DueQuote } from '../lib/types'
import { fmtUsdc, fmtSalary, fmtDateTime, fmtLateness } from '../lib/format'

interface Props {
  payroll:     Payroll | null
  payslip:     Payslip | null   // selected
  dueQuote:    DueQuote | null  // first due, if no payslip selected
  payrollCount:number
  totalPaydays:number
  totalUsdc:   bigint
  isLoading:   boolean
}

export function ClaimBand({
  payroll, payslip, dueQuote,
  payrollCount, totalPaydays, totalUsdc, isLoading,
}: Props) {

  const headline = () => {
    if (!payroll) return null
    if (payslip) {
      const sal  = fmtSalary(payroll.salary, payroll.currency)
      const usdc = fmtUsdc(payslip.paid + payslip.credited)
      return `${payroll.currency} ${sal} → ${usdc} USDC`
    }
    if (dueQuote) {
      const sal  = fmtSalary(payroll.salary, payroll.currency)
      const usdc = fmtUsdc(dueQuote.usdc)
      return `${payroll.currency} ${sal} → ${usdc} USDC`
    }
    return null
  }

  const subline = () => {
    if (!payroll) return null
    if (payslip) {
      const dt   = fmtDateTime(payslip.payday)
      const late = fmtLateness(payslip.settledAt, payslip.payday)
      const tail = late.late ? `Settled ${late.label.replace('settled ', '')}. The rate did not move.` : 'Settled on time.'
      return `Paid at the Chainlink rate live on ${dt} UTC. ${tail}`
    }
    if (dueQuote) {
      const dt = fmtDateTime(dueQuote.payday)
      return `Rate fixes at ${dt} UTC. Not yet settled.`
    }
    return null
  }

  const hl = headline()
  const sl = subline()

  return (
    <div
      style={{
        background: 'var(--claim)',
        borderBottom: '1px solid var(--rules)',
        minHeight: '148px',
      }}
      className="px-[35px] py-6 flex items-center gap-0"
    >
      {/* Left: headline + subline */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <>
            <div className="skeleton h-[47px] w-[400px] mb-3 rounded" />
            <div className="skeleton h-4 w-[350px] rounded" />
          </>
        ) : hl ? (
          <>
            <h1
              className="font-normal leading-[1.1] mb-2 text-balance"
              style={{ fontSize: '47px', color: 'var(--ink)', fontFamily: '"Radio Canada Big"' }}
            >
              {hl}
            </h1>
            <p className="text-[15px] m-0" style={{ color: 'var(--secondary)' }}>
              {sl}
            </p>
          </>
        ) : null}
      </div>

      {/* Right: three totals */}
      <div
        className="hidden sm:flex items-stretch gap-0 ml-8 shrink-0"
        style={{ borderLeft: '1px solid var(--rules)' }}
      >
        <Total value={String(payrollCount)}  label="payrolls"        loading={isLoading} />
        <Total value={String(totalPaydays)}  label="paydays settled"  loading={isLoading} />
        <Total value={fmtUsdc(totalUsdc)}    label="USDC paid"       loading={isLoading} mono />
      </div>
    </div>
  )
}

function Total({ value, label, loading, mono }: {
  value: string; label: string; loading: boolean; mono?: boolean
}) {
  return (
    <div
      className="px-8 flex flex-col justify-center"
      style={{ borderLeft: '1px solid var(--rules)' }}
    >
      {loading
        ? <div className="skeleton h-[37px] w-24 mb-1 rounded" />
        : (
          <span
            className={`${mono ? 'mono' : ''} leading-none`}
            style={{ fontSize: '37px', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </span>
        )
      }
      <span className="text-[15px] mt-1" style={{ color: 'var(--secondary)' }}>{label}</span>
    </div>
  )
}
