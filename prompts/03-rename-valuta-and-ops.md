Rename the product from Asof to **Valuta**, then add one operations script. Use the quick preset: there are no behaviour changes, so run the full test suite and a quick audit, then redeploy to Arc Testnet.

## 1. Rename (no logic changes)
- `contracts/Asof.sol` becomes `contracts/Valuta.sol`, and `contract Asof` becomes `contract Valuta`. Keep every function, error, event and the storage layout exactly as they are. That includes the `asOf()` view, which keeps its name because it describes what it does.
- Rename the test files to `contracts/test/Valuta.t.sol`, `contracts/test/Valuta.Extra.t.sol` and `contracts/test-integration/ValutaFork.t.sol`. Update every reference in the deploy script, comments, README.md and AGENTS.md, and delete the old Asof files.
- The header comment of `Valuta.sol` reads: "Valuta: salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it."

## 2. Operations script: `contracts/script/Ops.s.sol`
Foundry script functions that I will run myself against Arc mainnet with `--broadcast`. Do not run them on mainnet.
- `create(address valuta, address worker, bytes3 currency, uint256 salary, uint256 start, uint256 period, uint256 count, uint256 reserve)`: creates a payroll with `reserve` as msg.value, and logs the new id.
- `fund(address valuta, uint256 id, uint256 amount)`.
- `settleDue(address valuta, uint256 id)`:
  - read `dueCount`
  - compute each due payday's time with `payday(id, i)` and find its round with `asOf(currency, t)`
  - call `settle` in chunks of at most 32
  - log each payday's time, round id, answer and USDC amount
  - if nothing is due, log that and return **before** `vm.startBroadcast()`, so no transaction is sent

Add a test that runs the `settleDue` logic against a TestFeed history.

Report the test counts, the audit result and the new Arc Testnet address.
