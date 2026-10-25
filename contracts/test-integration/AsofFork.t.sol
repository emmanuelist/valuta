// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// ---------------------------------------------------------------------------
// AsofFork.t.sol – integration tests against Arc mainnet (chain 5042) using
// the real Chainlink MXN/USD and USD/ARS proxies.
//
// These tests are SKIPPED unless the environment variable ARC_RPC_URL is set.
// Run with:
//   ARC_RPC_URL=<arc-mainnet-rpc> forge test \
//     --match-path contracts/test-integration/AsofFork.t.sol -vv
//
// Facts about the Arc mainnet feeds verified on 2026-10-25:
//   • Phase 1 only.
//   • answeredInRound == roundId.
//   • startedAt is a few seconds before updatedAt.
//   • getRoundData for an id past the latest round returns zeros (no revert).
//   • getRoundData for a phase-2 id reverts.
//   • USD/ARS has 62 rounds, first on 2026-09-14.
// ---------------------------------------------------------------------------

import "forge-std/Test.sol";
import "../Asof.sol";
import "../TestFeed.sol"; // only used as the feed interface type in setup

/// @dev Minimal AggregatorV3 interface for reading live feeds.
interface IChainlinkFeed {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
    function getRoundData(uint80) external view returns (uint80, int256, uint256, uint256, uint80);
}

