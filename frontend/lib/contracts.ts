// Contract addresses and ABIs
export const CONTRACT_ADDRESSES = {
  ZkRent: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  VerifierStub: '0x0000000000000000000000000000000000000000', // Will be set after deployment
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
