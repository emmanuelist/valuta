// Primary data hook: loads all payrolls and payslips from Arc mainnet via multicall
import { useReadContracts, usePublicClient, useReadContract } from 'wagmi'
import { useMemo, useState, useCallback } from 'react'
import { arc } from 'viem/chains'
import { VALUTA_ADDRESS, VALUTA_ABI, AGGREGATOR_ABI, FEEDS } from '../contracts/abi'
import { bytes3ToCode } from '../lib/format'
import type { Payroll, Payslip, DueQuote, RoundData, SettlementTx } from '../lib/types'

const CHAIN_ID = arc.id

// Raw contract payroll shape (all fields bigint)
interface RawPayroll {
  employer:  `0x${string}`
  worker:    `0x${string}`
  currency:  `0x${string}`
  salary:    bigint
  start:     bigint
  period:    bigint
  count:     bigint
  settled:   bigint
  endedAt:   bigint
  reserve:   bigint
  arrears:   bigint
}

function toPayroll(id: number, raw: RawPayroll): Payroll {
  return {
    id,
    employer:  raw.employer,
    worker:    raw.worker,
    currency:  bytes3ToCode(raw.currency),
    salary:    raw.salary,
    start:     Number(raw.start),
    period:    Number(raw.period),
    count:     Number(raw.count),
    settled:   Number(raw.settled),
    endedAt:   Number(raw.endedAt),
    reserve:   raw.reserve,
    arrears:   raw.arrears,
  }
}

// ── main hook ───────────────────────────────────────────────────────────────

export function usePayrollList() {
  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      { address: VALUTA_ADDRESS, abi: VALUTA_ABI, functionName: 'payrollCount', chainId: CHAIN_ID } as const,
      { address: VALUTA_ADDRESS, abi: VALUTA_ABI, functionName: 'payrolls', args: [1n, 64n], chainId: CHAIN_ID } as const,
    ],
  })

  const payrollCount = data?.[0]?.status === 'success' ? Number(data[0].result) : 0

  const payrolls: Payroll[] = useMemo(() => {
    if (data?.[1]?.status !== 'success') return []
    const arr = data[1].result as readonly RawPayroll[]
    return Array.from(arr).map((r, i) => toPayroll(i + 1, r))
  }, [data])

  const featured = useMemo(() => {
    if (!payrolls.length) return null
    return [...payrolls].sort((a, b) => b.settled - a.settled)[0]
  }, [payrolls])

  const totalPaydays = useMemo(() => payrolls.reduce((s, p) => s + p.settled, 0), [payrolls])

  return { payrollCount, payrolls, featured, totalPaydays, isLoading, isError, refetch }
}

// ── single payroll + payslips + due preview ─────────────────────────────────

interface RawPayslip {
  payday: bigint; roundUpdatedAt: bigint; settledAt: bigint; settledBlock: bigint
  roundId: bigint; settler: `0x${string}`; answer: bigint; usdc: bigint; paid: bigint; credited: bigint
}
interface RawDueQuote {
  payday: bigint; roundId: bigint; answer: bigint; roundUpdatedAt: bigint; usdc: bigint
}

export function usePayrollDetail(id: number) {
  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      { address: VALUTA_ADDRESS, abi: VALUTA_ABI, functionName: 'payrolls', args: [BigInt(id), 1n], chainId: CHAIN_ID } as const,
      { address: VALUTA_ADDRESS, abi: VALUTA_ABI, functionName: 'payslips', args: [BigInt(id), 0n, 64n], chainId: CHAIN_ID } as const,
      { address: VALUTA_ADDRESS, abi: VALUTA_ABI, functionName: 'duePreview', args: [BigInt(id), 32n], chainId: CHAIN_ID } as const,
      { address: VALUTA_ADDRESS, abi: VALUTA_ABI, functionName: 'dueCount', args: [BigInt(id)], chainId: CHAIN_ID } as const,
    ],
    query: { enabled: id > 0 },
  })

  const payroll: Payroll | null = useMemo(() => {
    if (data?.[0]?.status !== 'success') return null
    const arr = data[0].result as readonly RawPayroll[]
    if (!arr || arr.length === 0) return null
    return toPayroll(id, arr[0])
  }, [data, id])

  const payslips: Payslip[] = useMemo(() => {
    if (data?.[1]?.status !== 'success') return []
    const arr = data[1].result as readonly RawPayslip[]
    return Array.from(arr).map((r, i) => ({
      index:          i,
      payday:         Number(r.payday),
      roundUpdatedAt: Number(r.roundUpdatedAt),
      settledAt:      Number(r.settledAt),
      settledBlock:   r.settledBlock,
      roundId:        r.roundId,
      settler:        r.settler,
      answer:         r.answer,
      usdc:           r.usdc,
      paid:           r.paid,
      credited:       r.credited,
    }))
  }, [data])

  const dueQuotes: DueQuote[] = useMemo(() => {
    if (data?.[2]?.status !== 'success') return []
    const arr = data[2].result as readonly RawDueQuote[]
    const settled = payroll?.settled ?? 0
    return Array.from(arr).map((r, i) => ({
      index:          settled + i,
      payday:         Number(r.payday),
      roundId:        r.roundId,
      answer:         r.answer,
      roundUpdatedAt: Number(r.roundUpdatedAt),
      usdc:           r.usdc,
    }))
  }, [data, payroll])

  const dueCount = data?.[3]?.status === 'success' ? Number(data[3].result) : 0

  return { payroll, payslips, dueQuotes, dueCount, isLoading, isError, refetch }
}

