Valuta redesign, part 3 (same workspace). Responsive layouts, accessibility and every non-happy state. Keep the visual language from `context/08-redesign-spec.md`.

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

Run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`.
