# Decisions
Append-only. To change a decision, add a new entry that supersedes it.

## D-001 · Build Asof, FX-indexed payroll, for Arc Microgrants 2 · 2026-10-25 · accepted
**Context:** 8 grants of $500. Rubric: real USDC on Arc mainnet 30%, Arc Studio usage 25%, working product 25%, potential 20%. A GitHub scan on 2026-10-25 found about 60 Studio entries: escrow (~16), splits (~11) and agent pay-per-call (~8) are saturated. Payroll has ~4 entries, none indexed to local currency. The only FX project on Arc is our own round-1 winner, Setoff.
**Decision:** a salary agreed in the worker's currency, paid in native USDC at the Chainlink rate live at each payday, proven from Chainlink round history. Anyone can settle, however late. The employer cannot reclaim the reserve while a payday is due. Shortfalls become public arrears.
**Alternatives:** an all-or-none group pot is the runner-up: simpler, but the lane has Kolo and two ajo apps. Grant vesting scored lowest (portable, weak potential). Metered software-to-software payments were rejected as the most crowded lane.
**Consequences:** depends on Chainlink FX feeds, which exist on Arc mainnet but not testnet (see D-004). Reuses Setoff's fixing expertise for a different product; the overlap was flagged to the builder, who raised no objection. Revisit if the Studio spike fails, or if M1 misses 2026-10-26 11:00 UTC: switch to the runner-up.
**Evidence:** internal/research/DOSSIER.md §§4–7. Feeds and round history checked on mainnet 2026-10-25 (docs/CONTEXT.md).

## D-002 · Every line of code goes through Arc Studio · 2026-10-25 · accepted
**Context:** the rules: "Projects built outside Arc Studio" are not eligible, and "Use of Arc Studio across the build: contracts, testing, and app" is 25% of the score. The question of whether external hardening synced back to Studio counts was asked in the Q&A on 2026-10-22 and is unanswered.
**Decision:** Studio writes all contract, test, script and app code (`arc-studio run --session asof`). Local changes are round-tripped through Studio with `--file`, never hand-edited. Every prompt is published in prompts/. This repo mirrors the Studio workspace through `arc-studio pull`, plus the docs.
**Alternatives:** writing locally and syncing to Studio is faster but is exactly the unanswered eligibility question.
**Consequences:** each change costs a Studio turn (1–3 min; 5–20 min for deploys). Studio's 30-day usage limit was at 0% on 2026-10-25.
**Evidence:** internal/research/raw/dorahacks-details-2026-10-25.md, raw/dorahacks-qa-and-r1-winners-2026-10-25.md

## D-003 · Mainnet deploy with arc-forge, outside Studio · 2026-10-25 · accepted
**Context:** Studio "does not deploy to, transact on, sign for, fund, or otherwise interact with mainnet" (Arc docs). The rules require a mainnet deployment.
**Decision:** deploy Studio's own `script/Deploy.s.sol` to mainnet with local `arc-forge` (1.7.1-dev) and verify on Sourcify. The mainnet transactions are scripted, rehearsed and confirmed with the builder.
**Consequences:** the deployed bytecode must come from Studio's sources unchanged. Record the commit and Studio file hashes in EVIDENCE.

## D-004 · TestFeed on testnet, Chainlink on mainnet, the app reads mainnet only · 2026-10-25 · accepted
**Context:** the Chainlink proxy addresses have no code on Arc Testnet, and Chainlink publishes no Arc testnet feed list (both checked 2026-10-25).
**Decision:** Studio writes `TestFeed`, a labelled stand-in with a settable history, used only in tests and the Studio testnet preview. The deployed app reads Arc mainnet and the real Chainlink proxies, with no demo mode.
**Consequences:** Studio's live preview cannot show real rates. Proof of real rates comes from the mainnet deploy, and the README says so.

## D-005 · Effective deadline 2026-10-27 22:00 UTC; repo private until then · 2026-10-25 · accepted
**Context:** the builder travels without a laptop on 2026-10-28. A public repo shows competitors the idea early, but judges need public access at submission.
**Decision:** submit on the evening of 2026-10-27, with the morning of 2026-10-28 as buffer. The repo `emmanuelist/asof` stays private until 2026-10-27 and goes public before the form is submitted.
**Consequences:** the plan is compressed into 2.5 days, so the M1 checkpoint is binding.

## D-006 · Fresh wallets for Asof · 2026-10-25 · accepted
**Context:** the Setoff `.env` says "Never reuse outside this project".
**Decision:** five new wallets (deployer, employer, two workers, and a stranger who proves anyone can settle), generated with `cast wallet new` into `.env` (mode 600). Addresses are in docs/CONTEXT.md.
**Consequences:** they need funding before M1: from Binance as in round 1, or from the Setoff wallets' leftover 4.91 USDC. **Pending the builder's choice.**

