Valuta, part 5 (same workspace): the last fixes from a rendered review of turn 11, measured in a browser at 390×844 and 1344×760. The phone rules in `index.css` exist but never apply, for three concrete reasons found in the code:

1. **Footer:** `PageFooter` sets `gridTemplateColumns: 'repeat(3, 1fr)'` inline, and the element never gets the `footer-cols` class. So `.footer-cols { grid-template-columns: 1fr }` under 700px can't win. Move the grid into the class and drop the inline grid. At 390 today the three columns sit side by side at 85px each.
2. **Seal:** `PayslipCard` renders `<GuillocheSeal size={171} …>` at every width. At 390 it covers the end of "0.053897", and squeezes the counterfactual and the facts into a column about 120px wide ("Round 292 / was live / at 14:00"). Under 700px:
   - the amount gets its own full-width line
   - the struck counterfactual sits under it at full width
   - then a row: the facts (flexible width) on the left, the seal at 96px on the right
   - the seal never overlaps any text
3. **Timeline:** `HonestTimeline` has a `vertical` mode, but `HomePage` never passes `vertical`. At 390 the timeline renders at desktop width: "VALUE DATE" sits at x=611 and "SETTLED" at x=1157, so everything after the first event is clipped. Pass `vertical` under 700px, from a `useMediaQuery('(max-width: 699px)')` hook.

Rule for every fix: **inline `style` props beat `@media` rules.** Any property that must change on phones (grid templates, widths, sizes, flex-direction) lives in a CSS class, not inline.

Also:
4. **The value stamp fits inside the card on phones:** max-width is the card's width minus its padding, and the font scales down so it stays on one line. At 390 today "UTC" is clipped at the card's right edge.
5. **Loading never states a fact.** While `getRoundData(r+1)` is still loading, the facts line and the timeline show "No newer round yet" / "No newer round", which is false for payslip 01 (round 293 exists). Show a placeholder until that read resolves. Say "No newer round yet" only when the read returned `updatedAt == 0`.
6. **Desktop 1344×760:**
   - The payslip header reads "VALUTA PAYSLIP · No. 01 of 20 · PAYROLL 1" on one line; today "1" wraps under it because the larger stamp crowds it. Give the header `white-space: nowrap` and let the stamp sit beside it.
   - The coupon row ends by y=744, as in the comp; today it runs about 15px past 760. Take the space from the gap above the timeline.

## Before you finish
Measure at 390×844 and 360×740 with `getBoundingClientRect`:
- footer columns stacked (different `top`, each full width)
- the seal's box intersecting no text box in the payslip
- the timeline's last label inside the viewport
- no horizontal page scroll

Then check 1344×760 against `context/redesign-a-specimen-1x.png`. Run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`, and report the files changed.
