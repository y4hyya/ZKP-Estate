// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Domain
 * @dev Shared types, constants, and events for the ZKP-Estate protocol
 * @notice This library contains the core data structures and events used across the protocol
 */
library Domain {
    /**
     * @dev Policy structure containing rental requirements and metadata
     * @param minAge Minimum age requirement for tenants
     * @param incomeMul Income multiplier requirement (e.g., 3x rent)
     * @param rentWei Monthly rent amount in wei
     * @param needCleanRec Whether clean rental record is required
     * @param deadline Policy expiration deadline
     * @param owner Policy owner (landlord)
     * @param policyHash Computed hash of the policy for verification
     */
    struct Policy {
        uint256 minAge;
        uint256 incomeMul;
        uint256 rentWei;
        bool needCleanRec;
        uint64 deadline;
        address owner;
        bytes32 policyHash;
    }

    /**
     * @dev Compute the policy hash for verification
     * @param p Policy struct to hash
     * @return bytes32 Keccak256 hash of all policy fields except policyHash
     * @notice Includes owner and deadline in the hash computation
     */
    function computePolicyHash(Policy memory p) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                p.minAge,
                p.incomeMul,
                p.rentWei,
                p.needCleanRec,
                p.deadline,
                p.owner
            )
        );
    }

    // Events to be reused across the protocol

    /**
     * @dev Emitted when a new rental policy is created
     * @param policyId Unique identifier for the policy
     * @param owner Address of the policy owner (landlord)
     * @param policyHash Computed hash of the policy
     */
    event PolicyCreated(
        uint256 indexed policyId,
        address indexed owner,
        bytes32 indexed policyHash
    );

    /**
     * @dev Emitted when a tenant proves eligibility for a policy
     * @param tenant Address of the eligible tenant
     * @param policyId Policy ID the tenant is eligible for
     * @param nullifier ZK proof nullifier to prevent double-spending
     */
    event Eligible(
        address indexed tenant,
        uint256 indexed policyId,
        bytes32 indexed nullifier
    );

    /**
     * @dev Emitted when a lease is started
     * @param policyId Policy ID for the lease
     * @param tenant Address of the tenant
     * @param amount Amount paid for the lease
     * @param deadline Lease expiration deadline
     */
    event LeaseStarted(
        uint256 indexed policyId,
        address indexed tenant,
        uint256 amount,
        uint64 deadline
    );

    /**
     * @dev Emitted when a lease is released (completed successfully)
     * @param policyId Policy ID for the lease
     * @param tenant Address of the tenant
     * @param amount Amount released to the tenant
     */
    event LeaseReleased(
        uint256 indexed policyId,
        address indexed tenant,
        uint256 amount
    );

    /**
     * @dev Emitted when a lease is refunded (early termination)
     * @param policyId Policy ID for the lease
     * @param tenant Address of the tenant
     * @param amount Amount refunded to the tenant
     */
    event LeaseRefunded(
        uint256 indexed policyId,
        address indexed tenant,
        uint256 amount
    );
}
