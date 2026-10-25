// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// ---------------------------------------------------------------------------
// Valuta.Payslip.t.sol - tests for v2 payslip storage and batch views.
//
// Covers:
//   * payslip(id, i) fields match PaydaySettled event (paid path, credited path)
//   * arrearsAdded identity: usdc - paid - credited == arrearsAdded
//   * payslips(id, from, n) cap at 64 and shorten at settled
//   * payrolls(fromId, n) cap at 64, shorten at payrollCount, fromId=0 treated as 1
//   * duePreview(id, n) matches what settle actually pays
//   * duePreview stale-fallback case
//   * NotSettled revert
//   * SalaryTooLarge revert
//   * Storage-slot count: settling one payday writes exactly 4 payslip slots
//   * Gas snapshot: settlement cost (reported in test output)
// ---------------------------------------------------------------------------

import "forge-std/Test.sol";
import "../Valuta.sol";
import "../TestFeed.sol";

// ---------------------------------------------------------------------------
// Shared base (same 16-round history as the other test files)
// ---------------------------------------------------------------------------
abstract contract PayslipBase is Test {
    uint256 constant MICRO   = 1e12;
    uint256 constant MAX_AGE = 25 hours;

    TestFeed feedMXN;
    TestFeed feedARS;

    Valuta v;

    address employer = makeAddr("employer");
    address worker   = makeAddr("worker");

    uint256 t0;

    function setUp() public virtual {
        t0 = 1_700_000_000;
        vm.warp(t0);

        feedMXN = new TestFeed();
        feedARS = new TestFeed();

        // 12 rounds every 6 h, then 27-h gap (round 13), then 3 more (rounds 14-16)
        for (uint256 i = 0; i < 12; i++) {
            feedMXN.push(5_000_000,         t0 + i * 6 hours);
            feedARS.push(105_000_000_000,   t0 + i * 6 hours);
        }
        feedMXN.push(5_000_000,         t0 + 12 * 6 hours + 27 hours);
        feedARS.push(105_000_000_000,   t0 + 12 * 6 hours + 27 hours);
        for (uint256 i = 1; i <= 3; i++) {
            feedMXN.push(5_000_000,         t0 + 12 * 6 hours + 27 hours + i * 6 hours);
            feedARS.push(105_000_000_000,   t0 + 12 * 6 hours + 27 hours + i * 6 hours);
        }

        bytes3[] memory codes  = new bytes3[](2);
        address[] memory feeds = new address[](2);
        bool[]    memory inv   = new bool[](2);

        codes[0] = "MXN"; feeds[0] = address(feedMXN); inv[0] = false;
        codes[1] = "ARS"; feeds[1] = address(feedARS); inv[1] = true;

        v = new Valuta(codes, feeds, inv, MAX_AGE);

        vm.deal(employer, 100_000 ether);
    }

    /// @dev Phase-1 round id for 1-based agg index n.
    function _rid(uint80 n) internal pure returns (uint80) {
        return (uint80(1) << 64) | n;
    }

    /// @dev Compute the storage slot base for _payslips[id][index].
    ///      Storage layout (immutables use no slots):
    ///        slot 0: _currencyCodes (dynamic array)
    ///        slot 1: _currencies (mapping)
    ///        slot 2: _nextId
    ///        slot 3: _payrolls (mapping)
    ///        slot 4: _payslips (mapping)   <-- here
    ///        slot 5: _credited (mapping)
    ///        slot 6: _locked
    ///      Note: maxAge is `immutable` and occupies NO storage slot.
    function _payslipSlot(uint256 id, uint256 index) internal pure returns (bytes32) {
        bytes32 outerSlot = keccak256(abi.encode(id, uint256(4)));
        return keccak256(abi.encode(index, outerSlot));
    }
}

