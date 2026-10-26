// HomePage — payslip-hero layout
// First viewport at 1344×760: claim (left) + payslip (right) + timeline + coupon row
import { useState, useEffect, useCallback } from 'react'
import type { Payroll } from '../lib/types'
import { usePayrollDetail } from '../hooks/useValutaData'
import { useNeighbourRoundsForProof, useAsOfRate } from '../hooks/useAsOfRate'
import { useSettlementTx } from '../hooks/useValutaData'
import { useCountdown } from '../hooks/useCountdown'
import { PayslipCard } from './PayslipCard'
import { HonestTimeline } from './HonestTimeline'
import { CouponRow } from './CouponRow'
import { CountdownChip } from './CountdownChip'
import { FEEDS } from '../contracts/abi'

const FEATURED_PAYROLL_ID = 1

interface Props {
  payrolls:     Payroll[]
  payrollCount: number
  totalPaydays: number
  featuredId:   number | null
  isLoading:    boolean
  isError:      boolean
  refetch:      () => Promise<unknown>
  targetId?:    number
  initialPayday?: number
}

export function HomePage({
  payrolls, isLoading, isError, refetch,
  targetId, initialPayday,
}: Props) {
  const payrollId = targetId ?? FEATURED_PAYROLL_ID

  const { payroll, payslips, dueQuotes, isLoading: detailLoading } =
    usePayrollDetail(payrollId)

  const totalItems = (payroll?.count ?? 0)

  // Selected index — default to first payslip (index 0)
  const [selected, setSelected] = useState<number>(
    initialPayday !== undefined ? initialPayday : 0,
  )
  const [animKey, setAnimKey] = useState(0)
  const [newlyDue, setNewlyDue] = useState<number | null>(null)

  // Auto-select first on load
  useEffect(() => {
    if (payslips.length > 0 && selected === 0) {
      // already at 0
    }
  }, [payslips.length, selected])

  const handleSelect = useCallback((i: number) => {
    setSelected(i)
    setAnimKey(k => k + 1)
    // Update URL without full navigation for /payroll/:id
    const url = new URL(window.location.href)
    url.searchParams.set('payday', String(i))
    history.replaceState({}, '', url.toString())
  }, [])

  // Track newly-due paydays
  const currentDueCount = dueQuotes.length
  useEffect(() => {
    if (currentDueCount > 0) {
      const firstDueIdx = (payroll?.settled ?? 0)
      setNewlyDue(firstDueIdx)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDueCount])

  // The displayed item
  const selectedPayslip  = selected < payslips.length ? payslips[selected] : null
  const selectedDueQuote = !selectedPayslip
    ? dueQuotes.find(q => q.index === selected) ?? null
    : null

  // Neighbour rounds (for proof facts + timeline)
  const roundId   = selectedPayslip?.roundId ?? selectedDueQuote?.roundId ?? null
  const currency  = payroll?.currency ?? ''
  const { prev, next, maxAge } = useNeighbourRoundsForProof(currency, roundId)

  // Settlement tx
  const settledBlock = selectedPayslip?.settledBlock ?? null
  const { tx: settlementTx, fetch: fetchTx } = useSettlementTx(
    payrollId, selected, settledBlock,
  )
  useEffect(() => {
    if (settledBlock) void fetchTx()
  }, [settledBlock, fetchTx])

  // Counterfactual — asOf at settledAt
  const settledAtTs = selectedPayslip?.settledAt ?? 0
  const { result: counterfactualResult } = useAsOfRate(
    currency,
    settledAtTs,
    !!selectedPayslip && settledAtTs > 0,
  )

  // Countdown chip
  const { next: nextValueDate } = useCountdown(payrolls)

  // Refetch on live data (throttled 10s via polling interval set in wagmi)
  useEffect(() => {
    const id = setInterval(() => { void refetch() }, 10_000)
    return () => clearInterval(id)
  }, [refetch])

  const isAnyLoading = isLoading || detailLoading

  if (isError) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center' }}>
        <div style={{ color: 'var(--secondary)', marginBottom: 16 }}>Could not connect to Arc mainnet.</div>
        <button
          onClick={() => void refetch()}
          style={{
            background: 'var(--petrol)', color: '#fff', border: 'none',
            borderRadius: 4, padding: '8px 18px', cursor: 'pointer',
            fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 14,
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  const feedInfo  = FEEDS[currency]
  const isInverse = feedInfo?.inverse ?? false
  void isInverse  // used in PayslipCard

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)' }}>

      {/* First viewport: 1344×760 */}
      <div
        style={{
          maxWidth: 1344,
          margin: '0 auto',
          padding: '0 27px',
        }}
      >
        {/* Main two-column row */}
        <div
          className="home-layout"
          style={{
            display: 'flex',
            gap: 46,
            paddingTop: 55,
            alignItems: 'flex-start',
          }}
        >
          {/* Left: claim + countdown */}
          <div
            style={{
              width: 400,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            {/* Claim text */}
            <h1
              style={{
                fontFamily: 'var(--font-words)',
                fontWeight: 600,
                fontSize: 51,
                lineHeight: 1.08,
                letterSpacing: '-0.015em',
                color: 'var(--ink)',
                margin: 0,
                marginBottom: 38,
              }}
            >
              Salaries agreed in pesos, paid in USDC at the rate that was live on payday, however late it settles.
            </h1>

            {/* Countdown chip */}
            <CountdownChip next={nextValueDate} />
          </div>

          {/* Right: payslip hero (846×474) */}
          <div style={{ flex: 1, minWidth: 0, maxWidth: 846 }}>
            {isAnyLoading && !payroll ? (
              <div
                style={{
                  background: 'var(--paper)', border: '1px solid var(--rule)',
                  borderRadius: 6, height: 474,
                  boxShadow: 'var(--shadow-paper)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div className="skeleton" style={{ width: 300, height: 20 }} />
              </div>
            ) : payroll ? (
              <PayslipCard
                payroll={payroll}
                payslip={selectedPayslip}
                dueQuote={selectedDueQuote}
                next={next}
                maxAge={maxAge}
                counterfactualAnswer={counterfactualResult?.answer ?? null}
                counterfactualRoundId={counterfactualResult?.roundId ?? null}
                settlementTx={settlementTx}
                index={selected}
                animKey={animKey}
              />
            ) : null}
          </div>
        </div>

        {/* Timeline row */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          {payroll && (
            <HonestTimeline
              payslip={selectedPayslip}
              dueQuote={selectedDueQuote}
              prev={prev}
              next={next}
              animKey={animKey}
            />
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--rule)', margin: '0 0 0 0' }} />

        {/* Coupon row */}
        <div
          style={{
            padding: '16px 0',
            minHeight: 112,
          }}
        >
          {isAnyLoading && !payroll ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ width: 112, height: 96, borderRadius: 6, flexShrink: 0 }} />
              ))}
            </div>
          ) : payroll && totalItems > 0 ? (
            <CouponRow
              payroll={payroll}
              payslips={payslips}
              dueQuotes={dueQuotes}
              selected={selected}
              onSelect={handleSelect}
              newlyDue={newlyDue}
            />
          ) : null}
        </div>
      </div>

      {/* Payrolls list (below the fold) */}
      {payrolls.length > 1 && (
        <div
          style={{
            maxWidth: 1344,
            margin: '24px auto',
            padding: '0 27px',
          }}
        >
          <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 24 }}>
            <h2
              style={{
                fontFamily: 'var(--font-words)',
                fontWeight: 600, fontSize: 18,
                color: 'var(--ink)', margin: '0 0 16px',
              }}
            >
              All payrolls
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {payrolls.map(p => (
                <a
                  key={p.id}
                  href={`/payroll/${p.id}`}
                  style={{
                    display: 'flex', gap: 16, alignItems: 'center',
                    background: 'var(--paper)',
                    border: `1px solid ${p.id === payrollId ? 'var(--petrol)' : 'var(--rule)'}`,
                    borderRadius: 6,
                    padding: '12px 18px',
                    textDecoration: 'none',
                    color: 'var(--ink)',
                    fontSize: 15,
                    fontFamily: 'var(--font-words)',
                  }}
                >
                  <span style={{ fontWeight: 600, minWidth: 80 }}>Payroll {p.id}</span>
                  <span style={{ color: 'var(--secondary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    {p.currency} · {p.settled}/{p.count} settled
                  </span>
                  {p.arrears > 0n && (
                    <span style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      arrears
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
