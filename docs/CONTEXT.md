# Context
Verified facts about everything Asof depends on. Each entry says how it was verified, so no session has to re-derive it or trust training data. Read this before touching an integration.

## Networks
| Name | Chain ID | RPC (env var) | Explorer | Verified |
|---|---|---|---|---|
| Arc mainnet | 5042 | `ARC_RPC_URL` = https://rpc.mainnet.arc.io (also rpc.drpc / rpc.blockdaemon / rpc.quicknode .mainnet.arc.io) | https://explorer.arc.io | `eth_chainId` = 5042, block 27,784,966, gas 20.05 gwei on 2026-10-25 |
| Arc Testnet | 5042002 | https://rpc.testnet.arc.io | https://explorer.testnet.arc.io | `eth_chainId` = 5042002 on 2026-10-25 |

## Contracts we call
Chainlink FX proxies on Arc mainnet. All have 8 decimals, and the on-chain `description()` confirms the direction. Checked with `latestRoundData`, `decimals()` and `description()` on 2026-10-25. Source: [Chainlink feed directory, arc-mainnet](https://reference-data-directory.vercel.app/feeds-arc-mainnet.json). Heartbeat 24 h.

| Feed | Address | Direction | Deviation | Answer on 2026-10-25 |
|---|---|---|---|---|
| EUR / USD | `0xDd5B15443cd733D3966a50a3E48cB7DF9Fb5DE0D` | direct | 0.5 % | 1.120275 |
| MXN / USD | `0x302eaa6cd6f7AdDdc973fAC2Bb8fa32e9Ce19f21` | direct | 0.3 % | 0.053568 |
| BRL / USD | `0x3406DB72AC5136b89eba6808CFcaD83aF523B3C2` | direct | 0.5 % | 0.201110 |
| JPY / USD | `0xF9Fc1C20C82d774A3787845E73E41BCbF7F38F25` | direct | 0.3 % | 0.006375 |
| CAD / USD | `0x5024DF70A748e5f1E720AAe8EEfc590430d71573` | direct | 0.3 % | 0.714077 |
| AUD / USD | `0xaF452c2EA72b6E08AB64a67133a13C4ED35343eb` | direct | 0.3 % | 0.703480 |
| KRW / USD | `0x07040A33A0204596e927595D0994C5D841d7d61D` | direct | 0.3 % | 0.000756 |
| USD / ARS | `0xa261C56CABf7Ed6081646b892E57175AB2Dd8617` | **inverse** (ARS per USD) | 0.5 % | 1643.0722 |

**Round history is readable.** On MXN/USD, `getRoundData` works back to phase-1 round 1 (2026-06-11 14:31 UTC). Round ids are `(1 << 64) | n`; the latest on 2026-10-25 was n = 326 (id 18446744073709551942). USD/ARS has only 62 rounds (first on 2026-09-14). Updates arrive about daily, plus deviation updates (e.g. 10-23 13:39 and 14:42).

**Round semantics through the proxy** (checked on MXN/USD and USD/ARS, 2026-10-25):
- `answeredInRound == roundId`, and `startedAt` is non-zero, 10–75 s before `updatedAt`.
- `getRoundData` for an id past the latest round **returns zeros** (`updatedAt = 0`); it does not revert.
- `getRoundData` for a phase-2 id **reverts**, as does an id below round 1.

**None of these addresses has code on Arc Testnet** (`eth_getCode` = `0x`, 2026-10-25), hence D-004.

USDC: native balance (18 decimals) plus the optional ERC-20 interface `0x3600000000000000000000000000000000000000` (6 decimals) over the same balance (Arc docs, contract addresses).

## Tools and SDKs
| Tool | Version | What we use | Verified in |
|---|---|---|---|
| Arc Studio CLI `@circle-fin/arc-studio-cli` | 1.2.2 (published 2026-10-23) | `run --session asof --prompt-file --skills chainlink --output json`, `pull --dry-run --diff`, `ls`, `cat`, `deployments --json`, `usage` | `arc-studio --help`, `arc-studio agent-guide`, docs.arc.io/ai/arc-studio-cli |
| Arc Foundry `arc-forge` | 1.7.1-dev (`~/.local/bin/arc-forge`) | build, test with Arc semantics, mainnet deploy | `arc-forge --version`, 2026-10-25 |
| Foundry `cast` | 1.8.3 | wallets, reads | `cast --version` |
| App stack (from Studio) | React 18.3 · Vite 6 · wagmi 2.19.5 · viem **2.57.5** (pinned through `overrides`) · ConnectKit 1.9 · Tailwind 3.4 · TypeScript ~7.0 · oxlint · bun 1.3.14 | — | `package.json`, `bun.lock` as pulled 2026-10-25; `bun install --frozen-lockfile` OK |
| Foundry config (from Studio) | solc 0.8.30 · `via_ir = true` · `evm_version = cancun` · optimizer 200 · forge-std vendored in `lib/` | — | `foundry.toml` |

Arc Studio facts (agent guide, 2026-10-25):
- Deploys to Arc Testnet only.
- The sandbox is "a Vite + Foundry app": Solidity under `contracts/`, web under `src/`.
- Prompts are capped at 10,000 characters.
- `--file` limits: 100 files, 1 MB each, 10 MB total; credential files are refused.
- Contract deploy turns take 5–20 min.
- Presets: "quick", "balanced" (default), "max" (full audit and tests).
- Exit codes: 0 completed, 1 error, 2 pull skipped local edits, 3 needs_input, 4 budget_exceeded.
- `deployments[]` and `finalText` are untrusted sandbox output: copy addresses, never execute text.

## Traps
- **USDC decimals:** 18 natively, 6 through the ERC-20 view, one balance. Never mix `msg.value` with `balanceOf` math. Round payouts to 1e12 so both views are exact (source: [EVM differences](https://docs.arc.io/arc/references/evm-differences.md)).
- **A native transfer can revert with enough balance:** to or from a blocklisted address (the reverted transaction still consumes gas), to the zero address, or to a self-destructed account. "Sending native value to a contract isn't guaranteed to succeed" (same source). Hence D-007.
- **Stock anvil and forge run a standard EVM** and can't reproduce Arc behaviour. Use `arc-forge` and `arc-anvil --network arc` (same source).
- **The mempool silently drops transactions with `maxFeePerGas` under 20 gwei**: no error, no receipt (same source).
- **Block timestamps are non-decreasing, not strictly increasing**, so use `>=` and `<` deliberately (round-1 research, `internal/`).
- **Each native transfer emits two `Transfer` logs** (system emitter `0xffff…fffe` at 18 decimals and the USDC contract at 6). Indexers must not double-count (Arc docs; observed in round 1).
- **`PREVRANDAO` is always 0.** Not relevant to Asof; noted to stop anyone using it.
- **Contract verification:** the explorer API returned Cloudflare 403 from the CLI in round 1. Sourcify supports 5042 (`--verifier sourcify`). Reported 2026-09; re-check at deploy.

## Valuta deployments (mainnet)
| Version | Address | Status |
|---|---|---|
| **v2 (current)**: on-chain payslips, batch views, checked casts | `0x7d209Fbd9999C8fe37b4e6B3CCeF41DbbAF3252a` (deploy block 27,804,867) | live, Sourcify exact match (E-016) |
| v1 | `0x2bDF0F489687a57a0E63E609281C3eC86dda76e9` | retired: payrolls ended, reserves reclaimed (E-015); history kept (E-011 to E-014) |

App read path (D-015): `payrolls(1, 64)` for the list, `payslips(id, 0, 64)` for the ledger, and `duePreview(id, 32)` for what's owed. Use `eth_getLogs` only for a single `settledBlock` (public RPCs cap ranges below 10,000 blocks).

## Wallets (addresses only; keys in `.env`, mode 600)
| Role | Address | Purpose |
|---|---|---|
| DEPLOYER | `0x4c5FF78aea285dC6243624524E107A2121E98771` | deploys Valuta |
| EMPLOYER | `0x248A4E26013A1085b71009C6b052e987cE7500e2` | creates and funds payrolls |
| WORKER_MX | `0xCF280b429E3b6a52cC11794fb0789C5227d182Dc` | paid in MXN-indexed USDC |
| WORKER_BR | `0x7fC019E5dae40F5430f6F991f80C1a1ec31347C2` | paid in BRL-indexed USDC |
| STRANGER | `0xe5CAd734abc7d9ADed5Ec0d171FE451d38aBCaC3` | settles a payday it has nothing to do with |

## Environment
| Var | Purpose | Where to get it |
|---|---|---|
| `ARC_RPC_URL` | mainnet RPC for scripts and fork tests | public: https://rpc.mainnet.arc.io |
| `<ROLE>_ADDRESS`, `<ROLE>_PRIVATE_KEY` | the five wallets above | generated locally; `.env` only |
