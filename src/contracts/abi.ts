// Valuta v2 ABI — imported from Foundry build output
// Contract: 0x7d209Fbd9999C8fe37b4e6B3CCeF41DbbAF3252a on Arc mainnet

export const VALUTA_ADDRESS    = '0x7d209Fbd9999C8fe37b4e6B3CCeF41DbbAF3252a' as const
export const VALUTA_DEPLOY_BLOCK = 27_804_867n
export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as const
export const ARC_EXPLORER       = 'https://explorer.arc.io' as const

// Chainlink feed addresses on Arc mainnet (all 8 decimals)
export const FEEDS: Record<string, { address: `0x${string}`; inverse: boolean }> = {
  EUR: { address: '0xDd5B15443cd733D3966a50a3E48cB7DF9Fb5DE0D', inverse: false },
  MXN: { address: '0x302eaa6cd6f7AdDdc973fAC2Bb8fa32e9Ce19f21', inverse: false },
  BRL: { address: '0x3406DB72AC5136b89eba6808CFcaD83aF523B3C2', inverse: false },
  JPY: { address: '0xF9Fc1C20C82d774A3787845E73E41BCbF7F38F25', inverse: false },
  CAD: { address: '0x5024DF70A748e5f1E720AAe8EEfc590430d71573', inverse: false },
  AUD: { address: '0xaF452c2EA72b6E08AB64a67133a13C4ED35343eb', inverse: false },
  KRW: { address: '0x07040A33A0204596e927595D0994C5D841d7d61D', inverse: false },
  ARS: { address: '0xa261C56CABf7Ed6081646b892E57175AB2Dd8617', inverse: true },
}

