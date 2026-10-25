# Evidence
Append-only proof log. Every claim in the README, demo or submission points to an entry here.

Proof is a public link (explorer, deployed URL, CI run, Studio project) or a command plus its captured output.

| # | Date | Claim | Proof | Commit |
|---|---|---|---|---|
| E-001 | 2026-10-25 | Asof contracts, tests and deploy script were written in Arc Studio (turn 1, `prompts/01-contracts.md`) | [Studio project](https://studio.arc.io/app/ad133b3b-d828-4323-88f3-5be7b8f0bad4) · files: `contracts/Asof.sol`, `contracts/TestFeed.sol`, `contracts/test/Asof.t.sol`, `contracts/test/Asof.Extra.t.sol`, `contracts/script/Deploy.s.sol` | (this PR) |
| E-002 | 2026-10-25 | 68 tests pass under Arc Foundry with Arc semantics | `arc-forge test --network arc` → "Ran 27 test suites: 68 tests passed, 0 failed, 0 skipped" (full log in `internal/studio/arc-forge-test-01.txt`) | (this PR) |
| E-003 | 2026-10-25 | Asof deployed by Studio on Arc Testnet; registry of 8 currencies, maxAge 25 h | [Asof `0x7b7c…9016`](https://explorer.testnet.arc.io/address/0x7b7c47f3fab266f12a66d3693adff05564bf9016) (7,654 bytes of code; deploy tx `0x84cc…91d7` status 1, block 69,030,192) · `cast call … currencies()` → `[EUR, MXN, BRL, JPY, CAD, AUD, KRW, ARS]` · `maxAge()` → 90000 | (this PR) |
