# State
_Last verified: 2026-10-26 13:58 UTC (branch 6-app)_

**Thesis:** Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.
**Milestone:** M2 · Core claim in the app (due 2026-10-26 22:00 UTC) · **Effective deadline:** 2026-10-27 22:00 UTC (hard: 2026-11-02 04:59 UTC)
**Next action:** Studio turn 11 (`prompts/11-fixes-from-review.md`: the measured fixes from the rendered review of turns 08–10) is queued in `internal/studio-turn11.sh` and starts when usage is below 70% (it was 79% at 13:56 UTC; yesterday's app turn ages out around 14:30–14:42). After it lands: render the review again (1344×760 against the comp, 1440, 390, 360, /new, /lookup, Run all), then CI (#5), Vercel, the film capture, the README Studio table, and submit (#6, #8)
**Blocked on:** nothing

## Works (verified this session)
| Capability | Verified by | Evidence |
|---|---|---|
| **Redesigned app (Studio turns 08–10)**: the payslip hero, home sections, settle flow, employer panel, phone layout, /new, /lookup. The local gate is green (typecheck, lint with `--deny-warnings`, build). A cold production load renders the payslip in 2.3 s with 5 RPC calls | browser renders, `bun run typecheck/lint/build`, `vite preview` timing | E-026 |
| "Try to cheat it" Run all replays at block 27,805,206 and shows the chain's own refusals | in the browser | E-026 |
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
- **Film:** the pipeline is ported from Setoff into `internal/film/` (tooling, gitignored). Every figure comes from `film/facts.json`, read off mainnet with assertions. The narration is voiced (ElevenLabs, the builder's new key, 668 of 10,000 characters used) and aligned word by word. Not done yet: the capture moves and beat measurement for the redesigned UI (after turns 08–09), the Studio shot (needs the builder's login in the recording browser), render, score and master.
- **Known defects, queued in turn 11:** cheat attempt 1 sends round 293 instead of the settle-day round 326; loading states claim "No value dates ahead" and "0 payrolls"; the desktop hero sits about 50px high and the coupon row falls below 760; the seal is too heavy; the phone layout of the payslip, timeline, chip, register and footer is broken; the initial chunk is 492 kB gzipped. The app is not deployed yet.
- The keeper runs only while this session and laptop are up.
- Studio streams can drop mid-turn. Always use `--detach` and then `attach`.

## Open questions
- Whether the organizers allow external hardening synced back to Studio. Unanswered since 2026-10-22, so D-002 avoids the question.
