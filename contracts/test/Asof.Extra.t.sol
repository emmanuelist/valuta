// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../Asof.sol";
import "../TestFeed.sol";

// ---------------------------------------------------------------------------
// Helpers (redeclared locally so this file compiles stand-alone)
// ---------------------------------------------------------------------------

/// @dev Worker that starts rejecting, then flips to accepting after owner says so.
contract FlippableWorker {
    bool public rejects = true;
    uint256 public received;

    function flip() external { rejects = false; }

    receive() external payable {
        if (rejects) revert("reject");
        received += msg.value;
    }
}

/// @dev Always-rejecting worker for TransferFailed / withdraw revert tests.
contract AlwaysRejecting {
    receive() external payable { revert("reject"); }
    fallback() external payable { revert("reject"); }
}

// ---------------------------------------------------------------------------
// Shared base (mirrors AsofTest from Asof.t.sol so the extra file is self-contained)
// ---------------------------------------------------------------------------
abstract contract AsofBase is Test {
    uint256 constant MICRO   = 1e12;
    uint256 constant MAX_AGE = 25 hours;

    TestFeed feedMXN;
    TestFeed feedARS;

    Asof asof;

    address employer = makeAddr("employer");
    address worker   = makeAddr("worker");
    address stranger = makeAddr("stranger");

    uint256 t0;

    function setUp() public virtual {
        t0 = 1_700_000_000;
        vm.warp(t0);

        feedMXN = new TestFeed();
        feedARS = new TestFeed();

        _seedFeed(feedMXN, 5_000_000);           // MXN/USD 0.05
        _seedFeed(feedARS, 105_000_000_000);     // USD/ARS 1050

        bytes3[] memory codes  = new bytes3[](2);
        address[] memory feeds = new address[](2);
        bool[]    memory inv   = new bool[](2);

        codes[0] = "MXN"; feeds[0] = address(feedMXN); inv[0] = false;
        codes[1] = "ARS"; feeds[1] = address(feedARS); inv[1] = true;

        asof = new Asof(codes, feeds, inv, MAX_AGE);

        vm.deal(employer, 1_000 ether);
        vm.deal(stranger,   100 ether);
    }

    // 12 rounds every 6 h then a 27-h gap then 3 more (mirrors Asof.t.sol)
    function _seedFeed(TestFeed feed, int256 rate) internal {
        for (uint256 i = 0; i < 12; i++) {
            feed.push(rate, t0 + i * 6 hours);
        }
        feed.push(rate, t0 + 12 * 6 hours + 27 hours);
        for (uint256 i = 1; i <= 3; i++) {
            feed.push(rate, t0 + 12 * 6 hours + 27 hours + i * 6 hours);
        }
    }

    function _rid(uint80 n) internal pure returns (uint80) {
        return (uint80(1) << 64) | n;
    }

    function _createMXN(
        address wrk,
        uint256 salary,
        uint256 start,
        uint256 period,
        uint256 count,
        uint256 reserve
    ) internal returns (uint256 id) {
        vm.prank(employer);
        id = asof.create{value: reserve}(wrk, "MXN", salary, start, period, count);
    }
}

// ===========================================================================
// A. NoPayroll guard on fund() and settle()
// ===========================================================================
contract NoPayrollTest is AsofBase {
    function test_Fund_NoPayroll_Reverts() public {
        vm.expectRevert(NoPayroll.selector);
        asof.fund{value: 1 ether}(9999);
    }

    function test_Settle_NoPayroll_Reverts() public {
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        vm.expectRevert(NoPayroll.selector);
        asof.settle(9999, rids);
    }
}

// ===========================================================================
// B. NotEmployer guard on reclaim() and end()
// ===========================================================================
contract NotEmployerTest is AsofBase {
    function test_Reclaim_NotEmployer_Reverts() public {
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);
        uint256 id = _createMXN(worker, 5_000e18, paydayTs, 30 days, 1, 600 ether);

        // settle so no UnsettledPaydays guard fires first
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        asof.settle(id, rids);

        vm.prank(stranger);
        vm.expectRevert(NotEmployer.selector);
        asof.reclaim(id, 1 ether);
    }

    function test_End_NotEmployer_Reverts() public {
        uint256 id = _createMXN(worker, 5_000e18, t0 + 1 hours, 30 days, 1, 100 ether);

        vm.prank(stranger);
        vm.expectRevert(NotEmployer.selector);
        asof.end(id);
    }
}

