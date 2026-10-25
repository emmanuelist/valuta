// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// ---------------------------------------------------------------------------
// TestFeed – Chainlink AggregatorV3-compatible mock for Arc Testnet and tests.
//
// Mainnet uses the real Chainlink proxies (e.g. EUR/USD at 0xDd5B154...).
// This contract exists ONLY for Arc Testnet deploys and Foundry unit tests.
//
// Phase is fixed at 1. Round ids are encoded as (1 << 64) | aggRoundId.
// Decimals: 8 (same as all mainnet Chainlink USD feeds).
// History is set by calling push(answer, updatedAt) from the deployer.
// ---------------------------------------------------------------------------
contract TestFeed {
    address public immutable deployer;

    struct Round {
        int256  answer;
        uint256 updatedAt;
    }

    Round[] private _rounds; // 0-indexed; aggRoundId = index + 1

    event RoundPushed(uint80 indexed roundId, int256 answer, uint256 updatedAt);

    constructor() {
        deployer = msg.sender;
    }

    /// @notice Push a new round. Only callable by the deployer.
    function push(int256 answer, uint256 updatedAt) external {
        require(msg.sender == deployer, "TestFeed: not deployer");
        _rounds.push(Round(answer, updatedAt));
        uint80 rid = _encodeRoundId(uint80(_rounds.length));
        emit RoundPushed(rid, answer, updatedAt);
    }

    // -----------------------------------------------------------------------
    // AggregatorV3 interface (partial – read-only functions Asof uses)
    // -----------------------------------------------------------------------

    function decimals() external pure returns (uint8) {
        return 8;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(_rounds.length > 0, "TestFeed: no rounds");
        uint256 idx = _rounds.length - 1;
        Round storage r = _rounds[idx];
        roundId        = _encodeRoundId(uint80(idx + 1));
        answer         = r.answer;
        startedAt      = r.updatedAt;
        updatedAt      = r.updatedAt;
        answeredInRound = roundId;
    }

    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        uint80 phaseId = uint80(_roundId >> 64);
        require(phaseId == 1, "TestFeed: wrong phase");
        uint80 aggId = uint80(_roundId & type(uint64).max);
        require(aggId >= 1 && aggId <= uint80(_rounds.length), "TestFeed: no such round");
        uint256 idx = aggId - 1;
        Round storage r = _rounds[idx];
        roundId        = _roundId;
        answer         = r.answer;
        startedAt      = r.updatedAt;
        updatedAt      = r.updatedAt;
        answeredInRound = _roundId;
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    function totalRounds() external view returns (uint256) {
        return _rounds.length;
    }

    /// @dev Round id for aggRoundId n (1-based). Phase is always 1.
    function roundIdFor(uint80 n) external pure returns (uint80) {
        return _encodeRoundId(n);
    }

    function _encodeRoundId(uint80 aggRoundId) internal pure returns (uint80) {
        return (uint80(1) << 64) | aggRoundId;
    }
}
