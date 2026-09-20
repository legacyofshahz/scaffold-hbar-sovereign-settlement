// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISupraSValueFeed} from "./interfaces/ISupraSValueFeed.sol";

/// @title OracleGuardedSettlement
/// @notice Executes a single-use HBAR settlement only when an EIP-712 authorized intent
///         remains within its signed deadline and a live Supra oracle price window.
contract OracleGuardedSettlement is Ownable, EIP712, ReentrancyGuard {
    bytes32 public constant SETTLEMENT_INTENT_TYPEHASH =
        keccak256(
            "SettlementIntent(bytes32 intentId,address recipient,uint256 amountWei,uint256 pairId,uint256 minPrice,uint256 maxPrice,uint256 maxOracleAge,uint256 deadline,bytes32 evidenceCommitment)"
        );

    struct SettlementIntent {
        bytes32 intentId;
        address payable recipient;
        uint256 amountWei;
        uint256 pairId;
        uint256 minPrice;
        uint256 maxPrice;
        uint256 maxOracleAge;
        uint256 deadline;
        bytes32 evidenceCommitment;
    }

    error ZeroAddress();
    error ZeroAmount();
    error ZeroEvidenceCommitment();
    error InvalidPriceRange();
    error InvalidOracleAge();
    error IntentAlreadyConsumed(bytes32 intentId);
    error IntentExpired(uint256 deadline, uint256 nowTimestamp);
    error IncorrectValue(uint256 expected, uint256 actual);
    error InvalidAuthorizer(address recovered, address expected);
    error OracleTimestampInFuture(
        uint256 oracleTimestamp,
        uint256 nowTimestamp
    );
    error OracleStale(
        uint256 oracleTimestamp,
        uint256 maxOracleAge,
        uint256 nowTimestamp
    );
    error PriceOutsideRange(uint256 price, uint256 minPrice, uint256 maxPrice);
    error TransferFailed();

    event AuthorizerUpdated(
        address indexed oldAuthorizer,
        address indexed newAuthorizer
    );
    event SupraFeedUpdated(address indexed oldFeed, address indexed newFeed);
    event SettlementExecuted(
        bytes32 indexed intentId,
        address indexed recipient,
        address indexed relayer,
        uint256 amountWei,
        uint256 pairId,
        uint256 oraclePrice,
        uint256 oracleTimestamp,
        bytes32 evidenceCommitment,
        bytes32 authorizationDigest
    );

    ISupraSValueFeed public supraFeed;
    address public authorizer;
    mapping(bytes32 intentId => bool consumed) public consumedIntents;

    constructor(
        address supraFeedAddress,
        address initialOwner,
        address initialAuthorizer
    ) Ownable(initialOwner) EIP712("OracleGuardedSettlement", "1") {
        if (
            supraFeedAddress == address(0) ||
            initialOwner == address(0) ||
            initialAuthorizer == address(0)
        ) {
            revert ZeroAddress();
        }
        supraFeed = ISupraSValueFeed(supraFeedAddress);
        authorizer = initialAuthorizer;
    }

    function updateAuthorizer(address newAuthorizer) external onlyOwner {
        if (newAuthorizer == address(0)) revert ZeroAddress();
        address previous = authorizer;
        authorizer = newAuthorizer;
        emit AuthorizerUpdated(previous, newAuthorizer);
    }

    function updateSupraFeed(address newFeed) external onlyOwner {
        if (newFeed == address(0)) revert ZeroAddress();
        address previous = address(supraFeed);
        supraFeed = ISupraSValueFeed(newFeed);
        emit SupraFeedUpdated(previous, newFeed);
    }

    function intentStructHash(
        SettlementIntent calldata intent
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    SETTLEMENT_INTENT_TYPEHASH,
                    intent.intentId,
                    intent.recipient,
                    intent.amountWei,
                    intent.pairId,
                    intent.minPrice,
                    intent.maxPrice,
                    intent.maxOracleAge,
                    intent.deadline,
                    intent.evidenceCommitment
                )
            );
    }

    function authorizationDigest(
        SettlementIntent calldata intent
    ) public view returns (bytes32) {
        return _hashTypedDataV4(intentStructHash(intent));
    }

    function currentOraclePrice(
        uint256 pairId
    ) external view returns (ISupraSValueFeed.PriceFeed memory) {
        return supraFeed.getSvalue(pairId);
    }

    function execute(
        SettlementIntent calldata intent,
        bytes calldata signature
    ) external payable nonReentrant returns (bytes32 digest) {
        _validateStaticIntent(intent);

        if (consumedIntents[intent.intentId])
            revert IntentAlreadyConsumed(intent.intentId);
        if (block.timestamp > intent.deadline)
            revert IntentExpired(intent.deadline, block.timestamp);
        if (msg.value != intent.amountWei)
            revert IncorrectValue(intent.amountWei, msg.value);

        digest = authorizationDigest(intent);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != authorizer)
            revert InvalidAuthorizer(recovered, authorizer);

        ISupraSValueFeed.PriceFeed memory observed = supraFeed.getSvalue(
            intent.pairId
        );
        if (observed.time > block.timestamp) {
            revert OracleTimestampInFuture(observed.time, block.timestamp);
        }
        if (block.timestamp - observed.time > intent.maxOracleAge) {
            revert OracleStale(
                observed.time,
                intent.maxOracleAge,
                block.timestamp
            );
        }
        if (
            observed.price < intent.minPrice || observed.price > intent.maxPrice
        ) {
            revert PriceOutsideRange(
                observed.price,
                intent.minPrice,
                intent.maxPrice
            );
        }

        consumedIntents[intent.intentId] = true;

        (bool ok, ) = intent.recipient.call{value: intent.amountWei}("");
        if (!ok) revert TransferFailed();

        emit SettlementExecuted(
            intent.intentId,
            intent.recipient,
            msg.sender,
            intent.amountWei,
            intent.pairId,
            observed.price,
            observed.time,
            intent.evidenceCommitment,
            digest
        );
    }

    function _validateStaticIntent(
        SettlementIntent calldata intent
    ) private pure {
        if (intent.recipient == address(0)) revert ZeroAddress();
        if (intent.amountWei == 0) revert ZeroAmount();
        if (intent.evidenceCommitment == bytes32(0))
            revert ZeroEvidenceCommitment();
        if (intent.minPrice > intent.maxPrice) revert InvalidPriceRange();
        if (intent.maxOracleAge == 0) revert InvalidOracleAge();
    }
}
