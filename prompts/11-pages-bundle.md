Valuta redesign, part 4 (same workspace). The two secondary pages and the bundle. Use the same visual language (`context/08-redesign-spec.md`: Hanken Grotesk, Spline Sans Mono, petrol, paper payslip).

## A. /new: create a payroll
- **Two columns at 1024px and up:** the form on the left (max 480px). On the right, a **live payslip preview** using the real payslip component in its "draft" state:
  - "No. 01 of N · VALUE <first payday, UTC>"
  - "at today's rate MXN/USD 0.05356774 (round 326) ≈ 0.053567 USDC", from that feed's `latestRoundData`
  - "Reserve covers N of M paydays". When the reserve covers fewer than M, an amber line: "the rest become public arrears".
  - for back pay: "N paydays will be due immediately; anyone can settle them"
- **Validation:** only after blur or submit, inline under each field. Never show errors on an untouched form.
- **Currency options** show name, code and today's rate: "Mexican peso · MXN · 0.05356774".
- **Period:** Hourly, Daily, Weekly, Every 2 weeks, Monthly, and Custom (in minutes, at least 1, not seconds).
- **First payday:** a UTC datetime input with chips "Next hour", "Tomorrow 14:00 UTC" and "Back pay: 10 days ago". Show the parsed UTC value back ("15 Oct 2026, 14:00 UTC").
- **Review step** before signing:
  - salary × count
  - first and last value dates
  - the reserve and its runway
  - the three guarantees, in one line each
- **After a successful create:** route to `/payroll/<newId>`, where the new payroll's first payslip is shown, with a receipt card.
- **One wallet treatment:** remove ConnectKit's grey "Connect Wallet" duplicate, and use the top bar's button style everywhere.

## B. /lookup: the rate at any moment
- **Open with an answer:** MXN at 2026-10-15 14:00 UTC, already resolved. Use the same timeline component (previous, as-of and next rounds around the chosen moment) and the three facts.
- **Presets:** "Now", "1 hour ago", "Yesterday 14:00", "Payday 01 of payroll 1".
- **A live rates board** of all 8 currencies, from one multicall of `latestRoundData`. Each row shows:
  - name and code
  - rate (8 decimals) and "≈ N per USD"
  - round
  - published (UTC) and age. Over 25 h, the age turns amber, with "stale: a payday now would price at the next round".
- Label any moment "chosen time", not "PAYDAY".

## C. Bundle
- Lazy-load `/new`, `/lookup` and the wallet connector.
- Remove unused SDK imports and scaffold code.
- Initial JS under 250 kB gzipped (about 485 kB today).
- Cold load to a rendered payslip in under 3 s.

Run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`, and report the gzipped initial chunk size.