## D-007 · Payouts push with a fallback to credit · 2026-10-25 · accepted
**Context:** on Arc a native transfer can revert at runtime: blocklisted address, zero address, or a recipient contract that rejects it (Arc EVM differences).
**Decision:** a payday pushes USDC to the worker. If the push fails, the amount is credited to a withdrawable balance and the settlement still succeeds. Payouts are rounded down to whole micro-USDC (multiples of 1e12 wei), so they are exact in both USDC interfaces.
**Consequences:** one bad recipient can never block a payroll. Pure pull would make a new worker with zero USDC unable to pay gas for a claim.

## D-008 · Name and thesis · 2026-10-25 · accepted
**Decision:** the name is **Asof**. The contract performs an "as-of" lookup, like a database `ASOF JOIN`, against Chainlink round history. The thesis, used verbatim everywhere: *Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.*

## D-009 · Cuts for the 2.5-day build · 2026-10-25 · accepted
**Decision:** not building reserve yield through Earn Kit (it would need verified mainnet vaults, and the yields on demo amounts are invisible), cross-chain funding (more surface, not needed for the claim), a multi-employer dashboard (the claim needs one payroll and its payslips), or gas rebates for settlers (gasback already shows that mechanism).
**Consequences:** these move to the "potential to go further" section of the README.

## D-010 · Bound payout gas, because a worker contract could lock the employer's reserve · 2026-10-25 · accepted
**Context:** a review of Studio's turn-1 `Asof.sol` found that `_tryTransfer` forwards all gas and copies return data. A worker that is a contract can burn the gas in `receive()` and make `settle` revert, so no payday settles and `reclaim` stays blocked by `UnsettledPaydays`. Studio's three audit rounds did not flag it.
**Decision:** payouts triggered by a third party (`settle`, and arrears in `fund`) use a 50,000-gas stipend and an assembly `call` without return-data copy, then fall back to credit as before. `withdraw` and `reclaim` forward all gas (the caller is the recipient), also without copying return data. The fix is written by Studio (turn 2, `prompts/02-hardening.md`), with tests for a gas-burning worker and a huge-revert worker.
**Consequences:** a recipient whose `receive` needs more than 50k gas is credited instead of pushed, and can still `withdraw` with full gas.

## D-011 · Keep the stack Studio generated · 2026-10-25 · accepted
**Context:** Studio's sandbox ships a Vite app: React 18.3, Vite 6, wagmi 2.19, viem 2.57.5 (pinned through overrides), ConnectKit, Tailwind 3, oxlint, TypeScript ~7.0, bun 1.3.14. Foundry: solc 0.8.30, `via_ir = true` (Studio enabled it after stack-too-deep), `evm_version = cancun`.
**Decision:** keep it. Swapping frameworks would break the "built in Arc Studio" line (D-002) and cost a day. The visual layer is ours to restyle through Studio round-trips.
**Consequences:** UI work happens inside this stack. Locally, bun 1.2.21 installs the 1.3.14 lockfile fine (`bun install --frozen-lockfile`, 832 packages).

## D-012 · The product is named Valuta · 2026-10-25 · supersedes D-008
**Context:** the builder asked for a more professional name than "Asof".
**Decision:** **Valuta**. It is a banking word meaning both *currency* and *value date* (the date whose value applies to a payment, whenever the money actually moves), which is the product's claim. Checked 2026-10-25: no fintech or crypto brand by that name in search results, no Arc entry, and the GitHub name was free. The thesis is unchanged.
**Consequences:**
- The contract is renamed `Valuta` by Studio (turn 3) **before** the mainnet deploy, so the verified contract carries the final name. The `asOf()` view keeps its name, because it describes what the function does.
- The repo is renamed to `emmanuelist/valuta`; GitHub redirects the old URL.
- prompts/01 and prompts/02 still say Asof, because they are the verbatim record of what was sent.

## D-013 · Funded from the Setoff leftovers · 2026-10-25 · resolves the pending part of D-006
**Decision:** the builder chose to fund from the Setoff wallets rather than Binance. Six transfers moved 2.76 USDC: EMPLOYER 2.30, STRANGER 0.25, DEPLOYER 0.15, WORKER_MX 0.03, WORKER_BR 0.03 (E-008). About 2.15 USDC stays in the Setoff wallets for the builder's own withdrawal to Binance.
**Consequences:** after judging, the payroll is ended, the reserve reclaimed, and every wallet swept back to the builder's Binance deposit address. That needs this laptop, because the keys exist only in `.env`.