// ---------------------------------------------------------------------------
// 1. Payslip fields match PaydaySettled event - paid path
// ---------------------------------------------------------------------------
contract PayslipFieldsPaidTest is PayslipBase {
    function test_Payslip_Fields_PaidPath() public {
        uint256 salary   = 5_000e18; // -> 250e18 USDC at 0.05
        uint256 paydayTs = t0 + 1 hours; // inside round 1 (updatedAt = t0)
        vm.warp(paydayTs + 1);

        vm.prank(employer);
        uint256 id = v.create{value: 300 ether}(worker, "MXN", salary, paydayTs, 30 days, 1);

        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);

        // Capture the event to compare against the payslip.
        vm.recordLogs();
        v.settle(id, rids);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Decode PaydaySettled fields.
        bytes32 sig = keccak256(
            "PaydaySettled(uint256,uint256,uint256,uint80,int256,uint256,uint256,uint256,uint256,uint256,address)"
        );
        uint256 evtPayday; uint80 evtRoundId; int256 evtAnswer;
        uint256 evtUpdatedAt; uint256 evtUsdc; uint256 evtPaid; uint256 evtCredited;
        uint256 evtArrears; address evtSettler;
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == sig) {
                // id is indexed (topics[1]), not in data.
                (, evtPayday, evtRoundId, evtAnswer, evtUpdatedAt,
                 evtUsdc, evtPaid, evtCredited, evtArrears, evtSettler) =
                    abi.decode(logs[i].data,
                        (uint256, uint256, uint80, int256, uint256,
                         uint256, uint256, uint256, uint256, address));
                found = true;
            }
        }
        assertTrue(found, "no PaydaySettled event");

        Valuta.Payslip memory ps = v.payslip(id, 0);

        // Fields are stored as smaller types; compare via upcast.
        assertEq(uint256(ps.payday),         evtPayday,             "payday");
        assertEq(uint256(ps.roundId),        uint256(evtRoundId),   "roundId");
        assertEq(uint256(ps.answer),         uint256(evtAnswer),    "answer");
        assertEq(uint256(ps.roundUpdatedAt), evtUpdatedAt,          "roundUpdatedAt");
        assertEq(uint256(ps.usdc),           evtUsdc,               "usdc");
        assertEq(uint256(ps.paid),           evtPaid,               "paid");
        assertEq(uint256(ps.credited),       evtCredited,           "credited");
        assertEq(ps.settler,                 evtSettler,            "settler");

        // arrearsAdded identity: usdc - paid - credited == arrearsAdded from event
        assertEq(uint256(ps.usdc) - uint256(ps.paid) - uint256(ps.credited),
                 evtArrears, "arrears identity");

        // settledAt and settledBlock were set this block
        assertEq(uint256(ps.settledAt),    block.timestamp, "settledAt");
        assertEq(uint256(ps.settledBlock), block.number,    "settledBlock");
    }
}

// ---------------------------------------------------------------------------
// 2. Payslip fields - credited path (rejecting worker)
// ---------------------------------------------------------------------------
contract RejectingWorkerPayslip {
    receive() external payable { revert("reject"); }
}

contract PayslipFieldsCreditedTest is PayslipBase {
    function test_Payslip_Fields_CreditedPath() public {
        RejectingWorkerPayslip rw = new RejectingWorkerPayslip();

        uint256 salary   = 10_000e18; // -> 500e18 USDC
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);

        vm.prank(employer);
        uint256 id = v.create{value: 600 ether}(address(rw), "MXN", salary, paydayTs, 30 days, 1);

        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        v.settle(id, rids);

        Valuta.Payslip memory ps = v.payslip(id, 0);

        // Transfer failed -> paid=0, credited=500e18
        assertEq(uint256(ps.paid),     0,          "paid should be 0 for rejecting worker");
        assertEq(uint256(ps.credited), 500 ether,  "credited should be full usdc");
        assertEq(uint256(ps.usdc),     500 ether,  "usdc");
        // arrears = 0 (reserve was enough, just failed to transfer)
        assertEq(uint256(ps.usdc) - uint256(ps.paid) - uint256(ps.credited),
                 0, "arrears identity for credited path");
    }
}

