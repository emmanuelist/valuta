# Valuta app spec (reference for Arc Studio turn 7)

Valuta pays salaries agreed in a worker's currency in USDC on Arc, at the Chainlink rate that was live at each payday, proven from round history. Anyone can settle a payday, however late, and the rate cannot change. The app is how employers run payrolls, how workers check a payslip, and how a judge verifies all of it from Arc mainnet in minutes.

**Hard rules**
- Every value on screen comes from Arc mainnet: the Valuta contract, the Chainlink feeds, or the chain itself.
- No demo mode, mock data, placeholder numbers or fake fallbacks. Delete the scaffold's demo mode and sample data.
- **Light theme only** (the builder's requirement).

## 1. Chain and contract
- Chain: `arc` from `viem/chains` (id 5042, RPC https://rpc.mainnet.arc.io, explorer https://explorer.arc.io, Multicall3 at 0xcA11bde05977b3631167028862bE2a173976CA11, live). Remove arcTestnet and the Ethereum mainnet ENS chain from `src/config.ts`; the app is Arc mainnet only.
- Valuta v2: `0x7d209Fbd9999C8fe37b4e6B3CCeF41DbbAF3252a` (deploy block 27,804,867, Sourcify exact match). Its ABI is in this workspace's Foundry output for `contracts/Valuta.sol` (or `contracts/contract-metadata/Valuta.json`); import it, don't hand-type it.
- **Reads** (batch through viem `multicall` wherever possible; the public RPC takes about 1.2–1.6 s per round trip):
  - `payrollCount()`
  - `payrolls(1, 64)` returns `Payroll[]`: employer, worker, currency (bytes3), salary (18-decimal local amount), start, period, count, settled, endedAt, reserve, arrears
  - `payslips(id, 0, 64)` returns `Payslip[]`: payday, roundUpdatedAt, settledAt, settledBlock, roundId, settler, answer (uint128, 8 decimals), usdc, paid, credited
  - `duePreview(id, 32)` returns `DueQuote[]`: payday, roundId, answer, roundUpdatedAt, usdc (what a settlement would pay right now, already fixed)
  - `dueCount(id)`, `nextPayday(id)`, `quote(id)`, `credit(address)`, `asOf(bytes3 currency, uint256 t)`, `maxAge()`
- **Chainlink feeds** (immutable constructor args, all 8 decimals). The app needs them to read the rounds either side of a payslip's round:
  - EUR `0xDd5B15443cd733D3966a50a3E48cB7DF9Fb5DE0D`
  - MXN `0x302eaa6cd6f7AdDdc973fAC2Bb8fa32e9Ce19f21`
  - BRL `0x3406DB72AC5136b89eba6808CFcaD83aF523B3C2`
  - JPY `0xF9Fc1C20C82d774A3787845E73E41BCbF7F38F25`
  - CAD `0x5024DF70A748e5f1E720AAe8EEfc590430d71573`
  - AUD `0xaF452c2EA72b6E08AB64a67133a13C4ED35343eb`
  - KRW `0x07040A33A0204596e927595D0994C5D841d7d61D`
  - ARS `0xa261C56CABf7Ed6081646b892E57175AB2Dd8617`. This feed is USD/ARS, inverse: usdc = salary × 1e8 / answer.

  `getRoundData(roundId - 1)` and `getRoundData(roundId + 1)` give the neighbours. Round ids are uint80, with the phase in the top 16 bits, so ±1 stays inside the phase. A round past the latest returns zeros (`updatedAt == 0`): show it as "next round not yet published".
- **Settlement tx hash:** call `eth_getLogs` for exactly one block, `payslip.settledBlock`, filtered by the Valuta address and the `PaydaySettled` topic, then match on (id, index). Cache per block. **Never scan block ranges:** Arc's public RPCs refuse ranges of 10,000 blocks or more, and the chain makes about 170,000 blocks a day.
- **Units:**
  - USDC is native with 18 decimals; show 6 decimals (payouts are floored to whole micro-USDC).
  - Rates: `answer / 1e8`, shown with 7 decimals (0.0538976).
  - Salary: 18-decimal local amount, shown with 2 decimals (0 for JPY and KRW), with the currency code in front ("MXN 1.00").
  - Times in UTC ("15 OCT 14:00").
- **Lateness:** `settledAt − payday`. Up to 15 minutes reads "on time"; beyond that, "settled 10d late", "settled 3h late" or "settled 40m late" (largest unit).

## 2. Writes (wagmi injected connector, Arc mainnet only)
- Functions:
  - `create(worker, currency, salary, start, period, count)` payable (msg.value is the reserve)
  - `fund(id)` payable
  - `settle(id, uint80[] roundIds)`: take the round ids from `duePreview`, in chunks of up to 32
  - `end(id)`, `reclaim(id, amount)`, `withdraw()`
- Before every write, `simulateContract`. On a revert, decode the custom error and say what happened in plain words, naming the error:
  - `UnsettledPaydays`: "2 paydays are due. Settle them first; the contract refuses to release the reserve while pay is owed."
  - `NotAsOfPayday`, `ArrearsOutstanding`, `InsufficientReserve`, `NotEmployer`, `NothingDue`, `StartTooOld`, `PeriodTooShort`, `BadCount`, `ZeroSalary`, `ZeroWorker`, `UnknownCurrency`, `SalaryTooLarge`: one plain sentence each.
- **Wrong network:** a clear "Switch to Arc" action. **Not connected:** read-only, and action buttons say "Connect wallet to settle".
- **Transaction states:** pending (button shows progress, with the explorer link as soon as there's a hash), confirmed, failed (with the decoded reason). Everything refetches after confirmation.
- **Anyone can settle.** Say so next to the Settle button: "Anyone can settle. The rate is already fixed."

## 3. Routes
Use a tiny History-API router (no new router dependency), plus a `vercel.json` rewrite of all paths to `/index.html`.
- `/` is the home page. Its featured payroll is the one with the most settled payslips (payroll 1 today). Layout as in section 5.
- `/payroll/:id`: the same layout for any payroll; `?payday=N` selects a payday.
- `/new`: create a payroll. Fields:
  - worker address
  - currency (from `currencies()`)
  - salary per payday
  - period (hourly, daily, weekly, every 2 weeks, monthly, or custom seconds ≥ 60)
  - number of paydays (1–10,000)
  - first payday (date and time UTC; may be up to 90 days in the past, which is back pay)
  - reserve in USDC

  Live preview from the current Chainlink rate: "≈ 0.0536 USDC per payday at today's rate; this reserve covers 20 paydays." Validate the contract's rules before sending.
- `/lookup`: "Rate as of any moment". Pick a currency and a UTC date and time; `asOf` returns the round, rate and publish time, and the inspector's value axis shows that round with its neighbours.

## 4. Visual system (tokens)
- **Colours:**
  - ground #F7F8F9
  - surface #FFFFFF
  - claim band #F9FBFC
  - ink #0F1720
  - secondary text #5B6470 (≥4.5:1 on white)
  - rules #E3E6EA
  - petrol #0B4F6C: brand, primary buttons, links, selection, the as-of ring
  - petrol tint #E6F0F4: selected row
  - vermilion #D93F2B: lateness only (tags, settlement marker, caption)
  - amber #B7791F: due only
- **Type:**
  - **Radio Canada Big** (Google Fonts) carries every word, from the wordmark through headings, labels and body.
  - **Geist Mono** (Google Fonts) is used **only** for data: rates, round ids, amounts, addresses and tx hashes. Always `font-variant-numeric: tabular-nums`.
  - Small-caps labels: 11px, letter-spacing 0.08em, secondary colour.
- **Spacing:** 4px base (4, 8, 12, 16, 20, 24, 32, 40, 56).
- **Shape:** card radius 12px with a 1px border in the rules colour and no shadow (at most `0 1px 2px rgba(15,23,32,0.04)`); button radius 8px; tag radius 6px.
- **Refused:** gradients, glass and blur, glow, coloured left borders thicker than 1px, eyebrow labels above headings, emoji used as icons. Icons come from lucide-react (already installed), with one stroke width.
- **Browser surfaces:**
  - `::selection` petrol tint
  - `caret-color` petrol
  - `:focus-visible` 2px petrol ring with 2px offset on every control
  - thin scrollbars in the rules colour
  - links underline with `text-underline-offset: 3px`

## 5. Home and payroll page: first viewport at 1344×890 must match `context/comp-4-combined.png`
Boxes are measured from the approved comp in px (x, y, w, h). Copy the comp's words exactly where they are fixed copy; data values come from the chain.
- **Top bar** (0, 0, 1344, 72), white with a bottom hairline:
  - wordmark "Valuta" (28, 23, 87, 26), 34px, weight 500
  - links "Payrolls", "New payroll", "Rate lookup" (194, 31, 320, 17), 18px
  - petrol "Connect wallet" button (1158, 15, 157, 44), 16px white text; shows a short address and network when connected
- **Claim band** (0, 72, 1344, 148), #F9FBFC with a bottom hairline:
  - headline (35, 111, 593, 35): Radio Canada Big 400, **47px**: "MXN 1.00 → 0.053897 USDC", from the featured payroll's selected payslip (salary → usdc)
  - subline (35, 172, 657, 16), 15px secondary: "Paid at the Chainlink rate live on 15 Oct, 14:00 UTC. Settled 10 days later. The rate did not move." Build it from the payslip; if settled on time, end with "Settled on time."
  - three live totals at right, separated by hairlines: "2 / payrolls" (794, 118), "10 / paydays settled" (950, 118), "0.539189 / USDC paid" (1143, 119). Numbers Geist Mono 37px, labels 15px. Values: `payrollCount`; the sum of `settled` over all payrolls; the sum of `paid + credited` over all payslips.
- **Ledger card** (18, 237, 700, 624):
  - header (40, 263, 428, 18), 18px: "Payroll No. 1 · MXN 1.00 per day · Reserve 0.560811 USDC"
  - one row per payday, about 62px tall, starting at y 304, each with:
    - the number "01" (18px)
    - the stamp "VALUE 15 OCT 14:00" (small caps label plus mono time)
    - the rate (mono)
    - "R292" (mono, the round's aggregator number, i.e. the low 64 bits)
    - the amount "0.053897 USDC" (mono)
    - a tag at the right: vermilion outline "settled 10d late", or a quiet "on time" in secondary
  - selected row: petrol tint background, 1px petrol inset ring, number in petrol (no thick left bar)
  - due rows after the settled ones: "11 · VALUE 25 OCT 14:00 · due · rate already fixed", then that preview's usdc amount, then a petrol "Settle" button (593, 792, 104, 32). Several due rows show "Settle 3 due" once.
  - beyond the due rows, upcoming paydays show quietly ("upcoming · rate fixes at payday"), with the list scrolling inside the card
- **Proof inspector card** (733, 237, 589, 624):
  - payday stepper (753, 263, 201, ~16): "‹ Payday 01 of 10 ›" in petrol 12px caps, with buttons that step through the settled payslips (this replaces the comp's eyebrow text)
  - title (753, 293, 237, 26): "Why 0.053897 USDC", 27px weight 500
  - label "15 OCT · VALUE TIME AXIS" (753, 348), small caps
  - **value axis** SVG (753, 385, 549, 159):
    - a horizontal time axis spanning from the previous round's publish time minus 10% to the next round's publish time plus 10%, with hour ticks
    - three markers with labels "291 · 12:58 · 0.0540599", "292 · 13:50 · 0.0538976" and "293 · 14:06 · 0.0540808"
    - the as-of round drawn as a petrol ring; the others as hollow grey circles
    - a bold vertical ink line "PAYDAY 14:00"
  - label "SETTLEMENT TIME AXIS" (753, 579), small caps
  - **settlement axis** SVG (753, 592, 549, 92): the same hour ticks for the payday day, an axis break, then a vermilion dot at settledAt labelled "settled 25 Oct 13:59 / 10 days later"
  - caption (753, 706, 285, 16), vermilion 14px: "Settled 10 days late. The rate did not move." (on time: "Settled on time.")
  - ids (753, 771, 238, 39), Geist Mono 13px: "round id 18446744073709551908" and "tx 0x82ff…38b7" (copy buttons)
  - link "View on explorer ↗" (753, 825), petrol 14px, to the settlement tx
- **Footer** under the cards: "Reading Arc mainnet · Valuta 0x7d20…252a, verified on Sourcify · Demo payrolls are the builder's own wallets." Each part links where it should.

## 6. Signature motion: "the lock" (framer-motion is installed; use it)
When a payday is selected (on first load for payday 01, and on stepper or row click):
1. the value axis ticks fade in (120ms)
2. the payday line draws from top to bottom (220ms)
3. the as-of round's ring scales from 0.6 to 1 and locks with a brief 1.08 overshoot (240ms)
4. on the settlement axis, the vermilion marker travels from the payday position, across the break, to its settledAt position (420ms)
5. the title's amount does **not** animate: it is the fixed point while time moves

Easing `cubic-bezier(0.16, 1, 0.3, 1)`. Everything starts already visible: no layout shift, and no content hidden waiting for motion. With `prefers-reduced-motion`, show the final state instantly. Other transitions are 150–200ms (hover, selection tint). A payday settled while the page is open gets a soft petrol highlight and a "settled just now" tag that stays until clicked (persistent change state). No page-load choreography and no scroll effects.

## 7. Responsive
- **≤1100px:** the ledger and inspector stack, ledger first; the inspector follows the selection.
- **≤640px:**
  - the top bar collapses to the wordmark plus a menu button
  - the claim band stacks: headline at about 30px, totals in a three-column row underneath
  - each ledger row takes two lines (number plus stamp on the first; rate, round and amount plus tag on the second)
  - tapping a row opens the inspector as a bottom sheet (snap point at 85% height, close button, swipe down to close)
- No horizontal scroll at 360px width. Long values (ids, addresses) truncate in the middle with a copy button.

## 8. States (all of them, designed)
- **Loading:** skeleton rows at the exact row height, and a skeleton claim band. No spinners in the middle of content.
- **Empty:** no payrolls yet, with one sentence on what a payroll is and a link to New payroll.
- **RPC error:** what failed, plus a Retry button.
- **Payroll not found:** for `/payroll/99`.
- **A payroll with zero settled payslips:** the inspector explains what it will show once a payday settles, and the claim band shows the next payday's preview ("rate fixes at 14:00 UTC").
- **Arrears > 0:** a vermilion line in the ledger header: "Arrears 0.12 USDC owed to the worker".
- **Ended payroll:** "Ended 25 Oct 13:17"; upcoming rows hidden.
- **Credited payouts** (`credited > 0`): tag "credited · withdrawable", and the worker sees a Withdraw action when connected.

## 9. Acceptance
- `bun run typecheck`, `bun run lint` with zero warnings, and `vite build` all pass.
- The home page renders payroll 1's ten real payslips from mainnet, with round 292 locked for payday 01, rounds 291 and 293 as its neighbours, and the real settlement tx.
- At 1344×890 the first viewport matches the comp's composition: the regions above, at those boxes.
