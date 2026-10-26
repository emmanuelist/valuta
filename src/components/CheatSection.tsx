// CheatSection — "Try to cheat it."
// Four read-only eth_calls that try to break the payslip's rate proof.
// Every result comes from the live contract on Arc mainnet.
import { useRef, useCallback, useState } from 'react'
import { usePublicClient, useAccount } from 'wagmi'
import { arc } from 'viem/chains'
import { motion, AnimatePresence } from 'framer-motion'
import type { Payroll, Payslip, DueQuote } from '../lib/types'
import {
  fmtUsdc,
  truncAddr,
} from '../lib/format'
import { VALUTA_ADDRESS, VALUTA_ABI, FEEDS } from '../contracts/abi'
import { decodeValutaErrorRich } from '../lib/errors'

// ── Types ────────────────────────────────────────────────────────────────────

type AttemptState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'refused'; errorName: string; errorArgs: readonly unknown[]; message: string }
  | { status: 'settles'; message: string }
  | { status: 'rpc-error'; reason: string }

interface AttemptConfig {
  id: string
  label: string           // "Pay it at the rate on the day it was settled"
  callSig: string         // mono 13px description of the call
  disabled?: boolean
  /** Struck-through USDC amount to show under the result (attempt 1 only) */
  strikethroughHint?: string
  run: () => Promise<AttemptState>
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function VoidStamp({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <motion.div
      initial={{ scale: 1.3, rotate: -6, opacity: 0 }}
      animate={{ scale: 1, rotate: -3, opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'inline-block',
        border: '2.5px solid var(--void)',
        borderRadius: 4,
        padding: '1px 8px',
        color: 'var(--void)',
        fontFamily: 'var(--font-words)',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '.12em',
        lineHeight: '22px',
        transformOrigin: 'center center',
        flexShrink: 0,
      }}
    >
      VOID
    </motion.div>
  )
}

function SettlesStamp() {
  return (
    <motion.div
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'inline-block',
        border: '2.5px solid var(--petrol)',
        borderRadius: 4,
        padding: '1px 8px',
        color: 'var(--petrol)',
        fontFamily: 'var(--font-words)',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '.12em',
        lineHeight: '22px',
        flexShrink: 0,
      }}
    >
      SETTLES
    </motion.div>
  )
}

// Format decoded error args, showing round ids as their low 64 bits
function fmtErrorDetail(name: string, args: readonly unknown[]): string {
  if (name === 'NotAsOfPayday' && args.length >= 2) {
    const paydayTs = Number(args[0])
    const roundId  = BigInt(String(args[1]))
    const aggId    = roundId & ((1n << 64n) - 1n)
    const d = new Date(paydayTs * 1000)
    const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]
    const h = String(d.getUTCHours()).padStart(2,'0')
    const mi = String(d.getUTCMinutes()).padStart(2,'0')
    return `NotAsOfPayday: the contract refused round ${aggId} for the ${d.getUTCDate()} ${mo} ${h}:${mi} UTC payday.`
  }
  if (name === 'UnsettledPaydays') {
    return 'UnsettledPaydays: there are due paydays. The contract refuses to release the reserve while pay is owed.'
  }
  if (name === 'NotEmployer') {
    return 'NotEmployer: only the employer can reclaim. This address has no standing.'
  }
  if (args.length === 0) return name
  const argStr = args.map(a => {
    if (typeof a === 'bigint') {
      const agg = a & ((1n << 64n) - 1n)
      return agg !== a ? `${agg} (round)` : String(a)
    }
    return String(a)
  }).join(', ')
  return `${name}(${argStr})`
}

// ── The Row ───────────────────────────────────────────────────────────────────

