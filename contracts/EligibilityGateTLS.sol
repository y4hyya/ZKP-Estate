// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IEligibility.sol";
import "./lib/AttestationTypes.sol";

/**
 * @title EligibilityGateTLS
 * @dev TLS-based eligibility verification system using EIP-712 signatures
 * @notice Alternative to ZK-based eligibility verification using trusted attestor signatures
 */
contract EligibilityGateTLS is EIP712, Ownable, IEligibility {
    using ECDSA for bytes32;

    // EIP-712 Domain
    string private constant DOMAIN_NAME = "ZKPRent-TLS";
    string private constant DOMAIN_VERSION = "1";
    
    // EIP-712 Type Hash for Attestation struct
    bytes32 private constant ATTESTATION_TYPEHASH = keccak256(
        "Attestation(address wallet,uint256 policyId,uint64 expiry,bytes32 nullifier,uint8 passBitmask)"
    );

    // State variables
    address public attestor; // trusted signer
    mapping(bytes32 => bool) public nullifierUsed;
    mapping(uint256 => mapping(address => bool)) public eligible;

    // Events
    event Eligible(address indexed tenant, uint256 indexed policyId, bytes32 indexed nullifier);
    event AttestorUpdated(address indexed oldAttestor, address indexed newAttestor);

    /**
     * @dev Constructor
     * @param _attestor The trusted attestor address
     * @param _owner The owner of the contract
     */
    constructor(address _attestor, address _owner) 
        EIP712(DOMAIN_NAME, DOMAIN_VERSION) 
        Ownable(_owner)
    {
        require(_attestor != address(0), "EligibilityGateTLS: Invalid attestor");
        attestor = _attestor;
    }

    /**
     * @dev Set a new attestor address
     * @param _newAttestor The new attestor address
     */
    function setAttestor(address _newAttestor) external onlyOwner {
        require(_newAttestor != address(0), "EligibilityGateTLS: Invalid attestor");
        address oldAttestor = attestor;
        attestor = _newAttestor;
        emit AttestorUpdated(oldAttestor, _newAttestor);
    }

    /**
     * @dev Submit a TLS attestation for eligibility verification
     * @param a The attestation struct
     * @param sig The EIP-712 signature from the attestor
     */
    function submitTLS(AttestationTypes.Attestation calldata a, bytes calldata sig) external {
        // Check attestation hasn't expired
        require(block.timestamp <= a.expiry, "EligibilityGateTLS: Attestation expired");
        
        // Verify signature comes from trusted attestor
        require(_recoverSigner(a, sig) == attestor, "EligibilityGateTLS: Invalid signature");
        
        // Verify all checks passed (0b111 = all bits set)
        require((a.passBitmask & 0x07) == 0x07, "EligibilityGateTLS: Not all checks passed");
        
        // Check nullifier hasn't been used
        require(!nullifierUsed[a.nullifier], "EligibilityGateTLS: Nullifier already used");
        
        // Verify the submitter is the attested wallet
        require(a.wallet == msg.sender, "EligibilityGateTLS: Wallet mismatch");
        
        // Mark nullifier as used
        nullifierUsed[a.nullifier] = true;
        
        // Mark as eligible
        eligible[a.policyId][msg.sender] = true;
        
        // Emit event
        emit Eligible(msg.sender, a.policyId, a.nullifier);
    }

    /**
     * @dev Check if an address is eligible for a specific policy
     * @param who The address to check eligibility for
     * @param policyId The policy ID to check against
     * @return true if eligible, false otherwise
     */
    function isEligible(address who, uint256 policyId) external view override returns (bool) {
        return eligible[policyId][who];
    }

    /**
     * @dev Recover the signer from an attestation using EIP-712
     * @param a The attestation struct
     * @param sig The signature to recover from
     * @return The recovered signer address
     */
    function _recoverSigner(AttestationTypes.Attestation calldata a, bytes calldata sig) internal view returns (address) {
        bytes32 structHash = keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                a.wallet,
                a.policyId,
                a.expiry,
                a.nullifier,
                a.passBitmask
            )
        );
        
        bytes32 hash = _hashTypedDataV4(structHash);
        return hash.recover(sig);
    }
}
