// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IVerifier.sol";

/**
 * @title VerifierStub
 * @dev Mock verifier implementation for demo purposes
 * @notice WARNING: This is a stub implementation that always returns true.
 * @notice DO NOT USE IN PRODUCTION - This is for demonstration only.
 * @notice In production, replace this with the actual Noir circuit verifier.
 */
contract VerifierStub is IVerifier {
    // Events
    event ProofVerified(bytes proof, uint256[] publicInputs, bool result);
    event WarningEmitted(string message);

    /**
     * @dev Constructor that emits a warning about demo usage
     */
    constructor() {
        emit WarningEmitted("WARNING: VerifierStub is for demo only - DO NOT USE IN PRODUCTION");
    }

    /**
     * @dev Verify a ZK proof (stub implementation)
     * @return isValid Always returns true for demo purposes
     * @notice WARNING: This always returns true regardless of proof validity
     * @notice In production, this would verify against the actual Noir circuit
     * @notice Parameters are ignored in this stub implementation
     */
    function verify(
        bytes calldata /* proof */,
        uint256[] calldata /* publicInputs */
    ) external pure override returns (bool) {
        // WARNING: This is a demo stub that always returns true
        // In production, this would:
        // 1. Validate the proof format
        // 2. Check public inputs against circuit constraints
        // 3. Verify the proof against the circuit's verification key
        // 4. Return the actual verification result
        
        // For demo purposes, we emit an event to show the stub was called
        // Note: We can't emit events in view functions, so this is just for documentation
        
        // Always return true for demo
        return true;
    }

    /**
     * @dev Get a warning message about this stub implementation
     * @return warning The warning message
     */
    function getWarning() external pure returns (string memory) {
        return "WARNING: VerifierStub always returns true - DO NOT USE IN PRODUCTION";
    }

    /**
     * @dev Check if this is a stub implementation
     * @return isStub Always returns true for this contract
     */
    function isStub() external pure returns (bool) {
        return true;
    }
}
