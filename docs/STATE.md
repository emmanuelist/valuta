# State
_Last verified: 2026-10-27 18:45 UTC (branch 7-film-link → main)_

**Thesis:** Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.
**Milestone:** M4 · Submitted (#8) · **Effective deadline:** 2026-10-27 22:00 UTC (hard: 2026-11-02 04:59 UTC)
**Next action:** wait for the review (DoraHacks shows Valuta "Under Review"). After judging: end payrolls 1–3, reclaim the reserves, sweep the six wallets to the builder's exchange address (mainnet writes; confirm first)
**Blocked on:** nothing

## Works (verified this session)
| Capability | Verified by | Evidence |
|---|---|---|
| **Valuta v2 live on Arc mainnet, Sourcify exact match** (runtime and creation) | Sourcify page rendered for the film, 2026-10-27 | E-016 |
| **The app in production**, https://valuta-arc.vercel.app; every external README link returns 200 (CI badge 404s only while the repo is private) | `curl` over all README links, 2026-10-27 | E-030 |
| **Settle through the live app as a stranger**: payroll 3 payday 02 and payroll 2 payday 26, both status 1, read back with `payslip()` | `arc-cast receipt`, `arc-cast call payslip` | E-033 |
| Studio turns 18–20 in production (seal A, upcoming coupons, due-state truth, boundary seconds) | browser, measured | E-032 |
| 96 tests pass under Arc semantics; CI green | `arc-forge test --network arc`, CI run | E-017, E-028 |
| **The film is final**: 2:10.2, 1920×1080, 9 chapters, 23 lines; the Studio chapter from the builder's recording plus Sourcify (D-024); the settle chapter is the live 18:00 settle and its explorer page; voice −15.6 LUFS, peak −2.5 dBTP | `internal/film` render, score and master logs; stills reviewed | E-034 |
| **Submitted** to Arc Microgrants 2 on DoraHacks (Valuta, "Under Review"); repo public; README hero recaptured from production | DoraHacks builds page; anonymous `curl` of the repo | E-036 |
| No secrets in tracked files or git history | grep over `git log --all -p` | — |
| **Benchmark** (first run): fit 2, evidence 2, differentiation 3, integration 3, resilience 2, advantage 2, demo 2. Top finding (fixed): no app-sent tx was listed for "through your contract and app" | `internal/benchmarks/2026-10-27-524e177.md` | D-025 |

## Deployed
| What | Network | Address / URL | Last checked |
|---|---|---|---|
| **Valuta v2** | **Arc mainnet** | `0x7d209Fbd9999C8fe37b4e6B3CCeF41DbbAF3252a` | 2026-10-27 16:00 UTC |
| Payroll #1: MXN 1.00 daily, 14:00 UTC | v2 | id 1: nothing due until 10-28 14:00 | 2026-10-27 15:50 UTC |
| Payroll #2: BRL 0.10 every 2 h (36 paydays) | v2 | id 2: 27 settled (No. 27 by STRANGER through the app, on film, E-034) | 2026-10-27 18:02 UTC |
| Payroll #3: EUR 0.01 daily at 14:00 UTC, to 12-04 | v2 | id 3: 2 settled; next due 10-28 14:00 | 2026-10-27 15:52 UTC |
| **The app (production)** | Vercel | https://valuta-arc.vercel.app | 2026-10-27 16:15 UTC |
| Studio project | studio.arc.io | https://studio.arc.io/app/ad133b3b-d828-4323-88f3-5be7b8f0bad4 | 2026-10-27 |
| Repo (public since 2026-10-27 18:40 UTC) | GitHub | https://github.com/emmanuelist/valuta | 2026-10-27 |

## Film (`internal/film`, gitignored tooling)
- Final master: `internal/film/film/valuta-master.mp4`, published at https://youtu.be/HUbb6BLe1uY (E-035).
- Rebuild: `scripts/studio.ts` (Studio chapter), `scripts/settle-final.sh` (settle take, sends a real settle), then `film:cut`, render, score, master.

## Broken or unverified
- The keeper was restarted at 18:01 UTC after the film's settle; it runs only while this session and laptop are up.
- The app's "Settled N payday" receipt can be skipped by the post-confirmation refetch (E-033). The payslip still shows the settlement. Not fixed: it would take a Studio turn.
- The initial chunk is 492 kB gzipped (accepted, D-023).

## Open questions
- Whether the organizers allow external hardening synced back to Studio. Unanswered since 2026-10-22, so D-002 avoids the question.
