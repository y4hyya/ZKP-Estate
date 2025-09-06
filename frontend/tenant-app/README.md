# ZKP-Estate Tenant Frontend

A Vite+React frontend application for tenants to generate zero-knowledge proofs of eligibility for rental policies.

## Features

- 🔒 **Privacy-First**: All sensitive data processing happens locally on the user's device
- 🎯 **Wallet Integration**: Connect with MetaMask or other Web3 wallets
- 📋 **Policy Integration**: Fetch policy requirements from smart contracts
- 🔮 **Local Proof Generation**: Generate ZK proofs without sending data to servers
- 📤 **Contract Submission**: Submit proofs directly to smart contracts
- ⚠️ **Local Validation**: Validate eligibility requirements with user warnings

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask or compatible Web3 wallet
- Local blockchain network (Hardhat, Ganache, etc.)

### Installation

```bash
cd frontend/tenant-app
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

## Usage

1. **Connect Wallet**: Click "Connect Wallet" to connect your MetaMask
2. **Enter Information**: Fill in your age, monthly income, and policy ID
3. **Generate Proof**: Click "Generate Proof" to create a ZK proof locally
4. **Submit to Contract**: Click "Submit to Contract" to send the proof to the smart contract

## Privacy Protection

- ✅ **No Server Communication**: All data processing happens in the browser
- ✅ **Local Proof Generation**: ZK proofs are generated locally using WASM
- ✅ **Wallet-Only Submission**: Only proof data is sent to the blockchain
- ✅ **No Data Logging**: Sensitive information is never logged or stored

## Technical Details

### Architecture

- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS
- **Web3**: Ethers.js v6
- **ZK Proofs**: Mock implementation (ready for Noir WASM integration)

### Contract Integration

The frontend integrates with the following smart contracts:

- **PolicyRegistry**: Fetches policy requirements
- **EligibilityGate**: Submits ZK proofs for verification
- **VerifierStub**: Mock verifier for testing

### Proof Generation

Currently uses a mock proof generation system. In production, this would be replaced with:

1. Noir WASM integration for local proof generation
2. Real circuit compilation and execution
3. Proper nullifier computation using Poseidon hash

## Environment Variables

Create a `.env.local` file with:

```env
VITE_RPC_URL=http://localhost:8545
VITE_POLICY_REGISTRY_ADDRESS=0x...
VITE_ELIGIBILITY_GATE_ADDRESS=0x...
```

## Development Notes

- The application works offline once loaded
- Policy data is fetched from smart contracts when available
- Falls back to mock data if contract calls fail
- All sensitive data validation happens locally

## Security Considerations

- Never send raw user data to external servers
- Always validate inputs locally before proof generation
- Use proper nullifier generation for replay protection
- Implement proper error handling for contract interactions

## Future Enhancements

- [ ] Real Noir WASM integration
- [ ] Poseidon hash implementation
- [ ] Multiple wallet support
- [ ] Policy browsing interface
- [ ] Proof history and management
- [ ] Mobile-responsive design improvements