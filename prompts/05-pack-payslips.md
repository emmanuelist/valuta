Valuta v2 fix-up, same workspace. Quick preset. Settlement logic, errors and events stay unchanged apart from the guard below.

## 1. The Payslip struct really takes 9 storage slots, not 4
The comment says "Packed into 4 storage slots", but `payday`, `roundUpdatedAt`, `usdc`, `paid`, `credited`, `settledAt` and `settledBlock` are declared `uint256`, and Solidity gives each `uint256` its own slot. Re-declare the struct so the comment is true:

- slot 0: `uint64 payday` | `uint64 roundUpdatedAt` | `uint64 settledAt` | `uint64 settledBlock`
- slot 1: `uint80 roundId` | `address settler`
- slot 2: `uint128 answer` | `uint128 usdc`
- slot 3: `uint128 paid` | `uint128 credited`

Use checked casts (revert on overflow, never truncate silently). To make overflow impossible in practice, add to `create`: `salary <= 1e33`, otherwise revert `SalaryTooLarge()`. Keep the comment, but make it describe this exact layout.

Add a test that uses `vm.record()` and `vm.accesses()` to assert that settling one payday writes exactly 4 payslip storage slots. Report the gas per single-payday settlement before and after.

## 2. `payrolls(0, n)`
Ids start at 1. Treat `fromId == 0` as 1, so the result never includes an empty record. Add a test.

Then run the full suite and redeploy to Arc Testnet. Report the test counts, the gas figures and the new address.
