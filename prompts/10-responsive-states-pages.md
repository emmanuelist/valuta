Valuta redesign, part 3 (same workspace). Responsive layouts, accessibility, every non-happy state, the two secondary pages and the bundle. Keep the visual language from `context/08-redesign-spec.md`: Hanken Grotesk, Spline Sans Mono, petrol, the paper payslip.

## A. Responsive: designed, not shrunk
- **1100px and up:** the composition as built. The first viewport must also hold at common desktop widths, 1280 to 1600:
  - fluid columns from the spec's proportions, not a fixed-pixel grid that wraps 100px narrower
  - sizes in proportion to the viewport rather than px floors
  - nothing the first viewport shows is pushed below the fold
- **700–1099px:** the claim on top at full width (`clamp(36px, 5vw, 51px)`), then the payslip at full width, then the timeline and coupons. One breakpoint decides this, and there must be no width at which the proof disappears.
- **699px and below (phones; check 360 and 390):**
  - the top bar collapses to the wordmark, a live dot and a menu button; the drawer gets a scrim and a focus trap
  - the claim is about 32px, over 3–4 lines
  - the countdown chip spans the full width
  - **the payslip becomes a vertical card:**
    - header
    - stamp, rotated no more than −2°
    - salary and rate lines, wrapping cleanly
    - the amount at about 40px
    - the counterfactual
    - the seal at 120px, floated to the right of the facts
    - the facts
    - the footer, with ids truncated in the middle plus copy buttons
  - the timeline turns vertical: events top to bottom, with the same log spacing
  - the coupon row stays horizontal, swipeable, with snap
  - **the sections below:**
    - "Try to cheat it": each attempt row stacks as words, then the call, then Run, then the result, under its own number
    - the four clauses stack
    - the register turns into one ruled entry per payroll: No. and Pays on the first line, then the figures in two columns
    - the imprint's three columns stack
  - no horizontal page scroll at 360px
  - touch targets of at least 44px

## B. Accessibility
- Every input has an associated `<label>`.
- The payslip is announced as an article with a heading. The timeline gets an accessible description summarising the three facts.
- Each attempt's result is announced through `aria-live="polite"`.
- Copy buttons get an `aria-label` and a visible "Copied" confirmation for 1.5 s.
- **Contrast:** verify every text pair reaches at least 4.5:1. That includes placeholders: set an explicit placeholder colour at 4.5:1 or above. It also includes the amber and void red on their tints.
- **Keyboard:** everything reachable in order, with the 2px petrol focus ring. The coupon keys (←/→, j/k) must not trap focus.
- **Reduced motion:** final states appear instantly, everywhere.

## C. States
- **Loading:**
  - Skeletons shaped like the payslip, the coupons and the register.
  - Never show a claim while its data is unknown. The old "next round not yet published" text during loading is forbidden.
- **Error:** what failed, plus Retry.
- **Empty payroll** (a new payroll with no payslips): what will appear here, and when.
- **No payrolls:** how to create one.
- **Long and large content:**
  - an ARS payroll (USD/ARS answers above 1,000)
  - a salary of 1,000,000
  - 36 or more coupons
  - an address with no ENS
  - a payroll that has ended
- Fix the React warning about mixed `border`/`borderBottom`, and never call setState during render.


## D. /new: create a payroll
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

## E. /lookup: the rate at any moment
- **Open with an answer:** MXN at 2026-10-15 14:00 UTC, already resolved. Use the same timeline component (previous, as-of and next rounds around the chosen moment) and the three facts.
- **Presets:** "Now", "1 hour ago", "Yesterday 14:00", "Payday 01 of payroll 1".
- **A live rates board** of all 8 currencies, from one multicall of `latestRoundData`. Each row shows:
  - name and code
  - rate (8 decimals) and "≈ N per USD"
  - round
  - published (UTC) and age. Over 25 h, the age turns amber, with "stale: a payday now would price at the next round".
- Label any moment "chosen time", not "PAYDAY".

## F. Bundle
- Lazy-load `/new`, `/lookup` and the wallet connector.
- Remove unused SDK imports and scaffold code.
- Initial JS under 250 kB gzipped (about 485 kB today).
- Cold load to a rendered payslip in under 3 s.

## Before you finish
Open the preview at 1440×900, 1280×800, 768×1024, 390×844 and 360×740, and on `/`, `/payroll/2`, `/new` and `/lookup`. Fix anything clipped, overlapping, misaligned or scrolling sideways. There must be no placeholder copy and no console errors.

Run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`, and report the gzipped initial chunk size and the files changed.