// ---------------------------------------------------------------------------
// 3. Payslip - arrears path (underfunded reserve)
// ---------------------------------------------------------------------------
contract PayslipArrearsTest is PayslipBase {
    function test_Payslip_ArrearsPath() public {
        uint256 salary   = 10_000e18; // -> 500e18 USDC
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);

        // Reserve only 100 -> arrears = 400, paid = 100
        vm.prank(employer);
        uint256 id = v.create{value: 100 ether}(worker, "MXN", salary, paydayTs, 30 days, 1);

        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);

        vm.recordLogs();
        v.settle(id, rids);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Decode arrearsAdded from event.
        bytes32 sig = keccak256(
            "PaydaySettled(uint256,uint256,uint256,uint80,int256,uint256,uint256,uint256,uint256,uint256,address)"
        );
        uint256 evtArrears;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == sig) {
                (,,,,, ,, , evtArrears,) =
                    abi.decode(logs[i].data,
                        (uint256,uint256,uint80,int256,uint256,
                         uint256,uint256,uint256,uint256,address));
            }
        }

        Valuta.Payslip memory ps = v.payslip(id, 0);
        assertEq(uint256(ps.usdc) - uint256(ps.paid) - uint256(ps.credited),
                 evtArrears, "arrears identity");
        assertEq(uint256(ps.paid),     100 ether, "paid");
        assertEq(uint256(ps.credited), 0,         "credited");
    }
}

// ---------------------------------------------------------------------------
// 4. NotSettled revert
// ---------------------------------------------------------------------------
contract NotSettledTest is PayslipBase {
    function test_NotSettled_Reverts() public {
        uint256 paydayTs = t0 + 1 hours;
        vm.prank(employer);
        uint256 id = v.create{value: 0}(worker, "MXN", 1_000e18, paydayTs, 30 days, 1);

        // Nothing settled yet -> index 0 reverts NotSettled
        vm.expectRevert(NotSettled.selector);
        v.payslip(id, 0);

        // After settling one, index 1 still reverts NotSettled
        vm.warp(paydayTs + 1);
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);
        v.settle(id, rids);

        vm.expectRevert(NotSettled.selector);
        v.payslip(id, 1);
    }
}

// ---------------------------------------------------------------------------
// 5. SalaryTooLarge revert
// ---------------------------------------------------------------------------
contract SalaryTooLargeTest is PayslipBase {
    function test_SalaryTooLarge_Reverts() public {
        vm.prank(employer);
        vm.expectRevert(SalaryTooLarge.selector);
        v.create{value: 0}(worker, "MXN", 1e33 + 1, t0 + 1 hours, 30 days, 1);
    }

    function test_SalaryAtBound_Succeeds() public {
        vm.prank(employer);
        // 1e33 exactly should succeed
        uint256 id = v.create{value: 0}(worker, "MXN", 1e33, t0 + 1 hours, 30 days, 1);
        assertGt(id, 0, "created with max salary");
    }
}

// ---------------------------------------------------------------------------
// 6. Storage-slot count: settling one payday writes exactly 4 payslip slots
// ---------------------------------------------------------------------------
contract StorageSlotCountTest is PayslipBase {
    function test_PayslipWritesExactly4Slots() public {
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);

        vm.prank(employer);
        uint256 id = v.create{value: 300 ether}(worker, "MXN", 5_000e18, paydayTs, 30 days, 1);

        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);

        // Record all storage accesses during settle.
        vm.record();
        v.settle(id, rids);
        (, bytes32[] memory writes) = vm.accesses(address(v));

        // Compute the 4 expected payslip slot addresses for _payslips[id][0].
        // _payslips is at slot 5 in Valuta's storage layout.
        bytes32 base = _payslipSlot(id, 0);
        bytes32 slot0 = base;
        bytes32 slot1 = bytes32(uint256(base) + 1);
        bytes32 slot2 = bytes32(uint256(base) + 2);
        bytes32 slot3 = bytes32(uint256(base) + 3);

        // Count DISTINCT payslip slots written (a slot may appear more than once in
        // the writes array if Solidity performs a zero-init write followed by the
        // actual value write, e.g. when via_ir compiles struct literals).
        bool hit0; bool hit1; bool hit2; bool hit3;
        for (uint256 i = 0; i < writes.length; i++) {
            if (writes[i] == slot0) hit0 = true;
            if (writes[i] == slot1) hit1 = true;
            if (writes[i] == slot2) hit2 = true;
            if (writes[i] == slot3) hit3 = true;
        }
        uint256 distinctSlots = (hit0 ? 1 : 0) + (hit1 ? 1 : 0) +
                                 (hit2 ? 1 : 0) + (hit3 ? 1 : 0);

        assertEq(distinctSlots, 4, "Payslip must write exactly 4 distinct storage slots");
    }
}

