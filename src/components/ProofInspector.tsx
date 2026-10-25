import { useEffect } from 'react'
import { Copy, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAccount, useWriteContract, useSimulateContract, useWaitForTransactionReceipt } from 'wagmi'
import { arc } from 'viem/chains'
import type { Payroll, Payslip, DueQuote } from '../lib/types'
import { fmtUsdc, fmtDate, fmtDateTime, fmtLateness, fmtRate, aggRoundId } from '../lib/format'
import { ValueAxis } from './ValueAxis'
import { SettlementAxis } from './SettlementAxis'
import { useNeighbourRounds, useSettlementTx } from '../hooks/useValutaData'
import { VALUTA_ADDRESS, VALUTA_ABI } from '../contracts/abi'
import { ARC_EXPLORER } from '../config'
import { decodeValutaError } from '../lib/errors'

interface Props {
  payroll:      Payroll
  payslips:     Payslip[]
  dueQuotes:    DueQuote[]
  selectedIdx:  number | null
  onStepTo:     (i: number) => void
  isBottomSheet?: boolean
  onClose?:       () => void
}

export function ProofInspector({
  payroll, payslips, dueQuotes, selectedIdx, onStepTo,
  isBottomSheet, onClose,
}: Props) {
  const ps  = selectedIdx !== null && selectedIdx < payslips.length ? payslips[selectedIdx] : null
  const dq  = selectedIdx !== null && selectedIdx >= payslips.length
    ? dueQuotes[selectedIdx - payslips.length]
    : null

  const curRound = ps
    ? { roundId: ps.roundId, answer: ps.answer, updatedAt: ps.roundUpdatedAt }
    : dq
    ? { roundId: dq.roundId, answer: BigInt(dq.answer), updatedAt: dq.roundUpdatedAt }
    : null

  const { prev, next } = useNeighbourRounds(payroll.currency, curRound?.roundId ?? null)

  // Settlement tx — fetched on demand
  const { tx, fetch: fetchTx } = useSettlementTx(
    payroll.id,
    ps?.index ?? 0,
    ps?.settledBlock ?? null,
  )
  useEffect(() => {
    if (ps) void fetchTx()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ps?.index, fetchTx])

  // Stepper logic
  const totalSettled = payslips.length
  const maxStep = totalSettled - 1
  const canPrev = (selectedIdx ?? 0) > 0
  const canNext = (selectedIdx ?? 0) < maxStep

  if (!curRound) {
    // No selection / zero settled
    return (
      <EmptyInspector payroll={payroll} />
    )
  }

  const paydayTs = ps?.payday ?? dq?.payday ?? 0
  const usdc     = ps ? ps.paid + ps.credited : dq?.usdc ?? 0n
  const late     = ps ? fmtLateness(ps.settledAt, ps.payday) : null
  const caption  = late?.late
    ? `Settled ${late.label.replace('settled ', '')}. The rate did not move.`
    : ps ? 'Settled on time.' : null

  return (
    <div
      className="flex flex-col rounded-card overflow-hidden h-full"
      style={{
        background: 'var(--surface)',
        border:     '1px solid var(--rules)',
        boxShadow:  '0 1px 2px rgba(15,23,32,0.04)',
      }}
    >
      {isBottomSheet && (
        <button
          onClick={onClose}
          className="self-end p-4"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)' }}
          aria-label="Close"
        >
          ✕
        </button>
      )}

      <div className="flex-1 px-5 py-5 overflow-y-auto">
        {/* Payday stepper */}
        {totalSettled > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => canPrev && onStepTo((selectedIdx ?? 0) - 1)}
              disabled={!canPrev}
              className="p-0.5 rounded"
              style={{
                background: 'none', border: 'none', cursor: canPrev ? 'pointer' : 'not-allowed',
                color: canPrev ? 'var(--petrol)' : 'var(--rules)',
              }}
              aria-label="Previous payday"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="label-caps text-[12px]" style={{ color: 'var(--petrol)' }}>
              PROOF INSPECTOR · PAYDAY {String((selectedIdx ?? 0) + 1).padStart(2, '0')} OF {String(totalSettled).padStart(2, '0')}
            </span>
            <button
              onClick={() => canNext && onStepTo((selectedIdx ?? 0) + 1)}
              disabled={!canNext}
              className="p-0.5 rounded"
              style={{
                background: 'none', border: 'none', cursor: canNext ? 'pointer' : 'not-allowed',
                color: canNext ? 'var(--petrol)' : 'var(--rules)',
              }}
              aria-label="Next payday"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Title — the amount does NOT animate */}
        <h2 className="text-[27px] font-medium mb-4 m-0" style={{ color: 'var(--ink)' }}>
          Why {fmtUsdc(usdc)} USDC
        </h2>

        {/* Value axis label */}
        <div className="label-caps mb-2">
          {fmtDate(paydayTs)} · VALUE TIME AXIS
        </div>

        {/* Value axis SVG — key re-mounts to replay animation on payday change */}
        <div className="mb-5" style={{ minHeight: 159 }}>
          <ValueAxis
            key={`va-${selectedIdx}`}
            paydayTs={paydayTs}
            cur={curRound}
            prev={prev}
            next={next}
            isSelected={true}
          />
        </div>

        {/* Settlement axis — only for settled payslips */}
        {ps && (
          <>
            <div className="label-caps mb-2">SETTLEMENT TIME AXIS</div>
            <div className="mb-4" style={{ minHeight: 92 }}>
              <SettlementAxis
                key={`sa-${selectedIdx}`}
                paydayTs={ps.payday}
                settledAt={ps.settledAt}
                isSelected={true}
              />
            </div>
          </>
        )}

        {/* Caption */}
        {caption && (
          <p className="text-[14px] mb-4" style={{ color: late?.late ? 'var(--vermilion)' : 'var(--secondary)' }}>
            {caption}
          </p>
        )}

        {/* Ids + tx */}
        {ps && (
          <div className="flex flex-col gap-2 mb-4">
            <DataRow label="round id" value={ps.roundId.toString()} />
            {tx
              ? <TxRow hash={tx.hash} />
              : <DataRow label="tx" value="loading…" />
            }
          </div>
        )}

        {/* Explorer link */}
        {tx && (
          <a
            href={`${ARC_EXPLORER}/tx/${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] flex items-center gap-1"
            style={{ color: 'var(--petrol)' }}
          >
            View on explorer <ExternalLink size={13} />
          </a>
        )}

        {/* Due payday: show Chainlink info */}
        {dq && (
          <div className="mt-2 text-[13px]" style={{ color: 'var(--secondary)' }}>
            <p className="m-0">Rate: {fmtRate(dq.answer)} (round {aggRoundId(dq.roundId).toString()})</p>
            <p className="m-0 mt-1">Published: {fmtDateTime(dq.roundUpdatedAt)} UTC</p>
            <p className="m-0 mt-1">This payday's rate is already fixed and cannot change.</p>
          </div>
        )}

        {/* Withdraw action for credited payslips */}
        {ps && ps.credited > 0n && (
          <WithdrawAction payroll={payroll} ps={ps} />
        )}
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function DataRow({ label, value }: { label: string; value: string }) {
  const copy = () => { void navigator.clipboard.writeText(value) }
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="label-caps w-16 shrink-0">{label}</span>
      <span className="mono truncate" style={{ color: 'var(--ink)' }}>{value}</span>
      <button
        onClick={copy}
        className="shrink-0 p-0.5 rounded"
        title="Copy"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)' }}
      >
        <Copy size={13} />
      </button>
    </div>
  )
}

function TxRow({ hash }: { hash: string }) {
  const display = `${hash.slice(0, 6)}…${hash.slice(-4)}`
  const copy = () => { void navigator.clipboard.writeText(hash) }
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="label-caps w-16 shrink-0">tx</span>
      <span className="mono" style={{ color: 'var(--ink)' }}>{display}</span>
      <button
        onClick={copy}
        className="shrink-0 p-0.5 rounded"
        title="Copy"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)' }}
      >
        <Copy size={13} />
      </button>
    </div>
  )
}

function EmptyInspector({ payroll }: { payroll: Payroll }) {
  const nextPd = payroll.start + payroll.settled * payroll.period
  return (
    <div
      className="flex flex-col rounded-card h-full items-center justify-center px-8 py-12 text-center"
      style={{
        background: 'var(--surface)',
        border:     '1px solid var(--rules)',
        boxShadow:  '0 1px 2px rgba(15,23,32,0.04)',
      }}
    >
      <p className="text-[15px] mb-2" style={{ color: 'var(--secondary)' }}>
        Select a settled payday to see the proof.
      </p>
      {payroll.settled === 0 && (
        <p className="text-[13px]" style={{ color: 'var(--secondary)' }}>
          Once the first payday settles, this panel shows which Chainlink round priced it,
          the rounds either side, and the exact settlement timestamp.
          {nextPd > 0 && ` Next payday: ${fmtDateTime(nextPd)} UTC.`}
        </p>
      )}
    </div>
  )
}

function WithdrawAction({ payroll, ps }: { payroll: Payroll; ps: Payslip }) {
  const { address, chainId } = useAccount()
  const isWorker = address?.toLowerCase() === payroll.worker.toLowerCase()
  const isWrongChain = !!address && chainId !== arc.id

  const { data: simData, error: simError } = useSimulateContract({
    address: VALUTA_ADDRESS,
    abi: VALUTA_ABI,
    functionName: 'withdraw',
    args: [],
    query: { enabled: isWorker && !isWrongChain },
  })

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  if (!isWorker) {
    return (
      <p className="text-[13px] mt-3" style={{ color: 'var(--secondary)' }}>
        Credited: {fmtUsdc(ps.credited)} USDC withdrawable. Connect as the worker to withdraw.
      </p>
    )
  }

  const errMsg = simError ? decodeValutaError(simError) : writeError ? decodeValutaError(writeError) : null

  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-[13px] m-0" style={{ color: 'var(--secondary)' }}>
        {fmtUsdc(ps.credited)} USDC credited to your withdrawable balance.
      </p>
      {errMsg && <p className="text-[13px] m-0" style={{ color: 'var(--vermilion)' }}>{errMsg}</p>}
      {isSuccess && <p className="text-[13px] m-0" style={{ color: 'var(--petrol)' }}>Withdrawn!</p>}
      <button
        onClick={() => simData?.request && writeContract(simData.request)}
        disabled={!simData?.request || isPending || isConfirming}
        className="px-4 py-1.5 rounded-btn text-[13px] font-medium"
        style={{
          background: 'var(--petrol)', color: '#fff',
          border: 'none', cursor: 'pointer',
          opacity: (!simData?.request || isPending || isConfirming) ? 0.5 : 1,
          alignSelf: 'flex-start',
        }}
      >
        {isPending ? 'Confirm…' : isConfirming ? 'Confirming…' : 'Withdraw'}
      </button>
      {hash && (
        <a href={`${ARC_EXPLORER}/tx/${hash}`} target="_blank" rel="noopener noreferrer"
          className="text-[13px] flex items-center gap-1" style={{ color: 'var(--petrol)' }}>
          View on explorer <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}
