import { useAccount, useWriteContract, useSimulateContract, useWaitForTransactionReceipt } from 'wagmi'
import { arc } from 'viem/chains'
import { ExternalLink } from 'lucide-react'
import type { Payroll, Payslip, DueQuote } from '../lib/types'
import { fmtSalary, fmtUsdc, fmtDateTime, fmtRate, fmtRoundShort, fmtLateness } from '../lib/format'
import { VALUTA_ADDRESS, VALUTA_ABI } from '../contracts/abi'
import { ARC_EXPLORER } from '../config'
import { decodeValutaError } from '../lib/errors'

interface Props {
  payroll:      Payroll
  payslips:     Payslip[]
  dueQuotes:    DueQuote[]
  selectedIdx:  number | null
  onSelect:     (i: number) => void
  onSettled:    () => void
  isLoading:    boolean
  nowTs:        number
}

export function LedgerCard({
  payroll, payslips, dueQuotes, selectedIdx, onSelect, onSettled, isLoading, nowTs,
}: Props) {
  const { address, chainId } = useAccount()
  const isWrongChain = !!address && chainId !== arc.id

  // Count of upcoming paydays — nowTs passed in from parent (stable across renders)
  const now = nowTs
  const upcoming: { index: number; payday: number }[] = []
  if (payroll.endedAt === 0 || payroll.endedAt > now) {
    const firstUpcoming = payroll.settled + dueQuotes.length
    for (let i = firstUpcoming; i < payroll.count; i++) {
      const pd = payroll.start + i * payroll.period
      if (pd > now) upcoming.push({ index: i, payday: pd })
      if (upcoming.length >= 10) break
    }
  }

  const hasDue = dueQuotes.length > 0

  return (
    <div
      className="flex flex-col rounded-card overflow-hidden"
      style={{
        background: 'var(--surface)',
        border:     '1px solid var(--rules)',
        boxShadow:  '0 1px 2px rgba(15,23,32,0.04)',
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--rules)' }}>
        {isLoading ? (
          <div className="skeleton h-5 w-[320px] rounded" />
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[18px] font-medium" style={{ color: 'var(--ink)' }}>
              Payroll No. {payroll.id}
            </span>
            <span style={{ color: 'var(--rules)' }}>·</span>
            <span className="text-[15px]" style={{ color: 'var(--secondary)' }}>
              {payroll.currency} {fmtSalary(payroll.salary, payroll.currency)} per payday
            </span>
            <span style={{ color: 'var(--rules)' }}>·</span>
            <span className="text-[15px]" style={{ color: 'var(--secondary)' }}>
              Reserve {fmtUsdc(payroll.reserve)} USDC
            </span>
          </div>
        )}
        {/* Arrears */}
        {!isLoading && payroll.arrears > 0n && (
          <p className="text-[14px] mt-1 m-0" style={{ color: 'var(--vermilion)' }}>
            Arrears {fmtUsdc(payroll.arrears)} USDC owed to the worker
          </p>
        )}
        {/* Ended */}
        {!isLoading && payroll.endedAt > 0 && (
          <p className="text-[14px] mt-1 m-0" style={{ color: 'var(--secondary)' }}>
            Ended {fmtDateTime(payroll.endedAt)} UTC
          </p>
        )}
      </div>

      {/* Scrollable rows */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: 520 }}>
        {isLoading ? (
          <SkeletonRows />
        ) : (
          <>
            {/* Settled rows */}
            {payslips.map((ps) => (
              <SettledRow
                key={ps.index}
                ps={ps}
                selected={selectedIdx === ps.index}
                onSelect={() => onSelect(ps.index)}
              />
            ))}

            {/* Due rows */}
            {hasDue && (
              <DueSection
                payroll={payroll}
                dueQuotes={dueQuotes}
                address={address}
                isWrongChain={isWrongChain}
                onSettled={onSettled}
              />
            )}

            {/* Upcoming rows */}
            {upcoming.map(u => (
              <div
                key={u.index}
                className="flex items-center px-5 py-3 border-b text-[14px] gap-4"
                style={{ borderColor: 'var(--rules)', color: 'var(--secondary)' }}
              >
                <span className="mono w-6 text-right shrink-0"
                  style={{ color: 'var(--secondary)', fontSize: '14px' }}>
                  {String(u.index + 1).padStart(2, '0')}
                </span>
                <span className="label-caps shrink-0">VALUE</span>
                <span className="mono text-[13px] shrink-0">{fmtDateTime(u.payday)} UTC</span>
                <span className="label-caps ml-auto">upcoming · rate fixes at payday</span>
              </div>
            ))}

            {/* Empty state */}
            {payslips.length === 0 && dueQuotes.length === 0 && upcoming.length === 0 && (
              <div className="px-5 py-8 text-center" style={{ color: 'var(--secondary)' }}>
                <p className="text-[15px]">No paydays yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Settled row ──────────────────────────────────────────────────────────────

function SettledRow({ ps, selected, onSelect }: {
  ps: Payslip; selected: boolean; onSelect: () => void
}) {
  const late = fmtLateness(ps.settledAt, ps.payday)
  const hasCredited = ps.credited > 0n

  return (
    <button
      onClick={onSelect}
      className="w-full text-left flex items-center px-5 gap-4 border-b transition-colors"
      style={{
        minHeight: '62px',
        background: selected ? 'var(--ptint)' : 'var(--surface)',
        borderColor: 'var(--rules)',
        outline: selected ? '1px solid var(--petrol)' : 'none',
        outlineOffset: '-1px',
        cursor: 'pointer',
        border: selected
          ? '1px solid var(--petrol)'
          : '0 0 1px 0 solid var(--rules)',
        borderBottom: `1px solid var(--rules)`,
      }}
    >
      <span
        className="mono text-[18px] w-6 text-right shrink-0"
        style={{ color: selected ? 'var(--petrol)' : 'var(--ink)' }}
      >
        {String(ps.index + 1).padStart(2, '0')}
      </span>

      <span className="label-caps shrink-0">VALUE</span>
      <span className="mono text-[13px] shrink-0">{fmtDateTime(ps.payday)}</span>

      <span className="mono text-[13px] shrink-0" style={{ color: 'var(--secondary)' }}>
        {fmtRate(ps.answer)}
      </span>

      <span className="mono text-[13px] shrink-0" style={{ color: 'var(--secondary)' }}>
        {fmtRoundShort(ps.roundId)}
      </span>

      <span className="mono text-[13px] shrink-0">
        {fmtUsdc(ps.paid + ps.credited)} USDC
      </span>

      {hasCredited && (
        <span
          className="text-[12px] px-2 py-0.5 rounded-tag shrink-0"
          style={{ color: 'var(--petrol)', border: '1px solid var(--petrol)', background: 'transparent' }}
        >
          credited · withdrawable
        </span>
      )}

      <span className="ml-auto shrink-0">
        {late.late
          ? (
            <span
              className="text-[12px] px-2 py-0.5 rounded-tag"
              style={{ color: 'var(--vermilion)', border: '1px solid var(--vermilion)', background: 'transparent' }}
            >
              {late.label}
            </span>
          )
          : (
            <span className="text-[12px]" style={{ color: 'var(--secondary)' }}>on time</span>
          )
        }
      </span>
    </button>
  )
}

// ── Due section ──────────────────────────────────────────────────────────────

function DueSection({ payroll, dueQuotes, address, isWrongChain, onSettled }: {
  payroll:      Payroll
  dueQuotes:    DueQuote[]
  address:      `0x${string}` | undefined
  isWrongChain: boolean
  onSettled:    () => void
}) {
  const roundIds = dueQuotes.map(q => q.roundId)

  const { data: simData, error: simError } = useSimulateContract({
    address: VALUTA_ADDRESS,
    abi: VALUTA_ABI,
    functionName: 'settle',
    args: [BigInt(payroll.id), roundIds],
    query: { enabled: !!address && !isWrongChain && roundIds.length > 0 },
  })

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const errMsg = simError
    ? decodeValutaError(simError)
    : writeError
    ? decodeValutaError(writeError)
    : null

  if (isSuccess) { onSettled(); reset() }

  const handleSettle = () => {
    if (!simData?.request) return
    writeContract(simData.request)
  }

  const btnLabel = () => {
    if (!address)      return 'Connect wallet to settle'
    if (isWrongChain)  return 'Switch to Arc'
    if (isPending)     return 'Confirm in wallet…'
    if (isConfirming)  return 'Confirming…'
    return dueQuotes.length > 1 ? `Settle ${dueQuotes.length} due` : 'Settle'
  }

  const canSettle = !!address && !isWrongChain && !!simData?.request && !isPending && !isConfirming

  return (
    <>
      {dueQuotes.map(q => (
        <div
          key={q.index}
          className="flex items-center px-5 gap-4 border-b"
          style={{ minHeight: '62px', borderColor: 'var(--rules)', background: 'var(--surface)' }}
        >
          <span className="mono text-[18px] w-6 text-right shrink-0" style={{ color: 'var(--amber)' }}>
            {String(q.index + 1).padStart(2, '0')}
          </span>
          <span className="label-caps shrink-0">VALUE</span>
          <span className="mono text-[13px] shrink-0">{fmtDateTime(q.payday)}</span>
          <span className="text-[13px] shrink-0" style={{ color: 'var(--amber)' }}>due</span>
          <span className="mono text-[13px] shrink-0" style={{ color: 'var(--secondary)' }}>
            rate already fixed
          </span>
          <span className="mono text-[13px] shrink-0">
            {fmtUsdc(q.usdc)} USDC
          </span>
        </div>
      ))}

      {/* Settle action row */}
      <div
        className="flex flex-wrap items-center justify-between px-5 py-3 border-b gap-3"
        style={{ borderColor: 'var(--rules)', background: 'var(--surface)' }}
      >
        <div>
          <p className="text-[13px] m-0" style={{ color: 'var(--secondary)' }}>
            Anyone can settle. The rate is already fixed.
          </p>
          {errMsg && (
            <p className="text-[13px] m-0 mt-1" style={{ color: 'var(--vermilion)' }}>{errMsg}</p>
          )}
          {hash && (
            <a
              href={`${ARC_EXPLORER}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] flex items-center gap-1 mt-1"
              style={{ color: 'var(--petrol)' }}
            >
              View on explorer <ExternalLink size={12} />
            </a>
          )}
        </div>
        <button
          onClick={handleSettle}
          disabled={!canSettle}
          className="px-4 py-1.5 rounded-btn text-[14px] font-medium transition-opacity"
          style={{
            background: canSettle ? 'var(--petrol)' : 'var(--rules)',
            color:       canSettle ? '#fff' : 'var(--secondary)',
            border: 'none',
            cursor:  canSettle ? 'pointer' : 'not-allowed',
            minWidth: '100px',
          }}
        >
          {btnLabel()}
        </button>
      </div>
    </>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center px-5 gap-4 border-b" style={{ height: 62, borderColor: 'var(--rules)' }}>
          <div className="skeleton h-4 w-6 rounded shrink-0" />
          <div className="skeleton h-4 w-32 rounded shrink-0" />
          <div className="skeleton h-4 w-20 rounded shrink-0" />
          <div className="skeleton h-4 w-24 rounded ml-auto shrink-0" />
        </div>
      ))}
    </>
  )
}
