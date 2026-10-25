Follow-up on Asof, same workspace. Make the four changes below, then re-run the full test suite and the audit (max preset), and redeploy to Arc Testnet. Keep everything else as it is, and add no new dependencies.

## 1. Bound the gas a payout can burn
`_tryTransfer` forwards all gas and copies return data. A worker that is a contract can burn that gas in `receive()` and make `settle` revert. Then no payday settles, `reclaim` stays blocked by `UnsettledPaydays`, and the worker has locked the employer's reserve.

Fix:
- For payouts triggered by someone other than the recipient (`settle`, and the arrears payment in `fund`), send with a fixed stipend, `uint256 constant PAYOUT_GAS = 50_000`, using an assembly `call` that does not copy return data. On failure, credit the amount as today.
- `withdraw` and `reclaim` (where the recipient is the caller) keep forwarding all gas, but must not copy return data either.
- Add tests: a worker whose `receive()` loops forever, and a worker that reverts with a huge payload, are both credited, and both the settlement and a later `reclaim` succeed.

## 2. Deploy script
- `DEPLOY_MODE=mainnet` must broadcast a real deployment of Asof with the 8 Chainlink proxies already listed in the script, and maxAge = 25 hours. I run it myself with my own key; do not run it.
- `DEPLOY_MODE=testnet` must deploy **one TestFeed per currency** for MXN, BRL and EUR (not one shared feed) and register only those three. Seed each with at least 10 days of history at realistic rates: MXN/USD ≈ 0.0536, BRL/USD ≈ 0.2011, EUR/USD ≈ 1.1203, about two rounds a day, with small daily moves and one gap longer than 25 hours. That way a payday can actually be settled on Arc Testnet.

## 3. `payrollCount()` view
Returns the number of payrolls created so far.

## 4. Fork test against the real Chainlink feeds
Create `contracts/test-integration/AsofFork.t.sol`. It is skipped unless `ARC_RPC_URL` is set (use `vm.envOr` and `vm.createSelectFork`). On Arc mainnet (chain 5042), using the real MXN/USD and USD/ARS proxies:
- deploy Asof on the fork
- create a back-pay payroll with daily paydays over the last 10 days, funded enough to pay them all
- find each payday's round with `asOf` and settle all of them
- assert each payout equals the conversion of that round's answer, floored to 1e12
- assert that passing the round just before or just after the correct one reverts `NotAsOfPayday`

Facts about these feeds, checked on mainnet today:
- phase 1
- `answeredInRound == roundId`
- `startedAt` is a few seconds before `updatedAt`
- `getRoundData` for an id past the latest round returns zeros (it does not revert)
- `getRoundData` for a phase-2 id reverts
- USD/ARS has 62 rounds, the first on 2026-09-14

Report the test counts, the audit result and the new Arc Testnet addresses.
