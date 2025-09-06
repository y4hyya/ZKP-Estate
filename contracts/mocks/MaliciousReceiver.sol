// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../LeaseEscrow.sol";

/**
 * @title MaliciousReceiver
 * @dev Contract that attempts reentrancy attacks on LeaseEscrow
 * @notice This contract is used for testing reentrancy protection
 */
contract MaliciousReceiver {
    LeaseEscrow public immutable leaseEscrow;
    bool public attackAttempted = false;

    constructor(address payable _leaseEscrow) {
        leaseEscrow = LeaseEscrow(_leaseEscrow);
    }

    /**
     * @dev Fallback function that attempts reentrancy
     * @notice This function will be called when ETH is sent to this contract
     */
    receive() external payable {
        if (!attackAttempted) {
            attackAttempted = true;
            // Attempt to call back into LeaseEscrow during the transfer
            // This should be prevented by ReentrancyGuard
            leaseEscrow.triggerReentrancy();
        }
    }

    /**
     * @dev Function to trigger reentrancy attack
     * @notice This function is called by the test to initiate the attack
     */
    function triggerReentrancy() external {
        // This function is called by the malicious contract during receive()
        // The actual reentrancy attempt happens in the receive() function
    }
}