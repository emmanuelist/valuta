// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// ---------------------------------------------------------------------------
// Asof – salary-in-local-currency, paid in USDC at the Chainlink rate that
// was live at each payday ("as of payday").
//
// Arc facts honoured:
//   • USDC IS the native gas token; msg.value and balances are 18-decimal.
//   • Every payout is floored to a whole micro-USDC (multiple of 1e12 wei).
//   • A failed native transfer credits the recipient instead of reverting.
//   • Block timestamps can repeat; we use >= and < throughout.
//
// No owner, no admin, no pause, no upgradeability.
// Minimal reentrancy guard (lock per function, not per contract).
// ---------------------------------------------------------------------------

/// @dev Minimal Chainlink AggregatorV3 interface (read-only).
interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
    function getRoundData(uint80 _roundId)
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

// ---------------------------------------------------------------------------
// Custom errors
// ---------------------------------------------------------------------------
error UnknownCurrency();
error ZeroWorker();
error ZeroSalary();
error PeriodTooShort();
error BadCount();
error StartTooOld();
error NotEmployer();
error NothingDue();
error TooManyPaydays();
error NotAsOfPayday(uint256 payday, uint80 roundId);
error BadAnswer();
error UnprovableRound();
error UnsettledPaydays();
error ArrearsOutstanding();
error InsufficientReserve();
error NothingToWithdraw();
error TransferFailed();
error AlreadyEnded();
error ReentrantCall();
error LengthMismatch();
error NoPayroll();
error ZeroFeed();

