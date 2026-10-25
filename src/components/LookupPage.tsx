import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { arc } from 'viem/chains'
import { VALUTA_ADDRESS, VALUTA_ABI, FEEDS } from '../contracts/abi'
import { fmtDateTime, fmtRate, aggRoundId } from '../lib/format'
import { ValueAxis } from './ValueAxis'
import { useNeighbourRounds } from '../hooks/useValutaData'

const CHAIN_ID = arc.id
const CURRENCIES = Object.keys(FEEDS)

export function LookupPage() {
  const [currency, setCurrency] = useState('MXN')
  const [dateTime, setDateTime] = useState('')

  const ts = dateTime ? Math.floor(new Date(dateTime + 'Z').getTime() / 1000) : 0

  const toBytes3 = (c: string): `0x${string}` =>
    `0x${Array.from(c.padEnd(3, '\0')).map(ch => ch.charCodeAt(0).toString(16).padStart(2, '0')).join('')}`
  const currencyBytes: `0x${string}` = currency ? toBytes3(currency) : '0x4d584e'

  const { data, isLoading, isError, error } = useReadContract({
    address: VALUTA_ADDRESS, abi: VALUTA_ABI,
    functionName: 'asOf',
    args: [currencyBytes, BigInt(ts)],
    chainId: CHAIN_ID,
    query: { enabled: ts > 0 },
  })

  const result = data as [bigint, bigint, bigint] | undefined
  const roundId  = result?.[0] ?? null
  const answer   = result?.[1] ?? 0n
  const updatedAt= result?.[2] ? Number(result[2]) : 0

  const { prev, next } = useNeighbourRounds(currency, roundId)

  const curRound = roundId ? { roundId, answer, updatedAt } : null
  const [showAxis, setShowAxis] = useState(false)

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-[27px] font-medium mb-2" style={{ color: 'var(--ink)' }}>Rate as of any moment</h1>
      <p className="text-[15px] mb-8" style={{ color: 'var(--secondary)' }}>
        Find which Chainlink round was live at a specific UTC time, and see its neighbours.
      </p>

      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <label className="label-caps">Currency</label>
          <select
            value={currency}
            onChange={e => { setCurrency(e.target.value); setShowAxis(false) }}
            className="form-input"
            style={{ maxWidth: 200 }}
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="label-caps">Date and time (UTC)</label>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={e => { setDateTime(e.target.value); setShowAxis(false) }}
            className="form-input"
            style={{ maxWidth: 280 }}
          />
        </div>

        <button
          onClick={() => setShowAxis(true)}
          disabled={!ts || isLoading}
          className="px-5 py-2 rounded-btn text-[15px] font-medium self-start transition-opacity"
          style={{
            background: 'var(--petrol)', color: '#fff', border: 'none',
            cursor: ts ? 'pointer' : 'not-allowed',
            opacity: (!ts || isLoading) ? 0.5 : 1,
          }}
        >
          {isLoading ? 'Looking up…' : 'Look up'}
        </button>
      </div>

      {isError && (
        <p className="text-[14px]" style={{ color: 'var(--vermilion)' }}>
          {(error as {shortMessage?: string})?.shortMessage ?? 'Failed to look up rate.'}
        </p>
      )}

      {showAxis && curRound && (
        <div
          className="rounded-card p-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--rules)', boxShadow: '0 1px 2px rgba(15,23,32,0.04)' }}
        >
          <div className="label-caps mb-1">
            {fmtDateTime(ts)} UTC · {currency} VALUE TIME AXIS
          </div>
          <p className="text-[13px] mb-4" style={{ color: 'var(--secondary)' }}>
            Round {aggRoundId(curRound.roundId).toString()} · Rate {fmtRate(curRound.answer)} · Published {fmtDateTime(curRound.updatedAt)} UTC
          </p>
          <ValueAxis
            paydayTs={ts}
            cur={curRound}
            prev={prev}
            next={next}
            isSelected={true}
          />
        </div>
      )}

      {showAxis && !curRound && !isLoading && ts > 0 && (
        <p className="text-[14px]" style={{ color: 'var(--secondary)' }}>
          No data for that time. The feed may not have had a round at that point.
        </p>
      )}
    </div>
  )
}
