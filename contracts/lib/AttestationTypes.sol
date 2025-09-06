// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AttestationTypes
 * @dev Library containing attestation-related types and constants
 */
library AttestationTypes {
    /**
     * @dev Attestation struct for TLS-based eligibility verification
     * @param wallet The tenant's wallet address
     * @param policyId The target policy ID
     * @param expiry Unix timestamp when attestation expires
     * @param nullifier Unique identifier to prevent replay attacks
     * @param passBitmask Bitmask indicating which checks passed:
     *                    bit0: age check passed
     *                    bit1: income check passed  
     *                    bit2: clean record check passed
     *                    0b111 = all checks passed
     */
    struct Attestation {
        address wallet;        // tenant wallet
        uint256 policyId;      // target policy
        uint64  expiry;        // unix time, validity
        bytes32 nullifier;     // replay guard
        uint8   passBitmask;   // bit0: age, bit1: income, bit2: cleanRec; 0b111 = passed
    }

    /**
     * @dev Bitmask constants for passBitmask
     */
    uint8 public constant AGE_PASSED = 0x01;        // bit0
    uint8 public constant INCOME_PASSED = 0x02;     // bit1
    uint8 public constant CLEAN_RECORD_PASSED = 0x04; // bit2
    uint8 public constant ALL_CHECKS_PASSED = 0x07;   // 0b111
}