// ---------------------------------------------------------------------------
// Main contract
// ---------------------------------------------------------------------------
contract Asof {
    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    struct CurrencyInfo {
        address feed;       // Chainlink AggregatorV3 proxy
        bool    inverse;    // false = X/USD; true = USD/X
        uint8   decimals;   // cached from feed.decimals()
        bool    exists;
    }

    struct Payroll {
        address employer;
        address worker;
        bytes3  currency;
        uint256 salary;    // local currency as 18-decimal fixed point
        uint256 start;     // first payday unix timestamp
        uint256 period;    // seconds between paydays
        uint256 count;     // total paydays
        uint256 settled;   // paydays settled so far
        uint256 endedAt;   // 0 = not ended
        uint256 reserve;   // USDC (native 18-decimal)
        uint256 arrears;   // USDC owed but unpaid
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /// @dev maxAge is the staleness bound (25 hours = 90_000 s on mainnet).
    uint256 public immutable maxAge;

    bytes3[] private _currencyCodes;
    mapping(bytes3 => CurrencyInfo) private _currencies;

    uint256 private _nextId = 1;
    mapping(uint256 => Payroll) private _payrolls;

    /// @dev credited[addr] – native USDC credited on failed payout.
    mapping(address => uint256) private _credited;

    /// @dev Reentrancy guard: 1 = unlocked, 2 = locked.
    uint256 private _locked = 1;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event PayrollCreated(
        uint256 indexed id,
        address indexed employer,
        address indexed worker,
        bytes3  currency,
        uint256 salary,
        uint256 start,
        uint256 period,
        uint256 count
    );
    event Funded(uint256 indexed id, address indexed from, uint256 amount);
    event PaydaySettled(
        uint256 indexed id,
        uint256 index,
        uint256 payday,
        uint80  roundId,
        int256  answer,
        uint256 roundUpdatedAt,
        uint256 usdc,
        uint256 paid,
        uint256 credited,
        uint256 arrearsAdded,
        address settler
    );
    event ArrearsPaid(uint256 indexed id, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event Reclaimed(uint256 indexed id, uint256 amount);
    event Ended(uint256 indexed id, uint256 at);

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier nonReentrant() {
        if (_locked != 1) revert ReentrantCall();
        _locked = 2;
        _;
        _locked = 1;
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    /// @param codes    Currency codes (bytes3), e.g. "MXN", "BRL", "EUR".
    /// @param feeds    Chainlink AggregatorV3 proxy addresses.
    /// @param inverse  false = X/USD feed, true = USD/X feed (e.g. USD/ARS).
    /// @param _maxAge  Staleness bound in seconds (25 hours = 90_000).
    constructor(
        bytes3[] memory codes,
        address[] memory feeds,
        bool[]    memory inverse,
        uint256   _maxAge
    ) {
        if (codes.length != feeds.length || feeds.length != inverse.length) revert LengthMismatch();
        maxAge = _maxAge;
        for (uint256 i = 0; i < codes.length; i++) {
            bytes3 code = codes[i];
            address feed = feeds[i];
            if (feed == address(0)) revert ZeroFeed();
            uint8 dec = IAggregatorV3(feed).decimals();
            _currencies[code] = CurrencyInfo({
                feed:     feed,
                inverse:  inverse[i],
                decimals: dec,
                exists:   true
            });
            _currencyCodes.push(code);
        }
    }

    // -----------------------------------------------------------------------
    // Write functions
    // -----------------------------------------------------------------------

    /// @notice Create a new payroll. msg.value becomes the reserve.
    /// @return id  New payroll id (starts at 1).
    function create(
        address worker,
        bytes3  currency,
        uint256 salary,
        uint256 start,
        uint256 period,
        uint256 count
    ) external payable nonReentrant returns (uint256 id) {
        if (worker == address(0))                          revert ZeroWorker();
        if (!_currencies[currency].exists)                 revert UnknownCurrency();
        if (salary == 0)                                   revert ZeroSalary();
        if (period < 60)                                   revert PeriodTooShort();
        if (count == 0 || count > 10_000)                  revert BadCount();
        // back pay up to 90 days is allowed
        if (start < block.timestamp - 90 days)             revert StartTooOld();

        id = _nextId++;
        _payrolls[id] = Payroll({
            employer: msg.sender,
            worker:   worker,
            currency: currency,
            salary:   salary,
            start:    start,
            period:   period,
            count:    count,
            settled:  0,
            endedAt:  0,
            reserve:  msg.value,
            arrears:  0
        });

        emit PayrollCreated(id, msg.sender, worker, currency, salary, start, period, count);
    }

    /// @notice Fund an existing payroll. Anyone may call.
    ///         Arrears are paid to the worker first; the remainder goes to the reserve.
    function fund(uint256 id) external payable nonReentrant {
        Payroll storage p = _payrolls[id];
        if (p.employer == address(0)) revert NoPayroll();

        uint256 amount = msg.value;
        if (amount == 0) return;

        if (p.arrears > 0) {
            uint256 toPay = amount < p.arrears ? amount : p.arrears;
            p.arrears -= toPay;
            amount    -= toPay;
            _sendOrCredit(p.worker, toPay);
            emit ArrearsPaid(id, toPay);
        }

        if (amount > 0) {
            p.reserve += amount;
        }

        emit Funded(id, msg.sender, msg.value);
    }

    /// @notice Settle the next roundIds.length paydays, one round id per payday.
    ///         Anyone may call.
    function settle(uint256 id, uint80[] calldata roundIds) external nonReentrant {
        if (roundIds.length == 0) revert NothingDue();
        if (roundIds.length > 32) revert TooManyPaydays();

        Payroll storage p = _payrolls[id];
        if (p.employer == address(0)) revert NoPayroll();

        uint256 firstIndex = p.settled;

        // The FIRST payday must be due right now.
        if (!_isDue(p, firstIndex)) revert NothingDue();

        for (uint256 k = 0; k < roundIds.length; k++) {
            uint256 index = firstIndex + k;
            if (!_isDue(p, index)) break;
            _settleOne(id, p, index, roundIds[k]);
        }
    }

    /// @dev Settle a single payday. Extracted to avoid stack-too-deep in the loop.
    function _settleOne(
        uint256 id,
        Payroll storage p,
        uint256 index,
        uint80 rid
    ) internal {
        CurrencyInfo storage ci = _currencies[p.currency];
        uint256 pdTime = p.start + index * p.period;

        (int256 answer, uint256 updatedAt) = _verifyAsOf(ci, pdTime, rid);

        // Convert salary → USDC, floored to micro-USDC (1e12).
        uint256 usdc = (_toUsdc(p.salary, answer, ci.decimals, ci.inverse) / 1e12) * 1e12;

        // Pay min(usdc, reserve), credit on failure.
        uint256 toPay     = usdc <= p.reserve ? usdc : p.reserve;
        uint256 shortfall = usdc - toPay;

        p.reserve -= toPay;
        p.arrears += shortfall;
        p.settled  = index + 1;

        uint256 creditedAmt;
        uint256 paidAmt;
        if (toPay > 0) {
            // Use capped-gas transfer: worker is not the caller here, so we must not
            // allow their receive() to consume unlimited gas and revert the settlement.
            if (_tryTransferCapped(p.worker, toPay)) {
                paidAmt = toPay;
            } else {
                _credited[p.worker] += toPay;
                creditedAmt = toPay;
            }
        }

        emit PaydaySettled(id, index, pdTime, rid, answer, updatedAt, usdc, paidAmt, creditedAmt, shortfall, msg.sender);
    }

    /// @notice Withdraw the caller's credited balance.
    function withdraw() external nonReentrant {
        uint256 amount = _credited[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        _credited[msg.sender] = 0;
        bool ok = _tryTransfer(msg.sender, amount);
        if (!ok) {
            _credited[msg.sender] = amount;
            revert TransferFailed();
        }
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Employer reclaims part of the reserve.
    function reclaim(uint256 id, uint256 amount) external nonReentrant {
        Payroll storage p = _payrolls[id];
        if (p.employer != msg.sender) revert NotEmployer();
        if (_hasDueUnsettled(p))      revert UnsettledPaydays();
        if (p.arrears > 0)            revert ArrearsOutstanding();
        if (amount > p.reserve)       revert InsufficientReserve();

        p.reserve -= amount;
        bool ok = _tryTransfer(msg.sender, amount);
        if (!ok) {
            p.reserve += amount;
            revert TransferFailed();
        }
        emit Reclaimed(id, amount);
    }

    /// @notice Employer ends the payroll: paydays at or after now are never due.
    function end(uint256 id) external {
        Payroll storage p = _payrolls[id];
        if (p.employer != msg.sender) revert NotEmployer();
        if (p.endedAt != 0)           revert AlreadyEnded();
        p.endedAt = block.timestamp;
        emit Ended(id, block.timestamp);
    }

    // -----------------------------------------------------------------------
    // View functions
    // -----------------------------------------------------------------------

    /// @notice Find the Chainlink round that was live at time t for a currency.
    ///         Uses the same staleness rule as settle.
    function asOf(bytes3 currency, uint256 t)
        external
        view
        returns (uint80 roundId, int256 answer, uint256 updatedAt)
    {
        CurrencyInfo storage ci = _currencies[currency];
        if (!ci.exists) revert UnknownCurrency();
        return _findAsOf(ci, t);
    }

    /// @notice Return payday timestamp for payroll id and 0-based index i.
    function payday(uint256 id, uint256 i) external view returns (uint256) {
        Payroll storage p = _payrolls[id];
        return p.start + i * p.period;
    }

    /// @notice Number of due-but-unsettled paydays.
    function dueCount(uint256 id) external view returns (uint256 n) {
        Payroll storage p = _payrolls[id];
        if (p.employer == address(0)) return 0;
        for (uint256 i = p.settled; i < p.count; i++) {
            if (_isDue(p, i)) n++;
            else break;
        }
    }

    /// @notice Timestamp of the next payday (0 if all settled or none due).
    function nextPayday(uint256 id) external view returns (uint256) {
        Payroll storage p = _payrolls[id];
        if (p.employer == address(0)) return 0;
        uint256 i = p.settled;
        if (i >= p.count) return 0;
        return p.start + i * p.period;
    }

    /// @notice USDC amount for the next payday at the latest Chainlink rate.
    function quote(uint256 id) external view returns (uint256) {
        Payroll storage p = _payrolls[id];
        if (p.employer == address(0)) return 0;
        CurrencyInfo storage ci = _currencies[p.currency];
        (uint80 roundId, int256 ans,,, uint80 answeredInRound) = IAggregatorV3(ci.feed).latestRoundData();
        if (ans <= 0 || answeredInRound < roundId) return 0;
        uint256 raw = _toUsdc(p.salary, ans, ci.decimals, ci.inverse);
        return (raw / 1e12) * 1e12;
    }

    /// @notice Returns all registered currency codes.
    function currencies() external view returns (bytes3[] memory) {
        return _currencyCodes;
    }

    /// @notice Credited (withdrawable) balance for an address.
    function credit(address account) external view returns (uint256) {
        return _credited[account];
    }

    /// @notice Full payroll struct.
    function payrollInfo(uint256 id) external view returns (Payroll memory) {
        return _payrolls[id];
    }

    /// @notice Number of payrolls created so far (ids are 1-based, so the last id == payrollCount()).
    function payrollCount() external view returns (uint256) {
        return _nextId - 1;
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /// @dev True if payday i is due and not yet settled.
    function _isDue(Payroll storage p, uint256 i) internal view returns (bool) {
        if (i >= p.count)    return false;
        if (i < p.settled)   return false;
        uint256 ts = p.start + i * p.period;
        if (ts > block.timestamp) return false;
        if (p.endedAt != 0 && ts >= p.endedAt) return false;
        return true;
    }

    /// @dev True if any payday is due but unsettled.
    function _hasDueUnsettled(Payroll storage p) internal view returns (bool) {
        for (uint256 i = p.settled; i < p.count; i++) {
            if (_isDue(p, i)) return true;
            if (p.start + i * p.period > block.timestamp) break;
        }
        return false;
    }

    /// @dev Verify that roundId `rid` is the correct "as of" round for payday `t`.
    ///      Returns (answer, updatedAt) on success; reverts otherwise.
    function _verifyAsOf(CurrencyInfo storage ci, uint256 t, uint80 rid)
        internal
        view
        returns (int256 answer, uint256 updatedAt)
    {
        IAggregatorV3 feed = IAggregatorV3(ci.feed);

        // Fetch data for rid.
        uint80 ridRoundId;
        uint80 ridAnsweredInRound;
        uint256 ridStartedAt;
        uint256 ridUpdatedAt;
        {
            (uint80 rrid, int256 a, uint256 s, uint256 u, uint80 air) = feed.getRoundData(rid);
            ridRoundId = rrid;
            ridAnsweredInRound = air;
            answer = a;
            ridStartedAt = s;
            ridUpdatedAt = u;
        }
        if (ridAnsweredInRound < ridRoundId) revert BadAnswer();
        if (ridStartedAt == 0) revert BadAnswer();
        if (ridUpdatedAt == 0) revert BadAnswer();
        if (answer <= 0) revert BadAnswer();

        updatedAt = ridUpdatedAt;

        // Derive phase and next/prev round ids.
        uint80 phaseId = uint80(rid >> 64);
        uint80 aggRid  = uint80(rid & type(uint64).max);

        uint80 nextRid = _encodeRoundId(phaseId, aggRid + 1);
        uint80 prevRid;

        if (aggRid > 1) {
            prevRid = _encodeRoundId(phaseId, aggRid - 1);
        } else if (phaseId > 1) {
            uint80 prevPhaseId = phaseId - 1;
            uint256 lo = 1;
            uint256 hi = type(uint32).max;
            uint256 best = 0;

            for (uint256 i = 0; i < 64 && lo <= hi; i++) {
                uint256 mid = lo + (hi - lo) / 2;
                uint80 midRid = _encodeRoundId(prevPhaseId, uint80(mid));
                bool exists;
                uint256 midUpdatedAt;

                try feed.getRoundData(midRid) returns (uint80, int256, uint256, uint256 mu, uint80) {
                    exists = true;
                    midUpdatedAt = mu;
                } catch {
                    exists = false;
                }

                if (exists && midUpdatedAt > 0) {
                    best = mid;
                    lo = mid + 1;
                } else {
                    if (mid == 0) break;
                    hi = mid - 1;
                }
            }

            if (best > 0) {
                prevRid = _encodeRoundId(prevPhaseId, uint80(best));
            }
        } else {
            prevRid = 0;
        }

        // Check if rid is the latest round on this feed.
        (uint80 latestRid,,, , uint80 latestAnsweredInRound) = feed.latestRoundData();
        if (latestAnsweredInRound < latestRid) revert BadAnswer();
        bool isLatest = (rid == latestRid);

        // Try to get next round (may not exist if rid is the latest).
        bool   nextExists;
        uint256 nextUpdatedAt;
        if (!isLatest) {
            try feed.getRoundData(nextRid) returns (uint80, int256, uint256, uint256 nu, uint80) {
                nextExists = nu > 0;
                nextUpdatedAt = nu;
            } catch {
                // next round does not exist — possible phase boundary
            }

            if (!nextExists) {
                uint80 nextPhaseRid = _encodeRoundId(phaseId + 1, 1);
                try feed.getRoundData(nextPhaseRid) returns (uint80, int256, uint256, uint256 nu, uint80) {
                    if (nu > ridUpdatedAt) {
                        nextRid = nextPhaseRid;
                        nextExists = true;
                        nextUpdatedAt = nu;
                    }
                } catch {
                    // no first round in next phase yet
                }
            }
        }

        // ── Live case ──────────────────────────────────────────────────────
        // ridUpdatedAt <= t  AND  (rid is latest OR nextUpdatedAt > t)
        // AND  t - ridUpdatedAt <= maxAge
        if (ridUpdatedAt <= t) {
            bool nextOk = isLatest || (nextExists && nextUpdatedAt > t);
            if (!nextOk) {
                // next round exists and nextUpdatedAt <= t → rid is not the right round
                if (nextExists) revert NotAsOfPayday(t, rid);
                // next round doesn't exist and rid is not the latest round → phase boundary
                if (!isLatest) revert UnprovableRound();
            }
            if (t - ridUpdatedAt > maxAge) {
                // Stale fallback check: this might be the stale case (see below), but
                // if we are here with ridUpdatedAt <= t and t-ridUpdatedAt > maxAge,
                // we need the FIRST round AFTER t.
                // Fall through to stale-fallback validation below.
            } else {
                // Valid live case.
                return (answer, ridUpdatedAt);
            }
        }

        // ── Stale fallback ─────────────────────────────────────────────────
        // The round live at t was older than maxAge.
        // We price at the FIRST round AFTER t: ridUpdatedAt > t, prev <= t, prev stale.
        if (ridUpdatedAt > t) {
            // rid is after t; check prev
            if (prevRid == 0) revert NotAsOfPayday(t, rid);
            uint80 prevRoundId;
            uint80 prevAnsweredInRound;
            uint256 prevStartedAt;
            uint256 prevUpdatedAt;
            try feed.getRoundData(prevRid) returns (uint80 pr, int256, uint256 ps, uint256 pu, uint80 pair) {
                prevRoundId = pr;
                prevAnsweredInRound = pair;
                prevStartedAt = ps;
                prevUpdatedAt = pu;
            } catch {
                revert NotAsOfPayday(t, rid);
            }
            if (prevAnsweredInRound < prevRoundId) revert BadAnswer();
            if (prevStartedAt == 0) revert BadAnswer();
            if (prevUpdatedAt == 0) revert BadAnswer();
            // prev must be at or before t, and must be stale (t - prevUpdatedAt > maxAge)
            if (prevUpdatedAt > t)           revert NotAsOfPayday(t, rid);
            if (t - prevUpdatedAt <= maxAge) revert NotAsOfPayday(t, rid);
            // Valid stale-fallback case.
            return (answer, ridUpdatedAt);
        }

        // ridUpdatedAt <= t but t - ridUpdatedAt > maxAge, and this was the "live" candidate
        // We already passed nextOk above → this is the stale-like region from the live path.
        // In the live path, if ridUpdatedAt <= t but age > maxAge, we fell through here.
        // That means we should actually be using the stale fallback round (first after t).
        // But the caller passed THIS round (ridUpdatedAt <= t) — that's wrong for stale-fallback.
        revert NotAsOfPayday(t, rid);
    }

    /// @dev Binary search over the latest phase to find the round live at time t.
    ///      Note: this intentionally searches only the latest phase as a best-effort UI helper.
    function _findAsOf(CurrencyInfo storage ci, uint256 t)
        internal
        view
        returns (uint80 roundId, int256 answer, uint256 updatedAt)
    {
        IAggregatorV3 feed = IAggregatorV3(ci.feed);
        (uint80 latestRid, int256 latestAns,, uint256 latestUpdatedAt,) = feed.latestRoundData();

        uint80 phaseId = uint80(latestRid >> 64);
        uint80 latest  = uint80(latestRid & type(uint64).max);

        // If latest is at or before t, return latest directly (possibly stale fallback).
        if (latestUpdatedAt <= t) {
            if (t - latestUpdatedAt <= maxAge) {
                return (latestRid, latestAns, latestUpdatedAt);
            }
            // Latest is stale — no valid round; return latest as best effort for UI.
            return (latestRid, latestAns, latestUpdatedAt);
        }

        // Binary search: find highest aggRid where updatedAt <= t.
        uint80 lo = 1;
        uint80 hi = latest;
        uint80 best = 0;
        uint256 bestUpdatedAt = 0;

        while (lo <= hi) {
            uint80 mid = lo + (hi - lo) / 2;
            uint80 midRid = _encodeRoundId(phaseId, mid);
            try feed.getRoundData(midRid) returns (uint80, int256, uint256, uint256 mu, uint80) {
                if (mu <= t) {
                    best = mid;
                    bestUpdatedAt = mu;
                    lo = mid + 1;
                } else {
                    if (mid == 0) break;
                    hi = mid - 1;
                }
            } catch {
                if (mid == 0) break;
                hi = mid - 1;
            }
        }

        if (best == 0) {
            // All rounds in the latest phase are after t: use first round in latest phase.
            uint80 firstRid = _encodeRoundId(phaseId, 1);
            (, int256 fa,, uint256 fu,) = feed.getRoundData(firstRid);
            return (firstRid, fa, fu);
        }

        uint80 bestRoundId = _encodeRoundId(phaseId, best);

        // Stale fallback: if best is stale, return first round after t.
        if (t - bestUpdatedAt > maxAge) {
            uint80 nextAgg = best + 1;
            if (nextAgg <= latest) {
                uint80 nextRid = _encodeRoundId(phaseId, nextAgg);
                (, int256 na,, uint256 nu,) = feed.getRoundData(nextRid);
                return (nextRid, na, nu);
            }
            // No round after t in this phase — return best (UI can handle).
            (, int256 bAns,, uint256 bAt,) = feed.getRoundData(bestRoundId);
            return (bestRoundId, bAns, bAt);
        }

        (, int256 bestAns,, uint256 bestAt,) = feed.getRoundData(bestRoundId);
        return (bestRoundId, bestAns, bestAt);
    }

    /// @dev Convert salary (18-decimal local) → USDC (18-decimal native).
    function _toUsdc(uint256 salary, int256 answer, uint8 dec, bool inverse)
        internal
        pure
        returns (uint256)
    {
        // answer is already validated > 0 before this call.
        uint256 ans = uint256(answer);
        uint256 scale = 10 ** dec;
        if (!inverse) {
            // X/USD: usdc = salary * answer / 10**decimals
            return (salary * ans) / scale;
        } else {
            // USD/X: usdc = salary * 10**decimals / answer
            return (salary * scale) / ans;
        }
    }

    // -----------------------------------------------------------------------
    // Transfer helpers
    // -----------------------------------------------------------------------

    /// @dev Gas cap for payouts where the recipient is NOT the caller (settle, fund arrears).
    ///      Prevents a malicious worker contract from burning all gas in receive() and
    ///      making the settlement revert, which would lock the employer's reserve.
    uint256 private constant PAYOUT_GAS = 50_000;

    /// @dev Attempt a capped-gas native transfer (settle / fund arrears path).
    ///      Uses an assembly call that does NOT copy return data, preventing
    ///      returndata-bomb griefing. Returns false on failure.
    function _tryTransferCapped(address to, uint256 amount) internal returns (bool ok) {
        if (to == address(0)) return false;
        assembly ("memory-safe") {
            // call(gas, to, value, argsOffset, argsLen, retOffset, retLen)
            ok := call(PAYOUT_GAS, to, amount, 0, 0, 0, 0)
        }
    }

    /// @dev Attempt a full-gas native transfer where the recipient IS the caller
    ///      (withdraw, reclaim). Does NOT copy return data to prevent returndata-bomb
    ///      griefing, but forwards all remaining gas so the caller's own contract
    ///      receive() can do real work.
    function _tryTransfer(address to, uint256 amount) internal returns (bool ok) {
        if (to == address(0)) return false;
        assembly ("memory-safe") {
            ok := call(gas(), to, amount, 0, 0, 0, 0)
        }
    }

    /// @dev Send native USDC to `to` via the capped-gas path; on failure, credit.
    function _sendOrCredit(address to, uint256 amount) internal {
        if (!_tryTransferCapped(to, amount)) {
            _credited[to] += amount;
        }
    }

    /// @dev Encode a phase-scoped Chainlink round id.
    function _encodeRoundId(uint80 phaseId, uint80 aggRoundId) internal pure returns (uint80) {
        return (phaseId << 64) | aggRoundId;
    }
}
