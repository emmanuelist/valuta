Valuta redesign, part 2 (same workspace, after the payslip-hero turn). This turn covers:
- the rest of the home page under the coupon row
- the settle flow
- the employer panel
- the document head

Keep the visual language of `context/08-redesign-spec.md` exactly: the same paper, perforated edges, stamps, 1px rules, palette and two faces. Add nothing the hero doesn't already use: no new colours, illustrations, icon grids, gradients or nested cards.

Below the fold, the page reads as **the reverse of the payslip**: the attempts to cheat it, the terms that price it, the register of every payroll, and the imprint. Every figure is a live read. Only the fixed copy is hardcoded.

## A. "Try to cheat it." (first section under the coupon row)
- **Heading:** "Try to cheat it." (Hanken 600, 34px). Under it, in 17px secondary: "Each attempt is a real read-only call to the live contract on Arc mainnet. Press one: the chain answers, not this page."
- **What it acts on:** the payslip selected above, stated in mono 14px.
  - Settled: "On payslip No. 01 · payroll 1 · replayed at block 27,805,206, the block before it was settled".
  - Due: "…at the latest block, while it is due".
  - Upcoming: "Nothing to attempt before 26 Oct 14:00 UTC. Pick a settled or due payslip.", with the rows disabled.
- **Layout:** one paper slip holding four attempt rows. Each row has:
  - the attempt in words (Hanken 500, 17px)
  - the exact call (mono 13px, secondary)
  - a **Run** button (petrol outline)
  - a result cell, empty until run
  - **Run all**, at the slip's top right, runs the four in order, 150 ms apart.
- **The four attempts:**
  1. "Pay it at the next round's rate", or "the previous round's rate" when the next round wasn't published at that block. This is `tryCheat(payslip)` from turn 08. Expected: `NotAsOfPayday`, with "would have paid 0.054080 USDC" struck through.
  2. "The employer pulls the reserve while this payday is due": `reclaim(id, 1)` from the employer's address at the same block. Expected: `UnsettledPaydays`.
  3. "A stranger takes the reserve": `reclaim(id, 1)` from the visitor's address, or the zero address if not connected. Expected: `NotEmployer`.
  4. "Control: pay it at round 292, the round live at payday": the honest `settle`. Show a petrol **SETTLES** stamp and "The honest call goes through. Nothing was sent."
- **Results:**
  - A refusal stamps **VOID** in void red, rotated −3° with a 200 ms stamp-in, beside the decoded error name and arguments from the ABI. Show round ids as their low 64 bits.
  - Never hardcode a result. If the chain answers differently, show what it said.
  - While running: "asking Arc…". On an RPC error: "Arc didn't answer: <reason>", with Retry.
- **Under the slip,** a quiet line: "Calls from the employer's address need no key: eth_call simulates without signing."
- **In the hero footer,** after "Verify on Arc ↗", add "· Try to cheat it ↓". It scrolls here and runs nothing by itself.

## B. "How a payday is priced"
Four numbered clauses in one row, filled from the selected payslip's reads:
- numbers 01–04 in Spline Sans Mono, like the coupons
- a bold lead in Hanken 600 at 17px
- one or two sentences at 16px

The clauses:
1. **The value date fixes the rate.** "The Chainlink round live at that second decides: round 292 for 15 Oct 14:00 UTC, MXN/USD 0.05389760."
2. **The contract proves the round.** "Round 292 was published at 13:50, before payday, and round 293 at 14:06, after it. It was 10 minutes old, inside the 25 h limit. Any other round is refused by name."
3. **Anyone settles, any time, for the same amount.** "No. 01 was settled 9 d 23 h late by 0xe5CA…CaC3, not the employer: 0.053897 USDC, the payday's amount to the micro-USDC."
   - Due payslip: "Anyone can settle it now, or a year from now, for 0.018412 USDC" (from `duePreview`).
   - Upcoming payslip: "It will be fixed at 26 Oct 14:00 UTC by the round live then."
4. **Pay is never skipped.** "The reserve can't leave while a payday is due. A shortfall becomes public arrears, which the next funding pays first."

## C. "Every payroll"
- **Heading:** "Every payroll", plus "3 on Arc mainnet" in mono, from `payrollCount()`.
- **The register:** a ruled table with 1px rules, no zebra stripes, mono figures and right-aligned numbers.
  - Columns: No. · Pays · Salary · Schedule · Paydays · Due now · Reserve · Arrears · Next value date.
  - Example row: "01 · Mexican peso MXN · 1.00 · daily, 14:00 UTC · 11 of 20 · 0 · 0.507244 USDC · 0 · 26 Oct 14:00".
