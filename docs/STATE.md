# State
_Last verified: 2026-10-25 ~13:10 UTC at cc3a7d0_

**Thesis:** Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.
**Milestone:** M1 · Live on mainnet (due 2026-10-26 11:00 UTC, binding checkpoint) · **Effective deadline:** 2026-10-27 22:00 UTC (hard: 2026-11-02 04:59 UTC)
**Next action:** when Studio turn 2 (`prompts/02-hardening.md`) completes, pull it, re-run `arc-forge test --network arc` and the fork test against real feeds (#2, #9)
**Blocked on:** wallet funding for the mainnet deploy. The builder chooses Binance or the Setoff leftovers (D-006), asked 2026-10-25.

## Works (verified this session)
| Capability | Verified by | Evidence |
|---|---|---|
| Asof v1 contracts: 68 tests pass under Arc semantics | `arc-forge test --network arc` | E-002 |
| Asof on Arc Testnet with an 8-currency registry and maxAge 25 h | `eth_getCode`, receipts, `cast call currencies()/maxAge()` | E-003 |
| Real Chainlink round semantics match the contract's assumptions | RPC probes of MXN/USD and USD/ARS | docs/CONTEXT.md |

## Deployed
| What | Network | Address / URL | Last checked |
|---|---|---|---|
| Asof v1 (pre-hardening) | Arc Testnet | `0x7b7c47f3fab266f12a66d3693adff05564bf9016` | 2026-10-25 13:05 UTC |
| TestFeed (shared, **no history**) | Arc Testnet | `0xd69e04323082945455defd0f1b8712186a5488d2` | 2026-10-25 13:05 UTC |
| Studio project | studio.arc.io | https://studio.arc.io/app/ad133b3b-d828-4323-88f3-5be7b8f0bad4 | 2026-10-25 |

## Broken or unverified
- **Payout gas is unbounded:** a worker contract can lock the reserve (D-010, #9). Being fixed by turn 2.
- Testnet TestFeed has no history, so testnet settlement is impossible. Being fixed by turn 2.
- Deploy script mainnet mode only prints the constructor args (#3). Being fixed by turn 2.
- Turn 2 is running, **detached**. Recover with `arc-studio attach --session asof --output json`. Raw output: `internal/studio/02-*.json`.
- Studio streams can drop mid-turn while the turn keeps running server-side. Always use `--detach` and then `attach`.

## Open questions
- Whether the organizers allow external hardening synced back to Studio. Unanswered since 2026-10-22, so D-002 avoids the question.
