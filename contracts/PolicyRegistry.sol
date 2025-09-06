// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./lib/Domain.sol";

/**
 * @title PolicyRegistry
 * @dev Registry for managing rental policies
 * @notice Stores and manages rental policies with auto-incrementing policy IDs
 */
contract PolicyRegistry {
    using Domain for Domain.Policy;

    // State variables
    uint256 private _nextPolicyId = 1;
    mapping(uint256 => Domain.Policy) private _policies;

    // Events
    event PolicyCreated(
        uint256 indexed policyId,
        address indexed owner,
        bytes32 indexed policyHash
    );

    /**
     * @dev Create a new rental policy
     * @param minAge Minimum age requirement for tenants
     * @param incomeMul Income multiplier requirement (e.g., 3x rent)
     * @param rentWei Monthly rent amount in wei
     * @param needCleanRec Whether clean rental record is required
     * @param deadline Policy expiration deadline
     * @return policyId The ID of the created policy
     * @notice Reverts if deadline <= block.timestamp
     */
    function createPolicy(
        uint256 minAge,
        uint256 incomeMul,
        uint256 rentWei,
        bool needCleanRec,
        uint64 deadline
    ) external returns (uint256) {
        require(deadline > block.timestamp, "PolicyRegistry: Invalid deadline");
        require(minAge > 0, "PolicyRegistry: Invalid min age");
        require(incomeMul > 0, "PolicyRegistry: Invalid income multiplier");
        require(rentWei > 0, "PolicyRegistry: Invalid rent amount");

        uint256 policyId = _nextPolicyId++;
        
        Domain.Policy memory policy = Domain.Policy({
            minAge: minAge,
            incomeMul: incomeMul,
            rentWei: rentWei,
            needCleanRec: needCleanRec,
            deadline: deadline,
            owner: msg.sender,
            policyHash: bytes32(0) // Will be computed below
        });

        // Compute policy hash
        policy.policyHash = policy.computePolicyHash();
        
        _policies[policyId] = policy;

        emit PolicyCreated(policyId, msg.sender, policy.policyHash);

        return policyId;
    }

    /**
     * @dev Get a policy by ID
     * @param policyId The ID of the policy to retrieve
     * @return policy The policy struct
     */
    function getPolicy(uint256 policyId) external view returns (Domain.Policy memory) {
        require(policyId > 0 && policyId < _nextPolicyId, "PolicyRegistry: Invalid policy ID");
        return _policies[policyId];
    }

    /**
     * @dev Check if caller is the owner of a specific policy
     * @param policyId The ID of the policy to check
     * @return isOwner True if caller is the policy owner
     */
    function isPolicyOwner(uint256 policyId) external view returns (bool) {
        require(policyId > 0 && policyId < _nextPolicyId, "PolicyRegistry: Invalid policy ID");
        return _policies[policyId].owner == msg.sender;
    }

    /**
     * @dev Get the next policy ID (for testing purposes)
     * @return nextId The next policy ID that will be assigned
     */
    function getNextPolicyId() external view returns (uint256) {
        return _nextPolicyId;
    }

    /**
     * @dev Get the total number of policies created
     * @return count The total number of policies
     */
    function getPolicyCount() external view returns (uint256) {
        return _nextPolicyId - 1;
    }

    /**
     * @dev Modifier to check if caller is the owner of a specific policy
     * @param policyId The ID of the policy to check
     */
    modifier onlyPolicyOwner(uint256 policyId) {
        require(policyId > 0 && policyId < _nextPolicyId, "PolicyRegistry: Invalid policy ID");
        require(_policies[policyId].owner == msg.sender, "PolicyRegistry: Not policy owner");
        _;
    }
}
