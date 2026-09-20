// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ISupraSValueFeed} from "../interfaces/ISupraSValueFeed.sol";

contract MockSupraSValueFeed is ISupraSValueFeed {
    mapping(uint256 pairId => PriceFeed feed) private feeds;

    function setPrice(
        uint256 pairId,
        uint256 round,
        uint256 decimals,
        uint256 timestamp,
        uint256 price
    ) external {
        feeds[pairId] = PriceFeed({
            round: round,
            decimals: decimals,
            time: timestamp,
            price: price
        });
    }

    function getSvalue(
        uint256 pairIndex
    ) external view returns (PriceFeed memory) {
        return feeds[pairIndex];
    }

    function getTimestamp(uint256 tradingPair) external view returns (uint256) {
        return feeds[tradingPair].time;
    }
}
