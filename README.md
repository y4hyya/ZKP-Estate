# ZKP-Estate: Zero-Knowledge Rent Protocol

A monorepo for a zk-Rent MVP using Noir ZK circuits for privacy-preserving rental agreements.

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

- `pnpm scripts:deploy` - Deploy contracts
- `pnpm scripts:createPolicy` - Create rental policy
- `pnpm scripts:prove` - Generate ZK proof
- `pnpm scripts:submitZk` - Submit ZK proof to contract
- `pnpm scripts:startLease` - Start rental lease
- `pnpm scripts:confirm` - Confirm rental completion
- `pnpm scripts:refund` - Process refund

## Architecture

- **Contracts**: Solidity smart contracts for rental management
- **Circuits**: Noir ZK circuits for eligibility verification
- **Frontend**: React/Next.js application
- **Scripts**: Deployment and interaction scripts

## Important Notes

- **Proof Generation**: ZK proofs are generated off-chain using Noir circuits
- **Demo Mode**: Includes a `VerifierStub` for demonstration purposes
- **Privacy**: Rental eligibility is verified without revealing sensitive information

## Project Structure

```
├── contracts/          # Solidity smart contracts
├── circuits/           # Noir ZK circuits
│   └── eligibility/    # Rental eligibility circuit
├── scripts/            # Deployment and interaction scripts
├── test/               # Unit and integration tests
├── frontend/           # React/Next.js frontend
├── artifacts/          # Compiled contract artifacts
├── deployments/        # Deployment records
└── .github/workflows/  # CI/CD pipelines
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
