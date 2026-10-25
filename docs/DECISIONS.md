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
