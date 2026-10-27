/**
 * wagmi configuration — Arc mainnet only
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { arc } from 'viem/chains'
import { injected } from 'wagmi/connectors'
export const config = createConfig({
  chains: [arc],
  connectors: [injected()],
  transports: {
    [arc.id]: http(),
  },
})

export const ARC_CHAIN_ID = arc.id        // 5042
export const ARC_EXPLORER = 'https://explorer.arc.io'
