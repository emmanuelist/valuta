// Shared domain types for the Valuta app

export interface Payroll {
  id: number
  employer:  `0x${string}`
  worker:    `0x${string}`
  currency:  string        // "MXN", "EUR", etc.
  salary:    bigint        // 18-decimal local amount
  start:     number        // unix seconds
  period:    number        // seconds
  count:     number
  settled:   number
  endedAt:   number        // 0 = active
  reserve:   bigint        // 18-decimal USDC (native)
  arrears:   bigint        // 18-decimal USDC
}

export interface Payslip {
  index:          number
  payday:         number   // unix seconds (uint64)
  roundUpdatedAt: number   // unix seconds
  settledAt:      number   // unix seconds
  settledBlock:   bigint
  roundId:        bigint   // uint80 phase-encoded
  settler:        `0x${string}`
  answer:         bigint   // uint128, 8 decimals
  usdc:           bigint   // 18-decimal
  paid:           bigint
  credited:       bigint
}

export interface DueQuote {
  index:          number
  payday:         number
  roundId:        bigint
  answer:         bigint   // int256 but always > 0
  roundUpdatedAt: number
  usdc:           bigint
}

export interface RoundNeighbours {
  prev: RoundData | null
  cur:  RoundData
  next: RoundData | null
}

export interface RoundData {
  roundId:   bigint
  answer:    bigint   // int256 from oracle
  updatedAt: number
}

export interface SettlementTx {
  hash: `0x${string}`
  block: bigint
}
