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
  fmtDateTime, fmtTime, fmtNearPayday, fmtDateMixed, fmtAggRound, fmtLatenessVerbose,
  truncAddr, truncHash, convertUsdc,
} from '../lib/format'
import { VALUTA_ADDRESS, VALUTA_ABI, FEEDS, ARC_EXPLORER } from '../contracts/abi'
import { GuillocheSeal } from './GuillocheSeal'
import { CopyButton } from './CopyButton'
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
  next:        RoundData | null
  /** True while the neighbour-round read is in flight */
  nextLoading: boolean
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
  /** Called immediately after a settle is confirmed on-chain */
  onSettled?: (index: number) => void
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
  payroll, payslip, dueQuote, allDueRounds, next, nextLoading, maxAge,
  counterfactualAnswer, counterfactualRoundId,
  settlementTx, index, animKey, onSettled,
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

  // Fact 1: "Round N was live at HH:MM" — always the payday time
  const fact1 = paydayTs && roundUpdAt && roundId
    ? `Round ${fmtAggRound(roundId)} was live at ${fmtTime(paydayTs)}`
    : null

  // Fact 2: "Round N came at HH:MM[:SS][, N s after/before payday]"
  const factNextCameAt = !roundId
    ? null
    : nextLoading
      ? null   // still in flight — show skeleton in the facts list
      : next && next.updatedAt > 0
        ? (() => {
            const gap = paydayTs ? next.updatedAt - paydayTs : 999
            if (paydayTs && gap > 0 && gap < 60) {
              // Within 60 s after payday: HH:MM:SS + gap
              const timeStr = fmtNearPayday(next.updatedAt, paydayTs)
              return `Round ${fmtAggRound(next.roundId)} came at ${timeStr}, ${gap} s after payday`
            }
            return `Round ${fmtAggRound(next.roundId)} came at ${fmtTime(next.updatedAt)}`
          })()
        : 'No newer round yet'

  // Fact 3: age of the as-of round at payday, in h + m
  const factAge = paydayTs && roundUpdAt
    ? (() => {
        const maxH = Math.round(maxAge / 3600)
        if (roundUpdAt > paydayTs) {
          // stale fallback: the as-of round is the first after payday
          const staleSec = roundUpdAt - paydayTs
          const staleMin = Math.floor(staleSec / 60)
          const staleSec2 = staleSec % 60
          const staleStr  = staleMin > 0
            ? staleSec2 > 0 ? `${staleMin} m ${staleSec2} s` : `${staleMin} m`
            : `${staleSec} s`
          return `Stale fallback: next round came ${staleStr} after payday`
        }
        const ageSec = paydayTs - roundUpdAt
        const ageH   = Math.floor(ageSec / 3600)
        const ageM   = Math.floor((ageSec % 3600) / 60)
        if (ageH === 0)  return `${ageM} m old, inside ${maxH} h`
        if (ageM === 0)  return `${ageH} h old, inside ${maxH} h`
        return `${ageH} h ${ageM} m old, inside ${maxH} h`
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

  // Fire onSettled immediately when the tx confirms
  useEffect(() => {
    if (confirmed && onSettled) onSettled(index)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed])

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

  const isEnded = payroll.endedAt > 0

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
      }}
      aria-label={`Payslip ${index + 1} of ${payroll.count}, payroll ${payroll.id}`}
      aria-live="polite"
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

        {/* Ended banner */}
        {isEnded && (
          <div
            style={{
              padding: '6px 12px', marginBottom: 10,
              background: 'var(--ambtint)', borderRadius: 4,
              fontFamily: 'var(--font-words)', fontSize: 13, color: 'var(--amber)',
            }}
          >
            This payroll ended on {fmtDateTime(payroll.endedAt)} — no more paydays will be added.
          </div>
        )}

        {/* Header row */}
        <div className="payslip-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, marginTop: 4, gap: 12 }}>
          <div
            className="mono"
            style={{ fontSize: 13, color: 'var(--secondary)', letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}
          >
            {isLoading
              ? <Skeleton w={280} h={14} />
              : `VALUTA PAYSLIP · No. ${String(index + 1).padStart(2, '0')} of ${payroll.count} · PAYROLL ${payroll.id}`
            }
          </div>

          {/* Value-date stamp — one line, 28 px Hanken 600, -3° */}
          {paydayTs ? (
            <motion.div
              key={`stamp-${animKey}`}
              initial={stampInitial}
              animate={stampSpring}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              className="payslip-stamp"
              style={{
                border: `2.5px solid ${isDue ? 'var(--amber)' : 'var(--petrol)'}`,
                borderRadius: 6,
                padding: '10px 18px',
                color: isDue ? 'var(--amber)' : 'var(--petrol)',
                textAlign: 'center',
                transformOrigin: 'center center',
                flexShrink: 0,
                maxWidth: 362,
              }}
            >
              <div
                className="payslip-stamp-text"
                style={{
                  fontFamily: 'var(--font-words)',
                  fontSize: 'clamp(14px, 1.45vw, 20px)',
                  fontWeight: 600,
                  letterSpacing: '.04em',
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                }}
              >
                VALUE {fmtDateTimeStamp(paydayTs)}
              </div>
              {isDue && (
                <div
                  className="mono"
                  style={{
                    fontSize: 'clamp(10px, 0.9vw, 13px)',
                    fontWeight: 700,
                    letterSpacing: '.1em',
                    color: 'var(--state-due)',
                    textAlign: 'center',
                    marginTop: 4,
                  }}
                >
                  DUE
                </div>
              )}
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
                  const rateStr  = fmtRate8(answer)
                  const inv2dp   = isInverse
                    ? `≈ ${fmtRateInverse(answer)} per USD`
                    : `≈ ${fmtRateInverse(answer)} ${currency} per USD`
                  const roundNum = fmtAggRound(roundId)
                  const pubAt    = roundUpdAt ? fmtTime(roundUpdAt) : '—'
                  return `Rate ${currency}/USD ${rateStr} (${inv2dp}) · Chainlink round ${roundNum}, published ${pubAt}`
                })()
            }
          </div>
        </div>
        <div style={{ borderBottom: '1px dashed var(--rule)', marginBottom: 16 }} />

        {/*
          payslip-body-row: on desktop (≥700px) this is a flex row —
            left col (amount + counterfactual + facts) | right col (seal).
          On phones (<700px) it collapses: amount and counterfactual are
            full-width, then a sub-row holds facts-left + seal-right.
        */}
        <div className="payslip-body-row">

          {/* Left column: amount, counterfactual, facts */}
          <div className="payslip-body-left">

            {/* Amount */}
            {isLoading || usdc === null
              ? <Skeleton w={300} h={64} />
              : (
                <div
                  className="mono"
                  style={{
                    fontSize: 'clamp(36px, 5vw, 64px)',
                    fontWeight: 300,
                    color: isSettled ? 'var(--state-paid)' : 'var(--ink)',
                    lineHeight: 1,
                    letterSpacing: '-.01em',
                    marginBottom: 4,
                  }}
                >
                  {fmtUsdc(usdc)}{' '}
                  <span>USDC</span>
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

            {/*
              On phones this sub-row holds facts (left) + seal (right).
              On desktop the seal is in payslip-body-right instead.
            */}
            <div className="payslip-facts-seal-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Three proof facts */}
                <motion.div
                  key={`facts-${animKey}`}
                  ref={factRef}
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  {[fact1, factNextCameAt, factAge].map((fact, fi) =>
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
                    ) : (fi === 1 && nextLoading && roundId) ? (
                      <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="skeleton" style={{ width: 15, height: 15, borderRadius: '50%', flexShrink: 0 }} />
                        <div className="skeleton" style={{ width: 200, height: 14 }} />
                      </div>
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

              {/* Seal — phone only: visible here beside the facts */}
              {roundId != null && !!paydayTs && (
                <div className="payslip-seal-phone-only payslip-seal-wrap" style={{ flexShrink: 0 }}>
                  <GuillocheSeal
                    roundId={roundId}
                    payday={paydayTs}
                    state={sealState}
                    size={96}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right column: seal — desktop only */}
          {roundId != null && !!paydayTs && (
            <div className="payslip-body-right payslip-seal-wrap" style={{ flexShrink: 0 }}>
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
            {/* Primary line: settled … by … · tx … · Verify on Arc ↗ */}
            <div style={{ borderTop: '1px solid var(--rule)', marginTop: 16, paddingTop: 12 }}>
              <div className="mono" style={{ fontSize: 13, color: 'var(--secondary)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 6px', lineHeight: 1.6 }}>
                <span>settled {fmtDateTime(payslip.settledAt)}</span>
                <span>by {truncAddr(payslip.settler, 6, 4)}</span>
                <CopyButton value={payslip.settler} label="settler address" />
                <span>
                  {payslip.settler.toLowerCase() === payroll.employer.toLowerCase()
                    ? '· employer'
                    : '· not the employer'}
                </span>
                {settlementTx && (
                  <>
                    <span>· tx {truncHash(settlementTx.hash)}</span>
                    <CopyButton value={settlementTx.hash} label="transaction hash" />
                    <span>·</span>
                    <a href={`${ARC_EXPLORER}/tx/${settlementTx.hash}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--petrol)', textDecoration: 'none' }}>
                      Verify on Arc ↗
                    </a>
                  </>
                )}
              </div>
            </div>
            {/* Quiet line: lateness · Try to cheat it ↓ */}
            <div className="mono" style={{ fontSize: 12, color: 'var(--secondary)', marginTop: 5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 8px' }}>
              {latenessLabel && <span>{latenessLabel}</span>}
              {rateNote && <span>· {rateNote}</span>}
              <a href="#cheat" style={{ color: 'var(--secondary)', textDecoration: 'none' }}>
                · Try to cheat it ↓
              </a>
            </div>
          </>
        )}

        {/* DUE actions */}
        {isDue && (
          <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {confirmed ? (
              <div
                className="mono"
                style={{
                  fontSize: 13, color: 'var(--state-paid)', border: '1px solid var(--state-paid)',
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
