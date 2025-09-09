# ZKP-Estate Tenant Frontend

A Vite+React frontend application for tenants to generate TLSNotary proofs of eligibility for rental policies.

## Features

- 🔗 **Wallet Integration**: Connect with MetaMask or other Web3 wallets
- 📋 **Policy Integration**: Fetch policy requirements from smart contracts
- 🔮 **TLSNotary Proof Generation**: Generate TLSNotary proofs for privacy-preserving verification
- 📤 **Contract Submission**: Submit proofs directly to smart contracts
- ⚠️ **Local Validation**: Validate eligibility requirements with user warnings

## Quick Start

### Prerequisites

- Node.js 18+ 
- MetaMask or compatible Web3 wallet
- Local Hardhat node running on port 8545

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Usage

1. **Connect Wallet**: Click "Connect Wallet" to connect your MetaMask
2. **Enter Information**: Fill in your age, monthly income, and policy ID
3. **Generate TLSNotary Proof**: Click "Generate TLSNotary Proof" to create a TLSNotary proof
4. **Submit to Contract**: Click "Submit to Contract" to send the proof to the smart contract

## Privacy Protection

- ✅ **No Server Communication**: All data processing happens in the browser
- ✅ **TLSNotary Verification**: TLSNotary proofs provide privacy-preserving verification
- ✅ **Wallet-Only Submission**: Only proof data is sent to the blockchain
- ✅ **No Data Logging**: Sensitive information is never logged or stored

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Web3**: Ethers.js v6
- **TLSNotary**: TLSNotary proof generation for privacy-preserving verification

### Contract Integration

The app integrates with the following smart contracts:

- **PolicyRegistry**: Fetches policy requirements
- **EligibilityGate**: Submits TLSNotary proofs for verification
- **VerifierStub**: Mock verifier for testing

### TLSNotary Proof Generation

Currently uses a mock TLSNotary proof generation system. In production, this would be replaced with:

1. Real TLSNotary service integration
2. Actual attestation verification
3. Proper proof validation using TLSNotary

## Development

### Project Structure

```
src/
├── components/
│   └── TenantProofForm.tsx    # Main form component
├── utils/
│   └── contracts.ts           # Contract interaction utilities
├── test/
│   └── test-utils.ts          # Testing utilities
└── main.tsx                   # App entry point
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_POLICY_REGISTRY_ADDRESS=0x...
VITE_ELIGIBILITY_GATE_ADDRESS=0x...
VITE_LEASE_ESCROW_ADDRESS=0x...
VITE_VERIFIER_ADDRESS=0x...
VITE_RPC_URL=http://localhost:8545
VITE_CHAIN_ID=1337
```

## Security Considerations

- Never send raw user data to external servers
- Always validate inputs locally before proof generation
- Use proper TLSNotary verification for privacy protection
- Implement proper error handling for contract interactions

## Future Enhancements

- [ ] Real TLSNotary service integration
- [ ] Multiple wallet support
- [ ] Enhanced UI/UX
- [ ] Mobile responsiveness improvements