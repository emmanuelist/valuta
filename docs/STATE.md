# State
_Last verified: 2026-10-26 07:08 UTC (branch 6-app)_

**Thesis:** Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.
**Milestone:** M2 · Core claim in the app (due 2026-10-26 22:00 UTC) · **Effective deadline:** 2026-10-27 22:00 UTC (hard: 2026-11-02 04:59 UTC)
**Next action:** nothing to send by hand. `internal/studio-chain.sh` (running since 07:07 UTC, log `internal/studio/chain.log`) sends Studio turns 08 → 09 → 10 back to back (D-021). The builder skipped the component review ("skip the review"); Impeccable refused to force its plates gate, so its formal gates stay unrecorded and fidelity is measured with standalone `comp-diff`. Turns start when usage is below 50% (08), 55% (09) and 85% (10). The cap is rolling (CONTEXT), so 08 is expected between about 12:40 and 14:45 UTC. When the chain ends: verify locally, hero comp-diff at 1344×760, critique (target ≥ 32/40), fix turn in the next window, CI (#5), Vercel, film, submit (#6)
**Blocked on:** nothing

## Works (verified this session)
| Capability | Verified by | Evidence |
|---|---|---|
| **Valuta v2 live on Arc mainnet, Sourcify exact match** | receipt, code, Sourcify API | E-016 |
| Whole payslip ledger in one `eth_call`; settlement tx by single-block `getLogs` | timed reads against mainnet | E-019 |
| Stranger settled 10 overdue paydays on v2, each at its own round | tx and payslip read-back | E-019 |
| 96 tests pass under Arc semantics (fork tests on live feeds included) | `arc-forge test --network arc` | E-017 |
| Keeper settles due paydays every 10 min (payrolls 1 and 3 daily, payroll 2 every 2 h); it caught up after the laptop slept; restarted for payroll 3 at 23:38 UTC | `internal/keeper.log`: 14:10 to 22:02 UTC, payroll 2 at 5 of 5 settled | — |

## Deployed
| What | Network | Address / URL | Last checked |
|---|---|---|---|
| **Valuta v2** | **Arc mainnet** | `0x7d209Fbd9999C8fe37b4e6B3CCeF41DbbAF3252a` | 2026-10-25 14:15 UTC |
| Payroll #1: MXN 1.00 daily, back pay from 10-15 (20 paydays) | v2 | id 1: 11 settled (10 by STRANGER, late; 1 by keeper, on time), reserve 0.5072 USDC | 2026-10-25 23:10 UTC |
| Payroll #2: BRL 0.10 every 2 h from 10-25 14:00 (36 paydays) | v2 | id 2: 9 settled; 06–09 in one late tx, each at its own round (E-024) | 2026-10-26 06:50 UTC |
| Payroll #3: EUR 0.01 daily at 14:00 UTC from 10-26 (40 paydays, to 12-04) | v2 | id 3: 0 settled, reserve 0.47 USDC, first payday 10-26 14:00 UTC (E-023) | 2026-10-25 23:37 UTC |
| Valuta v1 (retired) | Arc mainnet | `0x2bDF0F489687a57a0E63E609281C3eC86dda76e9` | ended and reclaimed |
| Studio project | studio.arc.io | https://studio.arc.io/app/ad133b3b-d828-4323-88f3-5be7b8f0bad4 | 2026-10-25 |
| Repo (private until 2026-10-27) | GitHub | https://github.com/emmanuelist/valuta | 2026-10-25 |

## Design (Impeccable, comp-led)
- Critique baseline **19/40** (dual-agent, 2026-10-25), craft 4/10 against Setoff 8 and Warrant 9: `.impeccable/critique/2026-10-25T22-26-13Z__src-app-tsx.md`.
- **Redesign (D-017):** the payslip is the hero. The approved comp is `.impeccable/mocks/redesign-a-specimen.png` (A, Specimen).
- The spec has 20 pixel-exact regions and 0 plates. Faces are Hanken Grotesk and Spline Sans Mono (D-018).
- Build phase: comps ✓ spec ✓ → plates gate waits on the **component review**: the builder accepts at http://127.0.0.1:61685/ (session d75619c3…).
- Higgsfield: 4 credits left on the builder's new workspace.

## Broken or unverified
- The current app (Studio turn 7) runs and reads mainnet (E-020), but scored 19/40. It will be replaced by the redesign turns 08–10. It runs locally (`bunx vite --port 5173`) and is not deployed yet.
- The keeper runs only while this session and laptop are up.
- Studio streams can drop mid-turn. Always use `--detach` and then `attach`.

## Open questions
- Whether the organizers allow external hardening synced back to Studio. Unanswered since 2026-10-22, so D-002 avoids the question.
