import { useState } from 'react'
import { useAccount, useWriteContract, useSimulateContract, useWaitForTransactionReceipt } from 'wagmi'
import { arc } from 'viem/chains'
import { ConnectKitButton } from 'connectkit'
import { ExternalLink } from 'lucide-react'
import { useReadContract, useSwitchChain } from 'wagmi'
import { VALUTA_ADDRESS, VALUTA_ABI } from '../contracts/abi'
import { ARC_EXPLORER } from '../config'
import { decodeValutaError } from '../lib/errors'
import { bytes3ToCode, fmtUsdc, fmtRate } from '../lib/format'
import { navigate } from '../lib/router'

const CHAIN_ID = arc.id

const PERIODS: Record<string, number> = {
  'Hourly':        3600,
  'Daily':         86400,
  'Weekly':        604800,
  'Every 2 weeks': 1209600,
  'Monthly':       2592000,
}

export function NewPayrollPage() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const isWrongChain = !!address && chainId !== CHAIN_ID

  // Form state
  const [worker,     setWorker]     = useState('')
  const [currency,   setCurrency]   = useState('')
  const [salary,     setSalary]     = useState('')
  const [periodKey,  setPeriodKey]  = useState('Daily')
  const [customPeriod, setCustomPeriod] = useState('')
  const [count,      setCount]      = useState('')
  const [firstPayday,setFirstPayday]= useState('')
  const [reserve,    setReserve]    = useState('')

  // Fetch available currencies
  const { data: currencyCodes } = useReadContract({
    address: VALUTA_ADDRESS, abi: VALUTA_ABI,
    functionName: 'currencies', chainId: CHAIN_ID,
  })
  const codes: string[] = (currencyCodes as `0x${string}`[] ?? []).map(bytes3ToCode)

  // Latest rate for live quote
  // nowTs is used only for validation — captured once via a stable ref
  const nowTsRef = useState(() => Math.floor(Date.now() / 1000))
  const nowTs = nowTsRef[0]
  const toBytes3 = (c: string): `0x${string}` =>
    `0x${Array.from(c.padEnd(3, '\0')).map(ch => ch.charCodeAt(0).toString(16).padStart(2, '0')).join('')}`

  const { data: quoteResult } = useReadContract({
    address: VALUTA_ADDRESS, abi: VALUTA_ABI,
    functionName: 'asOf',
    args: [
      currency ? toBytes3(currency) : ('0x4d584e'),
      BigInt(nowTs),
    ],
    chainId: CHAIN_ID,
    query: { enabled: !!currency },
  })

  const rateAnswer = quoteResult ? (quoteResult as [bigint, bigint, bigint])[1] : 0n

  // Compute live quote preview
  const salaryBig = (() => { try { return BigInt(Math.round(parseFloat(salary) * 1e18)); } catch { return 0n } })()
  const countNum  = parseInt(count) || 0
  const reserveBig = (() => { try { return BigInt(Math.round(parseFloat(reserve) * 1e18)); } catch { return 0n } })()

  const liveUsdc = (() => {
    if (!rateAnswer || rateAnswer === 0n || salaryBig === 0n) return 0n
    return (salaryBig * rateAnswer) / BigInt(1e8)
  })()
  const coversCount = liveUsdc > 0n && reserveBig > 0n ? Number(reserveBig / liveUsdc) : 0

  // Period seconds
  const periodSecs = periodKey === 'Custom'
    ? (parseInt(customPeriod) || 0)
    : PERIODS[periodKey] ?? 86400

  // First payday as unix ts
  const firstPaydayTs = firstPayday ? Math.floor(new Date(firstPayday + 'Z').getTime() / 1000) : 0

  // Currency bytes3
  const currencyBytes: `0x${string}` = currency
    ? toBytes3(currency)
    : '0x000000'

  // Validation
  const errors: string[] = []
  if (!worker.match(/^0x[0-9a-fA-F]{40}$/))        errors.push('Worker must be a valid Ethereum address.')
  if (!currency)                                     errors.push('Select a currency.')
  if (salaryBig <= 0n)                              errors.push('Salary must be > 0.')
  if (periodSecs < 60)                              errors.push('Period must be ≥ 60 seconds.')
  if (countNum < 1 || countNum > 10_000)            errors.push('Count must be 1–10,000.')
  if (!firstPayday)                                 errors.push('Set the first payday.')
  if (firstPaydayTs > 0 && firstPaydayTs < nowTs - 90 * 86400)
    errors.push('First payday cannot be more than 90 days in the past.')

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
    query: { enabled: errors.length === 0 && !!address && !isWrongChain },
  })

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const contractErr = simError ? decodeValutaError(simError) : writeError ? decodeValutaError(writeError) : null

  const handleCreate = () => {
    if (isWrongChain) { switchChain({ chainId: CHAIN_ID }); return }
    if (!simData?.request) return
    writeContract(simData.request)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-[27px] font-medium mb-6" style={{ color: 'var(--ink)' }}>New payroll</h1>

      {!address && (
        <div className="mb-6 p-4 rounded-card" style={{ background: 'var(--ptint)', border: '1px solid var(--petrol)' }}>
          <p className="text-[14px] mb-2 m-0" style={{ color: 'var(--petrol)' }}>Connect your wallet to create a payroll.</p>
          <ConnectKitButton />
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Field label="Worker address">
          <input value={worker} onChange={e => setWorker(e.target.value)}
            placeholder="0x…" className="form-input w-full mono text-[14px]" />
        </Field>

        <Field label="Currency">
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="form-input w-full">
            <option value="">Select currency…</option>
            {codes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label={`Salary per payday${currency ? ` (${currency})` : ''}`}>
          <input value={salary} onChange={e => setSalary(e.target.value)}
            type="number" step="0.01" min="0" placeholder="0.00" className="form-input w-full" />
          {liveUsdc > 0n && (
            <p className="text-[13px] mt-1 m-0" style={{ color: 'var(--secondary)' }}>
              ≈ {fmtUsdc(liveUsdc)} USDC per payday at today's rate ({fmtRate(rateAnswer)})
            </p>
          )}
        </Field>

        <Field label="Period">
          <select value={periodKey} onChange={e => setPeriodKey(e.target.value)} className="form-input w-full">
            {Object.keys(PERIODS).map(k => <option key={k} value={k}>{k}</option>)}
            <option value="Custom">Custom (seconds)</option>
          </select>
          {periodKey === 'Custom' && (
            <input value={customPeriod} onChange={e => setCustomPeriod(e.target.value)}
              type="number" min="60" placeholder="seconds ≥ 60" className="form-input w-full mt-2" />
          )}
        </Field>

        <Field label="Number of paydays (1–10,000)">
          <input value={count} onChange={e => setCount(e.target.value)}
            type="number" min="1" max="10000" placeholder="10" className="form-input w-full" />
        </Field>

        <Field label="First payday (UTC)">
          <input value={firstPayday} onChange={e => setFirstPayday(e.target.value)}
            type="datetime-local" className="form-input w-full" />
          <p className="text-[12px] mt-1 m-0" style={{ color: 'var(--secondary)' }}>
            May be up to 90 days in the past (back pay).
          </p>
        </Field>

        <Field label="Reserve (USDC)">
          <input value={reserve} onChange={e => setReserve(e.target.value)}
            type="number" step="0.000001" min="0" placeholder="0.00" className="form-input w-full" />
          {liveUsdc > 0n && reserveBig > 0n && (
            <p className="text-[13px] mt-1 m-0" style={{ color: 'var(--secondary)' }}>
              This reserve covers approximately {coversCount} paydays at today's rate.
            </p>
          )}
        </Field>

        {/* Errors */}
        {errors.length > 0 && !isSuccess && (
          <ul className="text-[13px] list-disc pl-4" style={{ color: 'var(--vermilion)' }}>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
        {contractErr && !isSuccess && (
          <p className="text-[13px]" style={{ color: 'var(--vermilion)' }}>{contractErr}</p>
        )}

        {isSuccess && (
          <div className="p-4 rounded-card" style={{ background: 'var(--ptint)', border: '1px solid var(--petrol)' }}>
            <p className="text-[14px] m-0" style={{ color: 'var(--petrol)' }}>Payroll created!</p>
            {hash && (
              <a href={`${ARC_EXPLORER}/tx/${hash}`} target="_blank" rel="noopener noreferrer"
                className="text-[13px] flex items-center gap-1 mt-1" style={{ color: 'var(--petrol)' }}>
                View on explorer <ExternalLink size={12} />
              </a>
            )}
            <button onClick={() => navigate('/')} className="mt-3 px-4 py-1.5 rounded-btn text-[13px]"
              style={{ background: 'var(--petrol)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Back to payrolls
            </button>
          </div>
        )}

        {!isSuccess && (
          <button
            onClick={handleCreate}
            disabled={(!simData?.request && errors.length === 0) || isPending || isConfirming || errors.length > 0}
            className="px-6 py-2.5 rounded-btn text-[15px] font-medium transition-opacity"
            style={{
              background: 'var(--petrol)', color: '#fff', border: 'none',
              cursor: 'pointer',
              opacity: ((!simData?.request && errors.length === 0) || isPending || isConfirming || errors.length > 0) ? 0.5 : 1,
            }}
          >
            {!address      ? 'Connect wallet to create'
              : isWrongChain ? 'Switch to Arc'
              : isPending    ? 'Confirm in wallet…'
              : isConfirming ? 'Confirming…'
              : 'Create payroll'}
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label-caps">{label}</label>
      {children}
    </div>
  )
}
