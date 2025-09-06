// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IEligibility
 * @dev Interface for eligibility verification systems
 */
interface IEligibility {
    /**
     * @dev Check if an address is eligible for a specific policy
     * @param who The address to check eligibility for
     * @param policyId The policy ID to check against
     * @return true if eligible, false otherwise
     */
    function isEligible(address who, uint256 policyId) external view returns (bool);
}
