import { ethers } from 'ethers';

// Contract addresses (in production, these would come from environment variables)
const CONTRACT_ADDRESSES = {
  PolicyRegistry: process.env.VITE_POLICY_REGISTRY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  EligibilityGate: process.env.VITE_ELIGIBILITY_GATE_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  LeaseEscrow: process.env.VITE_LEASE_ESCROW_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  Verifier: process.env.VITE_VERIFIER_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
};

// Mock ABI for testing (in production, these would be imported from artifacts)
const ELIGIBILITY_GATE_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "policyId", "type": "uint256"},
      {"internalType": "bytes", "name": "proof", "type": "bytes"},
      {"internalType": "uint256[]", "name": "publicInputs", "type": "uint256[]"}
    ],
    "name": "submitZk",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "who", "type": "address"},
      {"internalType": "uint256", "name": "policyId", "type": "uint256"}
    ],
    "name": "isEligible",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const POLICY_REGISTRY_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "policyId", "type": "uint256"}],
    "name": "getPolicy",
    "outputs": [
      {"internalType": "uint256", "name": "minAge", "type": "uint256"},
      {"internalType": "uint256", "name": "incomeMul", "type": "uint256"},
      {"internalType": "uint256", "name": "rentWei", "type": "uint256"},
      {"internalType": "bool", "name": "needCleanRec", "type": "bool"},
      {"internalType": "uint64", "name": "deadline", "type": "uint64"},
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "bytes32", "name": "policyHash", "type": "bytes32"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export class ContractService {
  private provider: ethers.BrowserProvider;
  private signer: ethers.JsonRpcSigner | null = null;
  private eligibilityGate: ethers.Contract;
  private policyRegistry: ethers.Contract;

  constructor() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask not installed');
    }
    
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.eligibilityGate = new ethers.Contract(
      CONTRACT_ADDRESSES.EligibilityGate,
      ELIGIBILITY_GATE_ABI,
      this.provider
    );
    this.policyRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.PolicyRegistry,
      POLICY_REGISTRY_ABI,
      this.provider
    );
  }

  async connectWallet(): Promise<string> {
    try {
      const accounts = await this.provider.request({ method: 'eth_requestAccounts' });
      this.signer = await this.provider.getSigner();
      
      // Update contracts with signer
      this.eligibilityGate = this.eligibilityGate.connect(this.signer);
      this.policyRegistry = this.policyRegistry.connect(this.signer);
      
      return accounts[0];
    } catch (error) {
      throw new Error('Failed to connect wallet');
    }
  }

  async getPolicy(policyId: number) {
    try {
      const policy = await this.policyRegistry.getPolicy(policyId);
      return {
        minAge: Number(policy.minAge),
        incomeMul: Number(policy.incomeMul),
        rentWei: policy.rentWei,
        needCleanRec: policy.needCleanRec,
        deadline: Number(policy.deadline),
        owner: policy.owner,
        policyHash: policy.policyHash,
      };
    } catch (error) {
      throw new Error(`Failed to fetch policy ${policyId}`);
    }
  }

  async submitZkProof(policyId: number, proof: string, publicInputs: string[]): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      // Convert proof from hex string to bytes
      const proofBytes = ethers.getBytes(proof);
      
      // Convert public inputs to BigInt array
      const publicInputsBigInt = publicInputs.map(input => BigInt(input));
      
      const tx = await this.eligibilityGate.submitZk(policyId, proofBytes, publicInputsBigInt);
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      throw new Error('Failed to submit proof to contract');
    }
  }

  async checkEligibility(address: string, policyId: number): Promise<boolean> {
    try {
      return await this.eligibilityGate.isEligible(address, policyId);
    } catch (error) {
      throw new Error('Failed to check eligibility');
    }
  }
}

export { CONTRACT_ADDRESSES };
