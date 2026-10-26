Valuta redesign, part 4 (same workspace): fixes from a rendered review of turns 08–10. Each item below was measured in a browser against `context/redesign-a-specimen-1x.png` and `context/08-redesign-spec.md`. Fix them in this order (A, B, C, D, E), so the most important land first if the turn runs short. Keep everything else as it is.

## A. Correctness (false or broken on screen)
1. **Cheat attempt 1 sends the wrong round.**
   - It is labelled "Pay it at the rate on the day it was settled" with "would have paid 0.053567 USDC", but it calls `settle(1, [293])`, and round 293 would pay 0.054080.
   - Use the settle-day round: `asOf(currency, settledAt)` at the replay block (round 326 for payslip 01), so the label, the amount and the call agree. Fall back to r+1 (if published at that block) or r−1 only when the settle-day round is the payslip's own round.
   - Show "would have paid 0.053567 USDC" struck through, under attempt 1's result, and drop "· direct feed" from the header.
2. **Never state a fact before its data arrives.** While loading, the countdown chip says "No value dates ahead" and the register says "0 on Arc mainnet". Show placeholders (skeletons, or "…") until those reads resolve.
3. **/new** prints a raw escape in a label: "NUMBER OF PAYDAYS (1\U201310,000)". It must read "(1–10,000)".
4. **/lookup opens with an answer**, resolved on load: MXN at 2026-10-15 14:00 UTC, the hero payslip's own payday, which is round 292 with the timeline and three facts. Today it opens empty until "Look up" is pressed. Also widen the currency select so "Mexican peso (MXN)" isn't cut.

## B. Desktop first viewport at 1344×760 (compare with the comp, region by region)
1. **Vertical placement:**
   - The claim starts at y=118 (today about 65, against the bar).
   - The payslip card's top is at y=75, with the whole perforated edge visible below the bar's hairline.
2. **The coupon row is fully visible by y=744, as in the comp.**
   - Tighten the timeline block to its 75px box (y 548–623), with the divider at y=628 and the coupons at y 648–744.
   - Today the coupons start near y=685 and are cut by the fold.
3. **The seal reads as an embossed security seal, not a dark knot.**
   - Put a clear paper-white centre disc (radius about 34px) behind "RATE HELD" (Hanken 700, petrol).
   - Rosette lines are finer (0.5px) and lighter (petrol at 35–55% opacity).
   - Keep it inside its 171×181 box.
4. **The value stamp fills its 362×79 box** on one line: about 26px Hanken 600, letter-spaced (today 18px).
5. **The rate line**, verbatim from the comp: "Rate MXN/USD 0.05389760 (≈ 18.55 MXN per USD) · Chainlink round 292, published 13:50". Restore "Rate" and "Chainlink".
6. **The footer is one line:** "settled 25 Oct 13:59 by 0xe5CA…CaC3, not the employer · tx 0x82ff…38b7 · Verify on Arc ↗".
   - Keep the copy buttons small and inline.
   - Move "Try to cheat it ↓" to the quiet line beneath: "booked 9 d 23 h after the value date · Try to cheat it ↓".
7. **Remove the floating "Built with Arc Studio" badge** on every page. The footer already carries it.

## C. Phones (390×844 and 360×740)
1. **The payslip card stacks:**
   - header, stamp, salary, rate
   - the amount at full width, about 40px, never clipped
   - the counterfactual
   - then a row: the facts on the left (flexible width) and the seal at 96px on the right
   - the footer below

   The seal must never overlap text. Today it covers the amount and squeezes the facts into a three-word column.
2. **The timeline renders vertically:** six events top to bottom, labels to the right, the same log spacing. Today only "205" shows.
3. **The countdown chip spans the full width** and wraps onto two lines if needed. It must never overflow the viewport or show an ellipsis.
4. **The register is one ruled entry per payroll:**
   - "01 · Mexican peso MXN" on the first line
   - then a two-column list: Salary, Schedule, Paydays, Due, Reserve, Arrears, Next value date

   Today it is a cramped table.
5. **The footer's three columns stack**, each at full width.

## D. Colour is the payday's state (no new hues, no decoration)
Every colour names one state in a payday's life, and every surface uses the same word and colour for the same state.
1. **Add semantic tokens to `index.css`** that alias the palette, and use them in components instead of the palette names:
   - `--state-upcoming: var(--secondary)`: not yet fixed
   - `--state-due: var(--amber)`, tint `var(--ambtint)`: amount fixed, waiting to be settled
   - `--state-held: var(--petrol)`, tint `var(--ptint)`: settled at the as-of round, so the rate held
   - `--state-paid: var(--carbon)`: USDC that moved
   - `--state-void: var(--void)`: refused by the chain
   - `--state-late: var(--secondary)`: lateness, which changes nothing, so it stays colourless

   Replace the raw hex in components (`#1B3158`, `#EAF0FC`, and hardcoded `#0B4F6C` / `#E3EEF3`) with tokens. Declare any colour you keep.
2. **Red means one thing only:** the chain refused an attempt (VOID). Form and transaction errors (the EmployerPanel `fundError`, /new validation) use ink text with a lucide `AlertCircle` and an amber border, never `--state-void`.
3. **The register speaks the coupon vocabulary.** Each payroll row gets a thin payday strip under its name: one 6px segment per payday, coloured upcoming, due, held or credited, exactly as the coupons are. Then:
   - "Due" above 0 shows in `--state-due` with the count.
   - Arrears above 0 show in `--state-due` as "arrears".
   - "complete" or "ended" shows in secondary.

   This puts each payroll's life on one line in the product's own colours.
4. **/lookup:** a feed whose round is over 25 h old shows its age in `--state-due`, with the note "stale: a payday now would price at the next round".
5. **The live moment:** while the countdown runs, the chip is `--state-due`. At zero it reads "Fixing now…", then that payday's coupon stamps DUE in `--state-due`. After a settle, the receipt and the new HELD coupon use `--state-paid` and `--state-held`.

## E. Bundle
- The initial chunk is 492 kB gzipped; the target is under 250 kB.
- Load the wallet stack (ConnectKit, WalletConnect and the wagmi connectors) lazily: on the first "Connect wallet" press, or when the browser is idle after first paint.
- Keep all reads on a plain viem public client, so the payslip renders without any wallet code.
- Report the initial gzip size.

## Before you finish
- Compare 1344×760 with the comp.
- Scroll the whole page at 1440×900, 390×844 and 360×740.
- Open `/new` and `/lookup`.
- Press "Run all" in "Try to cheat it.", and check attempt 1 calls round 326 and comes back VOID with `NotAsOfPayday`.

Then run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`, and report the files changed.
