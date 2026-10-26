// Translate Valuta custom errors into plain user-facing sentences

import { decodeErrorResult } from 'viem'
import { VALUTA_ABI } from '../contracts/abi'

const ERROR_MESSAGES: Record<string, string> = {
  UnsettledPaydays:    'Paydays are still due. Settle them first; the contract refuses to release the reserve while pay is owed.',
  NotAsOfPayday:       'The round id you supplied is not the one live at that payday. Use the round id shown in the proof inspector.',
  ArrearsOutstanding:  'The payroll has unpaid arrears. Clear them by funding the reserve before reclaiming.',
  InsufficientReserve: 'The reserve does not hold that much. Lower the amount or fund the payroll first.',
  NotEmployer:         'Only the employer can do this.',
  NothingDue:          'There are no due paydays right now.',
  StartTooOld:         'The first payday cannot be more than 90 days in the past.',
  PeriodTooShort:      'The period must be at least 60 seconds.',
  BadCount:            'The number of paydays must be between 1 and 10,000.',
  ZeroSalary:          'Salary cannot be zero.',
  ZeroWorker:          'A worker address is required.',
  UnknownCurrency:     'That currency is not registered in this contract.',
  SalaryTooLarge:      'Salary exceeds the contract maximum (1e33 units).',
  AlreadyEnded:        'This payroll has already been ended.',
  NothingToWithdraw:   'There is no credited balance to withdraw.',
  TransferFailed:      'The transfer failed. The amount remains in your withdrawable balance.',
  NotSettled:          'That payday has not been settled yet.',
  TooManyPaydays:      'You can settle at most 32 paydays in one transaction. Split into smaller batches.',
  BadAnswer:           'The oracle returned an invalid answer for that round.',
  UnprovableRound:     'This round cannot be proven as the as-of round for that payday — a phase boundary may be involved.',
  CastOverflow:        'An internal value overflowed. This should not happen with normal inputs.',
  ReentrantCall:       'Reentrant call detected.',
  NoPayroll:           'That payroll does not exist.',
  LengthMismatch:      'Internal configuration error.',
  ZeroFeed:            'A feed address cannot be zero.',
}

/** Structured error result for displaying decoded revert data */
export interface DecodedError {
  name: string
  args: readonly unknown[]
  message: string
}

/** Decode a contract error into its name, args, and a human message. */
export function decodeValutaErrorRich(error: unknown): DecodedError | null {
  if (!error) return null
  const raw = (error as { data?: string; message?: string; cause?: unknown })

  if (raw.data && typeof raw.data === 'string') {
    try {
      const decoded = decodeErrorResult({ abi: VALUTA_ABI, data: raw.data as `0x${string}` })
      const msg = ERROR_MESSAGES[decoded.errorName] ?? `Contract error: ${decoded.errorName}`
      return { name: decoded.errorName, args: decoded.args ?? [], message: msg }
    } catch { /* fall through */ }
  }
  if (raw.cause) return decodeValutaErrorRich(raw.cause)
  return null
}

export function decodeValutaError(error: unknown): string {
  if (!error) return 'Unknown error.'

  const raw = (error as { data?: string; message?: string; cause?: unknown })

  // Try to decode from the ABI
  if (raw.data && typeof raw.data === 'string') {
    try {
      const decoded = decodeErrorResult({ abi: VALUTA_ABI, data: raw.data as `0x${string}` })
      const msg = ERROR_MESSAGES[decoded.errorName]
      if (msg) return msg
      return `Contract error: ${decoded.errorName}`
    } catch { /* fall through */ }
  }

  // Try walking cause chain for a nested data
  if (raw.cause) {
    return decodeValutaError(raw.cause)
  }

  // Heuristic: search message for known error names
  const msg = raw.message ?? (typeof error === 'string' ? error : 'Unknown error')
  for (const [name, text] of Object.entries(ERROR_MESSAGES)) {
    if (msg.includes(name)) return text
  }

  // User rejected
  if (msg.toLowerCase().includes('user rejected') || msg.includes('4001')) {
    return '' // silently cancel
  }

  return msg.length < 200 ? msg : 'Transaction failed. Check the explorer for details.'
}
