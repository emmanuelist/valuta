# State
_Last verified: 2026-10-25 ~23:15 UTC at e761986 (branch 6-app)_

**Thesis:** Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.
**Milestone:** M2 · Core claim in the app (due 2026-10-26 22:00 UTC) · **Effective deadline:** 2026-10-27 22:00 UTC (hard: 2026-11-02 04:59 UTC)
**Next action:** when the Studio daily limit frees up (`arc-studio usage --json` below 100%; expected around 2026-10-26 12:00 UTC), send `prompts/08-redesign-hero.md` with `--file <abs>/prompts/08-redesign-spec.md --file <abs>/.impeccable/mocks/redesign-a-specimen.png --detach`, then attach. After it lands: pull, run locally, Impeccable hero gate at 1344×760, then prompts 09 and 10, re-run the critique (target ≥ 32/40), Vercel, film, submit (#6)
**Blocked on:** nothing

## Works (verified this session)
| Capability | Verified by | Evidence |
|---|---|---|
| **Valuta v2 live on Arc mainnet, Sourcify exact match** | receipt, code, Sourcify API | E-016 |
| Whole payslip ledger in one `eth_call`; settlement tx by single-block `getLogs` | timed reads against mainnet | E-019 |
| Stranger settled 10 overdue paydays on v2, each at its own round | tx and payslip read-back | E-019 |
| 96 tests pass under Arc semantics (fork tests on live feeds included) | `arc-forge test --network arc` | E-017 |
| Keeper settles due paydays every 10 min (payroll 1 daily, payroll 2 every 2 h) | `internal/keeper.log`: 14:10 UTC settlements | — |

## Deployed
| What | Network | Address / URL | Last checked |
|---|---|---|---|
| **Valuta v2** | **Arc mainnet** | `0x7d209Fbd9999C8fe37b4e6B3CCeF41DbbAF3252a` | 2026-10-25 14:15 UTC |
| Payroll #1: MXN 1.00 daily, back pay from 10-15 (20 paydays) | v2 | id 1: 11 settled (10 by STRANGER, late; 1 by keeper, on time) | 2026-10-25 14:15 UTC |
| Payroll #2: BRL 0.10 every 2 h from 10-25 14:00 (36 paydays) | v2 | id 2: 1 settled | 2026-10-25 14:15 UTC |
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
- The app does not exist yet. Studio turn 7 is running detached; recover with `arc-studio attach --session asof --output json`.
- The keeper runs only while this session and laptop are up.
- Studio streams can drop mid-turn. Always use `--detach` and then `attach`.

## Open questions
- Whether the organizers allow external hardening synced back to Studio. Unanswered since 2026-10-22, so D-002 avoids the question.