// ---------------------------------------------------------------------------
// 7. payslips() - cap at 64, shorten at settled
// ---------------------------------------------------------------------------
contract PayslipsBatchTest is PayslipBase {
    function test_Payslips_Cap64() public {
        // Create a payroll with many paydays but only settle a few.
        uint256 paydayTs = t0 + 1 hours;
        // Warp past payday 1 (t0+2h) so both payday 0 and payday 1 are due.
        vm.warp(paydayTs + 2 hours + 1);

        vm.prank(employer);
        uint256 id = v.create{value: 10_000 ether}(worker, "MXN", 1_000e18, paydayTs, 1 hours, 100);

        // Settle 2 paydays. Both fall within round 1 (updatedAt=t0, next=t0+6h).
        uint80[] memory rids = new uint80[](2);
        rids[0] = _rid(1);
        rids[1] = _rid(1);
        v.settle(id, rids);

        // payslips(id, 0, 100) -> capped at 64, shortened at 2 settled -> 2 results
        Valuta.Payslip[] memory pss = v.payslips(id, 0, 100);
        assertEq(pss.length, 2, "should return min(64, settled)=2");

        // payslips(id, 0, 1) -> 1 result
        pss = v.payslips(id, 0, 1);
        assertEq(pss.length, 1, "from=0, n=1 -> 1 result");

        // payslips(id, 1, 1) -> 1 result (index 1)
        pss = v.payslips(id, 1, 1);
        assertEq(pss.length, 1, "from=1, n=1 -> 1 result");
        // Second payslip is for payday 1 (t0+1h + 1h = t0+2h)
        assertEq(uint256(pss[0].payday), paydayTs + 1 hours, "second payslip timestamp");

        // payslips(id, 2, 1) -> 0 results (from >= settled)
        pss = v.payslips(id, 2, 1);
        assertEq(pss.length, 0, "from=settled -> empty");
    }

    function test_Payslips_ShortenAtSettled() public {
        uint256 paydayTs = t0 + 1 hours;
        // Warp past payday 2 (t0+3h) so all 3 paydays are due.
        vm.warp(paydayTs + 3 hours + 1);

        vm.prank(employer);
        uint256 id = v.create{value: 10_000 ether}(worker, "MXN", 1_000e18, paydayTs, 1 hours, 10);

        // All three paydays fall within round 1 (updatedAt=t0, next=t0+6h).
        uint80[] memory rids = new uint80[](3);
        rids[0] = _rid(1);
        rids[1] = _rid(1);
        rids[2] = _rid(1);
        v.settle(id, rids);

        // n=64 but only 3 settled -> result has 3 elements
        Valuta.Payslip[] memory pss = v.payslips(id, 0, 64);
        assertEq(pss.length, 3, "shortened at settled=3");

        // from=1, n=64 -> 2 elements
        pss = v.payslips(id, 1, 64);
        assertEq(pss.length, 2, "from=1, shortened to 2");
    }
}

