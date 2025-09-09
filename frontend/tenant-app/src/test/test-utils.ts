// Test utilities for the frontend
import { ethers } from 'ethers';

// Mock window.ethereum for testing
export const mockEthereum = {
  request: async ({ method }: { method: string }) => {
    if (method === 'eth_requestAccounts') {
      return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
    }
    return [];
  },
  on: () => {},
  removeListener: () => {},
};

// Mock policy data for testing
export const mockPolicyData = {
  minAge: 18,
  incomeMul: 3,
  rentWei: BigInt(1000),
  needCleanRec: true,
  deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
  owner: '0x1234567890123456789012345678901234567890',
  policyHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
};

// Test form data
export const testFormData = {
  age: 25,
  monthlyIncome: 5.0,
  criminalRecord: false,
  policyId: 1,
};

// Utility functions for testing
export const addressToBigInt = (address: string): string => {
  const hex = address.slice(-8);
  return BigInt('0x' + hex).toString();
};

export const generateSalt = (): string => {
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return BigInt('0x' + hex).toString();
};

// Test TLSNotary proof generation
export const generateTestTLSNotaryProof = (formData: any, policyData: any, walletAddress: string) => {
  return {
    proof: "0x" + "0".repeat(128), // Mock TLSNotary proof
    attestation: {
      age: formData.age,
      income: formData.monthlyIncome,
      cleanRecord: !formData.criminalRecord,
      timestamp: Date.now(),
      walletAddress: walletAddress,
      policyId: formData.policyId
    }
  };
};