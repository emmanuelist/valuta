import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { ClaimBand } from './ClaimBand'
import { LedgerCard } from './LedgerCard'
import { ProofInspector } from './ProofInspector'
import { usePayrollDetail, useTotalUsdcPaid } from '../hooks/useValutaData'
import type { Payroll } from '../lib/types'
import { navigate } from '../lib/router'
import { ARC_EXPLORER } from '../config'
import { VALUTA_ADDRESS } from '../contracts/abi'

interface Props {
  payrolls:      Payroll[]
  payrollCount:  number
  totalPaydays:  number
  featuredId:    number | null
  isLoading:     boolean
  isError:       boolean
  refetch:       () => unknown
  // For a specific payroll page
  targetId?:     number
  initialPayday?: number
}

export function HomePage({
  payrolls, payrollCount, totalPaydays,
  featuredId, isLoading, isError, refetch,
  targetId, initialPayday,
}: Props) {
  const id = targetId ?? featuredId ?? 1
  // nowTs is only used for LedgerCard upcoming-days logic; stable initial value is fine
  const [nowTs] = useState(() => Math.floor(Date.now() / 1000))
  const { payroll, payslips, dueQuotes, dueCount, isLoading: detailLoading, isError: detailError, refetch: refetchDetail } =
    usePayrollDetail(id)

  const totalUsdc = useTotalUsdcPaid(payrolls)

  // Selected payday index — initialise from ?payday= param, or auto-select when payslips load
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    initialPayday !== undefined && initialPayday >= 0 ? initialPayday : null,
  )
  // Auto-select first payslip on initial load — use the stable effect path
  useEffect(() => {
    if (payslips.length > 0 && selectedIdx === null) {
      setSelectedIdx(0)
    }
    // Only runs when payslips first become non-empty; selectedIdx starts null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payslips.length])

  // Sync ?payday= search param
  const handleSelect = useCallback((i: number) => {
    setSelectedIdx(i)
    if (targetId) {
      const url = `/payroll/${targetId}?payday=${i}`
      window.history.replaceState({}, '', url)
    }
  }, [targetId])

  const handleSettled = useCallback(() => {
    void refetchDetail()
    void refetch()
  }, [refetchDetail, refetch])

  // Bottom-sheet state (mobile ≤640px)
  const [sheetOpen, setSheetOpen] = useState(false)
  const handleRowSelect = (i: number) => {
    handleSelect(i)
    if (window.innerWidth <= 640) setSheetOpen(true)
  }

  const selectedPs  = selectedIdx !== null && payslips.length > selectedIdx ? payslips[selectedIdx] : null
  const selectedDq  = selectedIdx !== null && selectedIdx >= payslips.length
    ? dueQuotes[selectedIdx - payslips.length]
    : null

  const combinedLoading = isLoading || detailLoading

  if (isError || detailError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p style={{ color: 'var(--vermilion)' }}>Failed to load data from Arc mainnet.</p>
        <button
          onClick={() => { void refetch(); void refetchDetail() }}
          className="flex items-center gap-2 px-4 py-2 rounded-btn text-[14px]"
          style={{ background: 'var(--petrol)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    )
  }

  if (!combinedLoading && !payroll && !isLoading && payrollCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-4 text-center">
        <p className="text-[18px]" style={{ color: 'var(--ink)' }}>No payrolls yet.</p>
        <p className="text-[15px]" style={{ color: 'var(--secondary)' }}>
          A payroll is an agreement between an employer and a worker: a salary in a local currency,
          paid in USDC at the Chainlink rate live on each payday.
        </p>
        <button
          onClick={() => navigate('/new')}
          className="px-5 py-2 rounded-btn text-[15px] font-medium"
          style={{ background: 'var(--petrol)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Create payroll
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Claim band */}
      <ClaimBand
        payroll={payroll}
        payslip={selectedPs}
        dueQuote={selectedDq ? selectedDq : dueCount > 0 && !selectedPs ? dueQuotes[0] ?? null : null}
        payrollCount={payrollCount}
        totalPaydays={totalPaydays}
        totalUsdc={totalUsdc}
        isLoading={combinedLoading}
      />

      {/* Payroll selector tabs (if multiple payrolls) */}
      {payrolls.length > 1 && !targetId && (
        <div
          className="flex gap-2 px-5 pt-4 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {payrolls.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/payroll/${p.id}`)}
              className="shrink-0 px-4 py-1.5 rounded-tag text-[13px] font-medium transition-colors"
              style={{
                background: p.id === id ? 'var(--ptint)' : 'var(--surface)',
                color:      p.id === id ? 'var(--petrol)' : 'var(--secondary)',
                border:     `1px solid ${p.id === id ? 'var(--petrol)' : 'var(--rules)'}`,
                cursor: 'pointer',
              }}
            >
              No. {p.id} · {p.currency}
            </button>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex gap-5 px-5 py-5 items-start" style={{ minHeight: 640 }}>
        {/* Ledger */}
        <div className="flex-1 min-w-0">
          {payroll ? (
            <LedgerCard
              payroll={payroll}
              payslips={payslips}
              dueQuotes={dueQuotes}
              selectedIdx={selectedIdx}
              onSelect={handleRowSelect}
              onSettled={handleSettled}
              isLoading={combinedLoading}
              nowTs={nowTs}
            />
          ) : null}
        </div>

        {/* Inspector — desktop/tablet: right column */}
        {payroll && (
          <div
            className="shrink-0 hidden lg:block"
            style={{ width: 589 }}
          >
            <ProofInspector
              payroll={payroll}
              payslips={payslips}
              dueQuotes={dueQuotes}
              selectedIdx={selectedIdx}
              onStepTo={handleSelect}
            />
          </div>
        )}
      </div>

      {/* Inspector — tablet (1100px): below ledger */}
      {payroll && (
        <div className="lg:hidden xl:hidden px-5 pb-5">
          <div className="hidden md:block lg:hidden">
            <ProofInspector
              payroll={payroll}
              payslips={payslips}
              dueQuotes={dueQuotes}
              selectedIdx={selectedIdx}
              onStepTo={handleSelect}
            />
          </div>
        </div>
      )}

      {/* Bottom sheet — mobile (≤640px) */}
      <AnimatePresence>
        {sheetOpen && payroll && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(15,23,32,0.4)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-card overflow-hidden"
              style={{ height: '85vh', background: 'var(--surface)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setSheetOpen(false) }}
            >
              <ProofInspector
                payroll={payroll}
                payslips={payslips}
                dueQuotes={dueQuotes}
                selectedIdx={selectedIdx}
                onStepTo={handleSelect}
                isBottomSheet
                onClose={() => setSheetOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer
        className="px-7 py-5 text-[13px] flex flex-wrap gap-x-4 gap-y-1"
        style={{ color: 'var(--secondary)', borderTop: '1px solid var(--rules)', marginTop: 'auto' }}
      >
        <span>Reading <a href="https://arc.io" target="_blank" rel="noopener noreferrer">Arc mainnet</a></span>
        <span>·</span>
        <span>
          Valuta{' '}
          <a href={`${ARC_EXPLORER}/address/${VALUTA_ADDRESS}`} target="_blank" rel="noopener noreferrer">
            {VALUTA_ADDRESS.slice(0, 6)}…{VALUTA_ADDRESS.slice(-4)}
          </a>
          , verified on Sourcify
        </span>
        <span>·</span>
        <span>Demo payrolls are the builder&apos;s own wallets.</span>
      </footer>
    </>
  )
}