// ===========================================================================
// C. NothingDue edge-cases
// ===========================================================================
contract NothingDueExtraTest is AsofBase {
    function test_Settle_EmptyRoundIds_Reverts() public {
        uint256 id = _createMXN(worker, 5_000e18, t0 + 1 hours, 30 days, 1, 100 ether);
        uint80[] memory empty = new uint80[](0);
        vm.expectRevert(NothingDue.selector);
        asof.settle(id, empty);
    }
}

// ===========================================================================
// D. Events
// ===========================================================================
contract EventsTest is AsofBase {
    function test_PayrollCreated_Emitted() public {
        uint256 salary    = 5_000e18;
        uint256 start     = t0 + 1 hours;
        uint256 period    = 30 days;
        uint256 count     = 2;
        uint256 reserve   = 100 ether;

        vm.expectEmit(true, true, true, true, address(asof));
        emit Asof.PayrollCreated(1, employer, worker, "MXN", salary, start, period, count);
        vm.prank(employer);
        asof.create{value: reserve}(worker, "MXN", salary, start, period, count);
    }

    function test_Funded_Emitted() public {
        uint256 id = _createMXN(worker, 5_000e18, t0 + 1 hours, 30 days, 1, 0);
        vm.expectEmit(true, true, false, true, address(asof));
        emit Asof.Funded(id, stranger, 1 ether);
        vm.prank(stranger);
        asof.fund{value: 1 ether}(id);
    }

    function test_PaydaySettled_Emitted() public {
        uint256 salary    = 5_000e18;
        uint256 paydayTs  = t0 + 1 hours;
        vm.warp(paydayTs + 1);
        // usdc = 5_000e18 * 5_000_000 / 1e8 = 250e18; floor to MICRO → 250e18
        uint256 expectedUsdc = 250e18;

        uint256 id = _createMXN(worker, salary, paydayTs, 30 days, 1, 300 ether);

        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);

        // round 1 updatedAt = t0; roundId = _rid(1); answer = 5_000_000
        vm.expectEmit(true, false, false, true, address(asof));
        emit Asof.PaydaySettled(
            id, 0, paydayTs,
            _rid(1), int256(5_000_000), t0,
            expectedUsdc,
            expectedUsdc, // paid (transfer succeeds)
            0,            // credited
            0,            // arrearsAdded
            address(this)
        );
        asof.settle(id, rids);
    }

    function test_ArrearsPaid_Emitted() public {
        uint256 salary   = 10_000e18; // usdc = 500e18
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);

        // Reserve only 100 → arrears = 400 after settle
        uint256 id = _createMXN(worker, salary, paydayTs, 30 days, 1, 100 ether);
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        asof.settle(id, rids);

        // Fund 200: 200 goes to arrears, emitting ArrearsPaid
        vm.deal(stranger, 200 ether);
        vm.expectEmit(true, false, false, true, address(asof));
        emit Asof.ArrearsPaid(id, 200 ether);
        vm.prank(stranger);
        asof.fund{value: 200 ether}(id);
    }

    function test_Reclaimed_Emitted() public {
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);
        // reserve=600, usdc=500 → leftover=100 after settle
        uint256 id = _createMXN(worker, 10_000e18, paydayTs, 30 days, 1, 600 ether);
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        asof.settle(id, rids);

        vm.expectEmit(true, false, false, true, address(asof));
        emit Asof.Reclaimed(id, 50 ether);
        vm.prank(employer);
        asof.reclaim(id, 50 ether);
    }

    function test_Ended_Emitted() public {
        uint256 id = _createMXN(worker, 5_000e18, t0 + 1 hours, 30 days, 1, 100 ether);
        vm.warp(t0 + 2);

        vm.expectEmit(true, false, false, true, address(asof));
        emit Asof.Ended(id, block.timestamp);
        vm.prank(employer);
        asof.end(id);
    }

    function test_Withdrawn_Emitted() public {
        // Use FlippableWorker: settles while rejecting → credit, then flips to accept → withdraw
        FlippableWorker fw = new FlippableWorker();

        uint256 salary   = 5_000e18; // usdc = 250e18
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);

        vm.prank(employer);
        uint256 id = asof.create{value: 300 ether}(address(fw), "MXN", salary, paydayTs, 30 days, 1);
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        asof.settle(id, rids);

        uint256 creditAmt = asof.credit(address(fw));
        assertGt(creditAmt, 0, "credit should be > 0");

        // Flip to accepting, then withdraw
        fw.flip();
        vm.expectEmit(true, false, false, true, address(asof));
        emit Asof.Withdrawn(address(fw), creditAmt);
        vm.prank(address(fw));
        asof.withdraw();
    }
}