- **Reads:** `payrolls(1, 64)`, `dueCount(id)` and `nextPayday(id)`, in one Multicall3 batch.
- **End states:** an ended payroll reads "ended 28 Oct"; one with no paydays left reads "complete".
- **Rows:** each whole row is a focusable link to `/payroll/:id`, with a petrol tint on hover. The row for the payroll shown above carries the 2px petrol outline.
- **Under the table:** "These are the builder's own demo payrolls. The contract is open: anyone can create one." Then a petrol **Create a payroll** button (`/new`) and a link "Look up the rate at any moment →" (`/lookup`).

## D. The imprint (footer)
Three columns over a top hairline, at 15px:
- **Built in Arc Studio.** "Arc Studio wrote the contract, its tests and this app. Every prompt is published." Links:
  - Studio project ↗ (https://studio.arc.io/app/ad133b3b-d828-4323-88f3-5be7b8f0bad4)
  - The prompts ↗ (https://github.com/emmanuelist/valuta/tree/main/prompts)
  - Source ↗ (https://github.com/emmanuelist/valuta)
- **Stated plainly.** "Unaudited. The demo payrolls are the builder's own wallets. Arc Studio deploys to testnet only, so its exact source was deployed to Arc mainnet and verified: Sourcify, exact match ↗. FX rounds arrive 7 to 24 hours apart. A payday prices at the round live then, or at the next round if that one was over 25 hours old."
  - The Sourcify link is https://repo.sourcify.dev/5042/0x7d209Fbd9999C8fe37b4e6B3CCeF41DbbAF3252a, the human-readable page.
- **On Arc mainnet.** In mono:
  - "Valuta 0x7d20…252a ↗" (explorer)
  - "chain 5042"
  - "reading block 27,861,402" (live)
  - the "Built with Arc Studio" badge sits here, not floating

## E. Settle flow
- **Settle now** on a due payslip or a DUE coupon:
  - When disconnected, it opens the wallet connect.
  - It settles every due payday up to and including the selected one, because `settle` works in order. Rounds come from `duePreview`, and the call is simulated first.
- **Pending:** the button shows progress, and the explorer link appears as soon as there's a hash.
- **Confirmed:** a receipt card stays until dismissed: "Settled 2 paydays · 0.036824 USDC to 0x7fC0… · by you · tx ↗". The paid coupons flip to HELD with "settled just now".
- **Failed:** the decoded reason, in one sentence.
- **Announcements:** an `aria-live="polite"` region announces each state.

## F. Employer panel (only when the connected wallet is this payroll's employer)
It sits between the coupon row and section A.
- **Reserve runway:** "Reserve 0.507244 USDC covers about 9 more paydays at today's rate."
- **Fund:** an amount input. "Pays arrears first, then tops up the reserve."
- **End payroll:** confirmation copy: "Paydays already due still settle. No new paydays come due."
- **Reclaim:** disabled, with the reason inline, whenever the contract would refuse:
  - due paydays: "2 paydays are due. Settle them first; the contract refuses (UnsettledPaydays)."
  - outstanding arrears
  - an amount over the reserve
- Destructive actions sit apart from Fund.
- Every action is simulated first, and its errors are decoded.

## G. Document head and engineering
- **index.html:**
  - `<title>`: "Valuta: salaries in your currency, paid in USDC at payday's rate"
  - meta description: the claim
  - favicon: SVG, a petrol rounded square with a white "V"
  - Open Graph title and description
- **Outside the sandbox:** typecheck and lint must pass there too. Exclude `scripts/` (sandbox tooling that imports `@circlefin/compass-chains`) from tsconfig and oxlint, or delete those scaffold scripts and their package.json entries if unused.
- **package.json:** add `"build": "vite build"`. Make `lint` fail on any warning, without `--fix`, and keep a separate `lint:fix`.

## Before you finish
Open the preview at 1440×900 and scroll the whole home page, first on a settled payslip, then on a due one (payroll 2 or 3, when one is due). Run every attempt in section A, and check each result against what the chain answered. Fix anything clipped, overlapping or misaligned. There must be no placeholder copy and no console errors.

Run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`. Report the files changed.
