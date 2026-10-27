Valuta redesign, part 2 (same workspace, after the payslip-hero turn). Phones, flows, employer actions and accessibility. Keep the new visual language from `context/08-redesign-spec.md`.

## A. Responsive: designed, not shrunk
- **≥1100px:** the composition as built.
- **700–1099px:** the claim on top at full width (`clamp(36px, 5vw, 51px)`), then the payslip at full width, then the timeline and coupons. One breakpoint decides this; there must be no width at which the proof disappears.
- **≤699px (phones; check 360 and 390):**
  - the top bar collapses to the wordmark, a live dot and a menu button; the drawer gets a scrim and a focus trap
  - the claim is about 32px over 3–4 lines
  - the countdown chip spans full width
  - **the payslip becomes a vertical card:**
    - header
    - stamp, not rotated more than −2°
    - salary and rate lines, wrapping cleanly
    - the amount at about 40px
    - the counterfactual
    - the seal at 120px, floated right of the facts
    - the facts
    - the footer, with ids truncated in the middle plus copy buttons
  - the timeline turns vertical (events top to bottom, the same log spacing)
  - the coupon row stays horizontal, swipeable, with snap
  - no horizontal page scroll at 360px
  - touch targets ≥ 44px

## B. Settle flow
- Due coupons and due payslips are selectable.
- "Settle now" when disconnected opens the wallet connect.
- Pending: the button shows progress, and the explorer link appears as soon as there's a hash.
- Confirmed: a **receipt card** stays until dismissed: "Settled 2 paydays · 0.040222 USDC to 0x7fC0… · by you · tx ↗". The paid coupons flip to HELD with "settled just now".
- Failed: the decoded reason in one sentence.
- An `aria-live="polite"` region announces each state.

## C. Employer actions (shown when the connected wallet is the payroll's employer)
A compact "Employer" panel under the payslip (on phones, under the coupons):
- **Fund**: an amount input. "Pays arrears first, then tops up the reserve."
- **End payroll**: confirmation copy saying what ends and what doesn't ("paydays already due still settle").
- **Reclaim**: disabled with the reason inline when the contract would refuse: "2 paydays are due. Settle them first; the contract refuses (UnsettledPaydays)". Also arrears, or more than the reserve.
- Destructive actions sit apart from Fund, with clear spacing.
- Each action is simulated first, and errors are decoded.
- Also show the reserve runway: "Reserve 0.507244 USDC covers about 9 more paydays at today's rate".

## D. Accessibility and states
- Every input has an associated `<label>`.
- The payslip is announced as an article with a heading. The timeline gets an accessible description summarising the three facts.
- Copy buttons: `aria-label` plus a visible "Copied" confirmation for 1.5 s.
- **Contrast:** the vermilion and amber pairs that failed are gone; verify every text pair is ≥ 4.5:1, including placeholders (set an explicit placeholder colour ≥ 4.5:1).
- **Loading:** skeletons shaped like the payslip and the coupons. Never show claims while data is unknown; the old "next round not yet published" text while loading is forbidden.
- **Error:** what failed, plus Retry.
- **Empty payroll:** what will appear, and how to create one.
- Fix the React warning about mixed `border`/`borderBottom`, and never call setState during render.

Run `bun run typecheck`, `bun run lint` (zero warnings) and `vite build`.
