# Valuta: build rules and pinned context

Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.

Formerly named Asof, renamed on 2026-10-25 (D-012). The Studio session is still called `asof`; the Studio project is the same one.

Built for Arc Microgrants 2, "Built with Arc Studio" (deadline 2026-11-02 04:59 UTC; our own cutoff is 2026-10-27, see docs/PLAN.md). Research and strategy live in `internal/` (gitignored).

## How code gets written here: Arc Studio, always

The submission must be built in Arc Studio, and judges check the Studio project. So:

- **All contract, test, script and app code is written by Arc Studio**, through `arc-studio run --session asof`. Studio has no access to this filesystem: context goes in with `--file`, artifacts come out with `arc-studio pull`.
- **Never hand-edit `contracts/`, `test/`, `script/` or `src/` locally.** To change a file, round-trip it (`--file src/X.tsx:src/X.tsx`) and let Studio edit and test it. Then pull.
- **Every prompt is saved to `prompts/NN-<slug>.md` before it is sent**, and that is the file passed to `--prompt-file`. That folder is the public record of how Studio was used.
- Studio deploys to **Arc Testnet only**. The mainnet deploy, and every mainnet transaction, is ours (arc-forge plus scripts), and only after confirmation.
- Before pulling into a dirty tree, run `arc-studio pull --session asof --dry-run --diff`.

## Repo layout

```
contracts/ test/ script/   Solidity (Foundry), written in Arc Studio
src/                       the app (Vite), written in Arc Studio
prompts/                   every prompt sent to Arc Studio, in order
docs/                      STATE, PLAN, DECISIONS, EVIDENCE, CONTEXT
internal/                  research dossier, raw Studio results (gitignored)
```

Pinned versions are recorded in docs/CONTEXT.md once Studio's first output is pulled. Don't guess them.

## Rules

1. **No mocks, no fake data, no demo mode.** The app reads Arc mainnet and nothing else. Studio's generated apps ship a "Demo mode" by default, and it must be removed. `TestFeed` exists only for Arc Testnet and tests, and never appears in the mainnet app.
2. **Verify every SDK call** against installed types (`node_modules/<pkg>/**/*.d.ts`) or official docs before relying on it. If it can't be verified, stop and say so.
3. **Arc is not Ethereum.** Read the Traps in docs/CONTEXT.md before touching value transfers, decimals, gas or events. Run the contract suite under `arc-forge` (Arc semantics), not only stock `forge`.
4. **Mainnet writes need explicit confirmation.** Small amounts only. Keys live in `.env` (mode 600); never print, log or commit them.
5. **Phase-gated.** Work only on the current milestone in docs/PLAN.md, then stop and confirm.
6. **Tests cover failure paths**: wrong round, stale feed, short reserve, rejected payout, reclaim while due.
7. **Never scope-cut silently.** Put tradeoffs on technical merit into docs/DECISIONS.md.

## Verification before any gate
- Contracts: Studio's `forge test` green, and locally `arc-forge build && arc-forge test`.
- App: lint with zero warnings, typecheck, build (exact commands are added once the app exists).

## Current state
@docs/STATE.md

## Where things live
| Concern | File |
|---|---|
| Milestones and exit criteria | docs/PLAN.md (GitHub milestones mirror it) |
| Work items | GitHub issues (`gh issue list --milestone "<current>"`) |
| Why we chose what we chose | docs/DECISIONS.md (append-only) |
| Proof that things work | docs/EVIDENCE.md (append-only) |
| Verified facts about dependencies, and traps | docs/CONTEXT.md. Read it before touching any integration. |
| Studio prompts | prompts/ (the published record of Studio use) |
| Research and strategy | internal/ (gitignored) |

## Operating protocol
- **Start:** read the open issues for the current milestone and the last 3 entries of docs/DECISIONS.md. Say the next action back before starting.
- **Work:** one issue at a time, on a branch `<issue>-<slug>`; each PR says `Closes #<n>` and carries its evidence.
- **Finish** (or `/foundation handoff`): append EVIDENCE and DECISIONS, update CONTEXT with anything verified, close issues with evidence links, rewrite docs/STATE.md, commit.
- **Truth rule:** never write a claim into STATE, README, an issue or a PR that wasn't verified this session. Write "unverified" instead.
- **Decisions:** never relitigate an accepted decision without new evidence; supersede it with a new entry.
