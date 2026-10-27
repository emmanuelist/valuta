// EmployerPanel — shown when the connected wallet is this payroll's employer
import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useSimulateContract, useWaitForTransactionReceipt } from 'wagmi'
import { arc } from 'viem/chains'
import type { Payroll, DueQuote } from '../lib/types'
import { fmtUsdc, convertUsdc } from '../lib/format'
import { VALUTA_ADDRESS, VALUTA_ABI, ARC_EXPLORER, FEEDS } from '../contracts/abi'
import { decodeValutaError } from '../lib/errors'

interface Props {
  payroll:    Payroll
  dueQuotes:  DueQuote[]
  latestAnswer: bigint | null  // latest rate for reserve runway estimate
  onRefetch:  () => void
}

export function EmployerPanel({ payroll, dueQuotes, latestAnswer, onRefetch }: Props) {
  const { address } = useAccount()

  // Only show when connected wallet is the employer
  if (!address || address.toLowerCase() !== payroll.employer.toLowerCase()) return null

  return (
    <EmployerPanelInner
      payroll={payroll}
      dueQuotes={dueQuotes}
      latestAnswer={latestAnswer}
      onRefetch={onRefetch}
    />
  )
}

function EmployerPanelInner({
  payroll, dueQuotes, latestAnswer, onRefetch,
}: {
  payroll: Payroll
  dueQuotes: DueQuote[]
  latestAnswer: bigint | null
  onRefetch: () => void
}) {
  const [fundAmt, setFundAmt] = useState('')
  const [reclaimAmt, setReclaimAmt] = useState('')
  const [endConfirm, setEndConfirm] = useState(false)

  const payrollId = BigInt(payroll.id)
  const feedInfo  = FEEDS[payroll.currency]
  const isInverse = feedInfo?.inverse ?? false

  // ── Reserve runway estimate ────────────────────────────────────────────────
  let runwayLabel = ''
  if (latestAnswer && latestAnswer > 0n && payroll.reserve > 0n) {
    try {
      const perPayday = convertUsdc(payroll.salary, latestAnswer, isInverse)
      if (perPayday > 0n) {
        const paydays = payroll.reserve / perPayday
        runwayLabel = ` covers about ${paydays} more payday${paydays === 1n ? '' : 's'} at today's rate`
      }
    } catch { /* ignore */ }
  }

  // ── Fund ───────────────────────────────────────────────────────────────────
  const fundWei = (() => {
    const f = parseFloat(fundAmt)
    if (!isFinite(f) || f <= 0) return 0n
    return BigInt(Math.round(f * 1e6)) * 1_000_000_000_000n
  })()

  const { data: fundSim, error: fundSimErr } = useSimulateContract({
    address: VALUTA_ADDRESS, abi: VALUTA_ABI,
    functionName: 'fund',
    args: [payrollId],
    value: fundWei,
    chainId: arc.id,
    query: { enabled: fundWei > 0n },
  })
  const { writeContract: fundWrite, data: fundHash, isPending: fundPending } = useWriteContract()
  const { isLoading: fundConfirming, isSuccess: fundDone } = useWaitForTransactionReceipt({ hash: fundHash, chainId: arc.id })
  const fundError = fundSimErr ? decodeValutaError(fundSimErr) : null

  const handleFund = () => {
    if (fundSim?.request) { fundWrite(fundSim.request); onRefetch() }
  }

  // ── Reclaim ────────────────────────────────────────────────────────────────
  const reclaimWei = (() => {
    const f = parseFloat(reclaimAmt)
    if (!isFinite(f) || f <= 0) return 0n
    return BigInt(Math.round(f * 1e6)) * 1_000_000_000_000n
  })()

  const reclaimBlocked = dueQuotes.length > 0
    ? `${dueQuotes.length} payday${dueQuotes.length > 1 ? 's are' : ' is'} due. Settle them first; the contract refuses (UnsettledPaydays).`
    : payroll.arrears > 0n
    ? `Outstanding arrears: ${fmtUsdc(payroll.arrears)} USDC. Clear them first.`
    : reclaimWei > payroll.reserve
    ? `Amount exceeds reserve (${fmtUsdc(payroll.reserve)} USDC). Lower it.`
    : null

  const { data: reclaimSim, error: reclaimSimErr } = useSimulateContract({
    address: VALUTA_ADDRESS, abi: VALUTA_ABI,
    functionName: 'reclaim',
    args: [payrollId, reclaimWei],
    chainId: arc.id,
    query: { enabled: reclaimWei > 0n && !reclaimBlocked },
  })
  const { writeContract: reclaimWrite, data: reclaimHash, isPending: reclaimPending } = useWriteContract()
  const { isLoading: reclaimConfirming, isSuccess: reclaimDone } = useWaitForTransactionReceipt({ hash: reclaimHash, chainId: arc.id })
  const reclaimError = reclaimSimErr ? decodeValutaError(reclaimSimErr) : null

  const handleReclaim = () => {
    if (reclaimSim?.request) { reclaimWrite(reclaimSim.request); onRefetch() }
  }

  // ── End payroll ────────────────────────────────────────────────────────────
  const { data: endSim, error: endSimErr } = useSimulateContract({
    address: VALUTA_ADDRESS, abi: VALUTA_ABI,
    functionName: 'end',
    args: [payrollId],
    chainId: arc.id,
    query: { enabled: endConfirm && payroll.endedAt === 0 },
  })
  const { writeContract: endWrite, data: endHash, isPending: endPending } = useWriteContract()
  const { isLoading: endConfirming, isSuccess: endDone } = useWaitForTransactionReceipt({ hash: endHash, chainId: arc.id })
  const endError = endSimErr ? decodeValutaError(endSimErr) : null

  const handleEnd = useCallback(() => {
    if (endSim?.request) { endWrite(endSim.request); onRefetch() }
  }, [endSim, endWrite, onRefetch])

  const already = payroll.endedAt > 0

  return (
    <section
      style={{ maxWidth: 1344, margin: '0 auto', padding: '40px 27px 0' }}
      aria-labelledby="employer-heading"
    >
      <article
        style={{
          background: 'var(--paper)',
          border: '2px solid var(--petrol)',
          borderRadius: 6,
          padding: '24px 28px',
        }}
      >
        <h2
          id="employer-heading"
          style={{ fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 18, color: 'var(--petrol)', margin: '0 0 6px' }}
        >
          Employer panel
        </h2>
        <div className="mono" style={{ fontSize: 13, color: 'var(--secondary)', marginBottom: 20 }}>
          Payroll {payroll.id} · reserve {fmtUsdc(payroll.reserve)} USDC{runwayLabel}.
        </div>

        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>

          {/* Fund */}
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Fund</div>
            <div style={{ fontSize: 13, color: 'var(--secondary)', fontFamily: 'var(--font-words)', marginBottom: 10 }}>
              Pays arrears first, then tops up the reserve.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                step="0.000001"
                value={fundAmt}
                onChange={e => setFundAmt(e.target.value)}
                placeholder="USDC amount"
                className="form-input"
                style={{ width: 140 }}
              />
              <button
                onClick={handleFund}
                disabled={fundWei === 0n || fundPending || fundConfirming || !!fundError}
                style={{
                  background: 'var(--petrol)', color: '#fff', border: 'none',
                  borderRadius: 4, padding: '8px 16px', cursor: fundWei > 0n ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 14,
                  opacity: (fundWei === 0n || fundPending || fundConfirming) ? 0.6 : 1,
                }}
              >
                {fundPending ? 'Confirm…' : fundConfirming ? 'Sending…' : 'Fund'}
              </button>
            </div>
            {fundError && <div className="mono" style={{ fontSize: 12, color: 'var(--void)', marginTop: 6 }}>{fundError}</div>}
            {fundDone && fundHash && (
              <div className="mono" style={{ fontSize: 12, color: 'var(--petrol)', marginTop: 6 }}>
                ✓ Funded ·{' '}
                <a href={`${ARC_EXPLORER}/tx/${fundHash}`} target="_blank" rel="noopener noreferrer">tx ↗</a>
              </div>
            )}
          </div>

          {/* Reclaim */}
          <div style={{ flex: '1 1 280px' }}>
            <div style={{ fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Reclaim</div>
            {reclaimBlocked ? (
              <div style={{ fontSize: 13, color: 'var(--secondary)', fontFamily: 'var(--font-words)', marginBottom: 10 }}>
                {reclaimBlocked}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--secondary)', fontFamily: 'var(--font-words)', marginBottom: 10 }}>
                Withdraw from the reserve. Available: {fmtUsdc(payroll.reserve)} USDC.
              </div>
            )}
            {!reclaimBlocked && (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    step="0.000001"
                    value={reclaimAmt}
                    onChange={e => setReclaimAmt(e.target.value)}
                    placeholder="USDC amount"
                    className="form-input"
                    style={{ width: 140 }}
                  />
                  <button
                    onClick={handleReclaim}
                    disabled={reclaimWei === 0n || reclaimPending || reclaimConfirming || !!reclaimError}
                    style={{
                      background: 'transparent', color: 'var(--petrol)',
                      border: '1.5px solid var(--petrol)',
                      borderRadius: 4, padding: '8px 16px',
                      cursor: reclaimWei > 0n ? 'pointer' : 'not-allowed',
                      fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 14,
                      opacity: reclaimWei === 0n ? 0.5 : 1,
                    }}
                  >
                    {reclaimPending ? 'Confirm…' : reclaimConfirming ? 'Sending…' : 'Reclaim'}
                  </button>
                </div>
                {reclaimError && <div className="mono" style={{ fontSize: 12, color: 'var(--void)', marginTop: 6 }}>{reclaimError}</div>}
                {reclaimDone && reclaimHash && (
                  <div className="mono" style={{ fontSize: 12, color: 'var(--petrol)', marginTop: 6 }}>
                    ✓ Reclaimed ·{' '}
                    <a href={`${ARC_EXPLORER}/tx/${reclaimHash}`} target="_blank" rel="noopener noreferrer">tx ↗</a>
                  </div>
                )}
              </>
            )}
          </div>

          {/* End payroll — destructive, apart from Fund */}
          {!already && (
            <div style={{ flex: '1 1 220px', borderLeft: '1px solid var(--rule)', paddingLeft: 28 }}>
              <div style={{ fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 15, color: 'var(--secondary)', marginBottom: 6 }}>
                End payroll
              </div>
              <div style={{ fontSize: 13, color: 'var(--secondary)', fontFamily: 'var(--font-words)', marginBottom: 10 }}>
                Paydays already due still settle. No new paydays come due.
              </div>
              {!endConfirm ? (
                <button
                  onClick={() => setEndConfirm(true)}
                  style={{
                    background: 'transparent', color: 'var(--secondary)',
                    border: '1.5px solid var(--rule)',
                    borderRadius: 4, padding: '7px 14px',
                    fontFamily: 'var(--font-words)', fontWeight: 500, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  End this payroll
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={handleEnd}
                    disabled={endPending || endConfirming || !!endError}
                    style={{
                      background: 'transparent', color: 'var(--void)',
                      border: '1.5px solid var(--void)',
                      borderRadius: 4, padding: '7px 14px',
                      fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    {endPending ? 'Confirm…' : endConfirming ? 'Sending…' : 'Confirm end'}
                  </button>
                  <button
                    onClick={() => setEndConfirm(false)}
                    style={{
                      background: 'transparent', color: 'var(--secondary)', border: 'none',
                      fontFamily: 'var(--font-words)', fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {endError && <div className="mono" style={{ fontSize: 12, color: 'var(--void)', marginTop: 6 }}>{endError}</div>}
              {endDone && endHash && (
                <div className="mono" style={{ fontSize: 12, color: 'var(--petrol)', marginTop: 6 }}>
                  ✓ Ended ·{' '}
                  <a href={`${ARC_EXPLORER}/tx/${endHash}`} target="_blank" rel="noopener noreferrer">tx ↗</a>
                </div>
              )}
            </div>
          )}
        </div>
      </article>
    </section>
  )
}
