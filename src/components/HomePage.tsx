// HomePage — payslip-hero layout, responsive
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Payroll } from '../lib/types'
import { usePayrollDetail } from '../hooks/useValutaData'
import { useNeighbourRoundsForProof, useAsOfRate } from '../hooks/useAsOfRate'
import { useSettlementTx } from '../hooks/useValutaData'
import { useCountdown } from '../hooks/useCountdown'
import { useMediaQuery } from '../hooks/useMediaQuery'
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
import { navigate } from '../lib/router'

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

  const { payroll, payslips, dueQuotes, isLoading: detailLoading, isError: detailError, refetch: refetchDetail } =
    usePayrollDetail(payrollId)

  const totalItems = payroll?.count ?? 0

  const [selected, setSelected] = useState<number>(
    initialPayday !== undefined ? initialPayday : 0,
  )
  const [animKey, setAnimKey] = useState(0)
  const [newlyDue,  setNewlyDue]  = useState<number | null>(null)
  const [newlyHeld, setNewlyHeld] = useState<number | null>(null)

  const handleSelect = useCallback((i: number) => {
    setSelected(i)
    setAnimKey(k => k + 1)
    const url = new URL(window.location.href)
    url.searchParams.set('payday', String(i))
    history.replaceState({}, '', url.toString())
  }, [])

  // Immediately refetch after a settle and mark the coupon
  const handleSettled = useCallback((settledIndex: number) => {
    setNewlyHeld(settledIndex)
    void refetch()
    void refetchDetail()
  }, [refetch, refetchDetail])

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

  const selectedPayslip  = selected < payslips.length ? payslips[selected] : null
  const selectedDueQuote = !selectedPayslip
    ? dueQuotes.find(q => q.index === selected) ?? null
    : null

  const allDueRounds: bigint[] = useMemo(() => {
    const selectedIdx = selectedDueQuote?.index ?? -1
    return dueQuotes
      .filter(q => q.index <= selectedIdx)
      .map(q => q.roundId)
  }, [dueQuotes, selectedDueQuote])

  const roundId  = selectedPayslip?.roundId ?? selectedDueQuote?.roundId ?? null
  const currency = payroll?.currency ?? ''
  const { prev, next, maxAge, neighboursLoading } = useNeighbourRoundsForProof(currency, roundId)

  const settledBlock = selectedPayslip?.settledBlock ?? null
  const { tx: settlementTx, fetch: fetchTx } = useSettlementTx(
    payrollId, selected, settledBlock,
  )
  useEffect(() => {
    if (settledBlock) void fetchTx()
  }, [settledBlock, fetchTx])

  const settledAtTs = selectedPayslip?.settledAt ?? 0
  const { result: counterfactualResult } = useAsOfRate(
    currency, settledAtTs, !!selectedPayslip && settledAtTs > 0,
  )

  const feedInfo  = FEEDS[currency]
  const isInverse = feedInfo?.inverse ?? false
  const salaryCopy = payroll?.salary ?? null
  const counterfactualUsdc = useMemo(() => {
    if (!counterfactualResult?.answer || !salaryCopy) return null
    try { return convertUsdc(salaryCopy, counterfactualResult.answer, isInverse) }
    catch { return null }
  }, [counterfactualResult, salaryCopy, isInverse])

  const currentRate = selectedPayslip?.answer ?? selectedDueQuote?.answer ?? null

  const { next: nextValueDate } = useCountdown(payrolls)

  useEffect(() => {
    const id = setInterval(() => {
      void refetch()
      void refetchDetail()
    }, 10_000)
    return () => clearInterval(id)
  }, [refetch, refetchDetail])

  const isPhone = useMediaQuery('(max-width: 699px)')

  const isAnyLoading = isLoading || detailLoading
  const isAnyError   = isError || detailError

  // ── Error state ─────────────────────────────────────────────────────
  if (isAnyError && !isAnyLoading) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--secondary)', marginBottom: 16, fontFamily: 'var(--font-words)', fontSize: 16 }}>
          Could not connect to Arc mainnet.
        </p>
        <button
          onClick={() => { void refetch(); void refetchDetail() }}
          style={{
            background: 'var(--petrol)', color: '#fff', border: 'none',
            borderRadius: 6, padding: '10px 22px', cursor: 'pointer',
            fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 15, minHeight: 44,
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  // ── No payrolls state ────────────────────────────────────────────────
  if (!isAnyLoading && payrollCount === 0) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 24, color: 'var(--ink)', marginBottom: 12 }}>
          No payrolls yet
        </h2>
        <p style={{ color: 'var(--secondary)', fontSize: 16, marginBottom: 24 }}>
          Create the first payroll to see salary receipts here.
        </p>
        <button
          onClick={() => navigate('/new')}
          style={{
            background: 'var(--petrol)', color: '#fff', border: 'none',
            borderRadius: 6, padding: '10px 24px', cursor: 'pointer',
            fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 15, minHeight: 44,
          }}
        >
          Create a payroll
        </button>
      </div>
    )
  }

  // ── Payroll not found ────────────────────────────────────────────────
  if (!isAnyLoading && payrollCount > 0 && !payroll) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--secondary)', fontSize: 16 }}>
          Payroll {payrollId} not found.{' '}
          <button
            onClick={() => navigate('/')}
            style={{ color: 'var(--petrol)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-words)', textDecoration: 'underline', minHeight: 44, padding: 0 }}
          >
            Back to payroll 1
          </button>
        </p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)' }}>

      {/* ── First viewport ─────────────────────────────────────────── */}
      <div className="section-outer">

        {/* Two-column / single-column layout row */}
        <div className="home-layout">

          {/* Left: claim + countdown */}
          <div className="home-left">
            {/* Only show claim once we have data */}
            {(payroll || isAnyLoading) && (
              <h1 className="home-claim">
                Salaries agreed in pesos, paid in USDC at the rate that was live on payday, however late it settles.
              </h1>
            )}
            <CountdownChip next={nextValueDate} isLoading={isAnyLoading} />
          </div>

          {/* Right: payslip hero */}
          <div className="home-right">
            {isAnyLoading && !payroll ? (
              <PayslipSkeleton />
            ) : payroll ? (
              <PayslipCard
                payroll={payroll}
                payslip={selectedPayslip}
                dueQuote={selectedDueQuote}
                allDueRounds={allDueRounds}
                next={next}
                nextLoading={neighboursLoading}
                maxAge={maxAge}
                counterfactualAnswer={counterfactualResult?.answer ?? null}
                counterfactualRoundId={counterfactualResult?.roundId ?? null}
                settlementTx={settlementTx}
                index={selected}
                animKey={animKey}
                onSettled={handleSettled}
              />
            ) : null}
          </div>
        </div>

        {/* Timeline — tight 80px block on desktop, auto-height on phone */}
        <div className={isPhone ? 'timeline-block-phone' : 'timeline-block'} style={{ marginTop: isPhone ? 8 : 4 }}>
          {payroll ? (
            <HonestTimeline
              payslip={selectedPayslip}
              dueQuote={selectedDueQuote}
              prev={prev}
              next={next}
              animKey={animKey}
              vertical={isPhone}
            />
          ) : isAnyLoading ? (
            <div className="skeleton" style={{ width: '60%', height: 12 }} />
          ) : null}
        </div>

        {/* Divider directly below timeline */}
        <hr className="timeline-divider" />

        {/* Coupon row */}
        <div className="coupon-block">
          {isAnyLoading && !payroll ? (
            <CouponSkeleton />
          ) : payroll && totalItems > 0 ? (
            <CouponRow
              payroll={payroll}
              payslips={payslips}
              dueQuotes={dueQuotes}
              selected={selected}
              onSelect={handleSelect}
              newlyDue={newlyDue}
              newlyHeld={newlyHeld}
            />
          ) : payroll && totalItems === 0 ? (
            <EmptyPayroll />
          ) : null}
        </div>
      </div>

      {/* ── Employer panel ──────────────────────────────────────────── */}
      {payroll && (
        <EmployerPanel
          payroll={payroll}
          dueQuotes={dueQuotes}
          latestAnswer={currentRate}
          onRefetch={() => { void refetch(); void refetchDetail() }}
        />
      )}

      {/* ── Try to cheat it ─────────────────────────────────────────── */}
      {payroll && (
        <CheatSection
          payroll={payroll}
          payslip={selectedPayslip}
          dueQuote={selectedDueQuote}
          correctRounds={
            selectedPayslip
              ? (selectedPayslip.roundId ? [selectedPayslip.roundId] : [])
              : selectedDueQuote ? allDueRounds : []
          }
          counterfactualUsdc={counterfactualUsdc}
          settleDayRoundId={counterfactualResult?.roundId ?? null}
        />
      )}

      {/* ── How a payday is priced ───────────────────────────────────── */}
      {payroll && (
        <PricingClauses
          payroll={payroll}
          payslip={selectedPayslip}
          dueQuote={selectedDueQuote}
          next={next}
          maxAge={maxAge}
        />
      )}

      {/* ── Every payroll ────────────────────────────────────────────── */}
      <PayrollRegister
        payrolls={payrolls}
        payrollCount={payrollCount}
        isLoading={isAnyLoading}
        currentId={payrollId}
      />

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <PageFooter />
    </div>
  )
}

