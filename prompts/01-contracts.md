Build the smart contracts for **Asof** on Arc: contracts, tests and an Arc Testnet deploy in this turn. The app comes in a later turn. Use the sandbox's Foundry toolchain, not Hardhat. Max preset: full audit and tests.

## What Asof does
Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.

An employer agrees a salary in the worker's currency (MXN, BRL, EUR, JPY, CAD, AUD, KRW or ARS) and funds a reserve in native USDC. Each payday is priced at the Chainlink rate that was live at that payday's timestamp ("as of payday"). Settling late, or settling it yourself, cannot change the rate. The employer cannot reclaim the reserve while any payday is due and unsettled. A shortfall becomes public arrears, never a silent skip.

## Arc facts to honour
- USDC is the native gas token. `msg.value` and balances use 18 decimals. Every amount in this contract is native 18-decimal USDC; do not touch the ERC-20 interface at 0x3600000000000000000000000000000000000000.
- Round every USDC payout DOWN to a whole micro-USDC (a multiple of 1e12 wei), so it is exact in both of Arc's USDC interfaces.
- A native transfer can revert at runtime (blocklisted address, zero address). A failed payout must never revert a settlement: credit the amount to the recipient's withdrawable balance instead.
- Block timestamps can repeat. Use `>=` and `<` consistently.

## contracts/Asof.sol
Solidity ^0.8.30. No owner, no admin, no pause, no upgradeability. No dependencies beyond forge-std in tests; write a minimal reentrancy guard.

**Currency registry**, set in the constructor and immutable afterwards:
`constructor(bytes3[] codes, address[] feeds, bool[] inverse, uint256 maxAge)`
- Feeds are Chainlink AggregatorV3 proxies. `inverse == false` means an X/USD feed: `usdc = salary * answer / 10**decimals`. `inverse == true` means a USD/X feed: `usdc = salary * 10**decimals / answer`. Read and store `decimals()` per feed in the constructor.
- `maxAge` is the staleness bound (25 hours on mainnet).

**Payroll**: employer, worker, currency (bytes3), salary (local currency as 18-decimal fixed point, so MXN 50.00 = 50e18), start (first payday, unix seconds), period (seconds between paydays), count (number of paydays), settled (paydays settled so far), endedAt (0 = not ended), reserve (USDC), arrears (USDC owed to the worker but unpaid). Ids start at 1.
Payday i (0-based) is at `start + i * period`. It is due when its time <= block.timestamp, i < count, and (endedAt == 0 or its time < endedAt).

**Functions**
1. `create(worker, currency, salary, start, period, count) payable returns (uint256 id)`: msg.value becomes the reserve and the employer is msg.sender. Require worker != 0, a known currency, salary > 0, period >= 60, 1 <= count <= 10000, and start >= block.timestamp - 90 days (back pay is allowed).
2. `fund(id) payable`: anyone may call. Pays down arrears first (to the worker, using the failed-payout fallback); the rest goes to the reserve.
3. `settle(id, uint80[] roundIds)`: anyone may call. Settles the next `roundIds.length` paydays in order, with one round id per payday and at most 32 per call. For each payday: verify the round is the one as of that payday (rule below), compute usdc, pay min(usdc, reserve) to the worker (falling back to credit on failure), add any shortfall to arrears, increment settled, and emit PaydaySettled. Revert NothingDue if the first payday is not due.
4. `withdraw()`: sends msg.sender their credited balance. Reverts NothingToWithdraw, or TransferFailed with the credit left unchanged.
5. `reclaim(id, amount)`: employer only. Requires no due-but-unsettled payday (UnsettledPaydays), arrears == 0 (ArrearsOutstanding), and amount <= reserve (InsufficientReserve).
6. `end(id)`: employer only. Sets endedAt = block.timestamp, so paydays at or after it are never due. Due paydays before it still settle.

