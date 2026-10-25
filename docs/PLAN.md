# Plan
Hard deadline: 2026-11-02 04:59 UTC ([DoraHacks details](https://dorahacks.io/hackathon/arc-microgrants-2/detail)). **Effective deadline: 2026-10-27 22:00 UTC**, because the builder travels without a laptop on 2026-10-28 (D-005). Buffer: the morning of 2026-10-28. Times are UTC; the builder's local time is UTC+1.

Entries are reviewed as they arrive and decided in batches, so earlier is better.

| # | Milestone | Exit criteria (a stranger could check these) | Due (UTC) | Status |
|---|---|---|---|---|
| M0 | Research locked | D-001 recorded. Studio spike: Asof contracts and tests written in Studio, tests passing there, deployed to Arc Testnet, pulled into this repo | 2026-10-25 22:00 | in progress |
| M1 | Live on mainnet | The suite passes under `arc-forge`. Asof deployed on Arc mainnet and Sourcify exact match. A back-pay payroll settled at historic rates (each payday a different rate), and a live payroll accruing hourly paydays. **Checkpoint: missing this at 11:00 means switching to the runner-up (D-001)** | 2026-10-26 11:00 | |
| M2 | Core claim in the app | The Studio-built app is public, reads mainnet, and has no demo mode. The payslip shows the as-of stamp (round, publish time, payday). One real mainnet transaction is sent through the app. The late-settle beat and a named refusal are visible | 2026-10-26 22:00 | |
| M3 | Proof surface | `/benchmark` report with at most 5 fixes applied. README proof section; every claim has an EVIDENCE entry. Video shows the Studio build and the mainnet transactions. prompts/ complete | 2026-10-27 16:00 | |
| M4 | Submitted | Repo public. DoraHacks form submitted with the verbatim thesis, Studio project URL, app link, contract and tx links. `/hackathon preflight` passed from a phone on cellular | 2026-10-27 22:00 | |

## Cut list
Each entry links the decision that cut it.
- Reserve yield through Earn Kit — D-009
- Cross-chain funding (CCTP or App Kit Bridge) — D-009
- Multi-employer dashboard and payroll search — D-009
- Gas rebates for whoever settles — D-009