## D-014 · A local keeper settles due paydays while the laptop is on · 2026-10-25 · accepted
**Context:** a blockchain doesn't run code on a timer. Payroll 2 pays every 2 hours, and someone has to send the transaction.
**Decision:** `internal/keeper.sh` loops every 10 minutes and runs Studio's `Ops.settleDue` as EMPLOYER for each payroll with paydays due. It is operations glue, not product code (D-002 covers product code), and it is kept out of the repo.
**Consequences:**
- When the laptop is off (from 2026-10-28), paydays simply wait. Anyone can settle them later at the payday's own rate, which is the thesis, so judges can do it themselves from the app.
- Keeper gas comes from EMPLOYER, about 0.003 USDC per settlement.

## D-015 · Valuta v2 keeps payslips on-chain; v1 retired · 2026-10-25 · accepted
**Context:** measured on 2026-10-25:
- `eth_getLogs` on rpc.mainnet.arc.io and QuickNode fails at 50,000 blocks per request (9,999 works).
- Blockdaemon allows 50,000 but answers "pruned history unavailable" at 500,000.
- Arc makes about 170,000 blocks a day (0.507 s blocks).

An app that rebuilds payslips from `PaydaySettled` logs needs about 17 requests per day of history, so it would be slow for a judge looking days later, and could break where history is pruned.
**Decision:** v2 stores a `Payslip` per settled payday (round, rate, owed, paid, credited, settler, settledAt, settledBlock). It adds bounded batch views (`payslips`, `payrolls`, `duePreview`), so the app reads a whole ledger in one call and fetches only the single settlement block for a tx hash. The settlement logic, errors and events are unchanged. Written by Studio turn 4 (`prompts/04-onchain-payslips.md`).
**Consequences:**
- About 110k more gas per payday (~0.002 USDC at 20 gwei).
- v1 (`0x2bDF…76e9`) stays on mainnet as history (E-011 to E-014). Both its payrolls were ended and their reserves reclaimed to EMPLOYER (E-015).
- The payrolls and the stranger's back-pay settlement are recreated on v2.

## D-016 · Arc Studio's daily usage cap reached; fixes batched into two turns · 2026-10-25 · accepted
**Context:** Studio turn 7 (the app) ended `budget_exceeded`: 100% of the user's daily limit, a 24-hour window (`arc-studio usage --json`), after seven turns today. It wrote all 20 app files and got lint and typecheck green inside its sandbox, but its own `vite build` step didn't run (it passes locally).
**Decision:** no hand edits (D-002). Every fix found in today's inspection (hero fidelity, value-axis label collisions, exact 8-decimal rates, two-unit lateness, mobile overflow, the /new and /lookup pages, bundle size) is batched into two prompts written in advance: `prompts/08-hero-fidelity.md` (priority) and `prompts/09-pages-and-engineering.md`. They run as soon as capacity returns, expected around 2026-10-26 12:00 UTC.
**Alternatives:** the builder can buy a usage increase with `arc-studio upgrade` (a one-time payment for the org). That's the builder's decision; agents must never run it.
**Consequences:** M2 (due 2026-10-26 22:00 UTC) depends on Monday's Studio capacity. README, evidence and video work continue in parallel, because they aren't code.

