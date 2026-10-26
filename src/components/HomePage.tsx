// HomePage — payslip-hero layout, full page
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Payroll } from '../lib/types'
import { usePayrollDetail } from '../hooks/useValutaData'
import { useNeighbourRoundsForProof, useAsOfRate } from '../hooks/useAsOfRate'
import { useSettlementTx } from '../hooks/useValutaData'
import { useCountdown } from '../hooks/useCountdown'
import { PayslipCard } from './PayslipCard'
import { HonestTimeline } from './HonestTimeline'
import { CouponRow } from './CouponRow'
import { CountdownChip } from './CountdownChip'
import { CheatSection } from './CheatSection'
import { PricingClauses } from './PricingClauses'
import { PayrollRegister } from './PayrollRegister'
import { PageFooter } from './PageFooter'
import { EmployerPanel } from './EmployerPanel'
import { FEEDS } from '../contracts/abi'
import { convertUsdc } from '../lib/format'

const FEATURED_PAYROLL_ID = 1

interface Props {
  payrolls:     Payroll[]
  payrollCount: number
  isLoading:    boolean
  isError:      boolean
  refetch:      () => Promise<unknown>
  targetId?:    number
  initialPayday?: number
}

export function HomePage({
  payrolls, payrollCount, isLoading, isError, refetch,
  targetId, initialPayday,
}: Props) {
  const payrollId = targetId ?? FEATURED_PAYROLL_ID

  const { payroll, payslips, dueQuotes, isLoading: detailLoading, refetch: refetchDetail } =
    usePayrollDetail(payrollId)

  const totalItems = payroll?.count ?? 0

  // Selected index — default to first payslip (index 0)
  const [selected, setSelected] = useState<number>(
    initialPayday !== undefined ? initialPayday : 0,
  )
  const [animKey, setAnimKey] = useState(0)
  const [newlyDue, setNewlyDue] = useState<number | null>(null)

  const handleSelect = useCallback((i: number) => {
    setSelected(i)
    setAnimKey(k => k + 1)
    const url = new URL(window.location.href)
    url.searchParams.set('payday', String(i))
    history.replaceState({}, '', url.toString())
  }, [])

  // Track newly-due paydays
  const currentDueCount = dueQuotes.length
  const prevDueRef = useRef(0)
  useEffect(() => {
    if (currentDueCount > prevDueRef.current) {
      const firstDueIdx = payroll?.settled ?? 0
      setNewlyDue(firstDueIdx)
    }
    prevDueRef.current = currentDueCount
  }, [currentDueCount, payroll?.settled])

  // The displayed item
  const selectedPayslip  = selected < payslips.length ? payslips[selected] : null
  const selectedDueQuote = !selectedPayslip
    ? dueQuotes.find(q => q.index === selected) ?? null
    : null

  // All due rounds up to and including the selected payday (for multi-settle)
  const allDueRounds: bigint[] = useMemo(() => {
    const selectedIdx = selectedDueQuote?.index ?? -1
    return dueQuotes
      .filter(q => q.index <= selectedIdx)
      .map(q => q.roundId)
  }, [dueQuotes, selectedDueQuote])

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

  // Counterfactual USDC (for CheatSection wrong-round amount)
  const feedInfo  = FEEDS[currency]
  const isInverse = feedInfo?.inverse ?? false
  const salaryCopy = payroll?.salary ?? null
  const counterfactualUsdc = useMemo(() => {
    if (!counterfactualResult?.answer || !salaryCopy) return null
    try { return convertUsdc(salaryCopy, counterfactualResult.answer, isInverse) }
    catch { return null }
  }, [counterfactualResult, salaryCopy, isInverse])

  // Latest rate for employer runway estimate — use the selected payslip/due-quote answer
  const currentRate = selectedPayslip?.answer ?? selectedDueQuote?.answer ?? null

  // Countdown chip
  const { next: nextValueDate } = useCountdown(payrolls)

  // Refetch on live data (throttled 10s)
  useEffect(() => {
    const id = setInterval(() => {
      void refetch()
      void refetchDetail()
    }, 10_000)
    return () => clearInterval(id)
  }, [refetch, refetchDetail])

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)' }} aria-live="polite" aria-atomic="false">

      {/* ── First viewport ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1344, margin: '0 auto', padding: '0 27px' }}>

        {/* Main two-column row */}
        <div
          className="home-layout"
          style={{ display: 'flex', gap: 46, paddingTop: 55, alignItems: 'flex-start' }}
        >
          {/* Left: claim + countdown */}
          <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
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
            <CountdownChip next={nextValueDate} />
          </div>

          {/* Right: payslip hero */}
          <div style={{ flex: 1, minWidth: 0, maxWidth: 846 }}>
            {isAnyLoading && !payroll ? (
              <div
                style={{
                  background: 'var(--paper)', border: '1px solid var(--rule)',
                  borderRadius: 6, height: 474, boxShadow: 'var(--shadow-paper)',
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
                allDueRounds={allDueRounds}
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

        {/* Timeline */}
        <div style={{ marginTop: 24, paddingTop: 8, paddingBottom: 8 }}>
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
        <div style={{ borderTop: '1px solid var(--rule)' }} />

        {/* Coupon row */}
        <div style={{ padding: '16px 0', minHeight: 112 }}>
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

      {/* ── Employer panel (F) — between coupon row and cheat section ── */}
      {payroll && (
        <EmployerPanel
          payroll={payroll}
          dueQuotes={dueQuotes}
          latestAnswer={currentRate}
          onRefetch={() => { void refetch(); void refetchDetail() }}
        />
      )}

      {/* ── A: Try to cheat it ──────────────────────────────────────────── */}
      {payroll && (
        <CheatSection
          payroll={payroll}
          payslip={selectedPayslip}
          dueQuote={selectedDueQuote}
          correctRounds={
            selectedPayslip
              ? (selectedPayslip.roundId ? [selectedPayslip.roundId] : [])
              : selectedDueQuote
              ? allDueRounds
              : []
          }
          counterfactualUsdc={counterfactualUsdc}
        />
      )}

      {/* ── B: How a payday is priced ──────────────────────────────────── */}
      {payroll && (
        <PricingClauses
          payroll={payroll}
          payslip={selectedPayslip}
          dueQuote={selectedDueQuote}
          next={next}
          maxAge={maxAge}
        />
      )}

      {/* ── C: Every payroll ───────────────────────────────────────────── */}
      <PayrollRegister
        payrolls={payrolls}
        payrollCount={payrollCount}
        currentId={payrollId}
      />

      {/* ── D: Footer ─────────────────────────────────────────────────── */}
      <PageFooter />
    </div>
  )
}