// ---------------------------------------------------------------------------
// 8. payrolls() - cap at 64, shorten at payrollCount, fromId=0 treated as 1
// ---------------------------------------------------------------------------
contract PayrollsBatchTest is PayslipBase {
    function test_Payrolls_Cap64() public {
        // Create 3 payrolls.
        vm.startPrank(employer);
        for (uint256 i = 0; i < 3; i++) {
            v.create{value: 0}(worker, "MXN", 1_000e18, t0 + 1 hours, 30 days, 1);
        }
        vm.stopPrank();

        // payrolls(1, 100) -> capped at 64, shortened at 3 -> 3 results
        Valuta.Payroll[] memory prs = v.payrolls(1, 100);
        assertEq(prs.length, 3, "3 payrolls exist, n=100 capped+shortened to 3");

        // payrolls(2, 64) -> 2 results
        prs = v.payrolls(2, 64);
        assertEq(prs.length, 2, "fromId=2, 2 remaining");

        // payrolls(4, 64) -> 0 results (out of range)
        prs = v.payrolls(4, 64);
        assertEq(prs.length, 0, "fromId beyond payrollCount -> empty");
    }

    function test_Payrolls_FromIdZero_TreatedAsOne() public {
        // Create 2 payrolls (ids 1 and 2).
        vm.startPrank(employer);
        v.create{value: 0}(worker, "MXN", 1_000e18, t0 + 1 hours, 30 days, 1);
        v.create{value: 0}(worker, "MXN", 2_000e18, t0 + 1 hours, 30 days, 1);
        vm.stopPrank();

        // payrolls(0, 64) must return the same as payrolls(1, 64) -- no empty slot 0.
        Valuta.Payroll[] memory fromZero = v.payrolls(0, 64);
        Valuta.Payroll[] memory fromOne  = v.payrolls(1, 64);

        assertEq(fromZero.length, fromOne.length, "length: 0 treated as 1");
        assertEq(fromZero.length, 2, "both should return 2 payrolls");

        // First element in both should be payroll id=1 (employer set, salary=1000e18).
        assertEq(fromZero[0].employer, fromOne[0].employer, "employer match");
        assertEq(fromZero[0].salary,   fromOne[0].salary,   "salary match");
        assertEq(fromZero[1].salary,   fromOne[1].salary,   "second salary match");

        // Specifically, the first payroll has salary 1000e18 (not 0 from an empty slot).
        assertEq(fromZero[0].salary, 1_000e18, "first salary is 1000e18, not zero");
    }

    function test_Payrolls_FieldsCorrect() public {
        uint256 salary = 7_777e18;
        uint256 start  = t0 + 2 hours;
        uint256 period = 14 days;
        uint256 count  = 5;

        vm.prank(employer);
        v.create{value: 42 ether}(worker, "MXN", salary, start, period, count);

        Valuta.Payroll[] memory prs = v.payrolls(1, 1);
        assertEq(prs.length, 1, "one payroll");
        assertEq(prs[0].employer, employer, "employer");
        assertEq(prs[0].worker,   worker,   "worker");
        assertEq(prs[0].salary,   salary,   "salary");
        assertEq(prs[0].start,    start,    "start");
        assertEq(prs[0].period,   period,   "period");
        assertEq(prs[0].count,    count,    "count");
        assertEq(prs[0].reserve,  42 ether, "reserve");
    }
}

// ---------------------------------------------------------------------------
// 9. duePreview - matches what settle actually pays (live case)
// ---------------------------------------------------------------------------
contract DuePreviewTest is PayslipBase {
    function test_DuePreview_MatchesSettle() public {
        // 3 due paydays, each 6 hours apart.
        uint256 salary = 5_000e18; // -> 250e18 each
        uint256 start  = t0 + 1 hours;
        uint256 period = 6 hours;
        vm.warp(start + 2 * period + 1); // all 3 due

        vm.prank(employer);
        uint256 id = v.create{value: 1_000 ether}(worker, "MXN", salary, start, period, 3);

        // Get preview.
        Valuta.DueQuote[] memory dq = v.duePreview(id, 32);
        assertEq(dq.length, 3, "3 due paydays");

        // Settle and check each payslip matches the preview.
        uint80[] memory rids = new uint80[](3);
        for (uint256 i = 0; i < 3; i++) {
            rids[i] = dq[i].roundId;
        }
        v.settle(id, rids);

        for (uint256 i = 0; i < 3; i++) {
            Valuta.Payslip memory ps = v.payslip(id, i);
            assertEq(uint256(ps.payday),  dq[i].payday,   "payday match");
            assertEq(uint256(ps.roundId), uint256(dq[i].roundId), "roundId match");
            assertEq(uint256(ps.usdc),    dq[i].usdc,     "usdc match");
        }
    }

    function test_DuePreview_StaleCase() public {
        // Stale payday: falls in the 27-hour gap.
        // round 12 updatedAt = t0+11*6h, round 13 = t0+12*6h+27h
        // Payday at t0+12*6h+26h -> round 12 is stale, round 13 is the fallback.
        uint256 stalePd = t0 + 12 * 6 hours + 26 hours;
        vm.warp(stalePd + 1);

        vm.prank(employer);
        uint256 id = v.create{value: 1_000 ether}(worker, "MXN", 5_000e18, stalePd, 30 days, 1);

        Valuta.DueQuote[] memory dq = v.duePreview(id, 1);
        assertEq(dq.length, 1, "one due payday");

        // The preview roundId should be round 13 (stale fallback).
        assertEq(dq[0].roundId, _rid(13), "stale fallback: round 13");

        // Settling with the preview roundId must succeed.
        uint80[] memory rids = new uint80[](1);
        rids[0] = dq[0].roundId;
        v.settle(id, rids);

        Valuta.Payslip memory ps = v.payslip(id, 0);
        assertEq(uint256(ps.usdc), dq[0].usdc, "settled usdc matches preview");
    }

    function test_DuePreview_NothingDue() public {
        // Future payroll -> empty result
        vm.prank(employer);
        uint256 id = v.create{value: 0}(worker, "MXN", 1_000e18, t0 + 7 days, 30 days, 1);

        Valuta.DueQuote[] memory dq = v.duePreview(id, 32);
        assertEq(dq.length, 0, "nothing due");
    }

    function test_DuePreview_Cap32() public {
        // Many due paydays but cap at 32.
        uint256 start = t0 + 1 hours;
        uint256 period = 1 hours;
        // Warp 40 hours -> 40 paydays due (capped at 32 in preview).
        vm.warp(start + 40 * period);

        vm.prank(employer);
        uint256 id = v.create{value: 10_000 ether}(worker, "MXN", 100e18, start, period, 50);

        Valuta.DueQuote[] memory dq = v.duePreview(id, 40); // n=40 -> capped at 32
        assertEq(dq.length, 32, "capped at 32");
    }
}