## D-017 · Redesign: the payslip is the hero · 2026-10-25 · supersedes the comp-4 composition (surface brief)
**Context:** the builder found the UI not exciting or modern enough. The Impeccable critique (dual-agent, 2026-10-25) scored it 19/40 (Poor), with craft 4/10 against Setoff 8 and Warrant 9. Its P0: the proof axis is unreadable on real data, because the comp was approved on the one payday whose rounds were an hour apart, while real Arc FX rounds are 7–24 h apart. Snapshot: `.impeccable/critique/2026-10-25T22-26-13Z__src-app-tsx.md`.
**Decision (the builder's answers):** "Payslip is the hero", "Full redesign + all fixes", "Wait for the free reset", "I'll add Higgsfield credits".
- The payslip becomes the signature object: a value-date stamp, one honest timeline, a struck-through counterfactual at the settlement-time rate (from `asOf(currency, settledAt)`), three proof facts, a "RATE HELD" seal, and the settler shown.
- Raises from the redesign seed (`026e9c61…`): stamped coupon states (HELD / DUE / CREDITED / VOID), a value-date scrubber that drives the whole page, and slips registered on one baseline.
- Light theme, comp-led again once credits exist.
**Consequences:** the redesign runs as Studio turns after the daily reset (around 2026-10-26 12:00 UTC). It replaces prompts 08 and 09: their fixes are absorbed into the redesign prompts. The target is a re-run critique of ≥ 32/40 and a clear win over both references.

## D-018 · Redesign faces chosen by visual match, overriding the metric matcher's pick · 2026-10-25 · accepted
**Context:** Impeccable's font-match ranks faces by advance width and ink density. For the approved comp (`redesign-a-specimen.png`) it picked Nunito 700 for the claim (rounded terminals, where the comp shows a sharp neo-grotesk) and Roboto Condensed 300 for the amount (proportional, where tabular figures need monospace). Re-ranking with in-character candidates didn't change the metric's order.
**Decision:** a side-by-side specimen against the comp crops (rendered in the browser, 2026-10-25) chose:
- **Hanken Grotesk** for all words: single-storey g, crisp terminals, matching proportions
- **Spline Sans Mono** (light) for every figure: the plain zero and carbon-numeral feel of the comp

Setoff's Archivo and Warrant's Mona Sans were excluded on purpose, so each product keeps its own voice. The spec keeps font-match's record; the build uses these faces, and the hero gate's cap-height, weight and width readings will check the fit.
**Consequences:** if the hero gate flags a family mismatch, address it by the measured readings, not by switching to Nunito.

## D-019 · One home page that is also the landing page; the redesign queue becomes four turns · 2026-10-25 · accepted
**Context:** the builder asked whether Valuta gets a home page or a landing page. Both reference builds use one page: the live product and the claim in the first viewport, then story sections below. Setoff (round-1 winner) has "Try to break it", "How a debt clears" and "Stated plainly"; Warrant has its lock story and refusals. The queued spec covered only the first viewport. Impeccable's sections phase builds the rest of a surface inside the recorded system, with no new comp.
**Decision:** `/` stays the product. The approved comp's first viewport, the claim plus a live mainnet payslip, is the proof, before any click. Below the fold the page reads as the reverse of the payslip:
- "Try to cheat it.": four live read-only attempts on the selected payslip. Settled payslips are replayed at `settledBlock − 1` (E-022).
- "How a payday is priced": four clauses filled from chain reads.
- "Every payroll": the register, with Create a payroll.
- The imprint: built in Arc Studio, stated plainly, the contract.

There's no separate marketing page. It would put a click between the judge and the proof, and it would cost a comp and a Studio turn.

The same pass makes two more changes:
- Fonts are self-hosted from `@fontsource-variable`, because Impeccable's first-viewport capture refuses font CDNs.
- One `tryCheat` function serves both due and settled payslips.

**Queue:**
- 08: the hero (spec + comp)
- 09: home sections, settle flow, employer panel, document head
- 10: responsive, accessibility, states
- 11: /new, /lookup, bundle

The superseded drafts moved to `internal/prompts-unsent/`.
**Consequences:** one more Studio turn than planned. If capacity runs short, 11 is the turn to trim, since /new and /lookup already work from turn 7.

## D-020 · Payroll 3 (EUR, daily to 4 Dec) keeps the app live through judging · 2026-10-25 · accepted
**Context:** the keeper runs only on the builder's laptop, which travels on 2026-10-28. Payroll 2's last payday is 2026-10-28 12:00 UTC and payroll 1's is 2026-11-03 14:00 UTC, while judging starts after 2026-11-02 04:59 UTC. Without a new payroll, judges looking after 3 Nov would see nothing upcoming. The claim also names euros, and no payroll paid in them.
**Decision (the builder's yes):** payroll 3, EUR 0.01 a day at 14:00 UTC from 2026-10-26, 40 paydays to 2026-12-04, reserve 0.47 USDC (40 × 0.011202 at EUR/USD 1.1203, with headroom for a stronger euro), paid to a fresh wallet WORKER_EU (E-023).
**Consequences:**
- The countdown always has a value date ahead during judging.
- After 2026-10-28 no keeper runs, so due paydays wait with their amounts fixed. Judges can settle them, or try to cheat them.
- The README and footer must say this plainly instead of "settled within minutes".
- After judging, end payroll 3, reclaim its reserve and sweep WORKER_EU with the other wallets.


## D-021 · The redesign turns run back to back the moment Studio opens · 2026-10-25 · supersedes D-019's queue
**Context:** the builder: "Now that you know the limit of the Studio, build at once all we can in the next session when it is open, so that we have ample time tomorrow." Studio's cap is daily (D-016), so idle capacity in an open window is lost, and every turn re-reads the workspace, which costs quota.
**Decision:** three turns instead of four. Old 10 and 11 merge into `prompts/10-responsive-states-pages.md`. They are chained by `internal/studio-chain.sh`, with no wait between them. Each turn has a "Before you finish" check at the target viewports.
- Gate 1: the builder's accepted component review (`component-review verify`), or their explicit word to skip it.
- Gate 2: Studio capacity. Turn 08 starts below 60% used, so the hero is never cut mid-turn. Turns 09 and 10 start below 95%.

After each turn the chain pulls, syncs Studio's deletions in `src/`, `public/` and `scripts/`, and commits as "studio turn NN". It stops on any status other than `completed`.
**Consequences:** sections and responsive work land before the hero gate is run. The gates run afterwards on the full build, and the next window goes to fixes. If the cap cuts turn 10, its unfinished part carries into that window.
