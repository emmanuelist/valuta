// Fetches the asOf round for a given currency and timestamp (for counterfactual)
import { useReadContract } from 'wagmi'
import { arc } from 'viem/chains'
import { VALUTA_ADDRESS, VALUTA_ABI, AGGREGATOR_ABI, FEEDS } from '../contracts/abi'
import { useReadContracts } from 'wagmi'

const CHAIN_ID = arc.id

export interface AsOfResult {
  roundId: bigint
  answer:  bigint
  updatedAt: number
}

/** Get the asOf round for currency at timestamp t */
export function useAsOfRate(currency: string, t: number, enabled = true) {
  const { data, isLoading } = useReadContract({
    address: VALUTA_ADDRESS,
    abi: VALUTA_ABI,
    functionName: 'asOf',
    args: [
      // bytes3 from currency code
      (('0x' + Buffer.from(currency.padEnd(3, '\0')).toString('hex').slice(0, 6)) as `0x${string}`),
      BigInt(t),
    ],
    chainId: CHAIN_ID,
    query: { enabled: enabled && !!currency && t > 0, staleTime: 60_000 },
  })

  if (!data) return { result: null, isLoading }
  const [roundId, answer, updatedAt] = data as [bigint, bigint, bigint]
  const result: AsOfResult = { roundId, answer, updatedAt: Number(updatedAt) }
  return { result, isLoading }
}

/** Get neighbour rounds for proof facts */
export function useNeighbourRoundsForProof(currency: string, roundId: bigint | null) {
  const feedInfo = FEEDS[currency]
  const enabled  = !!feedInfo && roundId !== null && roundId > 0n

  const prevId = roundId ? roundId - 1n : 0n
  const nextId = roundId ? roundId + 1n : 0n

  const { data, isLoading } = useReadContracts({
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
      {
        address: VALUTA_ADDRESS,
        abi: VALUTA_ABI,
        functionName: 'maxAge' as const,
        args: [] as const,
        chainId: CHAIN_ID,
      },
    ],
    query: { enabled, staleTime: 60_000 },
  })

  const prev = (() => {
    if (data?.[0]?.status !== 'success') return null
    const r = data[0].result as [bigint, bigint, bigint, bigint, bigint]
    if (!r[3] || r[3] === 0n) return null
    return { roundId: r[0], answer: r[1], updatedAt: Number(r[3]) }
  })()

  // treat updatedAt==0 as "no round" per spec (getRoundData past latest → zeros)
  const next = (() => {
    if (data?.[1]?.status !== 'success') return null
    const r = data[1].result as [bigint, bigint, bigint, bigint, bigint]
    if (!r[3] || r[3] === 0n) return null
    return { roundId: r[0], answer: r[1], updatedAt: Number(r[3]) }
  })()

  const maxAge = data?.[2]?.status === 'success' ? Number(data[2].result) : 90_000

  return { prev, next, maxAge, neighboursLoading: isLoading }
}