// ── Sub-components for non-happy states ────────────────────────────────

function PayslipSkeleton() {
  return (
    <div
      aria-label="Loading payslip"
      aria-busy="true"
      style={{
        background: 'var(--paper)', border: '1px solid var(--rule)',
        borderRadius: 6, padding: '24px 32px', boxShadow: 'var(--shadow-paper)',
        display: 'flex', flexDirection: 'column', gap: 16, minHeight: 474,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div className="skeleton" style={{ width: '55%', height: 14 }} />
        <div className="skeleton" style={{ width: 200, height: 52, borderRadius: 6 }} />
      </div>
      <div className="skeleton" style={{ width: '35%', height: 14 }} />
      <div style={{ borderTop: '1px dashed var(--rule)', paddingTop: 10 }}>
        <div className="skeleton" style={{ width: '70%', height: 14 }} />
      </div>
      <div className="skeleton" style={{ width: 280, height: 64, borderRadius: 4 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ width: `${60 + i * 8}%`, height: 14 }} />)}
      </div>
    </div>
  )
}

function CouponSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 8 }} aria-label="Loading paydays" aria-busy="true">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: 112, height: 96, borderRadius: 6, flexShrink: 0 }} />
      ))}
    </div>
  )
}

function EmptyPayroll() {
  return (
    <div style={{ padding: '20px 0', color: 'var(--secondary)', fontFamily: 'var(--font-words)', fontSize: 15 }}>
      No paydays yet. Once the first value date passes, a coupon will appear here for anyone to settle.
    </div>
  )
}
