Valuta, part 6 (same workspace): turn 12 fixed the phone layout, which now measures correctly at 390 and 360. But its payslip restructure (the amount on its own line, then the facts beside the seal) also applies on desktop. Measured at 1344×760 with the scroll at the top:
- The card now starts at y=118 and is about 565px tall. The comp's box is (478, 75, 846×474).
- The seal sits low, beside the facts (y≈400–565), instead of in the right column beside the amount (box 1116, 271, 171×181).
- So the timeline starts near y=700, and the whole coupon row is below the 760 fold. In the comp it is visible at y 648–744.
- The value stamp box is 397px wide (24px type) against the comp's 362px. The header gets 345px but needs 362px, so it renders truncated: "VALUTA PAYSLIP · No. 01 of 20 · PAYROL…".

Fix, desktop only (700px and up); keep the phone layout exactly as it is under 700px:
1. **Restore the comp's payslip layout:**
   - The seal is in the card's right column, at box (1116, 271, 171×181), beside the amount and the facts.
   - The amount, the counterfactual and the facts flow down the left column without waiting for the seal.
   - The card's box is (478, 75, 846×474) at 1344×760.
2. **The claim starts at y=118.** The first viewport stacks: the card ending by y≈549, the timeline in y 548–623, the divider at y=628, the coupons in y 648–744. The whole coupon row is visible in 760px.
3. **The header shows in full,** with no ellipsis: "VALUTA PAYSLIP · No. 01 of 20 · PAYROLL 1". Make the stamp fit its 362px box (about 22px type, 0.04em tracking). If space is short, the stamp shrinks, never the header.

## Before you finish
At 1344×760, scroll to the top first (a reload can restore an old scroll position), then measure with `getBoundingClientRect`:
- card top 75 ± 6
- card bottom ≤ 555
- seal top ≈ 271
- coupon row bottom ≤ 750
- header `scrollWidth` ≤ `clientWidth`

Then repeat turn 12's phone checks at 390×844 and 360×740 and confirm they still pass:
- the seal overlaps no text
- the stamp is inside the card
- the timeline is vertical
- the footer columns are stacked
- no horizontal scroll

Run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`, and report the files changed.
