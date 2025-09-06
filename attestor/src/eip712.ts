import { ethers } from 'ethers';

export interface Attestation {
  wallet: string;
  policyId: number;
  expiry: number;
  nullifier: string;
  passBitmask: number;
}

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export interface EIP712Types {
  [key: string]: Array<{
    name: string;
    type: string;
  }>;
}

export const ATTESTATION_TYPES: EIP712Types = {
  Attestation: [
    { name: 'wallet', type: 'address' },
    { name: 'policyId', type: 'uint256' },
    { name: 'expiry', type: 'uint64' },
    { name: 'nullifier', type: 'bytes32' },
    { name: 'passBitmask', type: 'uint8' }
  ]
};

export function createEIP712Domain(
  chainId: number,
  verifyingContract: string
): EIP712Domain {
  return {
    name: 'ZKPRent-TLS',
    version: '1',
    chainId,
    verifyingContract
  };
}

export function getAttestationTypeHash(): string {
  return ethers.TypedDataEncoder.hashStruct(
    'Attestation',
    ATTESTATION_TYPES,
    {
      wallet: ethers.ZeroAddress,
      policyId: 0,
      expiry: 0,
      nullifier: ethers.ZeroHash,
      passBitmask: 0
    }
  );
}