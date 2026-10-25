# State
_Last verified: 2026-10-25 ~12:00 UTC, before the first commit_

**Thesis:** Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.
**Milestone:** M0 · Research locked (due 2026-10-25 22:00 UTC) · **Effective deadline:** 2026-10-27 22:00 UTC (hard: 2026-11-02 04:59 UTC)
**Next action:** read the result of Studio turn 1 (contracts, tests, testnet deploy), then pull it into the repo (#1)
**Blocked on:** wallet funding for M1. The builder chooses between Binance and the Setoff leftovers (D-006).

## Works (verified this session)
| Capability | Verified by | Evidence |
|---|---|---|
| Chainlink FX feeds live on Arc mainnet, round history readable | `latestRoundData` and `getRoundData` over RPC, 2026-10-25 | docs/CONTEXT.md |
| Arc Studio CLI authenticated, usage at 0% | `arc-studio whoami`, `arc-studio usage` | — |

## Deployed
| What | Network | Address / URL | Last checked |
|---|---|---|---|
| nothing yet | | | |

## Broken or unverified
- Studio turn 1 (`prompts/01-contracts.md`) is running in session `asof`. Output **unverified**. Raw result: `internal/studio/01-result.json`. If this session dies, recover with `arc-studio attach --session asof`, inspect with `arc-studio ls --session asof`, and get the project URL with `arc-studio apps`.
- Whether Studio's sandbox runs tests under Arc semantics is **unverified** (#2 covers it with local arc-forge).

## Open questions
- Does organizer guidance allow external hardening synced back to Studio? Unanswered in the Q&A since 2026-10-22, so D-002 avoids the question.
