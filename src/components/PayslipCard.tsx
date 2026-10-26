// PayslipCard — the hero security document
import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CircleCheck, CircleX } from 'lucide-react'
import { useWriteContract, useSimulateContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { useModal } from 'connectkit'
import { arc } from 'viem/chains'
import type { Payroll, Payslip, DueQuote, RoundData } from '../lib/types'
import {
  fmtUsdc, fmtSalary, fmtRate8, fmtRateInverse, fmtDateTimeStamp,
  fmtDateTime, fmtTime, fmtDateMixed, fmtAggRound, fmtLatenessVerbose,
  truncAddr, truncHash, convertUsdc,
} from '../lib/format'
import { VALUTA_ADDRESS, VALUTA_ABI, FEEDS, ARC_EXPLORER } from '../contracts/abi'
import { GuillocheSeal } from './GuillocheSeal'
import { decodeValutaError } from '../lib/errors'

interface Props {
  payroll:   Payroll
  /** Selected payslip (settled) or null */
  payslip:   Payslip | null
  /** Due quote (for DUE state) */
  dueQuote:  DueQuote | null
  /** All due quotes up to and including the selected one (for multi-settle) */
  allDueRounds: bigint[]
  /** Next neighbour round loaded from chain */
  next:      RoundData | null
  maxAge:    number
  /** Rate at settledAt (for counterfactual) */
  counterfactualAnswer: bigint | null
  counterfactualRoundId: bigint | null
  /** Settlement tx */
  settlementTx: { hash: `0x${string}`; block: bigint } | null
  /** Index within the payroll (0-based) */
  index: number
  /** Animation key — increment to replay stamps */
  animKey: number
}

function GuillocheGround() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    >
      <defs>
        <pattern id="guilloché-ground" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M0 10 Q5 0 10 10 Q15 20 20 10 Q25 0 30 10 Q35 20 40 10"
            fill="none"
            stroke="#0B4F6C"
            strokeWidth="0.6"
            opacity="0.05"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#guilloché-ground)" />
    </svg>
  )
}

function Skeleton({ w, h, className = '' }: { w: number | string; h: number; className?: string }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: w, height: h, borderRadius: 4 }}
    />
  )
}

