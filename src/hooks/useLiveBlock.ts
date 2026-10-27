// Live block number — polls every 4 s on Arc mainnet
import { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { arc } from 'viem/chains'

export function useLiveBlock() {
  const client = usePublicClient({ chainId: arc.id })
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null)

  useEffect(() => {
    if (!client) return
    let cancelled = false

    const poll = async () => {
      try {
        const bn = await client.getBlockNumber()
        if (!cancelled) setBlockNumber(bn)
      } catch { /* ignore */ }
    }

    void poll()
    const id = setInterval(() => { void poll() }, 4_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [client])

  return blockNumber
}
