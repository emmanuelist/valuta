Valuta app, fix round 1 (same workspace). The first build reads mainnet correctly; these fixes bring the home page onto the approved composition (`context/comp-4-combined.png`) and fix correctness and mobile. Make them all in this turn; change nothing else.

## A. First viewport at 1344×890 (it must match the comp)
1. **Remove the payroll tab row** ("No. 1 · MXN", "No. 2 · BRL") between the claim band and the cards. It pushes both cards about 40px down. Move payroll switching into the ledger header: "Payroll No. 1" becomes a compact menu button ("Payroll No. 1 ▾") listing every payroll as id · currency · salary per period. The cards start directly under the claim band (top at y = 237).
2. **Value axis** (`ValueAxis.tsx`). The labels collide and clip at the edges today ("91 · 12:58 …" is cut).
   - Window: whole hours from floor(prev round publish − 30 min) to ceil(next round publish + 30 min), at least 3 hours wide, with a tick and label at each whole hour (the comp shows 12:00, 13:00, 14:00, 15:00).
   - Marker labels sit above their markers as "291 · 12:58 · 0.05405990".
   - Collision avoidance: if two labels would overlap, move one to a second line above. Clamp every label inside the SVG (text-anchor start or end near the edges), so nothing is cut or overlaps the payday line.
   - "PAYDAY / 14:00" sits centred under the axis.
3. **Settlement axis** (`SettlementAxis.tsx`): four ticks only (the payday's hour ± 2 hours), the "//" break, then the settlement dot near the right end. Its label sits right-aligned above the dot, never over the axis line.
4. **Lateness**, using two units everywhere:
   - tags: "settled 9d 23h late", "settled 3h 05m late", or "on time" (≤ 15 min)
   - claim subline: "Settled 9 days 23 hours later. The rate did not move."
5. **Exact rates.** Show the feed answer with its full 8 decimals from the bigint (string formatting, never floats): 0.05389760, 0.20111020. Never round a rate. Amounts keep 6 decimals from the bigint.
6. **Stepper:** "‹ Payday 01 of 11 ›" only. Remove the words "PROOF INSPECTOR".
7. **Claim subline date:** "15 Oct, 14:00 UTC" (sentence-case month), as in the comp.
8. **Ledger bottom row.** Pin one footer row to the bottom of the ledger card (the list above scrolls), so the comp's bottom row always exists:
   - paydays due: "11 · VALUE 25 OCT 14:00 · due · rate already fixed · 0.053612 USDC" plus the petrol Settle button ("Settle 3 due" when several are due)
   - nothing due: "12 · VALUE 26 OCT 14:00 · next payday · rate fixes then", with a small live countdown and no button
9. **"Built with Arc Studio" badge:** keep it, but in the footer line, not floating over the inspector.
10. **Document:**
    - `<title>`: "Valuta: salaries in your currency, paid in USDC at payday's rate"
    - meta description: the one-line claim
    - favicon: an SVG petrol rounded square with a white "V"
    - Open Graph tags (title and description)
11. Fix the React warning "Updating border/borderBottom during rerender" (don't mix shorthand and longhand style props).

## B. Signature motion check
12. Confirm "the lock" (spec §6) plays when the payday changes through the stepper or a row click, and that the title amount never moves. Confirm `prefers-reduced-motion` shows the final state instantly.

## C. Mobile (≤640px); measured today at 390px
13. **Ledger rows overflow** to 592px inside a 390px card. Two lines per row:
    - first line: number plus VALUE stamp
    - second line: rate · R-round · amount, with the tag on the right
14. Claim band: headline about 30px on one or two lines, subline below, and the three totals as a compact three-column row.
15. Tapping a row opens the inspector as a bottom sheet (85% height, close button, swipe down to close). Desktop keeps the side card.
16. No element may extend past the viewport at 360px. Truncate ids in the middle with a copy button.

Run `bun run typecheck`, `bun run lint` (zero warnings) and `vite build`. Then report what changed, file by file.