contract AsofForkTest is Test {
    // ── Real Arc mainnet feed addresses ──────────────────────────────────
    address constant MXN_USD_FEED = 0x302eaa6cd6f7AdDdc973fAC2Bb8fa32e9Ce19f21;
    address constant USD_ARS_FEED = 0xa261C56CABf7Ed6081646b892E57175AB2Dd8617;

    uint256 constant MAX_AGE    = 90_000; // 25 hours
    uint256 constant MICRO      = 1e12;
    uint256 constant ARC_CHAIN  = 5042;

    Asof asof;
    address employer = makeAddr("employer");
    address worker   = makeAddr("worker");

    bool forkEnabled;

    function setUp() public {
        string memory rpcUrl = vm.envOr("ARC_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) {
            // Skip: ARC_RPC_URL not set.
            forkEnabled = false;
            return;
        }

        forkEnabled = true;
        vm.createSelectFork(rpcUrl);

        // Confirm we are on Arc mainnet.
        assertEq(block.chainid, ARC_CHAIN, "not Arc mainnet");

        // Deploy Asof with MXN and ARS on the fork.
        bytes3[] memory codes  = new bytes3[](2);
        address[] memory feeds = new address[](2);
        bool[]    memory inv   = new bool[](2);

        codes[0] = "MXN"; feeds[0] = MXN_USD_FEED; inv[0] = false;
        codes[1] = "ARS"; feeds[1] = USD_ARS_FEED;  inv[1] = true;

        asof = new Asof(codes, feeds, inv, MAX_AGE);

        vm.deal(employer, 100_000 ether);
    }

    // ── Helper: skip if fork not enabled ────────────────────────────────
    modifier onlyFork() {
        if (!forkEnabled) return;
        _;
    }

    // ── MXN back-pay test ─────────────────────────────────────────────────
    // Creates a payroll with daily paydays over the last 10 days,
    // finds each payday's round with asOf, settles all, and asserts
    // payout == conversion of that round's answer floored to 1e12.
    function test_Fork_MXN_BackPaySettlement() public onlyFork {
        uint256 salary   = 500e18; // MXN 500/day
        uint256 count    = 10;
        uint256 period   = 1 days;
        // start = 10 days ago + 1 hour (so the first payday is unambiguously past)
        uint256 startTs  = block.timestamp - 10 days + 1 hours;

        // Fund generously.
        vm.prank(employer);
        uint256 id = asof.create{value: 50_000 ether}(worker, "MXN", salary, startTs, period, count);

        // Find and settle each payday.
        for (uint256 i = 0; i < count; i++) {
            uint256 pdTs = startTs + i * period;
            if (pdTs > block.timestamp) break; // not yet due

            (uint80 rid, int256 answer, uint256 updatedAt) = asof.asOf("MXN", pdTs);

            // Compute expected USDC from the returned round.
            // MXN/USD: usdc = salary * answer / 1e8, floored to 1e12.
            assertTrue(answer > 0, "answer must be positive");
            uint256 expectedRaw = (salary * uint256(answer)) / (10 ** 8);
            uint256 expected    = (expectedRaw / MICRO) * MICRO;

            uint256 workerBefore = worker.balance;

            uint80[] memory rids = new uint80[](1);
            rids[0] = rid;
            asof.settle(id, rids);

            uint256 paid = worker.balance - workerBefore;
            // paid + credited == expected (credit if transfer failed; but worker is an EOA)
            uint256 cred = asof.credit(worker);
            assertEq(paid + cred, expected, "paid+credit != expected usdc");

            // Emit a log so the test output shows the actual amounts.
            emit log_named_uint("payday", i);
            emit log_named_uint("updatedAt", updatedAt);
            emit log_named_int ("answer (8 dec)", answer);
            emit log_named_uint("expected usdc (18 dec)", expected);
            emit log_named_uint("paid", paid);
        }
    }

    // ── ARS back-pay test ─────────────────────────────────────────────────
    // Same pattern for USD/ARS (inverse feed, only ~62 rounds from 2026-09-14).
    function test_Fork_ARS_BackPaySettlement() public onlyFork {
        // USD/ARS has a short history. Use 5 daily paydays from 3 weeks ago.
        uint256 salary  = 100_000e18; // ARS 100,000/day
        uint256 count   = 5;
        uint256 period  = 1 days;
        uint256 startTs = block.timestamp - 6 days + 1 hours;

        vm.prank(employer);
        uint256 id = asof.create{value: 50_000 ether}(worker, "ARS", salary, startTs, period, count);

        for (uint256 i = 0; i < count; i++) {
            uint256 pdTs = startTs + i * period;
            if (pdTs > block.timestamp) break;

            (uint80 rid, int256 answer,) = asof.asOf("ARS", pdTs);
            assertTrue(answer > 0, "ARS answer must be positive");

            // USD/ARS inverse: usdc = salary * 1e8 / answer
            uint256 expectedRaw = (salary * (10 ** 8)) / uint256(answer);
            uint256 expected    = (expectedRaw / MICRO) * MICRO;

            uint256 workerBefore = worker.balance;

            uint80[] memory rids = new uint80[](1);
            rids[0] = rid;
            asof.settle(id, rids);

            uint256 paid = worker.balance - workerBefore;
            uint256 cred = asof.credit(worker);
            assertEq(paid + cred, expected, "ARS: paid+credit != expected usdc");
        }
    }

    // ── NotAsOfPayday: round before and after the correct one ────────────
    function test_Fork_NotAsOfPayday_WrongRounds() public onlyFork {
        uint256 salary  = 100e18;
        uint256 period  = 1 days;
        // Pick a payday 5 days ago.
        uint256 pdTs    = block.timestamp - 5 days + 1 hours;

        vm.prank(employer);
        uint256 id = asof.create{value: 1_000 ether}(worker, "MXN", salary, pdTs, period, 1);

        (uint80 correctRid,,) = asof.asOf("MXN", pdTs);

        // Decode phase and agg id.
        uint80 phaseId = uint80(correctRid >> 64);
        uint80 aggId   = uint80(correctRid & type(uint64).max);

        // Round BEFORE the correct one (if it exists).
        if (aggId > 1) {
            uint80 prevRid = (phaseId << 64) | (aggId - 1);
            uint80[] memory rids = new uint80[](1);
            rids[0] = prevRid;
            vm.expectRevert(abi.encodeWithSelector(NotAsOfPayday.selector, pdTs, prevRid));
            asof.settle(id, rids);
        }

        // Round AFTER the correct one.
        uint80 nextRid = (phaseId << 64) | (aggId + 1);
        // Verify nextRid actually exists and has updatedAt > pdTs (otherwise it's the latest).
        IChainlinkFeed feed = IChainlinkFeed(MXN_USD_FEED);
        (,, , uint256 nextUpdatedAt,) = feed.getRoundData(nextRid);
        if (nextUpdatedAt > 0 && nextUpdatedAt > pdTs) {
            uint80[] memory rids = new uint80[](1);
            rids[0] = nextRid;
            vm.expectRevert(abi.encodeWithSelector(NotAsOfPayday.selector, pdTs, nextRid));
            asof.settle(id, rids);
        }

        // Correct round must pass.
        uint80[] memory rids = new uint80[](1);
        rids[0] = correctRid;
        asof.settle(id, rids); // must not revert
    }

    // ── payrollCount() view ───────────────────────────────────────────────
    function test_Fork_PayrollCount() public onlyFork {
        uint256 before = asof.payrollCount();

        vm.prank(employer);
        asof.create{value: 0}(worker, "MXN", 1e18, block.timestamp, 1 days, 1);

        assertEq(asof.payrollCount(), before + 1);
    }
}
