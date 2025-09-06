import { ethers } from 'ethers';
import { Attestation, EIP712Domain, ATTESTATION_TYPES } from './eip712.js';

export class AttestorSigner {
  private wallet: ethers.Wallet;

  constructor(privateKey: string) {
    this.wallet = new ethers.Wallet(privateKey);
  }

  getAddress(): string {
    return this.wallet.address;
  }

  async signAttestation(
    attestation: Attestation,
    domain: EIP712Domain
  ): Promise<string> {
    try {
      const signature = await this.wallet.signTypedData(
        domain,
        ATTESTATION_TYPES,
        attestation
      );
      return signature;
    } catch (error) {
      throw new Error(`Failed to sign attestation: ${error}`);
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      return await this.wallet.signMessage(message);
    } catch (error) {
      throw new Error(`Failed to sign message: ${error}`);
    }
  }
}