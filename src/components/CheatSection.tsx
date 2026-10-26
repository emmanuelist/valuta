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
  disabledReason?: string
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
  cfg, state, onRun,
}: {
  cfg: AttemptConfig
  state: AttemptState
  onRun: () => void
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
      {/* Left: label + call sig */}
      <div>
        <div style={{ fontFamily: 'var(--font-words)', fontWeight: 500, fontSize: 17, color: cfg.disabled ? 'var(--secondary)' : 'var(--ink)', marginBottom: 4 }}>
          {cfg.label}
        </div>
        <div className="mono" style={{ fontSize: 13, color: 'var(--secondary)' }}>
          {cfg.callSig}
        </div>
        {cfg.disabled && cfg.disabledReason && (
          <div style={{ fontSize: 13, color: 'var(--secondary)', marginTop: 4, fontFamily: 'var(--font-words)' }}>
            {cfg.disabledReason}
          </div>
        )}
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
                <span className="mono" style={{ fontSize: 13, color: 'var(--ink)' }}>
                  {fmtErrorDetail(state.errorName, state.errorArgs)}
                </span>
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
  /** The counterfactual USDC (what the wrong round would have paid) */
  counterfactualUsdc: bigint | null
}

export function CheatSection({
  payroll, payslip, dueQuote, correctRounds, counterfactualUsdc,
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

  // The wrong round: the rate the day it was settled (counterfactual round)
  // For due payslips: latest round from duePreview when available
  // If that equals the correct round, use correctRound + 1 as fallback
  const correctRound = payslip?.roundId ?? dueQuote?.roundId ?? null
  const feedInfo = FEEDS[payroll.currency]
  const isInverse = feedInfo?.inverse ?? false

  // Compute wrong-round id: for settled, counterfactual; for due, a wrong version
  // We approximate by using correctRound + 1 (the next round, which was published
  // after payday — exactly what the contract will reject as NotAsOfPayday)
  const wrongRound: bigint | null = correctRound != null ? correctRound + 1n : null

  // Wrong-round amount (counterfactual)
  const wrongRoundUsdc = counterfactualUsdc

  const payrollId  = BigInt(payroll.id)
  const callerAddr = strangerAddr

  // Build the correct rounds array for attempt 4 (honest)
  const honestRounds: bigint[] = [...correctRounds]

  // Build the wrong rounds for attempt 1: replace the last round with wrongRound
  const wrongRounds: bigint[] = correctRounds.length > 0
    ? [...correctRounds.slice(0, -1), ...(wrongRound != null ? [wrongRound] : [])]
    : wrongRound != null ? [wrongRound] : []

  const label1 = isDue
    ? "Pay it at today's rate"
    : "Pay it at the rate on the day it was settled"

  const callSig1 = wrongRound != null
    ? `settle(${payroll.id}, [${wrongRound & ((1n << 64n) - 1n)}])`
    : 'settle(…, [wrong_round])'

  const configs: AttemptConfig[] = [
    {
      id: 'wrong_rate',
      label: label1,
      callSig: callSig1,
      disabled: isUpcoming || wrongRounds.length === 0,
      disabledReason: isUpcoming ? undefined : undefined,
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

      {/* Paper slip */}
      <article
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          boxShadow: 'var(--shadow-paper)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Perforated top edge */}
        <div className="perf-top" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 14, background: 'var(--ground)', zIndex: 2 }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '28px 32px 12px', paddingTop: 22 }}>
          {/* Context + Run all row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
            <div className="mono" style={{ fontSize: 14, color: 'var(--secondary)' }}>
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

          {/* Wrong-round counterfactual hint */}
          {!isUpcoming && wrongRoundUsdc !== null && (
            <div className="mono" style={{ fontSize: 13, color: 'var(--secondary)', marginBottom: 8 }}>
              would have paid{' '}
              <span style={{ textDecoration: 'line-through' }}>
                {fmtUsdc(wrongRoundUsdc)} USDC
              </span>
              {' '}at the wrong rate ·{' '}
              {isInverse ? 'inverse feed' : 'direct feed'}
            </div>
          )}

          {/* Attempt rows */}
          <div>
            {configs.map(cfg => (
              <AttemptRow
                key={cfg.id}
                cfg={cfg}
                state={states[cfg.id] ?? { status: 'idle' }}
                onRun={() => {
                  void cfg.run().then(result => updateState(cfg.id, result))
                }}
              />
            ))}
          </div>
        </div>
      </article>

      {/* Quiet note under the slip */}
      <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--secondary)', fontFamily: 'var(--font-words)' }}>
        Calls from the employer's address need no key: eth_call simulates without signing.
      </p>
    </section>
  )
}