function AttemptRow({
  cfg, state, onRun, num,
}: {
  cfg: AttemptConfig
  state: AttemptState
  onRun: () => void
  num: number
}) {
  const isRunning = state.status === 'running'
  const isDisabled = cfg.disabled || isRunning

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '8px 16px',
        padding: '14px 0',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      {/* Left: number + label + call sig */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span className="mono" style={{ fontSize: 13, color: 'var(--secondary)', flexShrink: 0 }}>
            {num}.
          </span>
          <span style={{ fontFamily: 'var(--font-words)', fontWeight: 500, fontSize: 17, color: cfg.disabled ? 'var(--secondary)' : 'var(--ink)' }}>
            {cfg.label}
          </span>
        </div>
        <div className="mono" style={{ fontSize: 13, color: 'var(--secondary)', paddingLeft: 22 }}>
          {cfg.callSig}
        </div>
      </div>

      {/* Right: Run button */}
      <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 2 }}>
        <button
          onClick={onRun}
          disabled={isDisabled}
          style={{
            border: `1.5px solid ${isDisabled ? 'var(--rule)' : 'var(--petrol)'}`,
            borderRadius: 4,
            padding: '5px 14px',
            background: 'transparent',
            color: isDisabled ? 'var(--secondary)' : 'var(--petrol)',
            fontFamily: 'var(--font-words)',
            fontWeight: 600,
            fontSize: 14,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {isRunning ? 'asking Arc…' : 'Run'}
        </button>
      </div>

      {/* Result — spans both columns */}
      <AnimatePresence mode="wait">
        {state.status !== 'idle' && state.status !== 'running' && (
          <motion.div
            key={state.status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}
          >
            {state.status === 'refused' && (
              <>
                <VoidStamp show />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="mono" style={{ fontSize: 13, color: 'var(--ink)' }}>
                    {fmtErrorDetail(state.errorName, state.errorArgs)}
                  </span>
                  {cfg.strikethroughHint && (
                    <span className="mono" style={{ fontSize: 13, color: 'var(--secondary)' }}>
                      would have paid{' '}
                      <span style={{ textDecoration: 'line-through' }}>{cfg.strikethroughHint}</span>
                    </span>
                  )}
                </div>
              </>
            )}
            {state.status === 'settles' && (
              <>
                <SettlesStamp />
                <span className="mono" style={{ fontSize: 13, color: 'var(--petrol)' }}>
                  {state.message}
                </span>
              </>
            )}
            {state.status === 'rpc-error' && (
              <span style={{ fontSize: 13, color: 'var(--secondary)', fontFamily: 'var(--font-words)' }}>
                Arc didn't answer: {state.reason}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  payroll:   Payroll
  payslip:   Payslip | null   // selected settled payslip
  dueQuote:  DueQuote | null  // selected due quote
  /** Correct round ids for all due paydays up to and including the selected one */
  correctRounds: bigint[]
  /** The counterfactual USDC (what attempt 1 would have paid) */
  counterfactualUsdc: bigint | null
  /** The settle-day round (asOf at settledAt) — attempt 1 uses this, not correctRound+1 */
  settleDayRoundId: bigint | null
}

export function CheatSection({
  payroll, payslip, dueQuote, correctRounds, counterfactualUsdc, settleDayRoundId,
}: Props) {
  const client = usePublicClient({ chainId: arc.id })
  const { address: walletAddr } = useAccount()
  const sectionRef = useRef<HTMLDivElement>(null)

  const isSettled  = !!payslip
  const isDue      = !payslip && !!dueQuote
  const isUpcoming = !payslip && !dueQuote

  // Replay block for settled: settledBlock - 1
  // For due: latest block (null = latest)
  const replayBlock: bigint | undefined = payslip
    ? (payslip.settledBlock > 0n ? payslip.settledBlock - 1n : undefined)
    : undefined

  // Caller for "employer" attempt: payroll.employer
  // Caller for "stranger" attempt: walletAddr or zero address
  const strangerAddr = walletAddr ?? '0x0000000000000000000000000000000000000000'

  // ── eth_call helper ────────────────────────────────────────────────────────
  type ValutaFn = 'settle' | 'reclaim' | 'fund' | 'end' | 'withdraw' | 'create'

  const ethCall = useCallback(async (
    fn: ValutaFn,
    args: readonly unknown[],
    caller: `0x${string}`,
    blockNum?: bigint,
  ): Promise<AttemptState> => {
    if (!client) return { status: 'rpc-error', reason: 'No RPC client' }
    try {
      await client.simulateContract({
        address: VALUTA_ADDRESS,
        abi: VALUTA_ABI,
        functionName: fn,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args: args as any,
        account: caller,
        ...(blockNum !== undefined ? { blockNumber: blockNum } : {}),
      })
      return { status: 'settles', message: 'The honest call goes through. Nothing was sent.' }
    } catch (err: unknown) {
      const decoded = decodeValutaErrorRich(err)
      if (decoded) {
        return { status: 'refused', errorName: decoded.name, errorArgs: decoded.args, message: decoded.message }
      }
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('timeout')) {
        return { status: 'rpc-error', reason: msg.slice(0, 120) }
      }
      // Unknown revert without decoded data
      return { status: 'refused', errorName: 'Revert', errorArgs: [], message: msg.slice(0, 200) }
    }
  }, [client])

  // ── Attempt states ──────────────────────────────────────────────────────────
  const [states, setStates] = useState<Record<string, AttemptState>>({
    wrong_rate: { status: 'idle' },
    employer_reclaim: { status: 'idle' },
    stranger_reclaim: { status: 'idle' },
    honest: { status: 'idle' },
  })

  const updateState = (id: string, s: AttemptState) =>
    setStates(prev => ({ ...prev, [id]: s }))

  // ── Build configs ───────────────────────────────────────────────────────────

  const correctRound = payslip?.roundId ?? dueQuote?.roundId ?? null
  const feedInfo = FEEDS[payroll.currency]
  const isInverse = feedInfo?.inverse ?? false
  void isInverse

  const payrollId  = BigInt(payroll.id)
  const callerAddr = strangerAddr

  // Attempt 1: for a SETTLED payslip, the "wrong" round is asOf(currency, settledAt)
  // (the settle-day round). If that happens to equal the payslip's own round,
  // fall back to correctRound + 1.
  // For a DUE payday: use correctRound + 1 (next round, published after payday).
  let wrongRound: bigint | null = null
  if (isSettled && correctRound !== null) {
    if (settleDayRoundId !== null && settleDayRoundId !== correctRound) {
      wrongRound = settleDayRoundId
    } else {
      wrongRound = correctRound + 1n
    }
  } else if (isDue && correctRound !== null) {
    wrongRound = correctRound + 1n
  }

  // Wrong-round amount (counterfactual)
  const wrongRoundUsdc = counterfactualUsdc

  // Build the correct rounds array for attempt 4 (honest)
  const honestRounds: bigint[] = [...correctRounds]

  // Build the wrong rounds for attempt 1: replace the correct round with wrongRound
  const wrongRounds: bigint[] = correctRounds.length > 0
    ? [...correctRounds.slice(0, -1), ...(wrongRound != null ? [wrongRound] : [])]
    : wrongRound != null ? [wrongRound] : []

  const label1 = isDue
    ? "Pay it at today's rate"
    : "Pay it at the rate on the day it was settled"

  const callSig1 = wrongRound != null
    ? `settle(${payroll.id}, [${wrongRound & ((1n << 64n) - 1n)}])`
    : 'settle(\u2026, [wrong_round])'

  const configs: AttemptConfig[] = [
    {
      id: 'wrong_rate',
      label: label1,
      callSig: callSig1,
      disabled: isUpcoming || wrongRounds.length === 0,
      strikethroughHint: wrongRoundUsdc !== null ? `${fmtUsdc(wrongRoundUsdc)} USDC` : undefined,
      run: async () => {
        if (wrongRounds.length === 0) return { status: 'rpc-error', reason: 'No round available' }
        updateState('wrong_rate', { status: 'running' })
        const res = await ethCall('settle', [payrollId, wrongRounds], callerAddr, replayBlock)
        return res
      },
    },
    {
      id: 'employer_reclaim',
      label: 'The employer pulls the reserve while this payday is due',
      callSig: `reclaim(${payroll.id}, 1)`,
      disabled: isUpcoming,
      run: async () => {
        updateState('employer_reclaim', { status: 'running' })
        const res = await ethCall('reclaim', [payrollId, 1n], payroll.employer, replayBlock)
        return res
      },
    },
    {
      id: 'stranger_reclaim',
      label: 'A stranger takes the reserve',
      callSig: `reclaim(${payroll.id}, 1) from ${truncAddr(strangerAddr)}`,
      disabled: isUpcoming,
      run: async () => {
        updateState('stranger_reclaim', { status: 'running' })
        const res = await ethCall('reclaim', [payrollId, 1n], callerAddr, replayBlock)
        return res
      },
    },
    {
      id: 'honest',
      label: 'Control: pay it at the round live at payday',
      callSig: honestRounds.length > 0
        ? `settle(${payroll.id}, [${honestRounds.map(r => r & ((1n << 64n) - 1n)).join(', ')}])`
        : 'settle(…)',
      disabled: isUpcoming || honestRounds.length === 0,
      run: async () => {
        if (honestRounds.length === 0) return { status: 'rpc-error', reason: 'No due payday to settle' }
        updateState('honest', { status: 'running' })
        const res = await ethCall('settle', [payrollId, honestRounds], callerAddr, replayBlock)
        // For honest call, override to show "settles" even if it rejects (e.g. already settled)
        if (res.status === 'settles') return res
        // If already settled — show as settles
        if (res.status === 'refused' && res.errorName === 'NothingDue') {
          return { status: 'settles', message: 'Already settled. Nothing was sent.' }
        }
        return res
      },
    },
  ]

  const runAll = async () => {
    for (const cfg of configs) {
      if (cfg.disabled) continue
      const result = await cfg.run()
      updateState(cfg.id, result)
      await new Promise(r => setTimeout(r, 150))
    }
  }

  // Context description
  const ctxDesc = isSettled && payslip
    ? `On payslip No. ${String(payslip.index + 1).padStart(2, '0')} · payroll ${payroll.id} · replayed at block ${payslip.settledBlock > 0n ? String(payslip.settledBlock - 1n) : '—'}, the block before it was settled`
    : isDue
    ? `On payslip No. ${String((dueQuote?.index ?? 0) + 1).padStart(2, '0')} · payroll ${payroll.id} · at the latest block, while it is due`
    : null

  return (
    <section
      ref={sectionRef}
      id="cheat"
      style={{ maxWidth: 1344, margin: '0 auto', padding: '56px 27px 0' }}
      aria-labelledby="cheat-heading"
    >
      {/* Heading */}
      <div style={{ marginBottom: 24 }}>
        <h2
          id="cheat-heading"
          style={{
            fontFamily: 'var(--font-words)',
            fontWeight: 600,
            fontSize: 34,
            color: 'var(--ink)',
            margin: '0 0 8px',
          }}
        >
          Try to cheat it.
        </h2>
        <p style={{ margin: 0, fontSize: 17, color: 'var(--secondary)', fontFamily: 'var(--font-words)' }}>
          Each attempt is a real read-only call to the live contract on Arc mainnet. Press one: the chain answers, not this page.
        </p>
      </div>

      {/* Ruled rows on one paper slip — no nested card */}
      <div
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          boxShadow: 'var(--shadow-paper)',
          overflow: 'hidden',
        }}
      >
        {/* Context + Run all — top row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '14px 24px',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <div className="mono" style={{ fontSize: 13, color: 'var(--secondary)' }}>
            {isUpcoming ? (
              <>Nothing to attempt yet. Pick a settled or due payslip.</>
            ) : ctxDesc}
          </div>
          {!isUpcoming && (
            <button
              onClick={() => void runAll()}
              style={{
                border: '1.5px solid var(--petrol)',
                borderRadius: 4,
                padding: '5px 14px',
                background: 'transparent',
                color: 'var(--petrol)',
                fontFamily: 'var(--font-words)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Run all
            </button>
          )}
        </div>

        {/* Attempt rows — plain ruled, no nesting */}
        <div style={{ padding: '0 24px' }}>
          {configs.map((cfg, i) => (
            <AttemptRow
              key={cfg.id}
              cfg={cfg}
              num={i + 1}
              state={states[cfg.id] ?? { status: 'idle' }}
              onRun={() => {
                void cfg.run().then(result => updateState(cfg.id, result))
              }}
            />
          ))}
        </div>

        {/* Quiet note inside the slip, below the last row */}
        <div style={{ padding: '10px 24px 14px', borderTop: '1px solid var(--rule)' }}>
          <span style={{ fontSize: 13, color: 'var(--secondary)', fontFamily: 'var(--font-words)' }}>
            Calls from the employer's address need no key: eth_call simulates without signing.
          </span>
        </div>
      </div>
    </section>
  )
}
