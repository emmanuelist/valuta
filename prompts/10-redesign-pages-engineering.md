Valuta redesign, part 3 (same workspace). The two secondary pages, document polish and engineering. Use the same visual language (`context/08-redesign-spec.md`: Hanken Grotesk, Spline Sans Mono, petrol, paper payslip).

## A. /new: create a payroll
- **Two columns at ≥1024px:** the form on the left (max 480px). On the right, a **live payslip preview** using the real payslip component in its "draft" state:
  - "No. 01 of N · VALUE <first payday, UTC>"
  - "at today's rate MXN/USD 0.05356774 (round 326) ≈ 0.053567 USDC", from that feed's `latestRoundData`
  - "Reserve covers N of M paydays". When the reserve covers fewer than M, an amber line: "the rest become public arrears".
  - for back pay: "N paydays will be due immediately; anyone can settle them"
- **Validation:** only after blur or submit, inline under each field. Never show errors on an untouched form.
- **Currency options** show name, code and today's rate: "Mexican peso · MXN · 0.05356774".
- **Period:** Hourly, Daily, Weekly, Every 2 weeks, Monthly, and Custom (in minutes ≥ 1, not seconds).
- **First payday:** a UTC datetime input with chips "Next hour", "Tomorrow 14:00 UTC", "Back pay: 10 days ago". Show the parsed UTC value back ("15 Oct 2026, 14:00 UTC").
- **Review step** before signing: salary × count, first and last value dates, the reserve and its runway, plus the three guarantees in one line each.
- **After a successful create:** route to `/payroll/<newId>`, where the new payroll's first payslip is shown, with a receipt card.
- **One wallet treatment:** remove ConnectKit's grey "Connect Wallet" duplicate and use the top bar's button style everywhere.

## B. /lookup: rate as of any moment
- **Open with an answer:** MXN at 2026-10-15 14:00 UTC, already resolved. Use the same timeline component (previous, as-of and next rounds around the chosen moment) and the three facts.
- **Presets:** "Now", "1 hour ago", "Yesterday 14:00", "Payday 01 of payroll 1".
- **A live rates board** of all 8 currencies, in one multicall of `latestRoundData`: name, code, rate (8 decimals), "≈ N per USD", round, published (UTC), age. Over 25 h the age turns amber, with "stale: a payday now would price at the next round".
- Label any moment "chosen time", not "PAYDAY".

## C. Document and engineering
- **index.html:**
  - `<title>`: "Valuta: salaries in your currency, paid in USDC at payday's rate"
  - meta description: the one-line claim
  - favicon: SVG, a petrol rounded square with a white "V"
  - Open Graph title and description
- **The "Built with Arc Studio" badge:** keep it, in the footer line, not floating.
- **Footer:** "Reading Arc mainnet · Valuta 0x7d20…252a, verified on Sourcify · Demo payrolls are the builder's own wallets."
- **Typecheck and lint outside the Studio sandbox:** exclude `scripts/` (sandbox tooling that imports `@circlefin/compass-chains`) from tsconfig and oxlint, or delete those scaffold scripts if unused.
- **Bundle:**
  - lazy-load `/new`, `/lookup` and the wallet connector
  - remove unused SDK imports and scaffold code
  - initial JS under 250 kB gzipped (about 485 kB today)
  - cold load to a rendered payslip under 3 s

Run `bun run typecheck`, `bun run lint` (zero warnings) and `vite build`, and report the gzipped initial chunk size.
