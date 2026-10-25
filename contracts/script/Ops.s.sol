// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../Valuta.sol";

// ---------------------------------------------------------------------------
// Ops.s.sol – operational scripts for Valuta on Arc mainnet.
//
// Run each function individually with forge script, e.g.:
//
//   forge script contracts/script/Ops.s.sol:Ops \
//     --sig "create(address,address,bytes3,uint256,uint256,uint256,uint256,uint256)" \
//     <valuta> <worker> <currency> <salary> <start> <period> <count> <reserve> \
//     --rpc-url $ARC_MAINNET_RPC --private-key $PRIVATE_KEY --broadcast
//
//   forge script contracts/script/Ops.s.sol:Ops \
//     --sig "settleDue(address,uint256)" <valuta> <id> \
//     --rpc-url $ARC_MAINNET_RPC --private-key $PRIVATE_KEY --broadcast
//
// These functions are NOT run from Arc Studio. Run with your own key.
// ---------------------------------------------------------------------------
contract Ops is Script {

    // -----------------------------------------------------------------------
    // create
    // -----------------------------------------------------------------------
    /// @notice Create a new payroll with msg.value == reserve.
    /// @param valuta   Deployed Valuta contract address.
    /// @param worker   Worker address.
    /// @param currency Three-byte currency code, e.g. "MXN".
    /// @param salary   Salary in local currency (18-decimal fixed point).
    /// @param start    First payday unix timestamp.
    /// @param period   Seconds between paydays.
    /// @param count    Number of paydays.
    /// @param reserve  USDC reserve to deposit (18-decimal native, msg.value).
    function create(
        address valuta,
        address worker,
        bytes3  currency,
        uint256 salary,
        uint256 start,
        uint256 period,
        uint256 count,
        uint256 reserve
    ) external {
        vm.startBroadcast();
        uint256 id = Valuta(valuta).create{value: reserve}(worker, currency, salary, start, period, count);
        vm.stopBroadcast();

        console.log("=== Payroll created ===");
        console.log("id:      ", id);
        console.log("valuta:  ", valuta);
        console.log("worker:  ", worker);
        console.log("currency:", string(abi.encodePacked(currency)));
        console.log("salary:  ", salary);
        console.log("reserve: ", reserve);
    }

    // -----------------------------------------------------------------------
    // fund
    // -----------------------------------------------------------------------
    /// @notice Fund an existing payroll (clears arrears first, remainder to reserve).
    /// @param valuta  Deployed Valuta contract address.
    /// @param id      Payroll id.
    /// @param amount  Amount to send (18-decimal native USDC, msg.value).
    function fund(address valuta, uint256 id, uint256 amount) external {
        vm.startBroadcast();
        Valuta(valuta).fund{value: amount}(id);
        vm.stopBroadcast();

        console.log("=== Payroll funded ===");
        console.log("id:     ", id);
        console.log("amount: ", amount);
    }

    // -----------------------------------------------------------------------
    // settleDue
    // -----------------------------------------------------------------------
    /// @notice Settle all due paydays for a payroll.
    ///         Reads dueCount, resolves each payday's round via asOf, and
    ///         calls settle in chunks of at most 32. If nothing is due, logs
    ///         that and returns WITHOUT broadcasting a transaction.
    /// @param valuta  Deployed Valuta contract address.
    /// @param id      Payroll id.
    function settleDue(address valuta, uint256 id) external {
        Valuta v = Valuta(valuta);

        // Read payroll data before any broadcast.
        Valuta.Payroll memory p = v.payrollInfo(id);
        require(p.employer != address(0), "no such payroll");

        uint256 due = v.dueCount(id);
        if (due == 0) {
            console.log("=== settleDue: nothing due for payroll", id, "===");
            return; // no transaction sent
        }

        console.log("=== settleDue: settling paydays for payroll");
        console.log("  id:  ", id);
        console.log("  due: ", due);

        // Gather round ids for every due payday, logging each one.
        // We process in chunks of 32 (the contract's per-call limit).
        uint256 settled = p.settled;
        uint256 remaining = due;

        while (remaining > 0) {
            uint256 chunkSize = remaining > 32 ? 32 : remaining;
            uint80[] memory roundIds = new uint80[](chunkSize);

            for (uint256 k = 0; k < chunkSize; k++) {
                uint256 idx    = settled + k;
                uint256 pdTime = v.payday(id, idx);

                (uint80 rid, int256 answer, uint256 updatedAt) = v.asOf(p.currency, pdTime);

                roundIds[k] = rid;

                console.log("  payday index:", idx);
                console.log("  payday time: ", pdTime);
                console.log("  roundId:     ", uint256(rid));
                console.log("  answer:      ", answer > 0 ? uint256(answer) : 0);
                console.log("  updatedAt:   ", updatedAt);

                // Estimate USDC: emitted in PaydaySettled, but log a preview here.
                // (View-only; the actual amount is authoritative in the event.)
            }

            vm.startBroadcast();
            v.settle(id, roundIds);
            vm.stopBroadcast();

            console.log("  settled chunk of", chunkSize);

            settled   += chunkSize;
            remaining -= chunkSize;
        }

        console.log("=== settleDue: done ===");
    }
}
