// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./VerifierStub.sol";

/**
 * @title ZkRent
 * @dev Main contract for zero-knowledge rental protocol
 */
contract ZkRent is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;

    // Events
    event PolicyCreated(uint256 indexed policyId, address indexed landlord, uint256 rentAmount, uint256 deposit);
    event LeaseStarted(uint256 indexed policyId, address indexed tenant, uint256 leaseId);
    event LeaseConfirmed(uint256 indexed leaseId, address indexed tenant);
    event RefundProcessed(uint256 indexed leaseId, address indexed tenant, uint256 amount);
    event ProofSubmitted(uint256 indexed leaseId, bytes32 proofHash);

    // Structs
    struct RentalPolicy {
        address landlord;
        uint256 rentAmount;
        uint256 deposit;
        uint256 duration; // in days
        bool isActive;
        string propertyDetails; // IPFS hash or similar
    }

    struct Lease {
        uint256 policyId;
        address tenant;
        uint256 startTime;
        uint256 endTime;
        uint256 totalRent;
        uint256 deposit;
        bool isActive;
        bool isConfirmed;
        bytes32 proofHash;
    }

    // State variables
    Counters.Counter private _policyIds;
    Counters.Counter private _leaseIds;
    
    mapping(uint256 => RentalPolicy) public policies;
    mapping(uint256 => Lease) public leases;
    mapping(address => uint256[]) public userPolicies;
    mapping(address => uint256[]) public userLeases;
    
    VerifierStub public verifier;
    uint256 public platformFee = 250; // 2.5% in basis points
    uint256 public constant BASIS_POINTS = 10000;

    constructor() Ownable(msg.sender) {
        verifier = new VerifierStub();
    }

    /**
     * @dev Create a new rental policy
     */
    function createPolicy(
        uint256 _rentAmount,
        uint256 _deposit,
        uint256 _duration,
        string calldata _propertyDetails
    ) external returns (uint256) {
        require(_rentAmount > 0, "Rent amount must be positive");
        require(_deposit > 0, "Deposit must be positive");
        require(_duration > 0, "Duration must be positive");

        _policyIds.increment();
        uint256 policyId = _policyIds.current();

        policies[policyId] = RentalPolicy({
            landlord: msg.sender,
            rentAmount: _rentAmount,
            deposit: _deposit,
            duration: _duration,
            isActive: true,
            propertyDetails: _propertyDetails
        });

        userPolicies[msg.sender].push(policyId);

        emit PolicyCreated(policyId, msg.sender, _rentAmount, _deposit);
        return policyId;
    }

    /**
     * @dev Start a lease with ZK proof submission
     */
    function startLease(
        uint256 _policyId,
        bytes32 _proofHash
    ) external payable nonReentrant returns (uint256) {
        RentalPolicy storage policy = policies[_policyId];
        require(policy.isActive, "Policy not active");
        require(policy.landlord != msg.sender, "Cannot rent own property");

        uint256 totalAmount = policy.rentAmount + policy.deposit;
        require(msg.value >= totalAmount, "Insufficient payment");

        _leaseIds.increment();
        uint256 leaseId = _leaseIds.current();

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (policy.duration * 1 days);

        leases[leaseId] = Lease({
            policyId: _policyId,
            tenant: msg.sender,
            startTime: startTime,
            endTime: endTime,
            totalRent: policy.rentAmount,
            deposit: policy.deposit,
            isActive: true,
            isConfirmed: false,
            proofHash: _proofHash
        });

        userLeases[msg.sender].push(leaseId);

        // Transfer rent to landlord (minus platform fee)
        uint256 platformFeeAmount = (policy.rentAmount * platformFee) / BASIS_POINTS;
        uint256 landlordAmount = policy.rentAmount - platformFeeAmount;
        
        payable(policy.landlord).transfer(landlordAmount);
        payable(owner()).transfer(platformFeeAmount);

        emit LeaseStarted(_policyId, msg.sender, leaseId);
        emit ProofSubmitted(leaseId, _proofHash);

        return leaseId;
    }

    /**
     * @dev Confirm lease completion and process deposit refund
     */
    function confirmLease(uint256 _leaseId) external nonReentrant {
        Lease storage lease = leases[_leaseId];
        require(lease.isActive, "Lease not active");
        require(lease.tenant == msg.sender, "Not the tenant");
        require(block.timestamp >= lease.endTime, "Lease not yet ended");
        require(!lease.isConfirmed, "Lease already confirmed");

        lease.isConfirmed = true;
        lease.isActive = false;

        // Refund deposit to tenant
        payable(lease.tenant).transfer(lease.deposit);

        emit LeaseConfirmed(_leaseId, msg.sender);
    }

    /**
     * @dev Process refund for early termination (landlord only)
     */
    function processRefund(uint256 _leaseId) external nonReentrant {
        Lease storage lease = leases[_leaseId];
        require(lease.isActive, "Lease not active");
        require(policies[lease.policyId].landlord == msg.sender, "Not the landlord");
        require(block.timestamp < lease.endTime, "Lease already ended");

        lease.isActive = false;

        // Calculate partial refund based on time remaining
        uint256 timeRemaining = lease.endTime - block.timestamp;
        uint256 totalDuration = lease.endTime - lease.startTime;
        uint256 refundAmount = (lease.deposit * timeRemaining) / totalDuration;

        payable(lease.tenant).transfer(refundAmount);

        emit RefundProcessed(_leaseId, lease.tenant, refundAmount);
    }

    /**
     * @dev Verify ZK proof (stub implementation for demo)
     */
    function verifyProof(
        bytes32 _proofHash,
        uint256[] calldata _publicInputs
    ) external view returns (bool) {
        // In production, this would call the actual ZK verifier
        return verifier.verifyProof(_proofHash, _publicInputs);
    }

    /**
     * @dev Get user's policies
     */
    function getUserPolicies(address _user) external view returns (uint256[] memory) {
        return userPolicies[_user];
    }

    /**
     * @dev Get user's leases
     */
    function getUserLeases(address _user) external view returns (uint256[] memory) {
        return userLeases[_user];
    }

    /**
     * @dev Update platform fee (owner only)
     */
    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee cannot exceed 10%");
        platformFee = _newFee;
    }

    /**
     * @dev Emergency withdrawal (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Receive function to accept ETH
    receive() external payable {}
}
