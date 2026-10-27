// /new — Create a payroll, two-column layout with live preview
import { useState, useId } from 'react'
import { useAccount, useWriteContract, useSimulateContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { arc } from 'viem/chains'
import { ExternalLink, ChevronRight, ChevronLeft } from 'lucide-react'
import { useReadContract } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { VALUTA_ADDRESS, VALUTA_ABI, FEEDS } from '../contracts/abi'
import { ARC_EXPLORER } from '../contracts/abi'
import { decodeValutaError } from '../lib/errors'
import { bytes3ToCode, fmtUsdc, fmtRate8, fmtSalary } from '../lib/format'
import { navigate } from '../lib/router'

const CHAIN_ID = arc.id

interface PeriodOption { label: string; seconds: number }
const PERIOD_OPTIONS: PeriodOption[] = [
  { label: 'Hourly',        seconds: 3_600 },
  { label: 'Daily',         seconds: 86_400 },
  { label: 'Weekly',        seconds: 604_800 },
  { label: 'Every 2 weeks', seconds: 1_209_600 },
  { label: 'Monthly',       seconds: 2_592_000 },
  { label: 'Custom',        seconds: 0 },
]

function toBytes3(c: string): `0x${string}` {
  const codes = Array.from(c.padEnd(3, '\0')).map(ch => ch.charCodeAt(0).toString(16).padStart(2, '0'))
  return (`0x${codes.join('')}` as unknown) as `0x${string}`
}

function parseSalaryBig(s: string): bigint {
  try {
    const n = parseFloat(s)
    if (!Number.isFinite(n) || n <= 0) return 0n
    return BigInt(Math.round(n * 1e18))
  } catch { return 0n }
}

function parseReserveBig(s: string): bigint {
  try {
    const n = parseFloat(s)
    if (!Number.isFinite(n) || n < 0) return 0n
    return BigInt(Math.round(n * 1e18))
  } catch { return 0n }
}

interface FieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}
function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label
        htmlFor={id}
        style={{ fontFamily: 'var(--font-words)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '.05em', textTransform: 'uppercase' }}
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="field-error" style={{ color: 'var(--secondary)' }}>{hint}</p>}
      {error && (
        <p
          className="field-error"
          role="alert"
          style={{ color: 'var(--ink)', display: 'flex', alignItems: 'flex-start', gap: 6 }}
        >
          {error}
        </p>
      )}
    </div>
  )
}

// ── Live payslip preview ───────────────────────────────────────────────────

interface PreviewProps {
  currency: string
  salary: bigint
  count: number
  period: number
  firstPaydayTs: number
  liveUsdc: bigint
  rateAnswer: bigint
  reserveBig: bigint
  coversCount: number
  dueCount: number
}

