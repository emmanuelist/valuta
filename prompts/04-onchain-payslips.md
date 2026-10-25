Valuta v2: keep every payslip on-chain, and add batch views for the app. The settlement logic, errors and events stay exactly as they are. Balanced preset: run the full suite including the fork test, run the audit, and redeploy to Arc Testnet.

## Why
Arc's public RPCs cap `eth_getLogs` at under 10,000 blocks per request (measured today), and Arc produces about 170,000 blocks a day. An app that rebuilds payslips from `PaydaySettled` logs gets slower every day. So the contract must store what each payday paid, and the app must be able to read a whole ledger in one call.

## 1. Store a payslip for every settled payday
At settlement, `_settleOne` also writes a `Payslip` for that payday index, packed into at most 4 storage slots:
- `payday`: the payday timestamp
- `roundId`, `answer`, `roundUpdatedAt`: the round it was priced at (store `answer` as `uint128`; it is validated > 0)
- `usdc`, `paid`, `credited`: what was owed, pushed and credited (`arrearsAdded = usdc - paid - credited`, so it need not be stored)
- `settler`: msg.sender
- `settledAt`: block.timestamp
- `settledBlock`: block.number, so a UI can fetch the settlement tx from that single block

The `PaydaySettled` event is unchanged.

## 2. Views (all bounded)
- `payslip(uint256 id, uint256 i) returns (Payslip memory)`: reverts `NotSettled()` when `i >= settled`.
- `payslips(uint256 id, uint256 from, uint256 n) returns (Payslip[] memory)`: up to `n` consecutive payslips starting at `from`. `n` is capped at 64, and the result is shortened at `settled`.
- `payrolls(uint256 fromId, uint256 n) returns (Payroll[] memory)`: up to `n` payrolls starting at `fromId`. Capped at 64 and shortened at `payrollCount()`.
- `duePreview(uint256 id, uint256 n) returns (DueQuote[] memory)`: for up to `n` (capped at 32) due-but-unsettled paydays, in order, returns `payday`, `roundId`, `answer`, `roundUpdatedAt` and `usdc`, using the same as-of lookup as `asOf()` and the same conversion and flooring as `settle`. This lets the app show that a due payday's amount is already decided before anyone settles it. It is a view: no state changes.

## 3. Tests
- After a settlement, every `payslip(id, i)` field equals the corresponding `PaydaySettled` event field and the arrears identity holds.
- For the failed-payout path, the payslip records `credited`, not `paid`.
- `payslips` and `payrolls` respect their caps and shorten at the end.
- `duePreview` returns exactly what a subsequent `settle` pays, round for round and amount for amount, including the stale-fallback case.
- `NotSettled` reverts.
- Extend the fork test: after settling back pay on the mainnet fork, `payslips(id, 0, 10)` matches the events.

Report the gas used per payday settlement before and after, the test counts, the audit result and the new Arc Testnet address.
