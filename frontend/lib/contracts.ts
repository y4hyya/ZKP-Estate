// Contract addresses and ABIs
export const CONTRACT_ADDRESSES = {
  ZkRent: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  VerifierStub: '0x0000000000000000000000000000000000000000', // Will be set after deployment
  PolicyRegistry: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  EligibilityGateTLS: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  LeaseEscrow: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  Attestor: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
};

export const CHAIN_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111'),
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/test',
};

// Contract ABIs (simplified for demo)
export const ZK_RENT_ABI = [
  'function createPolicy(uint256 _rentAmount, uint256 _deposit, uint256 _duration, string calldata _propertyDetails) external returns (uint256)',
  'function startLease(uint256 _policyId, bytes32 _proofHash) external payable returns (uint256)',
  'function confirmLease(uint256 _leaseId) external',
  'function processRefund(uint256 _leaseId) external',
  'function verifyProof(bytes32 _proofHash, uint256[] calldata _publicInputs) external view returns (bool)',
  'function policies(uint256) external view returns (address, uint256, uint256, uint256, bool, string)',
  'function leases(uint256) external view returns (uint256, address, uint256, uint256, uint256, uint256, bool, bool, bytes32)',
  'function getUserPolicies(address) external view returns (uint256[])',
  'function getUserLeases(address) external view returns (uint256[])',
  'event PolicyCreated(uint256 indexed policyId, address indexed landlord, uint256 rentAmount, uint256 deposit)',
  'event LeaseStarted(uint256 indexed policyId, address indexed tenant, uint256 leaseId)',
  'event LeaseConfirmed(uint256 indexed leaseId, address indexed tenant)',
  'event RefundProcessed(uint256 indexed leaseId, address indexed tenant, uint256 amount)',
];

export const VERIFIER_STUB_ABI = [
  'function verifyProof(bytes32 _proofHash, uint256[] calldata _publicInputs) external returns (bool)',
  'function isProofVerified(bytes32 _proofHash) external view returns (bool)',
  'function getPublicInputSize() external pure returns (uint256)',
  'event ProofVerified(bytes32 indexed proofHash, bool verified)',
];

// TLS Contract ABIs
export const ELIGIBILITY_GATE_TLS_ABI = [
  'function submitTLS((address wallet, uint256 policyId, uint64 expiry, bytes32 nullifier, uint8 passBitmask) attestation, bytes signature) external',
  'function isEligible(address who, uint256 policyId) external view returns (bool)',
  'function attestor() external view returns (address)',
  'function nullifierUsed(bytes32) external view returns (bool)',
  'event Eligible(address indexed tenant, uint256 indexed policyId, bytes32 indexed nullifier)',
];

export const LEASE_ESCROW_ABI = [
  'function startLease(uint256 policyId) external payable',
  'function ownerConfirm(uint256 policyId, address tenant) external',
  'function timeoutRefund(uint256 policyId) external',
  'function getLease(uint256 policyId, address tenant) external view returns ((address tenant, uint256 amount, uint64 deadline, bool active))',
  'function isLeaseActive(uint256 policyId, address tenant) external view returns (bool)',
  'event LeaseStarted(uint256 indexed policyId, address indexed tenant, uint256 amount, uint64 deadline)',
  'event LeaseReleased(uint256 indexed policyId, address indexed tenant, uint256 amount)',
  'event LeaseRefunded(uint256 indexed policyId, address indexed tenant, uint256 amount)',
];

export const POLICY_REGISTRY_ABI = [
  'function getPolicy(uint256 policyId) external view returns ((uint256 minAge, uint256 incomeMul, uint256 rentWei, bool needCleanRec, uint64 deadline, address owner))',
  'function createPolicy(uint256 minAge, uint256 incomeMul, uint256 rentWei, bool needCleanRec, uint64 deadline) external returns (uint256)',
  'event PolicyCreated(uint256 indexed policyId, address indexed owner, uint256 minAge, uint256 incomeMul, uint256 rentWei, bool needCleanRec, uint64 deadline)',
];

// Attestor service configuration
export const ATTESTOR_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_ATTESTOR_URL || 'http://localhost:3001',
  endpoints: {
    health: '/health',
    attest: '/attest',
    samples: '/samples',
  },
};
