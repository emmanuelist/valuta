# Valuta redesign: "the payslip is the hero" (reference for Studio turns 8–10)

The approved composition is `context/redesign-a-specimen.png`, at 2688×1520 = 2× a 1344×760 viewport. All boxes below are in **1344-wide CSS px** (the comp's pixels halved). The first viewport at 1344×760 must land each region at its box. Real data replaces the comp's sample values.

**Unchanged rules:**
- Every value comes from Arc mainnet (Valuta v2 `0x7d209Fbd9999C8fe37b4e6B3CCeF41DbbAF3252a`, the Chainlink feeds, the chain).
- No demo mode, no mocks.
- Light theme only.

## 1. World and tokens (replace the current visual layer)
The payslip is printed as a **security document**: crisp white paper on a cool-white desk, petrol ink, carbon-blue figures.
- **Colours:**
  - ground #F6F8F9
  - paper #FFFFFF
  - ink #0E1B26
  - secondary #4F5B66 (must reach ≥ 4.5:1 on white and on #F6F8F9)
  - rule #DCE2E6
  - petrol #0B4F6C: brand, stamps, seal, the held state, selection
  - petrol tint #E3EEF3
  - carbon blue #1F3886: filled figures (the paid amount, the settlement mark)
  - amber #9A6417: due and countdown, text ≥ 4.5:1; use the #F5E7CF tint for chip fills
  - void red #B42318: **only** for a refused cheat (VOID); ≥ 4.5:1
- **Lateness is never red.** It is quiet secondary text: "booked 9 d 23 h after the value date".
- **Type:**
  - **Hanken Grotesk** for all words, headings and UI.
  - **Spline Sans Mono** for every figure, id, rate, amount, address and the payslip's printed lines. Always `tabular-nums`.
  - **Self-host both:** `bun add @fontsource-variable/hanken-grotesk@5.3.0 @fontsource-variable/spline-sans-mono@5.3.0`, imported in `main.tsx`. Use no Google Fonts `<link>` and no font CDN: the first-viewport check loads fonts only from the app's own files.
  - Drop Radio Canada Big and Geist Mono.
- **Paper:**
  - card radius 6px, 1px rule border
  - shadow `0 1px 2px rgba(14,27,38,.05), 0 18px 40px -18px rgba(14,27,38,.18)`
  - a **perforated top edge**: a row of small half-circle cut-outs made with a CSS `mask` of repeating radial gradients (not a clip-path polygon)
  - a faint **guilloché line ground**: an SVG pattern of fine petrol wave lines at 5% opacity, behind the slip's content only
- **Refused:** gradients as decoration, glass, glow, eyebrow kickers above headings, coloured left borders thicker than 1px, emoji used as icons. Icons come from lucide-react only.
- **Browser surfaces:**
  - `::selection` petrol tint
  - `caret-color` petrol
  - `:focus-visible` 2px petrol ring with 2px offset
  - thin scrollbars in the rule colour
  - links underline with an offset

## 2. Home and `/payroll/:id`: first viewport at 1344×760
The home page features **payroll 1** (`FEATURED_PAYROLL_ID = 1n` in config). Its first payslip was settled nine days late by a stranger at payday's rate, so it shows the claim in one object. Don't pick the payroll by "most settled": payroll 2 settles every 2 h and would take over. `/payroll/:id` shows any payroll.
- **Top bar** (0, 0, 1344, 63): ground colour, with a bottom hairline.
  - wordmark "Valuta" (21, 21), Hanken 600, 30px
  - links "Payrolls · New payroll · Rate lookup" (175, 25), 17px
  - **live indicator** (866, 25): a pulsing petrol dot plus "Arc mainnet · block 27,861,402", with the real block number from `watchBlockNumber`, polled every 4 s, in mono 14px
  - petrol button "Connect wallet" (1160, 10, 160, 42)
- **Claim** (32, 118, 400, 336): Hanken Grotesk 600, about 51px (cap height about 36px), line-height 1.08, tracking −0.015em, ink. The verbatim text: **"Salaries agreed in pesos, paid in USDC at the rate that was live on payday, however late it settles."**
- **Countdown chip** (36, 475, 340, 44):
  - amber outline and tint, clock icon, live each second: "Payroll 2 · next value date in 01:59:41"
  - it counts down to the soonest upcoming payday across all payrolls
  - at zero it reads "Fixing now…", then that payday appears as DUE with its fixed amount
  - if no payroll has an upcoming payday: "No value dates ahead", in quiet secondary text with no amber
- **The payslip** (478, 75, 846, 474): the signature object. It shows the selected payslip; on load, the featured payroll's first payslip. Contents:
  - **header** (512, 109): mono 14px small caps, "VALUTA PAYSLIP · No. 01 of 20 · PAYROLL 1"
  - **value-date stamp** (936, 113, 362×79):
    - rotated −3°, a 2.5px petrol border with radius 6px
    - petrol Hanken 600 at about 30px, letter-spaced: "VALUE 15 OCT 2026 · 14:00 UTC"
    - a very subtle ink-texture mask is allowed; it must stay crisp and legible
  - **salary** (513, 184): mono 16px, "Salary MXN 1.00"
  - **rate** (512, 231), between dashed rules: mono 15px, "Rate MXN/USD 0.05389760 (≈ 18.55 MXN per USD) · Chainlink round 292, published 13:50"
    - the rate is the answer with all 8 decimals, formatted from the bigint
    - "≈ 18.55 MXN per USD" is 1/rate (for USD/ARS, the answer itself as ARS per USD)
    - "292" is the round's low 64 bits
  - **paid amount** (514, 282, 470×48): Spline Sans Mono 300, about 64px, carbon blue, "0.053897 USDC" (6 decimals from the bigint)
  - **counterfactual** (511, 350): mono 13px secondary, `line-through`, "0.053567 at the 25 Oct rate it settled on"
    - compute it from `asOf(currency, settledAt)`, then the same conversion and flooring as the contract
    - if that round equals the payslip's own round: "Settled while its own round was still live: same amount"
  - **RATE HELD seal** (1116, 271, 171×181): a generative guilloché rosette drawn in SVG at runtime
    - parameters (loop counts, radii, phase) come from a deterministic hash of the payslip's roundId plus payday, so **every payslip's seal is unique to its proof**
    - fine petrol strokes, "RATE HELD" in Hanken 700 at the centre
    - due payslips show the seal outline only; upcoming ones show none
  - **three facts** (514, 399, 282×78): each line with a lucide CircleCheck in petrol and mono 15px text, computed from chain reads:
    - "Round 292 was live at 14:00", from `getRoundData(r).updatedAt ≤ payday`
    - "Round 293 came at 14:06", from `getRoundData(r+1).updatedAt > payday`. If r is the latest: "No newer round yet". Trap: on these feeds, `getRoundData` past the latest round returns all zeros instead of reverting, so treat `updatedAt == 0` as "No newer round yet", never as a 1970 time.
    - "10 minutes old, inside 25 h", from payday − updatedAt against `maxAge()`. Stale-fallback case: "Live round was 27 h old; priced at the next round".
  - **footer** (512, 520): mono 14px
    - "settled 25 Oct 13:59 by 0xe5CA…CaC3, not the employer · tx 0x82ff…38b7 · Verify on Arc ↗"
    - if the settler is the employer: "by the employer"
    - the tx comes from a single-block `getLogs` on `settledBlock`
  - a quiet line under the footer: "booked 9 d 23 h after the value date · the rate did not move"
- **Timeline** (67, 548, 1213×75): **one honest timeline**. It is not a linear time axis, because real round gaps are 7–24 h.
  - Six events in order:
    - previous round (hollow)
    - **as-of round** (petrol ring and dot)
    - payday (a star in a circle, labelled "14:00 / PAYDAY")
    - next round
    - a break mark "//" when the next gap exceeds 24 h
    - settlement (a carbon-blue dot, labelled "25 Oct / SETTLEMENT")
  - Spacing between consecutive events is proportional to log(1 + gap minutes), with a minimum of 120px. Each label sits under its own marker (round number; time above). No hourly ticks, so nothing collides.
  - Due payslips end at payday; upcoming ones show only a "now" marker and the payday ahead.
- **Divider** (0, 628): a full-width hairline.
- **Coupon row** (27, 648, 1286×96): one coupon per payday, each about 112×96.
  - each coupon: a dashed perforated border, its number in Hanken 600 at 22px, and a small rotated state stamp
    - **HELD** (petrol): settled
    - **DUE** (amber): due, amount already fixed
    - **CREDITED** (carbon blue): payout credited
    - **upcoming**: quiet grey outline with its date
  - the selected coupon has a 2px petrol outline (an outline, not a left border)
  - the row scrolls horizontally with snap when it doesn't fit, scrolled to keep the selection visible
  - clicking a coupon swaps the payslip
  - keyboard: ←/→ and j/k step through coupons; Enter selects
  - `aria-current` on the selected coupon

## 3. Motion: "stamp, travel, hold" (framer-motion; one authored moment)
On selecting a payslip:
1. The stamp presses: scale 1.12 → 1, rotate −6° → −3°, opacity 0 → 1, as a spring (stiffness 420, damping 20).
2. The seal's strokes draw in with stroke-dashoffset (650 ms, ease-out-expo).
3. The three facts tick in, staggered 90 ms.
4. On the timeline, the settlement dot travels from the payday marker across the break to its place (450 ms).

The paid amount rolls its digits to the new value (280 ms) and then **never moves while time moves**. Everything starts already visible: no layout shift, and no content hidden waiting for motion. With `prefers-reduced-motion`, show the final state instantly. Other transitions are 150–200 ms.

## 4. Live data
- Refetch payroll reads on new blocks (throttled to every 10 s), plus the countdown.
- When a payday becomes due, its coupon flips to DUE (a 200 ms stamp-in) and stays highlighted until clicked ("settled just now" uses the same persistence after a settle).
- Keep Multicall3 batching. Use exactly one ProofInspector or Payslip component instance (today two are mounted).

## 5. Due and upcoming payslip states (in the hero slip)
- **DUE:**
  - stamp "VALUE 25 OCT 2026 · 16:00 UTC · DUE" in amber
  - the amount from `duePreview` labelled "already fixed"
  - the facts computed from the preview round
  - footer actions:
    - **Settle now**: if not connected, open the wallet connect instead of a disabled button. Simulate first, then write. Then show a receipt card (tx link, "settled by you") that stays until dismissed.
    - **Try to cheat it**: a read-only `eth_call` of `settle(id, rounds)` from the visitor's address, or from the zero address if not connected. Build it as one function, `tryCheat(payslip)`, because the next turn reuses it for settled payslips.
      - **Which block:** for a DUE payslip, the latest block. For a HELD payslip, replay at `settledBlock − 1`, the block before it was settled, when it was still due. The public RPC serves historical state (verified 70 days back), so this works on every settled payslip.
      - **The rounds:** `settle` works in order from the first unsettled payday. For a due payslip, `rounds` holds the correct `duePreview` rounds for any due paydays before it. For a replay, it holds the stored rounds of the paydays settled earlier in that same block. Either way, **one wrong round** for this payday comes last.
      - **The wrong round** is r+1 if it had been published as of the call's block: the late employer waiting for a better rate. Otherwise it is r−1. Never send an unpublished r+1: the chain answers `BadAnswer`, which proves nothing about the rate (captured on mainnet, E-021).
      - **The control:** also run the same call with the correct round, and show that it goes through.
      - **Verified on mainnet:** at block 27,805,206, `settle(1, [round 293])` reverts with `NotAsOfPayday(1792072800, round 293)`, and `settle(1, [round 292])` succeeds.
      - **The result:** decode the revert with the ABI and show the error's real name and arguments, never hardcoded text. Show it as a red **VOID** stamp: "NotAsOfPayday: the contract refused round 205 for this payday. Round 206 was live at 16:00."
      - Show the amount the wrong round would have paid, struck through, computed from `getRoundData(wrong).answer` at that block with the same conversion.
      - **This turn** shows it on DUE payslips only. The HELD hero at 1344×760 gets no cheat control, because the first viewport must match the comp. The next turn adds it in a section below.
- **UPCOMING:** stamp "VALUE … · FIXES IN 01:59:41", no amount. A quiet line reads "today's rate would pay ≈ 0.020111; the round live at payday decides" (from `quote`).