function LivePreview({ currency, salary, count, period, firstPaydayTs, liveUsdc, rateAnswer, reserveBig, coversCount, dueCount }: PreviewProps) {
  const feedInfo = FEEDS[currency]
  const hasData = !!currency && salary > 0n && count > 0 && period > 0 && firstPaydayTs > 0

  const lastPaydayTs = firstPaydayTs > 0 && period > 0 && count > 0
    ? firstPaydayTs + (count - 1) * period
    : 0

  const fmtUtc = (ts: number) => {
    if (!ts) return '\u2014'
    const d = new Date(ts * 1000)
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]
    return `${d.getUTCDate()} ${M} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`
  }

  const underReserved = reserveBig > 0n && liveUsdc > 0n && coversCount < count
  const arrearCount   = dueCount
  const feedsInverse  = feedInfo?.inverse ?? false
  void feedsInverse

  return (
    <div
      style={{
        background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 6,
        boxShadow: 'var(--shadow-paper)', padding: '20px 24px', position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Perf edge */}
      <div className="perf-top" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 14, background: 'var(--ground)', zIndex: 2 }} />

      <div style={{ position: 'relative', zIndex: 1, paddingTop: 6 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--secondary)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          VALUTA PAYSLIP · DRAFT PREVIEW
        </div>

        {!hasData ? (
          <div style={{ color: 'var(--secondary)', fontSize: 14, fontFamily: 'var(--font-words)', padding: '12px 0' }}>
            Fill in the form to see a preview.
          </div>
        ) : (
          <>
            <div className="mono" style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 8 }}>
              {currency} {fmtSalary(salary, currency)} per payday &times; {count} paydays
            </div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--secondary)', marginBottom: 4 }}>
              First value date: {fmtUtc(firstPaydayTs)}
            </div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--secondary)', marginBottom: 12 }}>
              Last value date: {fmtUtc(lastPaydayTs)}
            </div>

            {liveUsdc > 0n && rateAnswer > 0n && (
              <div className="mono" style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 4 }}>
                At today's rate {currency}/USD {fmtRate8(rateAnswer)}
              </div>
            )}
            {liveUsdc > 0n && (
              <div
                className="mono"
                style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 300, color: 'var(--carbon)', lineHeight: 1, marginBottom: 12 }}
              >
                {fmtUsdc(liveUsdc)} USDC
              </div>
            )}

            {reserveBig > 0n && liveUsdc > 0n && (
              <div className="mono" style={{ fontSize: 12, color: 'var(--secondary)', marginBottom: 4 }}>
                Reserve covers {coversCount} of {count} paydays
              </div>
            )}
            {underReserved && (
              <div
                style={{
                  padding: '6px 10px', borderRadius: 4, marginBottom: 8,
                  background: 'var(--ambtint)',
                  fontFamily: 'var(--font-words)', fontSize: 12, color: 'var(--amber)',
                }}
              >
                The rest become public arrears \u2014 anyone can settle them.
              </div>
            )}
            {arrearCount > 0 && (
              <div
                style={{
                  padding: '6px 10px', borderRadius: 4, marginBottom: 8,
                  background: 'var(--ambtint)',
                  fontFamily: 'var(--font-words)', fontSize: 12, color: 'var(--amber)',
                }}
              >
                {arrearCount} payday{arrearCount > 1 ? 's' : ''} will be due immediately; anyone can settle them.
              </div>
            )}

            {/* Three guarantees */}
            <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 10, marginTop: 10 }}>
              {[
                'Rate locked at the Chainlink round live on each value date.',
                'Payout is in USDC, deposited directly to the worker\'s address.',
                'Uncovered paydays go into public arrears \u2014 anyone may settle them.',
              ].map((g, i) => (
                <div key={i} className="mono" style={{ fontSize: 11, color: 'var(--secondary)', marginBottom: 3 }}>
                  {i+1}. {g}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Review step ────────────────────────────────────────────────────────────

interface ReviewProps extends PreviewProps {
  worker: string
  onBack: () => void
  onConfirm: () => void
  isPending: boolean
  isConfirming: boolean
  contractErr: string | null
  txHash?: `0x${string}`
  isSuccess: boolean
}

function ReviewStep({ worker, currency, salary, count, period, firstPaydayTs, liveUsdc, rateAnswer, reserveBig, coversCount, dueCount, onBack, onConfirm, isPending, isConfirming, contractErr, txHash, isSuccess }: ReviewProps) {
  const lastPaydayTs = firstPaydayTs > 0 && period > 0 && count > 0
    ? firstPaydayTs + (count - 1) * period
    : 0
  const fmtUtc = (ts: number) => {
    if (!ts) return '\u2014'
    const d = new Date(ts * 1000)
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]
    return `${d.getUTCDate()} ${M} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`
  }

  if (isSuccess) {
    return (
      <div style={{ padding: '24px', background: 'var(--ptint)', borderRadius: 6, border: '1px solid var(--petrol)' }}>
        <div style={{ fontFamily: 'var(--font-words)', fontSize: 18, fontWeight: 600, color: 'var(--petrol)', marginBottom: 8 }}>
          Payroll created
        </div>
        <div style={{ fontFamily: 'var(--font-words)', fontSize: 14, color: 'var(--petrol)', marginBottom: 12 }}>
          Your new payroll is live on Arc mainnet.
        </div>
        {txHash && (
          <a href={`${ARC_EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--petrol)' }}>
            View transaction <ExternalLink size={12} />
          </a>
        )}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'var(--petrol)', color: '#fff', border: 'none', borderRadius: 6,
              padding: '10px 20px', cursor: 'pointer', fontFamily: 'var(--font-words)',
              fontWeight: 600, fontSize: 14, minHeight: 44,
            }}
          >
            View all payrolls
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 20, color: 'var(--ink)', marginBottom: 16 }}>
        Review and confirm
      </h2>
      <div
        style={{
          background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 6,
          padding: '20px 24px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <Row label="Worker"   value={worker} mono />
        <Row label="Currency" value={currency} />
        <Row label="Salary"   value={`${currency} ${fmtSalary(salary, currency)} × ${count} paydays`} mono />
        <Row label="Period"   value={formatPeriod(period)} />
        <Row label="First value date" value={fmtUtc(firstPaydayTs)} mono />
        <Row label="Last value date"  value={fmtUtc(lastPaydayTs)}  mono />
        {liveUsdc > 0n && <Row label="Per payday today" value={`≈ ${fmtUsdc(liveUsdc)} USDC at ${fmtRate8(rateAnswer)}`} mono />}
        <Row label="Reserve" value={`${fmtUsdc(reserveBig)} USDC → covers ${coversCount} of ${count} paydays`} mono />
        {dueCount > 0 && (
          <div style={{ padding: '6px 10px', borderRadius: 4, background: 'var(--ambtint)', fontFamily: 'var(--font-words)', fontSize: 12, color: 'var(--amber)' }}>
            {dueCount} payday{dueCount > 1 ? 's' : ''} will be immediately due.
          </div>
        )}
      </div>

      <div style={{ fontFamily: 'var(--font-words)', fontSize: 13, color: 'var(--secondary)', marginBottom: 16 }}>
        1. Rate is locked at the Chainlink round live at each value date. &nbsp;
        2. Payout is native USDC, delivered directly. &nbsp;
        3. Uncovered paydays go into public arrears.
      </div>

      {contractErr && (
        <div style={{ color: 'var(--void)', fontSize: 13, fontFamily: 'var(--font-words)', marginBottom: 12 }} role="alert">
          {contractErr}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', color: 'var(--ink)', border: '1px solid var(--rule)',
            borderRadius: 6, padding: '10px 20px', cursor: 'pointer',
            fontFamily: 'var(--font-words)', fontSize: 14, minHeight: 44,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onConfirm}
          disabled={isPending || isConfirming}
          style={{
            background: 'var(--petrol)', color: '#fff', border: 'none', borderRadius: 6,
            padding: '10px 24px', cursor: isPending || isConfirming ? 'wait' : 'pointer',
            fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 14, minHeight: 44,
            opacity: isPending || isConfirming ? 0.65 : 1,
          }}
        >
          {isPending ? 'Confirm in wallet\u2026' : isConfirming ? 'Confirming\u2026' : 'Create payroll'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'var(--font-words)', fontSize: 12, fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '.05em', width: 140, flexShrink: 0 }}>
        {label}
      </span>
      <span className={mono ? 'mono' : ''} style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-words)', fontSize: 13, color: 'var(--ink)', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  )
}

function formatPeriod(secs: number): string {
  if (secs === 3600)     return 'Hourly'
  if (secs === 86400)    return 'Daily'
  if (secs === 604800)   return 'Weekly'
  if (secs === 1209600)  return 'Every 2 weeks'
  if (secs === 2592000)  return 'Monthly'
  return `Every ${secs} seconds (custom)`
}

// ── Main page ──────────────────────────────────────────────────────────────

export function NewPayrollPage() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const isWrongChain = !!address && chainId !== CHAIN_ID

  // Unique ids for accessibility
  const uid = useId()
  const id  = (s: string) => `${uid}-${s}`

  // Form state
  const [worker,        setWorker]        = useState('')
  const [currency,      setCurrency]      = useState('')
  const [salary,        setSalary]        = useState('')
  const [periodKey,     setPeriodKey]     = useState('Daily')
  const [customPeriod,  setCustomPeriod]  = useState('')
  const [count,         setCount]         = useState('')
  const [firstPayday,   setFirstPayday]   = useState('')
  const [reserve,       setReserve]       = useState('')

  // Touched state (show errors only after blur or submit attempt)
  const [touched, setTouched]   = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [step, setStep]          = useState<'form' | 'review'>('form')

  const touch = (f: string) => setTouched(t => ({ ...t, [f]: true }))
  const shouldShow = (f: string) => submitted || !!touched[f]

  // Currencies
  const { data: currencyCodes } = useReadContract({
    address: VALUTA_ADDRESS, abi: VALUTA_ABI, functionName: 'currencies', chainId: CHAIN_ID,
  })
  const codes: string[] = (currencyCodes as `0x${string}`[] ?? []).map(bytes3ToCode)

  // Stable timestamp for the asOf call — captured once at mount, fine for rate display
  const [nowTs] = useState(() => Math.floor(Date.now() / 1000))

  const { data: quoteResult } = useReadContract({
    address: VALUTA_ADDRESS, abi: VALUTA_ABI,
    functionName: 'asOf',
    args: [currency ? toBytes3(currency) : '0x4d584e', BigInt(nowTs)],
    chainId: CHAIN_ID,
    query: { enabled: !!currency },
  })
  const rateAnswer = quoteResult ? (quoteResult as [bigint, bigint, bigint])[1] : 0n

  // Computed values
  const salaryBig   = parseSalaryBig(salary)
  const countNum    = parseInt(count) || 0
  const reserveBig  = parseReserveBig(reserve)
  const periodSecs  = periodKey === 'Custom'
    ? Math.max(60, parseInt(customPeriod) || 0)
    : PERIOD_OPTIONS.find(o => o.label === periodKey)?.seconds ?? 86400

  const firstPaydayTs = firstPayday
    ? Math.floor(new Date(firstPayday + 'Z').getTime() / 1000)
    : 0

  const currencyBytes: `0x${string}` = currency ? toBytes3(currency) : '0x000000'

  const feedInfo    = FEEDS[currency]
  const isInverse   = feedInfo?.inverse ?? false
  const liveUsdc    = rateAnswer > 0n && salaryBig > 0n
    ? isInverse
      ? (salaryBig * 100_000_000n) / rateAnswer
      : (salaryBig * rateAnswer) / 100_000_000n
    : 0n

  const coversCount = liveUsdc > 0n && reserveBig > 0n
    ? Number(reserveBig / liveUsdc)
    : 0

  const dueCount = firstPaydayTs > 0 && periodSecs > 0
    ? Math.max(0, Math.floor((nowTs - firstPaydayTs) / periodSecs) + (nowTs >= firstPaydayTs ? 0 : 0))
    : 0

  // Validation
  const errs: Record<string, string> = {}
  if (!worker.match(/^0x[0-9a-fA-F]{40}$/))
    errs.worker = 'Enter a valid 0x address.'
  if (!currency)
    errs.currency = 'Select a currency.'
  if (salaryBig <= 0n)
    errs.salary = 'Enter a salary greater than 0.'
  if (periodKey === 'Custom' && periodSecs < 60)
    errs.period = 'Custom period must be at least 60 seconds (1 minute).'
  if (countNum < 1 || countNum > 10_000)
    errs.count = 'Enter a number between 1 and 10,000.'
  if (!firstPayday)
    errs.firstPayday = 'Set the first value date.'
  if (firstPaydayTs > 0 && firstPaydayTs < nowTs - 90 * 86400)
    errs.firstPayday = 'First payday cannot be more than 90 days in the past.'

  const hasErrors = Object.keys(errs).length > 0

  const { data: simData, error: simError } = useSimulateContract({
    address: VALUTA_ADDRESS, abi: VALUTA_ABI,
    functionName: 'create',
    args: [
      worker as `0x${string}`,
      currencyBytes,
      salaryBig,
      BigInt(firstPaydayTs),
      BigInt(periodSecs),
      BigInt(countNum),
    ],
    value: reserveBig,
    query: { enabled: !hasErrors && !!address && !isWrongChain && step === 'review' },
  })

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash, chainId: CHAIN_ID })

  const contractErr = simError ? decodeValutaError(simError) : writeError ? decodeValutaError(writeError) : null

  const handleSubmit = () => {
    setSubmitted(true)
    if (hasErrors) return
    setStep('review')
  }

  const handleConfirm = () => {
    if (isWrongChain) { void switchChain({ chainId: CHAIN_ID }); return }
    if (simData?.request) writeContract(simData.request)
  }

  const previewProps: PreviewProps = {
    currency, salary: salaryBig, count: countNum, period: periodSecs,
    firstPaydayTs, liveUsdc, rateAnswer, reserveBig, coversCount, dueCount,
  }

  return (
    <div className="new-layout">
      {/* Left: form */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 28, color: 'var(--ink)', marginBottom: 24, marginTop: 0 }}>
          New payroll
        </h1>

        {!address && (
          <div
            style={{
              padding: '14px 16px', borderRadius: 6, marginBottom: 20,
              background: 'var(--ptint)', border: '1px solid var(--petrol)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-words)', fontSize: 14, color: 'var(--petrol)', margin: '0 0 10px' }}>
              Connect your wallet to create a payroll.
            </p>
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button
                  onClick={show}
                  style={{
                    background: 'var(--petrol)', color: '#fff', border: 'none',
                    borderRadius: 6, padding: '10px 20px', cursor: 'pointer',
                    fontFamily: 'var(--font-words)', fontWeight: 500, fontSize: 14, minHeight: 44,
                  }}
                >
                  Connect wallet
                </button>
              )}
            </ConnectKitButton.Custom>
          </div>
        )}

        {step === 'review' ? (
          <ReviewStep
            {...previewProps}
            worker={worker}
            onBack={() => setStep('form')}
            onConfirm={handleConfirm}
            isPending={isPending}
            isConfirming={isConfirming}
            contractErr={contractErr}
            txHash={hash}
            isSuccess={isSuccess}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field id={id('worker')} label="Worker address" error={shouldShow('worker') ? errs.worker : undefined}>
              <input
                id={id('worker')} value={worker} onChange={e => setWorker(e.target.value)} onBlur={() => touch('worker')}
                placeholder="0x…"
                className={`form-input mono${shouldShow('worker') && errs.worker ? ' field-error-border' : ''}`}
                style={{ fontSize: 14 }}
                aria-invalid={shouldShow('worker') && !!errs.worker}
              />
            </Field>

            <Field id={id('currency')} label="Currency" error={shouldShow('currency') ? errs.currency : undefined}>
              <select
                id={id('currency')} value={currency}
                onChange={e => setCurrency(e.target.value)} onBlur={() => touch('currency')}
                className="form-input"
                aria-invalid={shouldShow('currency') && !!errs.currency}
              >
                <option value="">Select…</option>
                {codes.map(c => {
                  const fi = FEEDS[c]
                  const lbl = fi ? `${c} \u00b7 ${c}/USD` : c
                  return <option key={c} value={c}>{lbl}</option>
                })}
              </select>
              {liveUsdc > 0n && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--secondary)', margin: '4px 0 0' }}>
                  Today: {currency}/USD {fmtRate8(rateAnswer)} \u2192 {fmtUsdc(liveUsdc)} USDC per payday
                </p>
              )}
            </Field>

            <Field
              id={id('salary')}
              label={`Salary per payday${currency ? ` (${currency})` : ''}`}
              error={shouldShow('salary') ? errs.salary : undefined}
            >
              <input
                id={id('salary')} value={salary} type="number" step="0.01" min="0" placeholder="0.00"
                onChange={e => setSalary(e.target.value)} onBlur={() => touch('salary')}
                className="form-input"
                aria-invalid={shouldShow('salary') && !!errs.salary}
              />
            </Field>

            <Field id={id('period')} label="Period" error={shouldShow('period') ? errs.period : undefined}>
              <select
                id={id('period')} value={periodKey}
                onChange={e => setPeriodKey(e.target.value)} onBlur={() => touch('period')}
                className="form-input"
              >
                {PERIOD_OPTIONS.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
              </select>
              {periodKey === 'Custom' && (
                <div style={{ marginTop: 6 }}>
                  <label htmlFor={id('custom-period')} style={{ fontFamily: 'var(--font-words)', fontSize: 12, color: 'var(--secondary)', display: 'block', marginBottom: 4 }}>
                    Minutes (at least 1)
                  </label>
                  <input
                    id={id('custom-period')} value={customPeriod} type="number" min="1" placeholder="minutes"
                    onChange={e => setCustomPeriod(String(parseInt(e.target.value) * 60 || 0))}
                    onBlur={() => touch('period')}
                    className="form-input"
                  />
                </div>
              )}
            </Field>

            <Field id={id('count')} label="Number of paydays (1–10,000)" error={shouldShow('count') ? errs.count : undefined}>
              <input
                id={id('count')} value={count} type="number" min="1" max="10000" placeholder="12"
                onChange={e => setCount(e.target.value)} onBlur={() => touch('count')}
                className="form-input"
                aria-invalid={shouldShow('count') && !!errs.count}
              />
            </Field>

            <Field
              id={id('firstPayday')}
              label="First value date (UTC)"
              error={shouldShow('firstPayday') ? errs.firstPayday : undefined}
              hint={firstPaydayTs > 0 ? fmtUtcDisplay(firstPaydayTs) : 'May be up to 90 days in the past (back pay).'}
            >
              <input
                id={id('firstPayday')} value={firstPayday} type="datetime-local"
                onChange={e => setFirstPayday(e.target.value)} onBlur={() => touch('firstPayday')}
                className="form-input"
                aria-invalid={shouldShow('firstPayday') && !!errs.firstPayday}
              />
              {/* Date presets */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {[
                  { label: 'Next hour', fn: () => nextHourUtc() },
                  { label: 'Tomorrow 14:00 UTC', fn: () => tomorrowUtc() },
                  { label: 'Back pay: 10 days ago', fn: () => tenDaysAgoUtc() },
                ].map(({ label, fn }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { setFirstPayday(fn()); touch('firstPayday') }}
                    style={{
                      fontFamily: 'var(--font-words)', fontSize: 12, color: 'var(--petrol)',
                      background: 'var(--ptint)', border: '1px solid var(--petrol)',
                      borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              id={id('reserve')}
              label="Reserve (USDC)"
              hint={coversCount > 0 ? `Covers approximately ${coversCount} payday${coversCount !== 1 ? 's' : ''} at today\u2019s rate.` : undefined}
            >
              <input
                id={id('reserve')} value={reserve} type="number" step="0.000001" min="0" placeholder="0.00"
                onChange={e => setReserve(e.target.value)} onBlur={() => touch('reserve')}
                className="form-input"
              />
            </Field>

            <button
              onClick={handleSubmit}
              disabled={!address || isWrongChain}
              style={{
                background: 'var(--petrol)', color: '#fff', border: 'none', borderRadius: 6,
                padding: '12px 24px', cursor: 'pointer', minHeight: 44,
                fontFamily: 'var(--font-words)', fontWeight: 600, fontSize: 15,
                opacity: (!address || isWrongChain) ? 0.5 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              {isWrongChain ? 'Switch to Arc first' : 'Review'}
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Right: live preview */}
      <div style={{ position: 'sticky', top: 80 }}>
        <div style={{ fontFamily: 'var(--font-words)', fontSize: 12, fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
          Live preview
        </div>
        <LivePreview {...previewProps} />
      </div>
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────────────

function fmtUtcDisplay(ts: number): string {
  const d = new Date(ts * 1000)
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]
  return `${d.getUTCDate()} ${M} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`
}

function toLocalDatetime(ts: number): string {
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

function nextHourUtc(): string {
  const now = new Date()
  now.setUTCMinutes(0, 0, 0)
  now.setUTCHours(now.getUTCHours() + 1)
  return toLocalDatetime(now.getTime() / 1000)
}

function tomorrowUtc(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(14, 0, 0, 0)
  return toLocalDatetime(d.getTime() / 1000)
}

function tenDaysAgoUtc(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 10)
  d.setUTCHours(14, 0, 0, 0)
  return toLocalDatetime(d.getTime() / 1000)
}
