// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IVerifier.sol";
import "./PolicyRegistry.sol";
import "./lib/Domain.sol";

/**
 * @title EligibilityGate
 * @dev Contract for managing tenant eligibility verification using ZK proofs
 * @notice Handles ZK proof submission, nullifier tracking, and eligibility management
 */
contract EligibilityGate {
    using Domain for Domain.Policy;

    // Dependencies
    PolicyRegistry public immutable policyRegistry;
    IVerifier public immutable verifier;

    // Storage
    mapping(bytes32 => bool) public nullifierUsed; // Replay protection
    mapping(uint256 => mapping(address => bool)) public eligible; // policyId => tenant => eligible

    // Events
    event Eligible(
        address indexed tenant,
        uint256 indexed policyId,
        bytes32 indexed nullifier
    );

    /**
     * @dev Constructor
     * @param _policyRegistry Address of the PolicyRegistry contract
     * @param _verifier Address of the IVerifier contract
     */
    constructor(address _policyRegistry, address _verifier) {
        require(_policyRegistry != address(0), "EligibilityGate: Invalid policy registry");
        require(_verifier != address(0), "EligibilityGate: Invalid verifier");
        
        policyRegistry = PolicyRegistry(_policyRegistry);
        verifier = IVerifier(_verifier);
    }

    /**
     * @dev Submit ZK proof for eligibility verification
     * @param policyId The policy ID to verify eligibility for
     * @param proof The ZK proof
     * @param publicInputs Public inputs in order: [minAge, incomeMul, rentWei, needCleanRec(0/1), policyId, nullifierHi, nullifierLo]
     * @notice Public inputs layout must match Noir circuit expectations
     */
    function submitZk(
        uint256 policyId,
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external {
        // Validate public inputs length
        require(publicInputs.length == 7, "EligibilityGate: Invalid public inputs length");
        
        // Get policy from registry
        Domain.Policy memory policy = policyRegistry.getPolicy(policyId);
        
        // Check policy deadline
        require(policy.deadline >= block.timestamp, "EligibilityGate: Policy deadline passed");
        
        // Verify public inputs match policy
        require(publicInputs[0] == policy.minAge, "EligibilityGate: minAge mismatch");
        require(publicInputs[1] == policy.incomeMul, "EligibilityGate: incomeMul mismatch");
        require(publicInputs[2] == policy.rentWei, "EligibilityGate: rentWei mismatch");
        require(publicInputs[3] == (policy.needCleanRec ? 1 : 0), "EligibilityGate: needCleanRec mismatch");
        require(publicInputs[4] == policyId, "EligibilityGate: policyId mismatch");
        
        // Extract nullifier from public inputs (combine hi and lo parts)
        bytes32 nullifier = bytes32((uint256(publicInputs[5]) << 128) | uint256(publicInputs[6]));
        
        // Check nullifier not used before (replay protection)
        require(!nullifierUsed[nullifier], "EligibilityGate: Nullifier already used");
        
        // Verify ZK proof
        bool isValid = verifier.verify(proof, publicInputs);
        require(isValid, "EligibilityGate: Invalid proof");
        
        // Mark nullifier as used and tenant as eligible
        nullifierUsed[nullifier] = true;
        eligible[policyId][msg.sender] = true;
        
        // Emit event
        emit Eligible(msg.sender, policyId, nullifier);
    }

    /**
     * @dev Check if an address is eligible for a specific policy
     * @param who The address to check
     * @param policyId The policy ID to check eligibility for
     * @return isEligible True if the address is eligible for the policy
     */
    function isEligible(address who, uint256 policyId) external view returns (bool) {
        return eligible[policyId][who];
    }

    /**
     * @dev Check if a nullifier has been used
     * @param nullifier The nullifier to check
     * @return used True if the nullifier has been used
     */
    function isNullifierUsed(bytes32 nullifier) external view returns (bool) {
        return nullifierUsed[nullifier];
    }

    /**
     * @dev Get the policy registry address
     * @return registry The policy registry contract address
     */
    function getPolicyRegistry() external view returns (address) {
        return address(policyRegistry);
    }

    /**
     * @dev Get the verifier address
     * @return verifierAddr The verifier contract address
     */
    function getVerifier() external view returns (address) {
        return address(verifier);
    }

    /**
     * @dev Helper function to construct nullifier from hi and lo parts
     * @param nullifierHi High 128 bits of nullifier
     * @param nullifierLo Low 128 bits of nullifier
     * @return nullifier Combined 256-bit nullifier
     */
    function constructNullifier(uint256 nullifierHi, uint256 nullifierLo) external pure returns (bytes32) {
        return bytes32((nullifierHi << 128) | nullifierLo);
    }
}
