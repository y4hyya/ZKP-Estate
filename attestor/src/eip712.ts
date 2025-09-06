import { ethers } from "ethers";

/**
 * EIP-712 Domain and Types for ZKP-Estate TLS Attestation
 */

export interface Attestation {
  wallet: string;
  policyId: number;
  expiry: number;
  nullifier: string;
  passBitmask: number;
}

export const EIP712_DOMAIN = {
  name: "ZKPRent-TLS",
  version: "1",
};

export const EIP712_TYPES = {
  Attestation: [
    { name: "wallet", type: "address" },
    { name: "policyId", type: "uint256" },
    { name: "expiry", type: "uint64" },
    { name: "nullifier", type: "bytes32" },
    { name: "passBitmask", type: "uint8" },
  ],
};

/**
 * Create EIP-712 domain with chain ID and verifying contract
 */
export function createDomain(chainId: number, verifyingContract: string) {
  return {
    ...EIP712_DOMAIN,
    chainId,
    verifyingContract,
  };
}

/**
 * Generate nullifier from wallet, policyId, and nonce
 */
export function generateNullifier(wallet: string, policyId: number, nonce: string): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "string"],
    [wallet, policyId, nonce]
  );
  return ethers.keccak256(encoded);
}

/**
 * Calculate pass bitmask from verification results
 */
export function calculatePassBitmask(
  agePassed: boolean,
  incomePassed: boolean,
  cleanRecordPassed: boolean
): number {
  let bitmask = 0;
  if (agePassed) bitmask |= 0x01;        // bit0: age
  if (incomePassed) bitmask |= 0x02;     // bit1: income
  if (cleanRecordPassed) bitmask |= 0x04; // bit2: clean record
  return bitmask;
}

/**
 * Check if all verification checks passed
 */
export function allChecksPassed(bitmask: number): boolean {
  return (bitmask & 0x07) === 0x07; // 0b111
}