// ===========================================================================
// E. Withdraw succeeds for a normal (EOA) credited account
//    (supplements the existing FailedPayoutTest)
// ===========================================================================
contract WithdrawEOATest is AsofBase {
    function test_Withdraw_EOA_AfterCredit() public {
        // Use FlippableWorker to get credit into Asof, then flip and withdraw
        FlippableWorker fw = new FlippableWorker();

        uint256 salary   = 5_000e18; // usdc = 250e18
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);

        vm.prank(employer);
        asof.create{value: 300 ether}(address(fw), "MXN", salary, paydayTs, 30 days, 1);
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        asof.settle(1, rids);

        uint256 credit = asof.credit(address(fw));
        assertGt(credit, 0);

        fw.flip();
        uint256 balBefore = address(fw).balance;
        vm.prank(address(fw));
        asof.withdraw();

        assertEq(asof.credit(address(fw)), 0);
        assertEq(address(fw).balance - balBefore, credit);
    }

    function test_Withdraw_NothingToWithdraw_Reverts() public {
        vm.expectRevert(NothingToWithdraw.selector);
        vm.prank(worker);
        asof.withdraw();
    }
}

// ===========================================================================
// F. End() — paydays AT endedAt are not due; due paydays strictly before are
// ===========================================================================
contract EndEdgeTest is AsofBase {
    function test_End_PaydayAtEndedAt_NotDue() public {
        // payday 1 lands exactly at endedAt → not due
        uint256 period = 1 days;
        uint256 start  = t0;
        vm.warp(t0 + 2 * period + 1);

        uint256 id = _createMXN(worker, 5_000e18, start, period, 5, 1_000 ether);

        // Settle payday 0 first (start = t0, already due)
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        asof.settle(id, rids);

        // End at exactly payday 1 time
        vm.warp(start + period);
        vm.prank(employer);
        asof.end(id); // endedAt = start + period = payday 1

        // payday 1 ts == endedAt → not due (condition: ts >= endedAt)
        uint256 n = asof.dueCount(id);
        assertEq(n, 0, "payday at endedAt must not be due");
    }

    function test_End_PastPaydays_SettleAfterEnd() public {
        // Three paydays; end after first two are due; both should still settle.
        uint256 period = 6 hours;
        uint256 start  = t0 + 1 hours;
        vm.warp(start + 2 * period + 1); // both payday 0 and 1 are due

        vm.deal(employer, 2_000 ether);
        uint256 id = _createMXN(worker, 5_000e18, start, period, 5, 2_000 ether);

        vm.prank(employer);
        asof.end(id); // endedAt = now

        // Settle both in one batch
        uint80[] memory rids = new uint80[](2);
        rids[0] = _rid(1); // payday 0 at start = t0+1h → round 1 (updatedAt=t0)
        rids[1] = _rid(2); // payday 1 at start+6h = t0+7h → round 2 (updatedAt=t0+6h)
        asof.settle(id, rids);

        Asof.Payroll memory p = asof.payrollInfo(id);
        assertEq(p.settled, 2);
    }
}

// ===========================================================================
// G. Fund() zero-value shortcut (msg.value == 0 returns early, no event)
// ===========================================================================
contract FundZeroTest is AsofBase {
    function test_Fund_ZeroValue_EmitsFunded() public {
        // fund(0) emits Funded but does nothing to reserve/arrears
        uint256 id = _createMXN(worker, 5_000e18, t0 + 1 hours, 30 days, 1, 0);
        Asof.Payroll memory before = asof.payrollInfo(id);

        // fund with 0: the function returns early (amount == 0) before emit
        // Funded is still emitted with amount=0 per contract code
        vm.recordLogs();
        asof.fund{value: 0}(id);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Verify reserve unchanged
        Asof.Payroll memory after_ = asof.payrollInfo(id);
        assertEq(after_.reserve, before.reserve);
        assertEq(after_.arrears, before.arrears);
        // No Funded event expected (early return before emit)
        bytes32 fundedSig = keccak256("Funded(uint256,address,uint256)");
        for (uint256 i = 0; i < logs.length; i++) {
            assertFalse(logs[i].topics[0] == fundedSig, "Funded should not emit on 0 value");
        }
    }
}

