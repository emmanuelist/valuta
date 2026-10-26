Valuta, part 11 (same workspace): the builder's choices and the last state fixes, from a live test of the deployed app (including a real settle as a stranger). Change nothing else.

## 1. Replace the RATE HELD seal with "seal A" (builder's choice)
The current generative seal renders as a fuzzy, knotted ring. The builder said it "doesn't look nice". Replace `GuillocheSeal`'s drawing with the construction in `context/seal-A-reference.html`. It renders as `context/seal-A-reference.png`, and the exact geometry is in that file's comment. In short:
- A double ring.
- Ring text built from the payslip's own reads: "RATE HELD · CHAINLINK ROUND {round} · VALUE {DD MON YYYY} · {HH:MM} UTC · ".
- A regular woven band: rotated copies of an N-petal hypotrochoid, with N, copies and d taken from a hash of roundId + payday, so each seal stays unique to its proof.
- A clear centre carrying the brand's ringed round.
- Petrol only, regular and symmetric, with nothing random.
- Sizes: 171px on desktop, 96px on phones (where the ring text may be omitted under 120px).
- **Due payslip:** the rings and centre only, with the text "RATE FIXED · ROUND {round} · VALUE … · " and no woven band.
- **Upcoming payslip:** no seal.

## 2. Upcoming coupons must not look like loading skeletons
The builder asked why the coupons that aren't HELD "show that loading state": faint dashed borders, a washed-out number and a grey date. Upcoming coupons become real paper coupons:
- solid white face, crisp 1px solid `--rule` border (dashed borders only for state coupons)
- the number in full ink
- the date as a quiet stamp with a lucide `Clock`: "27 OCT · fixes 14:00", in `--secondary`
- no opacity on any part

Also remove the stray shadow band under coupons 14–20 at the coupon row's bottom edge.

## 3. Due-state truth
- **The due stamp clips "DUE"** at the card's right edge ("VALUE 26 OCT 2026 · 18:00 UTC · DUE" outgrows its box). Fit it at every width.
- **A due amount is not money that moved yet.** Render it in ink (`--ink`), with "already fixed" in `--state-due-ink`. It turns green (`--state-paid`) only once settled.
- **After a successful settle:**
  - Refetch the payroll at once; don't wait for the 10s refresh.
  - The newly HELD coupons show "settled just now" until clicked (spec 09 E).

## 4. If there is room: first load
A cold load of https://valuta-arc.vercel.app from Lagos takes 5.2s to the proof facts; the initial chunk is 492 kB gzipped. Load the wallet stack (ConnectKit and the wagmi connector setup) with `React.lazy` / dynamic `import()` when "Connect wallet" is first pressed, keeping reads on a plain viem public client. Skip this item if it would put the settle flow at risk.

## Before you finish
- At 1344×760 the hero still matches as before: claim top 118, card 75–549, coupon row bottom ≤ 744.
- The new seal sits in its 171px box with no text overlap; at 390×844 it is 96px.
- An upcoming coupon reads as a scheduled payday.

Run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`, and report the gzipped initial chunk size.
