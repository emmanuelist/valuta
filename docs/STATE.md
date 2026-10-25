# State
_Last verified: 2026-10-25 ~13:30 UTC at 4f422c5_

**Thesis:** Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.
**Milestone:** M2 · Core claim in the app (due 2026-10-26 22:00 UTC) · **Effective deadline:** 2026-10-27 22:00 UTC (hard: 2026-11-02 04:59 UTC)
**Next action:** set the app's design direction, then the Studio app turn (`prompts/04-*.md`), which reads mainnet Valuta (#6)
**Blocked on:** nothing

## Works (verified this session)
| Capability | Verified by | Evidence |
|---|---|---|
| **Valuta live on Arc mainnet, Sourcify exact match** | receipt, `eth_getCode`, `currencies()`, Sourcify API | E-011 |
| Stranger settled 10 overdue paydays, each at its own Chainlink round | tx receipt and decoded `PaydaySettled` events | E-014 |
| Named refusals on the live contract | `eth_call` revert data | E-013 |
| 77 tests pass under Arc semantics (4 against live feeds) | `arc-forge test --network arc` | E-009 |

## Deployed
| What | Network | Address / URL | Last checked |
|---|---|---|---|
| **Valuta** | **Arc mainnet** | `0x2bDF0F489687a57a0E63E609281C3eC86dda76e9` | 2026-10-25 13:25 UTC |
| Payroll #1: MXN 1.00 daily, back pay from 10-15, 20 paydays | Arc mainnet | id 1 (10 settled, reserve ≈ 0.5608 USDC) | 2026-10-25 13:25 UTC |
| Payroll #2: BRL 0.10 every 2 h from 10-25 14:00 UTC, 36 paydays | Arc mainnet | id 2 (reserve 0.75 USDC) | 2026-10-25 13:25 UTC |
| Valuta (Studio's testnet build) | Arc Testnet | `0x807aecf42b356ee43abf95a83343e4bf3bd08516` | per Studio, unverified |
| Studio project | studio.arc.io | https://studio.arc.io/app/ad133b3b-d828-4323-88f3-5be7b8f0bad4 | 2026-10-25 |
| Repo (private until 2026-10-27) | GitHub | https://github.com/emmanuelist/valuta | 2026-10-25 |

## Broken or unverified
- The keeper (`internal/keeper.sh`, every 10 min as EMPLOYER) runs only while this session and laptop are up. Its log is `internal/keeper.log`. If it isn't running, paydays wait and can be settled later at their own rates.
- The testnet Valuta uses the shared, history-less TestFeed, so testnet settlement is impossible. Mainnet is unaffected.
- Studio streams can drop mid-turn. Always use `--detach` and then `attach`.

## Open questions
- Whether the organizers allow external hardening synced back to Studio. Unanswered since 2026-10-22, so D-002 avoids the question.