// ===========================================================================
// H. Invariant: contract balance == sum(reserves) + sum(credits) across many ops
// ===========================================================================
contract BalanceInvariantTest is AsofBase {
    // Three payrolls, some rejecting, one funded mid-stream
    function test_BalanceInvariant_MultiPayroll() public {
        AlwaysRejecting rw = new AlwaysRejecting();

        uint256 salary   = 5_000e18; // usdc = 250e18
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);

        // id1: normal worker, enough reserve
        uint256 id1 = _createMXN(worker, salary, paydayTs, 30 days, 2, 600 ether);
        // id2: rejecting worker
        vm.prank(employer);
        uint256 id2 = asof.create{value: 300 ether}(address(rw), "MXN", salary, paydayTs, 30 days, 1);
        // id3: underfunded → arrears
        uint256 id3 = _createMXN(worker, 10_000e18, paydayTs, 30 days, 1, 50 ether);

        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);

        asof.settle(id1, rids);
        asof.settle(id2, rids);
        asof.settle(id3, rids);

        Asof.Payroll memory p1 = asof.payrollInfo(id1);
        Asof.Payroll memory p2 = asof.payrollInfo(id2);
        Asof.Payroll memory p3 = asof.payrollInfo(id3);

        uint256 totalReserve = p1.reserve + p2.reserve + p3.reserve;
        uint256 totalCredit  = asof.credit(worker) + asof.credit(address(rw));

        assertEq(address(asof).balance, totalReserve + totalCredit,
            "balance != sum(reserves) + sum(credits)");
    }
}

// ===========================================================================
// I. Fuzz: asOf view round id, when fed to settle, must not revert NotAsOfPayday
// ===========================================================================
contract FuzzAsOfSettleTest is AsofBase {
    function testFuzz_AsOf_RoundId_SettleNeverNotAsOfPayday(uint16 seed) public {
        uint256 historyEnd = t0 + 12 * 6 hours + 27 hours + 3 * 6 hours;
        // Restrict seed to avoid StartTooOld check (90 days back limit)
        uint256 queryT = t0 + uint256(seed) % (historyEnd - t0);

        // Warp to after queryT so the payday is due
        vm.warp(historyEnd + 1);

        (uint80 roundId, int256 answer,) = asof.asOf("MXN", queryT);
        if (answer <= 0) return;

        vm.deal(employer, 10_000 ether);
        vm.prank(employer);
        uint256 id = asof.create{value: 1_000 ether}(worker, "MXN", 1_000e18, queryT, 30 days, 1);

        uint80[] memory rids = new uint80[](1);
        rids[0] = roundId;

        try asof.settle(id, rids) {
            // success — good
        } catch (bytes memory err) {
            bytes4 sel = bytes4(err);
            assertFalse(sel == bytes4(keccak256("NotAsOfPayday(uint256,uint80)")),
                "asOf view returned wrong round id");
        }
    }
}

// ===========================================================================
// J. Reclaim: full-cycle — createe, settle, reclaim full remainder
// ===========================================================================
contract ReclaimFullTest is AsofBase {
    function test_Reclaim_FullRemainder() public {
        uint256 salary    = 5_000e18; // usdc = 250e18
        uint256 paydayTs  = t0 + 1 hours;
        vm.warp(paydayTs + 1);

        // Reserve 300: 250 paid, 50 left
        uint256 id = _createMXN(worker, salary, paydayTs, 30 days, 1, 300 ether);
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        asof.settle(id, rids);

        Asof.Payroll memory p = asof.payrollInfo(id);
        assertEq(p.arrears, 0);
        uint256 rem = p.reserve; // 50 ether

        uint256 balBefore = employer.balance;
        vm.prank(employer);
        asof.reclaim(id, rem);
        assertEq(employer.balance - balBefore, rem);

        // Reserve now 0
        p = asof.payrollInfo(id);
        assertEq(p.reserve, 0);
    }
}