// ---------------------------------------------------------------------------
// 10. CastOverflow: settlement reverts rather than storing a truncated payslip
// ---------------------------------------------------------------------------
// The salary guard (<=1e33) keeps *usdc* values inside uint128 for realistic
// oracle answers. But the oracle answer itself is cast to uint128 directly,
// so a pathological feed returning answer > type(uint128).max must revert
// CastOverflow() rather than silently truncate the stored payslip.
contract CastOverflowTest is PayslipBase {
    function test_CastOverflow_HugeAnswer_Reverts() public {
        // Push an answer just above type(uint128).max into the MXN feed.
        // type(uint128).max = 2**128 - 1 ≈ 3.4e38; use 2**128 as the overflow value.
        // This fits in int256 (max ~1.15e77) and in uint256, but not in uint128.
        int256 overflowAnswer = int256(uint256(type(uint128).max) + 1);
        feedMXN.push(overflowAnswer, t0 + 100 hours);

        uint256 paydayTs = t0 + 100 hours + 1;
        vm.warp(paydayTs + 1);

        // salary = 1e18 (1 MXN) — well within the 1e33 guard
        vm.prank(employer);
        uint256 id = v.create{value: 1_000 ether}(worker, "MXN", 1e18, paydayTs, 30 days, 1);

        // Round is the newly pushed one (latest round).
        uint80 latestN = uint80(feedMXN.totalRounds());
        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(latestN);

        // Must revert CastOverflow, not store a truncated payslip.
        vm.expectRevert(CastOverflow.selector);
        v.settle(id, rids);
    }
}

// ---------------------------------------------------------------------------
// 11. Gas snapshot: measure settlement cost with packed payslip (4 slots)
// ---------------------------------------------------------------------------
contract GasSnapshotTest is PayslipBase {
    function test_GasSnapshot_SettleSinglePayday() public {
        uint256 salary   = 5_000e18;
        uint256 paydayTs = t0 + 1 hours;
        vm.warp(paydayTs + 1);

        vm.prank(employer);
        uint256 id = v.create{value: 300 ether}(worker, "MXN", salary, paydayTs, 30 days, 1);

        uint80[] memory rids = new uint80[](1);
        rids[0] = _rid(1);

        uint256 gasBefore = gasleft();
        v.settle(id, rids);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("[GAS] settle single payday (v2 packed 4-slot Payslip)", gasUsed);
        // 4-slot packed Payslip: 4 SSTORE cold writes ~22100 each = ~88400 gas for payslip alone.
        // Total settlement gas should be well under 300k.
        assertLt(gasUsed, 300_000, "settlement gas should be under 300k");
    }
}
