# Evidence
Append-only proof log. Every claim in the README, demo or submission points to an entry here.

Proof is a public link (explorer, deployed URL, CI run, Studio project) or a command plus its captured output.

| # | Date | Claim | Proof | Commit |
|---|---|---|---|---|
| E-001 | 2026-10-25 | Asof contracts, tests and deploy script were written in Arc Studio (turn 1, `prompts/01-contracts.md`) | [Studio project](https://studio.arc.io/app/ad133b3b-d828-4323-88f3-5be7b8f0bad4) · files: `contracts/Asof.sol`, `contracts/TestFeed.sol`, `contracts/test/Asof.t.sol`, `contracts/test/Asof.Extra.t.sol`, `contracts/script/Deploy.s.sol` | (this PR) |
| E-002 | 2026-10-25 | 68 tests pass under Arc Foundry with Arc semantics | `arc-forge test --network arc` → "Ran 27 test suites: 68 tests passed, 0 failed, 0 skipped" (full log in `internal/studio/arc-forge-test-01.txt`) | (this PR) |
| E-003 | 2026-10-25 | Asof deployed by Studio on Arc Testnet; registry of 8 currencies, maxAge 25 h | [Asof `0x7b7c…9016`](https://explorer.testnet.arc.io/address/0x7b7c47f3fab266f12a66d3693adff05564bf9016) (7,654 bytes of code; deploy tx `0x84cc…91d7` status 1, block 69,030,192) · `cast call … currencies()` → `[EUR, MXN, BRL, JPY, CAD, AUD, KRW, ARS]` · `maxAge()` → 90000 | (this PR) |
| E-004 | 2026-10-25 | Payout gas is bounded: a gas-burning or huge-revert worker is credited, and settle and reclaim still succeed (D-010) | Studio turn 2 (`prompts/02-hardening.md`); `_tryTransferCapped` uses assembly `call(PAYOUT_GAS=50_000, …, 0, 0)`; tests in `contracts/test/Asof.Extra.t.sol` | (this PR) |
| E-005 | 2026-10-25 | 74 tests pass under Arc Foundry with Arc semantics, including 4 run against Arc mainnet state | `arc-forge test --network arc` → "Ran 29 test suites: 74 tests passed, 0 failed, 0 skipped" (`internal/studio/arc-forge-test-02.txt`) | (this PR) |
| E-006 | 2026-10-25 | **Against the live MXN/USD Chainlink feed, 10 daily back-pay paydays each settle at their own round**, paying different USDC amounts for the same salary, and the neighbouring rounds revert `NotAsOfPayday` | `arc-forge test --network arc --match-path contracts/test-integration/AsofFork.t.sol -vv` (fork of Arc mainnet): answers 5389760 · 5441140 · 5405639 · 5407464 · 5407193 · 5407919 · 5375477 · 5360375 · 5343964 · 5362907 (8 dec), each paid exactly (`internal/studio/arc-forge-fork-02.txt`) | (this PR) |
| E-007 | 2026-10-25 | Turn-2 Asof redeployed by Studio on Arc Testnet | [`0x0304…73d1`](https://explorer.testnet.arc.io/address/0x0304d89b8fe4bff88712c00f11cad49c6f2e73d1): 7,674 bytes of code; tx `0x8c09…6724` status true, block 69,032,979; `currencies()` → `[MXN, BRL, EUR]`; `payrollCount()` → 0 | (this PR) |
