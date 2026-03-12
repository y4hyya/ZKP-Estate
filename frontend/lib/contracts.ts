// Contract addresses - updated after deployment via sync-addresses script
export const CONTRACT_ADDRESSES = {
  PolicyRegistry: process.env.NEXT_PUBLIC_POLICY_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
  EligibilityGateTLS: process.env.NEXT_PUBLIC_ELIGIBILITY_GATE_ADDRESS || '0x0000000000000000000000000000000000000000',
  LeaseEscrow: process.env.NEXT_PUBLIC_LEASE_ESCROW_ADDRESS || '0x0000000000000000000000000000000000000000',
  Attestor: process.env.NEXT_PUBLIC_ATTESTOR_ADDRESS || '0x0000000000000000000000000000000000000000',
};

export const CHAIN_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1337'),
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545',
};

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
  'function getPolicy(uint256 policyId) external view returns ((uint256 minAge, uint256 incomeMul, uint256 rentWei, bool needCleanRec, uint64 deadline, address owner, bytes32 policyHash))',
  'function createPolicy(uint256 minAge, uint256 incomeMul, uint256 rentWei, bool needCleanRec, uint64 deadline) external returns (uint256)',
  'function getPolicyCount() external view returns (uint256)',
  'event PolicyCreated(uint256 indexed policyId, address indexed owner, bytes32 indexed policyHash)',
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
