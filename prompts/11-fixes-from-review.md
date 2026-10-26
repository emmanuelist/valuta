Valuta redesign, part 4 (same workspace): fixes from a rendered review of turns 08–10. Each item below was measured in a browser against `context/redesign-a-specimen-1x.png` and `context/08-redesign-spec.md`. Fix them in this order, so the most important land first if the turn runs short. Keep everything else as it is.

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

## D. Bundle
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
