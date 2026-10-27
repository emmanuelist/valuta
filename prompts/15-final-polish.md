Valuta, part 8 (same workspace): the final polish, from a critique of the production build. It scored 30/40, up from 19. Each item below was measured in a browser, several by Impeccable's in-page detector. Change nothing else: the layout now matches the comp at 1344×760 and holds at 390 and 360, so keep every position and size not named here.

1. **The value stamp clips "UTC" at 1440×900:** the final C runs over the stamp's border at the card edge. Fit the stamp's text inside its border at every width from 1100 to 1600: scale the type with the box, or let the box grow to its text, within the card's padding.
2. **Clause 03 in "How a payday is priced" is garbled.** Today it reads "Anyone settles, any time, for the same amount (MXN 1.00)." and then "No. 01 was settled booked 9 d 23 h after the value date by 0xe5CA…CaC3, not the employer: …". Make it read:
   - heading: "Anyone settles, any time, for the same amount."
   - body: "No. 01 was settled 9 d 23 h after its value date by 0xe5CA…CaC3, not the employer: 0.053897 USDC, the payday's amount to the micro-USDC."

   Keep the figures live from the selected payslip.
3. **Contrast and size floor** (WCAG AA, 4.5:1 for text):
   - **Countdown chip:** amber text `#9a6417` on its tint `#f5e7cf` is 4.1:1. Darken the chip text (for example `#7A4E12`), or lighten the tint, to reach 4.5:1 or more. Keep `--state-due` as the token and add `--state-due-ink` if needed.
   - **Quiet text renders at 4.3:1 (`#727c85`) and 3.0:1 (`#8e969d`) on white,** because opacity is applied to secondary text. It shows up in "booked 9 d 23 h after the value date · Try to cheat it ↓", the timeline's round labels, and similar quiet lines. Use `color: var(--secondary)` (#4F5B66, 7.6:1) with no opacity on text anywhere.
   - **The "HELD" (and DUE, CREDITED) stamps on coupons are 10px.** Make them 11px or larger.
4. **Remove Studio's sandbox tracing from the production app.** `src/main.tsx` imports `./tracing` and `./console-capture`, which patch `fetch` and log `[studio-trace] …` to every visitor's console. Remove both imports (and the files, if nothing else uses them). The app must log nothing in production.
5. **The RATE HELD seal is a faint watermark, as in the comp.** Today its strokes are near full opacity and read as a dark knot.
   - Petrol at 35–55% opacity, 0.5–0.75px strokes.
   - "RATE HELD" stays solid petrol on its clear paper disc.
   - Keep the deterministic hash and the box sizes (171px desktop, 96px phone).
6. **Minor:**
   - **Coupon row:** the last visible coupon sits flush against the row's right edge with nothing to signal more. Add right padding equal to the gap, plus a soft fade of the ground colour over the last 32px while more coupons lie off-screen.
   - **Register:** "Schedule" wraps ("daily, 14:00 / UTC"). Keep it on one line by widening that column or shortening the label.
   - **Nested card:** the detector flags a card inside a card in "Try to cheat it". Make the inner rows plain ruled rows on the one paper slip, not cards.

## Before you finish
- At 1440×900 and 1344×760, scrolled to the top: the stamp's text sits inside its border.
- Measure every text colour on its background with computed styles: all at 4.5:1 or more. No text has opacity below 1.
- The console is empty on load.
- Recheck 390×844: no horizontal scroll, the seal overlaps no text.

Run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`, and report the files changed.
