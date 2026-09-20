// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Minimal interface used by this template for Supra's Push Oracle.
/// @dev Function names and struct order follow Supra's documented Solidity interface.
interface ISupraSValueFeed {
    struct PriceFeed {
        uint256 round;
        uint256 decimals;
        uint256 time;
        uint256 price;
    }

    function getSvalue(
        uint256 pairIndex
    ) external view returns (PriceFeed memory);

    function getTimestamp(uint256 tradingPair) external view returns (uint256);
}
