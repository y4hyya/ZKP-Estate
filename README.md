# ZKP-Estate: Zero-Knowledge Rent Protocol

A monorepo for a zk-Rent MVP supporting two verification paths: Noir ZK circuits for privacy-preserving rental agreements and TLSNotary attestations for faster MVP development.

## Quickstart

### Prerequisites

- Node.js 20+ 
- pnpm (recommended) or npm
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ZKP-Estate

# Install dependencies
pnpm install
# or
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Configure your environment variables:
   - `PRIVATE_KEY`: Your wallet private key
   - `RPC_URL`: Ethereum RPC endpoint
   - `ETHERSCAN_API_KEY`: For contract verification (optional)

### Development

```bash
# Start local Hardhat node
pnpm dev:node

# In another terminal, deploy contracts
pnpm dev:deploy

# Run tests
pnpm test

# Build contracts
pnpm build

# Lint and format
pnpm lint
pnpm format
```

### ZK Circuits

```bash
# Build Noir circuits
pnpm circuits:build

# Generate proof with sample input
pnpm circuits:prove
```

### Scripts

#### Path A (Noir ZK)
- `pnpm scripts:deploy` - Deploy contracts
- `pnpm scripts:createPolicy` - Create rental policy
- `pnpm scripts:prove` - Generate ZK proof
- `pnpm scripts:submitZk` - Submit ZK proof to contract
- `pnpm scripts:startLease` - Start rental lease
- `pnpm scripts:confirm` - Confirm rental completion
- `pnpm scripts:refund` - Process refund

#### Path B (TLSNotary)
- `pnpm scripts:deploy` - Deploy contracts (TLS mode)
- `pnpm scripts:createPolicy` - Create rental policy
- `pnpm scripts:submitTLS` - Submit TLS attestation
- `pnpm scripts:startLease` - Start rental lease
- `pnpm scripts:ownerConfirm` - Owner confirms lease
- `pnpm scripts:timeoutRefund` - Tenant requests refund

### Quick Start: TLSNotary Path

```bash
# 1. Start local blockchain
npx hardhat node

# 2. Deploy contracts (TLS mode)
npx hardhat run scripts/deploy-complete.cjs --network localhost

# 3. Start attestor service
cd attestor && npm run dev

# 4. Start frontend
cd frontend && npm run dev

# 5. Open browser to http://localhost:3000
# 6. Select "Path B (TLS)" tab
# 7. Follow the TLS flow: Get Attestation → Submit TLS → Start Lease
```

## Verification Paths

### Path A: Noir ZK Circuits
- **Privacy-First**: Maximum privacy with zero-knowledge proofs
- **Cryptographic Guarantees**: No trusted third parties required
- **Complex Setup**: Requires circuit development and proof generation
- **Higher Costs**: ZK proof verification on-chain

### Path B: TLSNotary Attestations
- **Faster MVP**: Quick development with HTTPS transcript verification
- **Lower Costs**: Simple signature verification on-chain
- **Trust Model**: Requires trusted attestor service
- **HTTPS Integration**: Leverages existing web infrastructure

📖 **Detailed Documentation**: [TLSNotary Path Guide](docs/tlsnotary.md)

## Architecture

- **Contracts**: Solidity smart contracts for rental management
- **Circuits**: Noir ZK circuits for eligibility verification (Path A)
- **Attestor**: TLSNotary verification service (Path B)
- **Frontend**: React/Next.js application with dual-path support
- **Scripts**: Deployment and interaction scripts

## Important Notes

- **Dual Paths**: Choose between Noir ZK circuits (Path A) or TLSNotary attestations (Path B)
- **Proof Generation**: ZK proofs are generated off-chain using Noir circuits (Path A)
- **Attestation Service**: TLSNotary verification requires running attestor service (Path B)
- **Demo Mode**: Includes a `VerifierStub` for demonstration purposes
- **Privacy**: Noir path provides maximum privacy; TLS path requires trusted attestor

## Project Structure

```
├── contracts/          # Solidity smart contracts
├── circuits/           # Noir ZK circuits (Path A)
│   └── eligibility/    # Rental eligibility circuit
├── attestor/           # TLSNotary attestation service (Path B)
├── scripts/            # Deployment and interaction scripts
├── test/               # Unit and integration tests
├── frontend/           # React/Next.js frontend (dual-path support)
├── docs/               # Documentation
│   └── tlsnotary.md    # TLSNotary path documentation
├── artifacts/          # Compiled contract artifacts
├── deployments/        # Deployment records
└── .github/workflows/  # CI/CD pipelines
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
