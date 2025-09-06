// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../LeaseEscrow.sol";

/**
 * @title MaliciousReceiver
 * @dev Mock contract to test reentrancy protection
 * @notice This contract attempts to reenter LeaseEscrow functions
 */
contract MaliciousReceiver {
    LeaseEscrow public leaseEscrow;
    bool public reentrancyAttempted = false;

    constructor(address payable _leaseEscrow) {
        leaseEscrow = LeaseEscrow(_leaseEscrow);
    }

    /**
     * @dev Receive function that attempts reentrancy
     */
    receive() external payable {
        if (!reentrancyAttempted) {
            reentrancyAttempted = true;
            // Attempt to call a function that should be protected
            // This will fail due to reentrancy guard
            try leaseEscrow.getBalance() {
                // This should not execute due to reentrancy protection
            } catch {
                // Expected to fail
            }
        }
    }

    /**
     * @dev Function to trigger reentrancy attempt
     */
    function triggerReentrancy() external {
        // This function can be called to test reentrancy protection
        leaseEscrow.getBalance();
    }
}
