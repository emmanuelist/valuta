Valuta v2, final fix before the mainnet deploy. Quick preset. No behaviour change for valid inputs.

1. **Make the casts really checked.** In Solidity 0.8, explicit downcasts like `uint128(x)` and `uint64(x)` truncate silently on overflow; they do not revert. Add internal helpers `_u64(uint256)` and `_u128(uint256)` that revert `CastOverflow()` when the value does not fit, and use them for every `Payslip` field in `_settleOne`.
2. **Fix the comments so they are true.** Change "checked casts" so it describes the helpers. Shorten the comment above the `salary > 1e33` guard to one accurate line: the guard keeps realistic payslip values far inside uint128, and the casts revert rather than truncate if a value ever does not fit.
3. **`contracts/test/SlotDebug.t.sol`:** if it is a debugging leftover rather than a real test, delete it.
4. Add a test that forces a cast overflow, for example with a TestFeed answer near `type(uint128).max` and a large salary within the guard, and asserts that settlement reverts `CastOverflow()` instead of storing a truncated payslip.

Run the full suite and redeploy to Arc Testnet. Report the test counts and the new address.
