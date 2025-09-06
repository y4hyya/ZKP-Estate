// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PolicyRegistry.sol";
import "./EligibilityGate.sol";
import "./lib/Domain.sol";

/**
 * @title LeaseEscrow
 * @dev Contract for managing lease escrow with ZK-verified eligibility
 * @notice Handles lease creation, fund management, and release/refund logic
 */
contract LeaseEscrow is ReentrancyGuard {
    using Domain for Domain.Policy;

    // Dependencies
    PolicyRegistry public immutable policyRegistry;
    EligibilityGate public immutable eligibilityGate;

    // Lease structure
    struct Lease {
        address tenant;
        uint256 amount;
        uint64 deadline;
        bool active;
    }

    // Storage
    mapping(uint256 => mapping(address => Lease)) public leases;

    // Events
    event LeaseStarted(
        uint256 indexed policyId,
        address indexed tenant,
        uint256 amount,
        uint64 deadline
    );

    event LeaseReleased(
        uint256 indexed policyId,
        address indexed tenant,
        uint256 amount
    );

    event LeaseRefunded(
        uint256 indexed policyId,
        address indexed tenant,
        uint256 amount
    );

    /**
     * @dev Constructor
     * @param _policyRegistry Address of the PolicyRegistry contract
     * @param _eligibilityGate Address of the EligibilityGate contract
     */
    constructor(address _policyRegistry, address _eligibilityGate) {
        require(_policyRegistry != address(0), "LeaseEscrow: Invalid policy registry");
        require(_eligibilityGate != address(0), "LeaseEscrow: Invalid eligibility gate");
        
        policyRegistry = PolicyRegistry(_policyRegistry);
        eligibilityGate = EligibilityGate(_eligibilityGate);
    }

    /**
     * @dev Start a lease for an eligible tenant
     * @param policyId The policy ID to start lease for
     * @notice Requires tenant to be eligible and payment to match policy rent
     * @notice Payment must equal policy.rentWei (exact amount required)
     */
    function startLease(uint256 policyId) external payable nonReentrant {
        // Check eligibility
        require(
            eligibilityGate.isEligible(msg.sender, policyId),
            "LeaseEscrow: Not eligible for policy"
        );

        // Get policy from registry
        Domain.Policy memory policy = policyRegistry.getPolicy(policyId);
        
        // Check policy is still active (deadline not passed)
        require(
            policy.deadline >= block.timestamp,
            "LeaseEscrow: Policy deadline passed"
        );

        // Check payment amount matches policy rent exactly
        require(
            msg.value == policy.rentWei,
            "LeaseEscrow: Incorrect payment amount"
        );

        // Check no existing active lease for this tenant and policy
        require(
            !leases[policyId][msg.sender].active,
            "LeaseEscrow: Lease already exists"
        );

        // Create lease
        leases[policyId][msg.sender] = Lease({
            tenant: msg.sender,
            amount: msg.value,
            deadline: policy.deadline,
            active: true
        });

        // Emit event
        emit LeaseStarted(policyId, msg.sender, msg.value, policy.deadline);
    }

    /**
     * @dev Owner confirms lease completion and releases funds
     * @param policyId The policy ID
     * @param tenant The tenant address
     * @notice Only callable by policy owner
     * @notice Transfers funds to owner and deactivates lease
     */
    function ownerConfirm(uint256 policyId, address tenant) external nonReentrant {
        // Get policy to verify caller is owner
        Domain.Policy memory policy = policyRegistry.getPolicy(policyId);
        require(
            policy.owner == msg.sender,
            "LeaseEscrow: Not policy owner"
        );

        // Get lease
        Lease storage lease = leases[policyId][tenant];
        require(
            lease.active,
            "LeaseEscrow: Lease not active"
        );

        // Deactivate lease first (checks-effects-interactions pattern)
        lease.active = false;
        uint256 amount = lease.amount;

        // Transfer funds to owner
        (bool success, ) = payable(policy.owner).call{value: amount}("");
        require(success, "LeaseEscrow: Transfer failed");

        // Emit event
        emit LeaseReleased(policyId, tenant, amount);
    }

    /**
     * @dev Tenant requests refund after deadline
     * @param policyId The policy ID
     * @notice Only callable by tenant after deadline has passed
     * @notice Refunds tenant if lease is still active
     */
    function timeoutRefund(uint256 policyId) external nonReentrant {
        // Get lease
        Lease storage lease = leases[policyId][msg.sender];
        require(
            lease.active,
            "LeaseEscrow: Lease not active"
        );

        // Check deadline has passed
        require(
            block.timestamp > lease.deadline,
            "LeaseEscrow: Deadline not yet passed"
        );

        // Deactivate lease first (checks-effects-interactions pattern)
        lease.active = false;
        uint256 amount = lease.amount;

        // Transfer funds back to tenant
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "LeaseEscrow: Refund failed");

        // Emit event
        emit LeaseRefunded(policyId, msg.sender, amount);
    }

    /**
     * @dev Get lease information
     * @param policyId The policy ID
     * @param tenant The tenant address
     * @return lease The lease struct
     */
    function getLease(uint256 policyId, address tenant) external view returns (Lease memory) {
        return leases[policyId][tenant];
    }

    /**
     * @dev Check if a lease exists and is active
     * @param policyId The policy ID
     * @param tenant The tenant address
     * @return exists True if lease exists and is active
     */
    function isLeaseActive(uint256 policyId, address tenant) external view returns (bool) {
        return leases[policyId][tenant].active;
    }

    /**
     * @dev Get the policy registry address
     * @return registry The policy registry contract address
     */
    function getPolicyRegistry() external view returns (address) {
        return address(policyRegistry);
    }

    /**
     * @dev Get the eligibility gate address
     * @return gate The eligibility gate contract address
     */
    function getEligibilityGate() external view returns (address) {
        return address(eligibilityGate);
    }

    /**
     * @dev Get contract balance
     * @return balance The contract's ETH balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Receive function to accept ETH
    receive() external payable {}
}
