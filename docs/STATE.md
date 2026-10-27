# State
_Last verified: 2026-10-27 16:25 UTC (branch 6-app)_

**Thesis:** Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.
**Milestone:** M3 · Submit (#8) · **Effective deadline:** 2026-10-27 22:00 UTC (hard: 2026-11-02 04:59 UTC)
**Next action:** at 18:00 UTC payroll 2's payday falls due (the keeper is paused for it). In `internal/film`: start the STRANGER signer; `SETTLE_PAYROLL=2 SETTLE_PAYDAY=26 npx tsx scripts/capture.ts 06-settle`; stop the signer; `SETTLE_TX=<hash the signer logged> npx tsx scripts/settle.ts` (adds the tx's explorer page); restart the keeper; then `film:cut`, render, score, master. Then: the tx into README and SUBMISSION, the builder uploads to YouTube, repo public, preflight, the builder submits (#8)
**Blocked on:** nothing

## Works (verified this session)
| Capability | Verified by | Evidence |
|---|---|---|
| **Valuta v2 live on Arc mainnet, Sourcify exact match** (runtime and creation) | Sourcify page rendered for the film, 2026-10-27 | E-016 |
| **The app in production**, https://valuta-arc.vercel.app; every external README link returns 200 (CI badge 404s only while the repo is private) | `curl` over all README links, 2026-10-27 | E-030 |
| **Settle through the live app as a stranger**: payroll 3 payday 02 and payroll 2 payday 26, both status 1, read back with `payslip()` | `arc-cast receipt`, `arc-cast call payslip` | E-033 |
| Studio turns 18–20 in production (seal A, upcoming coupons, due-state truth, boundary seconds) | browser, measured | E-032 |
| 96 tests pass under Arc semantics; CI green | `arc-forge test --network arc`, CI run | E-017, E-028 |
| **Film preview** renders end to end: 9 chapters, 23 lines, 2:18 with a stand-in settle take; voice −15.6 LUFS, peak −2.4 dBTP | `internal/film`, render, score and master logs | — |
| No secrets in tracked files or git history | grep over `git log --all -p` | — |
| **Benchmark** (first run): fit 2, evidence 2, differentiation 3, integration 3, resilience 2, advantage 2, demo 2. Top finding (fixed): no app-sent tx was listed for "through your contract and app" | `internal/benchmarks/2026-10-27-524e177.md` | D-025 |

## Deployed
| What | Network | Address / URL | Last checked |
|---|---|---|---|
| **Valuta v2** | **Arc mainnet** | `0x7d209Fbd9999C8fe37b4e6B3CCeF41DbbAF3252a` | 2026-10-27 16:00 UTC |
| Payroll #1: MXN 1.00 daily, 14:00 UTC | v2 | id 1: nothing due until 10-28 14:00 | 2026-10-27 15:50 UTC |
| Payroll #2: BRL 0.10 every 2 h (36 paydays) | v2 | id 2: 26 settled; payday 27 due at 18:00 UTC | 2026-10-27 16:05 UTC |
| Payroll #3: EUR 0.01 daily at 14:00 UTC, to 12-04 | v2 | id 3: 2 settled; next due 10-28 14:00 | 2026-10-27 15:52 UTC |
| **The app (production)** | Vercel | https://valuta-arc.vercel.app | 2026-10-27 16:15 UTC |
| Studio project | studio.arc.io | https://studio.arc.io/app/ad133b3b-d828-4323-88f3-5be7b8f0bad4 | 2026-10-27 |
| Repo (private until submission) | GitHub | https://github.com/emmanuelist/valuta | 2026-10-27 |

## Film (`internal/film`, gitignored tooling)
- Chapters 01–04 and 07 captured from the live site; **05-studio** cut from the builder's own Studio recording plus the live Sourcify page (D-024).
- **06-settle needs its final take** (above). The stand-in is the payroll 3 take, kept at `film/keep-06-settle-payroll3.mp4`.
- The settle line now says "in about two seconds" (measured 2.0 s, click to receipt).

## Broken or unverified
- **The keeper is paused** (since 10-27 14:48 UTC) so a payday stays due for the film. Restart it after the 18:00 take: `bash internal/keeper.sh` in the background.
- The app's "Settled N payday" receipt can be skipped by the post-confirmation refetch (E-033). The payslip still shows the settlement. Not fixed: it would take a Studio turn.
- The initial chunk is 492 kB gzipped (accepted, D-023).
- The keeper runs only while this session and laptop are up.

## Open questions
- Whether the organizers allow external hardening synced back to Studio. Unanswered since 2026-10-22, so D-002 avoids the question.