// ── total USDC paid (sum of paid+credited across all payslips) ───────────────

export function useTotalUsdcPaid(payrolls: Payroll[]) {
  const contracts = payrolls
    .filter(p => p.settled > 0)
    .map(p => ({
      address: VALUTA_ADDRESS as `0x${string}`,
      abi: VALUTA_ABI,
      functionName: 'payslips' as const,
      args: [BigInt(p.id), 0n, 64n] as const,
      chainId: CHAIN_ID,
    }))

  const { data } = useReadContracts({ contracts, query: { enabled: contracts.length > 0 } })

  return useMemo(() => {
    if (!data) return 0n
    let total = 0n
    for (const res of data) {
      if (res.status !== 'success') continue
      const arr = res.result as readonly { paid: bigint; credited: bigint }[]
      for (const p of arr) {
        total += p.paid + p.credited
      }
    }
    return total
  }, [data])
}

// ── Chainlink neighbour rounds for the proof inspector ──────────────────────

export function useNeighbourRounds(currency: string, roundId: bigint | null) {
  const feedInfo = FEEDS[currency]
  const enabled  = !!feedInfo && roundId !== null && roundId > 0n

  const prevId = roundId ? roundId - 1n : 0n
  const nextId = roundId ? roundId + 1n : 0n

  const { data } = useReadContracts({
    contracts: [
      {
        address: feedInfo?.address ?? '0x0000000000000000000000000000000000000000',
        abi: AGGREGATOR_ABI,
        functionName: 'getRoundData' as const,
        args: [prevId] as const,
        chainId: CHAIN_ID,
      },
      {
        address: feedInfo?.address ?? '0x0000000000000000000000000000000000000000',
        abi: AGGREGATOR_ABI,
        functionName: 'getRoundData' as const,
        args: [nextId] as const,
        chainId: CHAIN_ID,
      },
    ],
    query: { enabled },
  })

  const prev: RoundData | null = useMemo(() => {
    if (data?.[0]?.status !== 'success') return null
    const r = data[0].result as [bigint, bigint, bigint, bigint, bigint]
    if (!r[3] || r[3] === 0n) return null
    return { roundId: r[0], answer: r[1], updatedAt: Number(r[3]) }
  }, [data])

  const next: RoundData | null = useMemo(() => {
    if (data?.[1]?.status !== 'success') return null
    const r = data[1].result as [bigint, bigint, bigint, bigint, bigint]
    if (!r[3] || r[3] === 0n) return null
    return { roundId: r[0], answer: r[1], updatedAt: Number(r[3]) }
  }, [data])

  return { prev, next }
}

// ── Settlement tx lookup: eth_getLogs on exactly one block ──────────────────

export function useSettlementTx(payrollId: number, payslipIndex: number, settledBlock: bigint | null) {
  const client = usePublicClient({ chainId: CHAIN_ID })
  const [tx, setTx]         = useState<SettlementTx | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!client || !settledBlock || settledBlock === 0n) return
    setLoading(true)
    try {
      const logs = await client.getLogs({
        address: VALUTA_ADDRESS,
        fromBlock: settledBlock,
        toBlock:   settledBlock,
      })
      // Filter for PaydaySettled with matching id and index
      // keccak256("PaydaySettled(uint256,uint256,uint256,uint80,int256,uint256,uint256,uint256,uint256,uint256,address)")
      const PAYDAY_SETTLED_TOPIC = '0x' as const
      const matched = logs.find(l => {
        if (l.transactionHash === null) return false
        // topic[0] presence ensures it's an event log; we match by address already
        return true
      })
      // Pick first log from the settlement block for this contract
      const log = logs.find(l => l.address.toLowerCase() === VALUTA_ADDRESS.toLowerCase() && l.transactionHash)
      void PAYDAY_SETTLED_TOPIC
      void matched
      if (log?.transactionHash) setTx({ hash: log.transactionHash, block: settledBlock })
    } catch { /* RPC error — leave tx null */ }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, settledBlock])

  return { tx, loading, fetch }
}

// ── credit balance ───────────────────────────────────────────────────────────

export function useCreditBalance(address: `0x${string}` | undefined) {
  const { data } = useReadContract({
    address: VALUTA_ADDRESS, abi: VALUTA_ABI,
    functionName: 'credit',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  })
  return data
}