export function PayslipCard({
  payroll, payslip, dueQuote, allDueRounds, next, maxAge,
  counterfactualAnswer, counterfactualRoundId,
  settlementTx, index, animKey,
}: Props) {
  const reduced = useReducedMotion()
  const { address: walletAddr } = useAccount()
  const { setOpen } = useModal()

  // Determine state
  const isDue      = !payslip && !!dueQuote
  const isSettled  = !!payslip
  const isUpcoming = !payslip && !dueQuote

  // Values to display
  const roundId      = payslip?.roundId ?? dueQuote?.roundId ?? null
  const answer       = payslip?.answer  ?? (dueQuote?.answer ? dueQuote.answer : null)
  const roundUpdAt   = payslip?.roundUpdatedAt ?? dueQuote?.roundUpdatedAt ?? null
  const paydayTs     = payslip?.payday  ?? dueQuote?.payday ?? null
  const usdc         = payslip ? payslip.usdc  : (dueQuote?.usdc ?? null)
  const currency     = payroll.currency
  const feedInfo     = FEEDS[currency]
  const isInverse    = feedInfo?.inverse ?? false

  // Seal state
  const sealState = isSettled ? 'full' : isDue ? 'outline' : 'none'

  // Three proof facts
  const factPaydayLive = paydayTs && roundUpdAt
    ? roundUpdAt <= paydayTs
    : null
  const factNextCameAt = next
    ? (next.updatedAt > 0 ? `Round ${fmtAggRound(next.roundId)} came at ${fmtTime(next.updatedAt)}` : 'No newer round yet')
    : (!roundId ? null : 'No newer round yet')
  const factAge = paydayTs && roundUpdAt
    ? (() => {
        const ageMin = Math.round((paydayTs - roundUpdAt) / 60)
        const maxH   = Math.round(maxAge / 3600)
        if (roundUpdAt > paydayTs) {
          // stale fallback: the as-of round is the first after payday
          const staleMin = Math.round((roundUpdAt - paydayTs) / 60)
          return `Stale fallback: next round came ${staleMin} min after payday`
        }
        if (ageMin < 60) return `${ageMin} minutes old, inside ${maxH} h`
        const ageH = Math.round(ageMin / 60)
        return `${ageH} h old, inside ${maxH} h`
      })()
    : null

  // Counterfactual
  const sameRound = counterfactualRoundId !== null && roundId !== null
    && counterfactualRoundId === roundId
  const counterfactualUsdc = (!sameRound && counterfactualAnswer && answer !== null
    && payroll.salary > 0n)
    ? convertUsdc(payroll.salary, counterfactualAnswer, isInverse)
    : null

  // Lateness label
  const latenessLabel = payslip
    ? fmtLatenessVerbose(payslip.settledAt, payslip.payday)
    : null
  const rateNote = sameRound ? 'the rate did not move' : null

  // Settlement write — settle all due paydays up to and including this one
  const { data: simData, error: simError } = useSimulateContract({
    address: VALUTA_ADDRESS,
    abi: VALUTA_ABI,
    functionName: 'settle',
    args: isDue && allDueRounds.length > 0
      ? [BigInt(payroll.id), allDueRounds]
      : [BigInt(payroll.id), []],
    chainId: arc.id,
    query: { enabled: isDue && allDueRounds.length > 0 && !!walletAddr },
  })
  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: arc.id,
  })
  const settleError = simError ? decodeValutaError(simError) : null

  const handleSettle = () => {
    if (!walletAddr) { setOpen(true); return }
    if (simData?.request) writeContract(simData.request)
  }

  // Animate on selection
  const stampSpring = reduced
    ? { scale: 1, rotate: -3, opacity: 1 }
    : { scale: 1, rotate: -3, opacity: 1 }
  const stampInitial = reduced
    ? { scale: 1, rotate: -3, opacity: 1 }
    : { scale: 1.12, rotate: -6, opacity: 0 }

  const factRef = useRef<HTMLDivElement>(null)

  // Seal draw animation setup
  useEffect(() => {
    // seal path length approximation — handled via CSS animation in GuillocheSeal
  }, [animKey])

  const isLoading = !payroll

  return (
    <article
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--rule)',
        borderRadius: 6,
        boxShadow: 'var(--shadow-paper)',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        minHeight: 474,
      }}
      aria-label={`Payslip ${index + 1}`}
    >
      {/* Perforated top edge */}
      <div
        className="perf-top"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 14,
          background: 'var(--ground)', zIndex: 2,
        }}
      />

      {/* Guilloché ground */}
      <GuillocheGround />

      <div style={{ position: 'relative', zIndex: 1, padding: '24px 32px 28px', paddingTop: 20 }}>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, marginTop: 4 }}>
          <div
            className="mono"
            style={{ fontSize: 13, color: 'var(--secondary)', letterSpacing: '.08em', textTransform: 'uppercase' }}
          >
            {isLoading
              ? <Skeleton w={280} h={14} />
              : `VALUTA PAYSLIP · No. ${String(index + 1).padStart(2, '0')} of ${payroll.count} · PAYROLL ${payroll.id}`
            }
          </div>

          {/* Value-date stamp */}
          {paydayTs ? (
            <motion.div
              key={`stamp-${animKey}`}
              initial={stampInitial}
              animate={stampSpring}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              style={{
                border: `2.5px solid ${isDue ? 'var(--amber)' : 'var(--petrol)'}`,
                borderRadius: 6,
                padding: '6px 14px',
                color: isDue ? 'var(--amber)' : 'var(--petrol)',
                textAlign: 'center',
                transformOrigin: 'center center',
                maxWidth: 360,
                flexShrink: 0,
              }}
            >
              <div
                className="mono"
                style={{ fontSize: 17, fontWeight: 700, letterSpacing: '.12em', lineHeight: 1.25 }}
              >
                VALUE {fmtDateTimeStamp(paydayTs)}
                {isDue ? ' · DUE' : ''}
              </div>
            </motion.div>
          ) : isLoading ? (
            <Skeleton w={280} h={52} />
          ) : null}
        </div>

        {/* Salary line */}
        <div className="mono" style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 14 }}>
          {isLoading
            ? <Skeleton w={160} h={16} />
            : `Salary ${currency} ${fmtSalary(payroll.salary, currency)}`
          }
        </div>

        {/* Rate line — between dashed rules */}
        <div style={{ borderTop: '1px dashed var(--rule)', paddingTop: 10, marginBottom: 10 }}>
          <div className="mono" style={{ fontSize: 15, color: 'var(--ink)' }}>
            {isLoading || !answer || !roundId
              ? <Skeleton w={440} h={15} />
              : (() => {
                  const rateStr = fmtRate8(answer)
                  const inv     = isInverse
                    ? `≈ ${fmtRateInverse(answer)} ${currency} per USD`
                    : `≈ ${fmtRateInverse(answer)} ${currency} per USD`
                  const roundNum = fmtAggRound(roundId)
                  const pubAt    = roundUpdAt ? fmtTime(roundUpdAt) : '—'
                  return `Rate ${currency}/USD ${rateStr} (${inv}) · Chainlink round ${roundNum}, published ${pubAt}`
                })()
            }
          </div>
        </div>
        <div style={{ borderBottom: '1px dashed var(--rule)', marginBottom: 16 }} />

        {/* Paid amount + seal row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Amount */}
            {isLoading || usdc === null
              ? <Skeleton w={300} h={64} />
              : (
                <div
                  className="mono"
                  style={{
                    fontSize: 64, fontWeight: 300, color: 'var(--carbon)',
                    lineHeight: 1, letterSpacing: '-.01em',
                    marginBottom: 4,
                  }}
                >
                  {fmtUsdc(usdc)} <span style={{ fontSize: 44 }}>USDC</span>
                </div>
              )
            }
            {isDue && (
              <div style={{ fontSize: 12, color: 'var(--amber)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                already fixed
              </div>
            )}

            {/* Counterfactual */}
            {isSettled && (
              <div className="mono" style={{ fontSize: 13, color: 'var(--secondary)', marginBottom: 12 }}>
                {sameRound
                  ? 'Settled while its own round was still live: same amount'
                  : counterfactualUsdc !== null
                    ? (
                      <span style={{ textDecoration: 'line-through' }}>
                        {fmtUsdc(counterfactualUsdc)} at the {payslip ? fmtDateMixed(payslip.settledAt) : '—'} rate it settled on
                      </span>
                    )
                    : null
                }
              </div>
            )}

            {/* Three proof facts */}
            <motion.div
              key={`facts-${animKey}`}
              ref={factRef}
              style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              {[
                paydayTs && roundUpdAt && roundId
                  ? `Round ${fmtAggRound(roundId)} was live at ${fmtTime(paydayTs)}`
                  : null,
                factNextCameAt,
                factAge,
              ].map((fact, fi) =>
                fact ? (
                  <motion.div
                    key={fi}
                    initial={reduced ? { opacity: 1 } : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduced ? 0 : fi * 0.09, duration: 0.2 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <CircleCheck size={15} style={{ color: 'var(--petrol)', flexShrink: 0 }} />
                    <span className="mono" style={{ fontSize: 15, color: 'var(--ink)' }}>{fact}</span>
                  </motion.div>
                ) : null
              )}
              {factPaydayLive === false && roundUpdAt && paydayTs && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CircleX size={15} style={{ color: 'var(--void)', flexShrink: 0 }} />
                  <span className="mono" style={{ fontSize: 14, color: 'var(--void)' }}>
                    Stale-fallback: live round was more than {Math.round(maxAge / 3600)} h old
                  </span>
                </div>
              )}
            </motion.div>

            {/* Upcoming hint */}
            {isUpcoming && (
              <div className="mono" style={{ fontSize: 13, color: 'var(--secondary)', marginTop: 8 }}>
                Today's rate would pay ≈ — ; the round live at payday decides
              </div>
            )}
          </div>

          {/* RATE HELD seal */}
          {roundId != null && !!paydayTs && (
            <div style={{ flexShrink: 0, marginTop: -8 }}>
              <GuillocheSeal
                roundId={roundId}
                payday={paydayTs}
                state={sealState}
                size={171}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {isSettled && payslip && (
          <>
            <div style={{ borderTop: '1px solid var(--rule)', marginTop: 16, paddingTop: 12 }}>
              <div className="mono" style={{ fontSize: 14, color: 'var(--secondary)' }}>
                {'settled '}
                {fmtDateTime(payslip.settledAt)}
                {' by '}
                {truncAddr(payslip.settler, 6, 4)}
                {payslip.settler.toLowerCase() === payroll.employer.toLowerCase()
                  ? ', the employer'
                  : ', not the employer'}
                {settlementTx ? (
                  <>
                    {' · tx '}
                    {truncHash(settlementTx.hash)}
                    {' · '}
                    <a
                      href={`${ARC_EXPLORER}/tx/${settlementTx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--petrol)' }}
                    >
                      Verify on Arc ↗
                    </a>
                    {' · '}
                    <a
                      href="#cheat"
                      style={{ color: 'var(--secondary)' }}
                    >
                      Try to cheat it ↓
                    </a>
                  </>
                ) : null}
              </div>
            </div>
            {(latenessLabel || rateNote) && (
              <div className="mono" style={{ fontSize: 12, color: 'var(--secondary)', marginTop: 6, opacity: .75 }}>
                {[latenessLabel, rateNote].filter(Boolean).join(' · ')}
              </div>
            )}
          </>
        )}

        {/* DUE actions */}
        {isDue && (
          <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {confirmed ? (
              <div
                className="mono"
                style={{
                  fontSize: 13, color: 'var(--petrol)', border: '1px solid var(--petrol)',
                  borderRadius: 4, padding: '6px 12px',
                }}
              >
                ✓ Settled {allDueRounds.length > 1 ? `${allDueRounds.length} paydays` : '1 payday'} ·{' '}
                <a href={`${ARC_EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                  {txHash ? truncHash(txHash) : ''} ↗
                </a>
              </div>
            ) : (
              <button
                onClick={handleSettle}
                disabled={isPending || confirming || !!settleError}
                style={{
                  background: 'var(--petrol)', color: '#fff', border: 'none',
                  borderRadius: 4, padding: '8px 18px', cursor: isPending || confirming ? 'wait' : 'pointer',
                  fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 14,
                  opacity: (isPending || confirming || !!settleError) ? .65 : 1,
                }}
              >
                {isPending ? 'Confirm in wallet…' : confirming ? 'Confirming…' : 'Settle now'}
              </button>
            )}
            {settleError && (
              <div className="mono" style={{ fontSize: 12, color: 'var(--void)' }}>{settleError}</div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
