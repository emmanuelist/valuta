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
//     • Deploys TestFeed mocks for MXN, BRL, EUR, JPY, CAD, AUD, KRW, ARS.
//     • Seeds each feed with a short history.
//     • Deploys Asof with the TestFeed registry and maxAge = 90_000 (25h).
//
//   DEPLOY_MODE=mainnet
//     • Does NOT deploy — mainnet is deployed by the project owner using the
//       real Chainlink proxy addresses listed below. This mode prints the
//       constructor arguments and exits so the owner can deploy manually.
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
    // Mainnet proxy addresses — never deployed here, only logged.
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
            _printMainnetArgs();
            return;
        }

        // ── Testnet deploy ──────────────────────────────────────────────────
        vm.startBroadcast();

        // Deploy 8 TestFeeds.
        TestFeed feedEUR = new TestFeed();
        TestFeed feedMXN = new TestFeed();
        TestFeed feedBRL = new TestFeed();
        TestFeed feedJPY = new TestFeed();
        TestFeed feedCAD = new TestFeed();
        TestFeed feedAUD = new TestFeed();
        TestFeed feedKRW = new TestFeed();
        TestFeed feedARS = new TestFeed(); // USD/ARS inverse

        // Seed histories (a few rounds per day; one gap > 25 h to test staleness).
        // Using realistic approximate rates (Oct 2026).
        // All timestamps are relative to deploy time (block.timestamp) for clarity.
        // In practice a real deploy will use absolute timestamps.

        uint256 base = block.timestamp - 10 days;

        // EUR/USD ≈ 1.08 (8-decimal answer: 108_000_000)
        _seedEurLike(feedEUR, base, 108_000_000);
        // MXN/USD ≈ 0.048 (8-decimal: 4_800_000)
        _seedEurLike(feedMXN, base, 4_800_000);
        // BRL/USD ≈ 0.18 (8-decimal: 18_000_000)
        _seedEurLike(feedBRL, base, 18_000_000);
        // JPY/USD ≈ 0.0066 (8-decimal: 660_000)
        _seedEurLike(feedJPY, base, 660_000);
        // CAD/USD ≈ 0.73 (8-decimal: 73_000_000)
        _seedEurLike(feedCAD, base, 73_000_000);
        // AUD/USD ≈ 0.65 (8-decimal: 65_000_000)
        _seedEurLike(feedAUD, base, 65_000_000);
        // KRW/USD ≈ 0.00072 (8-decimal: 72_000)
        _seedEurLike(feedKRW, base, 72_000);
        // USD/ARS ≈ 1050 (8-decimal: 105_000_000_000)
        _seedEurLike(feedARS, base, 105_000_000_000);

        // Build registry arrays.
        bytes3[] memory codes   = new bytes3[](8);
        address[] memory feeds  = new address[](8);
        bool[]    memory inv    = new bool[](8);

        codes[0] = "EUR"; feeds[0] = address(feedEUR); inv[0] = false;
        codes[1] = "MXN"; feeds[1] = address(feedMXN); inv[1] = false;
        codes[2] = "BRL"; feeds[2] = address(feedBRL); inv[2] = false;
        codes[3] = "JPY"; feeds[3] = address(feedJPY); inv[3] = false;
        codes[4] = "CAD"; feeds[4] = address(feedCAD); inv[4] = false;
        codes[5] = "AUD"; feeds[5] = address(feedAUD); inv[5] = false;
        codes[6] = "KRW"; feeds[6] = address(feedKRW); inv[6] = false;
        codes[7] = "ARS"; feeds[7] = address(feedARS); inv[7] = true;

        Asof asof = new Asof(codes, feeds, inv, MAX_AGE);

        vm.stopBroadcast();

        // Report addresses.
        console.log("=== Asof Testnet Deploy ===");
        console.log("Asof:       ", address(asof));
        console.log("TestFeed EUR:", address(feedEUR));
        console.log("TestFeed MXN:", address(feedMXN));
        console.log("TestFeed BRL:", address(feedBRL));
        console.log("TestFeed JPY:", address(feedJPY));
        console.log("TestFeed CAD:", address(feedCAD));
        console.log("TestFeed AUD:", address(feedAUD));
        console.log("TestFeed KRW:", address(feedKRW));
        console.log("TestFeed ARS:", address(feedARS));
        console.log("maxAge:      ", MAX_AGE);
    }

    // ── Internal seed helper ──────────────────────────────────────────────
    // Seeds ~10 rounds spaced 6 h apart, then a > 25 h gap, then 3 more rounds.
    function _seedEurLike(TestFeed feed, uint256 base, int256 rate) internal {
        // 10 rounds, every 6 hours
        for (uint256 i = 0; i < 10; i++) {
            feed.push(rate, base + i * 6 hours);
        }
        // 27-hour gap (stale region)
        feed.push(rate, base + 10 * 6 hours + 27 hours);
        // 3 more rounds at 6-hour spacing after the gap
        uint256 gapEnd = base + 10 * 6 hours + 27 hours;
        for (uint256 i = 1; i <= 3; i++) {
            feed.push(rate, gapEnd + i * 6 hours);
        }
    }

    // ── Mainnet args (print only, never deploy) ───────────────────────────
    function _printMainnetArgs() internal view {
        console.log("=== Mainnet constructor arguments (DO NOT DEPLOY FROM HERE) ===");
        console.log("Deployer runs: forge create Asof --constructor-args ...");
        console.log("");
        console.log("codes:   [EUR, MXN, BRL, JPY, CAD, AUD, KRW, ARS]");
        console.log("feeds:");
        console.log("  EUR/USD", MAINNET_EUR_USD);
        console.log("  MXN/USD", MAINNET_MXN_USD);
        console.log("  BRL/USD", MAINNET_BRL_USD);
        console.log("  JPY/USD", MAINNET_JPY_USD);
        console.log("  CAD/USD", MAINNET_CAD_USD);
        console.log("  AUD/USD", MAINNET_AUD_USD);
        console.log("  KRW/USD", MAINNET_KRW_USD);
        console.log("  USD/ARS", MAINNET_USD_ARS);
        console.log("inverse: [false,false,false,false,false,false,false,true]");
        console.log("maxAge:  90000");
    }
}
