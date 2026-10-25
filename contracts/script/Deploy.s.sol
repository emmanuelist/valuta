// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../Asof.sol";
import "../TestFeed.sol";

// ---------------------------------------------------------------------------
// Deploy script for Asof.
//
// TWO MODES, selected via the environment variable DEPLOY_MODE:
//
//   DEPLOY_MODE=testnet  (default)
//     • Deploys one TestFeed per currency for MXN, BRL and EUR (3 feeds).
//     • Seeds each with ~10 days of realistic history, two rounds per day,
//       small daily moves, and one gap longer than 25 hours so stale-fallback
//       paydays can be exercised.
//     • Deploys Asof with those three currencies and maxAge = 90_000 (25 h).
//
//   DEPLOY_MODE=mainnet
//     • Broadcasts a real deployment of Asof on Arc mainnet (chain 5042) using
//       the 8 real Chainlink proxy addresses hard-coded below.
//     • This mode is intended to be run by the project owner with their own key:
//         DEPLOY_MODE=mainnet forge script contracts/script/Deploy.s.sol \
//           --rpc-url <ARC_MAINNET_RPC> --private-key $PRIVATE_KEY --broadcast
//     • Do NOT run from Arc Studio; do NOT send funds to Arc Studio wallets.
//
// Mainnet Chainlink proxies on Arc (chain 5042), all 8 decimals, verified:
//   EUR/USD  0xDd5B15443cd733D3966a50a3E48cB7DF9Fb5DE0D  (inverse=false)
//   MXN/USD  0x302eaa6cd6f7AdDdc973fAC2Bb8fa32e9Ce19f21  (inverse=false)
//   BRL/USD  0x3406DB72AC5136b89eba6808CFcaD83aF523B3C2  (inverse=false)
//   JPY/USD  0xF9Fc1C20C82d774A3787845E73E41BCbF7F38F25  (inverse=false)
//   CAD/USD  0x5024DF70A748e5f1E720AAe8EEfc590430d71573  (inverse=false)
//   AUD/USD  0xaF452c2EA72b6E08AB64a67133a13C4ED35343eb  (inverse=false)
//   KRW/USD  0x07040A33A0204596e927595D0994C5D841d7d61D  (inverse=false)
//   USD/ARS  0xa261C56CABf7Ed6081646b892E57175AB2Dd8617  (inverse=true)
//   maxAge   = 90_000 seconds (25 hours)
// ---------------------------------------------------------------------------
contract Deploy is Script {
    // ── Mainnet proxy addresses ───────────────────────────────────────────
    address constant MAINNET_EUR_USD = 0xDd5B15443cd733D3966a50a3E48cB7DF9Fb5DE0D;
    address constant MAINNET_MXN_USD = 0x302eaa6cd6f7AdDdc973fAC2Bb8fa32e9Ce19f21;
    address constant MAINNET_BRL_USD = 0x3406DB72AC5136b89eba6808CFcaD83aF523B3C2;
    address constant MAINNET_JPY_USD = 0xF9Fc1C20C82d774A3787845E73E41BCbF7F38F25;
    address constant MAINNET_CAD_USD = 0x5024DF70A748e5f1E720AAe8EEfc590430d71573;
    address constant MAINNET_AUD_USD = 0xaF452c2EA72b6E08AB64a67133a13C4ED35343eb;
    address constant MAINNET_KRW_USD = 0x07040A33A0204596e927595D0994C5D841d7d61D;
    address constant MAINNET_USD_ARS = 0xa261C56CABf7Ed6081646b892E57175AB2Dd8617;

    uint256 constant MAX_AGE = 90_000; // 25 hours

    function run() external {
        string memory mode = vm.envOr("DEPLOY_MODE", string("testnet"));

        if (keccak256(bytes(mode)) == keccak256(bytes("mainnet"))) {
            _deployMainnet();
            return;
        }

        _deployTestnet();
    }

    // ── Mainnet deploy (owner runs with their own key) ────────────────────
    function _deployMainnet() internal {
        bytes3[] memory codes  = new bytes3[](8);
        address[] memory feeds = new address[](8);
        bool[]    memory inv   = new bool[](8);

        codes[0] = "EUR"; feeds[0] = MAINNET_EUR_USD; inv[0] = false;
        codes[1] = "MXN"; feeds[1] = MAINNET_MXN_USD; inv[1] = false;
        codes[2] = "BRL"; feeds[2] = MAINNET_BRL_USD; inv[2] = false;
        codes[3] = "JPY"; feeds[3] = MAINNET_JPY_USD; inv[3] = false;
        codes[4] = "CAD"; feeds[4] = MAINNET_CAD_USD; inv[4] = false;
        codes[5] = "AUD"; feeds[5] = MAINNET_AUD_USD; inv[5] = false;
        codes[6] = "KRW"; feeds[6] = MAINNET_KRW_USD; inv[6] = false;
        codes[7] = "ARS"; feeds[7] = MAINNET_USD_ARS; inv[7] = true;

        vm.startBroadcast();
        Asof asof = new Asof(codes, feeds, inv, MAX_AGE);
        vm.stopBroadcast();

        console.log("=== Asof Mainnet Deploy ===");
        console.log("Asof:", address(asof));
        console.log("maxAge:", MAX_AGE);
    }

    // ── Testnet deploy ─────────────────────────────────────────────────────
    // Deploys one TestFeed per currency for MXN, BRL and EUR only.
    // Registers only those three currencies in Asof (sufficient for testnet demos).
    function _deployTestnet() internal {
        vm.startBroadcast();

        TestFeed feedMXN = new TestFeed();
        TestFeed feedBRL = new TestFeed();
        TestFeed feedEUR = new TestFeed();

        // Seed each feed with 10 days of history.
        // Two rounds per day (every 12 hours), small daily moves, one >25 h gap.
        // Absolute timestamps starting 10 days before now.
        uint256 base = block.timestamp - 10 days;

        // MXN/USD: starts at 0.0536, drifts ±0.0002/day
        // 8-decimal: 5_360_000 → daily increments of 20_000
        _seedWithDrift(feedMXN, base, 5_360_000, 20_000);

        // BRL/USD: starts at 0.2011, drifts ±0.0003/day
        // 8-decimal: 20_110_000 → daily increments of 30_000
        _seedWithDrift(feedBRL, base, 20_110_000, 30_000);

        // EUR/USD: starts at 1.1203, drifts ±0.0004/day
        // 8-decimal: 112_030_000 → daily increments of 40_000
        _seedWithDrift(feedEUR, base, 112_030_000, 40_000);

        bytes3[] memory codes  = new bytes3[](3);
        address[] memory feeds = new address[](3);
        bool[]    memory inv   = new bool[](3);

        codes[0] = "MXN"; feeds[0] = address(feedMXN); inv[0] = false;
        codes[1] = "BRL"; feeds[1] = address(feedBRL); inv[1] = false;
        codes[2] = "EUR"; feeds[2] = address(feedEUR); inv[2] = false;

        Asof asof = new Asof(codes, feeds, inv, MAX_AGE);

        vm.stopBroadcast();

        console.log("=== Asof Testnet Deploy ===");
        console.log("Asof:        ", address(asof));
        console.log("TestFeed MXN:", address(feedMXN));
        console.log("TestFeed BRL:", address(feedBRL));
        console.log("TestFeed EUR:", address(feedEUR));
        console.log("maxAge:      ", MAX_AGE);
    }

    // ── Seed helper ────────────────────────────────────────────────────────
    // Seeds 10 days of history: 2 rounds/day at 12-hour intervals, with small
    // daily rate drift. After day 5, inserts a 27-hour gap to create a stale
    // region suitable for testing the stale-fallback path.
    //
    // Day  0: round 1  (base + 0h),  round 2  (base + 12h)
    // Day  1: round 3  (base + 24h), round 4  (base + 36h)
    // ...
    // Day  4: round 9  (base + 96h), round 10 (base + 108h)
    //          ── gap of 27 hours ──
    // Day  5: round 11 (base + 135h = 108h + 27h), round 12 (base + 147h)
    // ...
    // Day  9: round 19 (base + 207h), round 20 (base + 219h)
    function _seedWithDrift(TestFeed feed, uint256 base, int256 startRate, int256 dailyDrift) internal {
        int256 rate = startRate;
        uint256 t   = base;
        bool gapInserted = false;

        for (uint256 day = 0; day < 10; day++) {
            // Insert the 27-hour gap after day 4's second round.
            if (day == 5 && !gapInserted) {
                t += 27 hours;
                gapInserted = true;
            }

            // Round 1 of the day.
            feed.push(rate, t);
            t += 12 hours;

            // Round 2 of the day (slight intra-day move).
            feed.push(rate + dailyDrift / 2, t);
            t += 12 hours;

            // Apply daily drift for the next day.
            rate += dailyDrift;
        }
    }
}