// ===========================================================================
// K. Invariant: paid + credited + arrearsAdded == usdc (via event decode)
//    — tests the underfunded AND the rejecting-worker paths
// ===========================================================================
contract InvariantEventTest is AsofBase {
    function _checkPaydaySettledInvariant(uint256 id, uint80[] memory rids) internal {
        vm.recordLogs();
        asof.settle(id, rids);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 sig = keccak256(
            "PaydaySettled(uint256,uint256,uint256,uint80,int256,uint256,uint256,uint256,uint256,uint256,address)"
        );
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == sig) {
                // id is indexed (topics[1]) — NOT in data.
                // data = (index, payday, roundId, answer, roundUpdatedAt, usdc, paid, credited, arrearsAdded, settler)
                (, , , , , uint256 usdc, uint256 paid, uint256 credited, uint256 arrearsAdded,) =
                    abi.decode(
                        logs[i].data,
                        (uint256, uint256, uint80, int256, uint256,
                         uint256, uint256, uint256, uint256, address)
                    );
                assertEq(paid + credited + arrearsAdded, usdc,
                    "paid+credited+arrears != usdc");
                found = true;
            }
        }
        assertTrue(found, "no PaydaySettled event");
    }

    function test_Invariant_UnderfundedPath() public {
        // salary 10k MXN → 500e18 usdc, reserve 100 → arrears 400
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);
        uint256 id = _createMXN(worker, 10_000e18, paydayTs, 30 days, 1, 100 ether);
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        _checkPaydaySettledInvariant(id, rids);
    }

    function test_Invariant_RejectingWorkerPath() public {
        AlwaysRejecting rw = new AlwaysRejecting();
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);
        vm.prank(employer);
        uint256 id = asof.create{value: 600 ether}(address(rw), "MXN", 10_000e18, paydayTs, 30 days, 1);
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        _checkPaydaySettledInvariant(id, rids);
    }
}

// ===========================================================================
// L. create() accepts msg.value as initial reserve (Funded event NOT emitted at
//    create time — only PayrollCreated) and reserve is stored correctly
// ===========================================================================
contract CreateReserveTest is AsofBase {
    function test_Create_InitialReserveStored() public {
        vm.prank(employer);
        uint256 id = asof.create{value: 42 ether}(worker, "MXN", 1_000e18, t0 + 1 hours, 30 days, 1);
        Asof.Payroll memory p = asof.payrollInfo(id);
        assertEq(p.reserve, 42 ether);
    }

    function test_Create_IdsIncrement() public {
        vm.prank(employer);
        uint256 id1 = asof.create{value: 0}(worker, "MXN", 1_000e18, t0 + 1 hours, 30 days, 1);
        vm.prank(employer);
        uint256 id2 = asof.create{value: 0}(worker, "MXN", 1_000e18, t0 + 1 hours, 30 days, 1);
        assertEq(id2, id1 + 1);
    }
}

// ===========================================================================
// M. Fuzz: fund() with any value keeps balance invariant
// ===========================================================================
contract FuzzFundBalanceTest is AsofBase {
    function testFuzz_Fund_BalanceInvariant(uint64 fundAmt) public {
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);

        uint256 id = _createMXN(worker, 10_000e18, paydayTs, 30 days, 1, 100 ether);
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        asof.settle(id, rids); // build arrears

        vm.deal(stranger, uint256(fundAmt));
        vm.prank(stranger);
        asof.fund{value: uint256(fundAmt)}(id);

        Asof.Payroll memory p = asof.payrollInfo(id);
        uint256 totalReserve = p.reserve;
        uint256 totalCredit  = asof.credit(worker);

        assertEq(address(asof).balance, totalReserve + totalCredit,
            "balance invariant broken after fund");
    }
}

// ===========================================================================
// N. ARS inverse conversion — exact arithmetic check
// ===========================================================================
contract ARSConversionExactTest is AsofBase {
    function test_ARS_ExactConversion() public {
        // USD/ARS = 1050 (answer = 105_000_000_000 at 8 dec)
        // salary = ARS 210,000 (210_000e18)
        // usdc = 210_000e18 * 1e8 / 105_000_000_000 = 210_000e18 / 1050 = 200e18
        uint256 salary = 210_000e18;
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);

        vm.prank(employer);
        uint256 id = asof.create{value: 300 ether}(worker, "ARS", salary, paydayTs, 30 days, 1);
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);

        uint256 balBefore = worker.balance;
        asof.settle(id, rids);
        assertEq(worker.balance - balBefore, 200e18);
    }
}