**Views**
- `asOf(bytes3 currency, uint256 t) returns (uint80 roundId, int256 answer, uint256 updatedAt)`: binary search over the feed's latest phase for the round live at t, applying the same staleness fallback as settle. A UI or keeper uses this to find the round id to pass to settle.
- `payday(id, i)`, `dueCount(id)`, `nextPayday(id)`, `quote(id)` (next payday's USDC at the latest rate), `currencies()`, `credit(address)`.

## The "as of" rule (the heart of the product)
Chainlink proxy round ids are `(phaseId << 64) | aggregatorRoundId`. For payday time p and a supplied round r in the same phase:
- **Live case:** updatedAt(r) <= p, and either round r+1 exists with updatedAt(r+1) > p, or r is the feed's latest round. Also p - updatedAt(r) <= maxAge.
- **Stale fallback:** if the round live at p is older than maxAge, the payday is priced at the first round published after p: updatedAt(r) > p, updatedAt(r-1) <= p, and p - updatedAt(r-1) > maxAge.
- Anything else reverts `NotAsOfPayday(p, r)`. The answer must be > 0 (BadAnswer). If r+1 does not exist and r is not the latest round (a phase change), revert UnprovableRound.
- Use try/catch around getRoundData for r+1 and r-1.

## Events
PayrollCreated(id, employer, worker, currency, salary, start, period, count) · Funded(id, from, amount) · PaydaySettled(id, index, payday, roundId, answer, roundUpdatedAt, usdc, paid, credited, arrearsAdded, settler) · ArrearsPaid(id, amount) · Withdrawn(account, amount) · Reclaimed(id, amount) · Ended(id, at)

## Custom errors
UnknownCurrency, ZeroWorker, ZeroSalary, PeriodTooShort, BadCount, StartTooOld, NotEmployer, NothingDue, TooManyPaydays, NotAsOfPayday(uint256 payday, uint80 roundId), BadAnswer, UnprovableRound, UnsettledPaydays, ArrearsOutstanding, InsufficientReserve, NothingToWithdraw, TransferFailed, AlreadyEnded

## contracts/TestFeed.sol (testnet and tests only)
Chainlink has no feeds on Arc Testnet. Write TestFeed: AggregatorV3-compatible, phase-encoded round ids (phase 1), decimals 8, and a settable history (`push(answer, updatedAt)`, deployer only). Name it TestFeed everywhere and comment that it exists only for Arc Testnet and tests; mainnet uses the real Chainlink proxies listed below.

## Tests (Foundry, test/)
Use TestFeed with a realistic history: a few rounds per day, plus some gaps longer than 25 hours.
- As-of rule: the right round passes. An earlier round, a later round, and a round with a "better" rate all revert NotAsOfPayday. Cover the latest-round case, the stale fallback both ways, and zero or negative answers.
- Conversion: direct and inverse feeds; floor to 1e12.
- Late settlement: the same payday settled now or 3 days later pays the identical amount.
- Arrears: a short reserve pays partially and records arrears; fund clears arrears first.
- Failed payout: a worker contract that rejects USDC is credited, and the settlement still succeeds. Withdraw works for a normal account.
- Reclaim is refused while a payday is due and unsettled, and while arrears are outstanding; it succeeds after.
- End: no payday is due after endedAt.
- A stranger can settle, and the money goes only to the worker.
- Invariants: contract balance == sum of reserves + sum of credits; for every payday, paid + credited + arrearsAdded == usdc; settled <= count.
- Fuzz: the asOf view agrees with the as-of rule for random timestamps.

## Deploy
`script/Deploy.s.sol` with two modes:
- **testnet:** deploys TestFeeds for MXN, BRL and EUR and seeds a short history.
- **mainnet registry:** do NOT deploy to mainnet; I deploy mainnet myself. The Chainlink proxies on Arc mainnet (chain 5042), all 8 decimals, verified on-chain:
  - EUR/USD `0xDd5B15443cd733D3966a50a3E48cB7DF9Fb5DE0D`
  - MXN/USD `0x302eaa6cd6f7AdDdc973fAC2Bb8fa32e9Ce19f21`
  - BRL/USD `0x3406DB72AC5136b89eba6808CFcaD83aF523B3C2`
  - JPY/USD `0xF9Fc1C20C82d774A3787845E73E41BCbF7F38F25`
  - CAD/USD `0x5024DF70A748e5f1E720AAe8EEfc590430d71573`
  - AUD/USD `0xaF452c2EA72b6E08AB64a67133a13C4ED35343eb`
  - KRW/USD `0x07040A33A0204596e927595D0994C5D841d7d61D`
  - USD/ARS `0xa261C56CABf7Ed6081646b892E57175AB2Dd8617` (inverse)
  - maxAge = 25 hours.

Deploy to Arc Testnet with the TestFeed registry and report every address.