export const AGGREGATOR_ABI = [
  {
    name: 'getRoundData',
    type: 'function',
    inputs: [{ name: '_roundId', type: 'uint80' }],
    outputs: [
      { name: 'roundId',       type: 'uint80'  },
      { name: 'answer',        type: 'int256'  },
      { name: 'startedAt',     type: 'uint256' },
      { name: 'updatedAt',     type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'latestRoundData',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'roundId',       type: 'uint80'  },
      { name: 'answer',        type: 'int256'  },
      { name: 'startedAt',     type: 'uint256' },
      { name: 'updatedAt',     type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
  },
] as const

export const VALUTA_ABI = [
  // --- views ---
  { type: 'function', name: 'payrollCount', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'maxAge',       inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'currencies',   inputs: [], outputs: [{ type: 'bytes3[]' }], stateMutability: 'view' },
  {
    type: 'function', name: 'payrolls',
    inputs: [{ name: 'fromId', type: 'uint256' }, { name: 'n', type: 'uint256' }],
    outputs: [{
      name: '', type: 'tuple[]',
      components: [
        { name: 'employer',  type: 'address' },
        { name: 'worker',    type: 'address' },
        { name: 'currency',  type: 'bytes3'  },
        { name: 'salary',    type: 'uint256' },
        { name: 'start',     type: 'uint256' },
        { name: 'period',    type: 'uint256' },
        { name: 'count',     type: 'uint256' },
        { name: 'settled',   type: 'uint256' },
        { name: 'endedAt',   type: 'uint256' },
        { name: 'reserve',   type: 'uint256' },
        { name: 'arrears',   type: 'uint256' },
      ],
    }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'payslips',
    inputs: [
      { name: 'id',   type: 'uint256' },
      { name: 'from', type: 'uint256' },
      { name: 'n',    type: 'uint256' },
    ],
    outputs: [{
      name: '', type: 'tuple[]',
      components: [
        { name: 'payday',         type: 'uint64'  },
        { name: 'roundUpdatedAt', type: 'uint64'  },
        { name: 'settledAt',      type: 'uint64'  },
        { name: 'settledBlock',   type: 'uint64'  },
        { name: 'roundId',        type: 'uint80'  },
        { name: 'settler',        type: 'address' },
        { name: 'answer',         type: 'uint128' },
        { name: 'usdc',           type: 'uint128' },
        { name: 'paid',           type: 'uint128' },
        { name: 'credited',       type: 'uint128' },
      ],
    }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'duePreview',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'n',  type: 'uint256' },
    ],
    outputs: [{
      name: 'result', type: 'tuple[]',
      components: [
        { name: 'payday',         type: 'uint256' },
        { name: 'roundId',        type: 'uint80'  },
        { name: 'answer',         type: 'int256'  },
        { name: 'roundUpdatedAt', type: 'uint256' },
        { name: 'usdc',           type: 'uint256' },
      ],
    }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'dueCount',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: 'n', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'nextPayday',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'quote',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'credit',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'asOf',
    inputs: [
      { name: 'currency', type: 'bytes3'  },
      { name: 't',        type: 'uint256' },
    ],
    outputs: [
      { name: 'roundId',   type: 'uint80'  },
      { name: 'answer',    type: 'int256'  },
      { name: 'updatedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'payday',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'i',  type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // --- writes ---
  {
    type: 'function', name: 'create',
    inputs: [
      { name: 'worker',   type: 'address' },
      { name: 'currency', type: 'bytes3'  },
      { name: 'salary',   type: 'uint256' },
      { name: 'start',    type: 'uint256' },
      { name: 'period',   type: 'uint256' },
      { name: 'count',    type: 'uint256' },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function', name: 'fund',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function', name: 'settle',
    inputs: [
      { name: 'id',       type: 'uint256'  },
      { name: 'roundIds', type: 'uint80[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'end',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'reclaim',
    inputs: [
      { name: 'id',     type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  { type: 'function', name: 'withdraw', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  // --- events ---
  {
    type: 'event', name: 'PaydaySettled',
    inputs: [
      { name: 'id',             type: 'uint256', indexed: true  },
      { name: 'index',          type: 'uint256', indexed: false },
      { name: 'payday',         type: 'uint256', indexed: false },
      { name: 'roundId',        type: 'uint80',  indexed: false },
      { name: 'answer',         type: 'int256',  indexed: false },
      { name: 'roundUpdatedAt', type: 'uint256', indexed: false },
      { name: 'usdc',           type: 'uint256', indexed: false },
      { name: 'paid',           type: 'uint256', indexed: false },
      { name: 'credited',       type: 'uint256', indexed: false },
      { name: 'arrearsAdded',   type: 'uint256', indexed: false },
      { name: 'settler',        type: 'address', indexed: false },
    ],
  },
  // --- errors ---
  { type: 'error', name: 'AlreadyEnded',       inputs: [] },
  { type: 'error', name: 'ArrearsOutstanding', inputs: [] },
  { type: 'error', name: 'BadAnswer',          inputs: [] },
  { type: 'error', name: 'BadCount',           inputs: [] },
  { type: 'error', name: 'CastOverflow',       inputs: [] },
  { type: 'error', name: 'InsufficientReserve',inputs: [] },
  { type: 'error', name: 'LengthMismatch',     inputs: [] },
  { type: 'error', name: 'NoPayroll',          inputs: [] },
  {
    type: 'error', name: 'NotAsOfPayday',
    inputs: [{ name: 'payday', type: 'uint256' }, { name: 'roundId', type: 'uint80' }],
  },
  { type: 'error', name: 'NotEmployer',        inputs: [] },
  { type: 'error', name: 'NotSettled',         inputs: [] },
  { type: 'error', name: 'NothingDue',         inputs: [] },
  { type: 'error', name: 'NothingToWithdraw',  inputs: [] },
  { type: 'error', name: 'PeriodTooShort',     inputs: [] },
  { type: 'error', name: 'ReentrantCall',      inputs: [] },
  { type: 'error', name: 'SalaryTooLarge',     inputs: [] },
  { type: 'error', name: 'StartTooOld',        inputs: [] },
  { type: 'error', name: 'TooManyPaydays',     inputs: [] },
  { type: 'error', name: 'TransferFailed',     inputs: [] },
  { type: 'error', name: 'UnknownCurrency',    inputs: [] },
  { type: 'error', name: 'UnprovableRound',    inputs: [] },
  { type: 'error', name: 'UnsettledPaydays',   inputs: [] },
  { type: 'error', name: 'ZeroFeed',           inputs: [] },
  { type: 'error', name: 'ZeroSalary',         inputs: [] },
  { type: 'error', name: 'ZeroWorker',         inputs: [] },
] as const
