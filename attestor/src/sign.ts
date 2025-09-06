import { ethers } from "ethers";
import { Attestation, createDomain, EIP712_TYPES } from "./eip712";

/**
 * EIP-712 Signature Module
 */

export interface AttestationResponse {
  attestation: Attestation;
  signature: string;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
}

/**
 * Sign an attestation using EIP-712
 */
export async function signAttestation(
  attestation: Attestation,
  wallet: ethers.Wallet,
  chainId: number,
  verifyingContract: string
): Promise<AttestationResponse> {
  const domain = createDomain(chainId, verifyingContract);
  
  console.log("🔐 Signing attestation:", {
    wallet: attestation.wallet,
    policyId: attestation.policyId,
    expiry: new Date(attestation.expiry * 1000).toISOString(),
    nullifier: attestation.nullifier,
    passBitmask: `0x${attestation.passBitmask.toString(16)}`,
  });

  try {
    const signature = await wallet.signTypedData(domain, EIP712_TYPES, attestation);
    
    console.log("✅ Attestation signed successfully");
    console.log("   Signature:", signature);
    console.log("   Signer:", wallet.address);
    
    return {
      attestation,
      signature,
      domain,
    };
  } catch (error) {
    console.error("❌ Failed to sign attestation:", error);
    throw new Error(`Failed to sign attestation: ${error}`);
  }
}

/**
 * Verify a signature (for testing purposes)
 */
export async function verifySignature(
  attestation: Attestation,
  signature: string,
  expectedSigner: string,
  chainId: number,
  verifyingContract: string
): Promise<boolean> {
  try {
    const domain = createDomain(chainId, verifyingContract);
    const recoveredAddress = ethers.verifyTypedData(domain, EIP712_TYPES, attestation, signature);
    
    console.log("🔍 Signature verification:", {
      expected: expectedSigner,
      recovered: recoveredAddress,
      valid: recoveredAddress.toLowerCase() === expectedSigner.toLowerCase(),
    });
    
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error("❌ Signature verification failed:", error);
    return false;
  }
}
