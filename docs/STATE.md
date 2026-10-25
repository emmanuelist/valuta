# State
_Last verified: 2026-10-25 ~13:40 UTC at b43413e_

**Thesis:** Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.
**Milestone:** M1 · Live on mainnet (due 2026-10-26 11:00 UTC, binding checkpoint) · **Effective deadline:** 2026-10-27 22:00 UTC (hard: 2026-11-02 04:59 UTC)
**Next action:** the builder confirms the product name (proposed: Valuta) → a Studio rename turn before any mainnet deploy → deploy to mainnet and verify on Sourcify (#3)
**Blocked on:** (1) funding: all 5 new wallets hold 0.000000 USDC (checked 13:35 UTC), and the Setoff wallets hold 4.910232. The builder must choose Binance or the Setoff leftovers (D-006). (2) The name decision.

## Works (verified this session)
| Capability | Verified by | Evidence |
|---|---|---|
| Asof contracts after turn 2: 74 tests pass under Arc semantics | `arc-forge test --network arc` | E-005 |
| The as-of rule holds against the **live** MXN/USD and USD/ARS feeds (mainnet fork) | `arc-forge test … AsofFork.t.sol -vv` | E-006 |
| Payout gas bounded (a gas-burning worker can't lock the reserve) | Studio tests, pulled and re-run | E-004 |
| Asof on Arc Testnet with an 8-currency registry and maxAge 25 h | `eth_getCode`, receipts, `cast call currencies()/maxAge()` | E-003 |
| Real Chainlink round semantics match the contract's assumptions | RPC probes of MXN/USD and USD/ARS | docs/CONTEXT.md |

## Deployed
| What | Network | Address / URL | Last checked |
|---|---|---|---|
| Asof turn 2 (current) | Arc Testnet | `0x0304d89b8fe4bff88712c00f11cad49c6f2e73d1` | 2026-10-25 13:35 UTC |
| Asof v1 (superseded) | Arc Testnet | `0x7b7c47f3fab266f12a66d3693adff05564bf9016` | 2026-10-25 13:05 UTC |
| TestFeed (shared, **no history**) | Arc Testnet | `0xd69e04323082945455defd0f1b8712186a5488d2` | 2026-10-25 13:05 UTC |
| Studio project | studio.arc.io | https://studio.arc.io/app/ad133b3b-d828-4323-88f3-5be7b8f0bad4 | 2026-10-25 |

## Broken or unverified
- The testnet Asof points at the shared, history-less TestFeed, so testnet settlement is impossible. Mainnet is unaffected. Run `Deploy.s.sol` testnet mode if a working testnet is ever needed.
- Studio streams can drop mid-turn while the turn keeps running server-side. Always use `--detach` and then `attach`.

## Open questions
- Whether the organizers allow external hardening synced back to Studio. Unanswered since 2026-10-22, so D-002 avoids the question.
