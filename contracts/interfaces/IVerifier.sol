// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IVerifier
 * @dev Interface for zero-knowledge proof verification
 * @notice This interface defines the standard for ZK proof verifiers in the ZKP-Estate protocol
 */
interface IVerifier {
    /**
     * @dev Verify a zero-knowledge proof
     * @param proof The ZK proof to verify
     * @param publicInputs The public inputs to the circuit
     * @return isValid True if the proof is valid, false otherwise
     * @notice This function should verify the proof against the circuit's verification key
     */
    function verify(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view returns (bool);
}
