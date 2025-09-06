# Contributing to ZKP-Estate

Thank you for your interest in contributing to ZKP-Estate! This guide will help you set up the development environment and understand how to work with both verification paths.

## Development Setup

### Prerequisites

- Node.js 20+
- npm or pnpm
- Git

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ZKP-Estate
   ```

2. **Install dependencies**
   ```bash
   npm ci
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   # The default values work for local development
   ```

4. **Set up attestor environment (for TLS path)**
   ```bash
   cd attestor
   cp .env.example .env
   # Edit .env if needed
   cd ..
   ```

## Verification Paths

ZKP-Estate supports two verification paths:

### Path A: Noir ZK Circuits
- **Privacy-First**: Maximum privacy with zero-knowledge proofs
- **Cryptographic Guarantees**: No trusted third parties required
- **Complex Setup**: Requires circuit development and proof generation

### Path B: TLSNotary Attestations
- **Faster MVP**: Quick development with HTTPS transcript verification
- **Lower Costs**: Simple signature verification on-chain
- **Trust Model**: Requires trusted attestor service

## Switching Between Paths

### Using Environment Variables

Set the `GATE_MODE` environment variable in your `.env` file:

```bash
# For Noir ZK path
GATE_MODE=NOIR

# For TLSNotary path
GATE_MODE=TLS
```

### Using npm Scripts

```bash
# Run with Noir path
npm run test:noir

# Run with TLS path
npm run test:tls
```

## Running Tests

### All Tests
```bash
npm test
```

### Path-Specific Tests
```bash
# Test Noir path only
GATE_MODE=NOIR npm test

# Test TLS path only
GATE_MODE=TLS npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Running the Attestor Service (TLS Path)

The attestor service is required for the TLS path:

### Start Attestor Service
```bash
cd attestor
npm ci
npm run dev
```

The service will start on `http://localhost:3001` with the following endpoints:
- `GET /health` - Health check
- `POST /attest` - Request attestation
- `GET /samples` - Sample data for testing

### Verify Attestor Service
```bash
# Check if service is running
curl http://localhost:3001/health

# Test attestation request
curl -X POST http://localhost:3001/attest \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "policyId": 1,
    "tlsn_proof": {
      "age": 28,
      "income": 120000,
      "cleanRecord": true,
      "timestamp": 1640995200,
      "source": "bank-statement"
    }
  }'
```

## Running the Frontend

### Start Frontend Development Server
```bash
cd frontend
npm ci
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Frontend Path Selection
- **Path A (Noir)**: Original ZK proof-based flow
- **Path B (TLS)**: New TLSNotary attestation-based flow

## Running the Complete Demo

### TLS Path Demo
```bash
# Terminal 1: Start local blockchain
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy-complete.cjs --network localhost

# Terminal 3: Start attestor service
cd attestor && npm run dev

# Terminal 4: Start frontend
cd frontend && npm run dev

# Open browser to http://localhost:3000
# Select "Path B (TLS)" tab
# Follow the TLS flow: Get Attestation → Submit TLS → Start Lease
```

### Noir Path Demo
```bash
# Terminal 1: Start local blockchain
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy-complete.cjs --network localhost

# Terminal 3: Start frontend
cd frontend && npm run dev

# Open browser to http://localhost:3000
# Select "Path A (Noir)" tab
# Follow the Noir flow: Generate Proof → Submit ZK → Start Lease
```

## Development Workflow

### 1. Choose Your Path
- Set `GATE_MODE` in `.env` to `TLS` or `NOIR`
- For TLS path, ensure attestor service is running

### 2. Run Tests
```bash
# Run all tests
npm test

# Run specific path tests
GATE_MODE=TLS npm test
GATE_MODE=NOIR npm test
```

### 3. Build and Deploy
```bash
# Build contracts
npm run build

# Deploy contracts
npx hardhat run scripts/deploy-complete.cjs --network localhost
```

### 4. Test Frontend
```bash
cd frontend
npm run dev
```

## Environment Variables

### Root .env
```bash
# Gate Mode: TLS or NOIR
GATE_MODE=TLS

# Attestor Configuration (used when GATE_MODE=TLS)
ATTESTOR_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# Blockchain Configuration
CHAIN_ID=31337
RPC_URL=http://localhost:8545

# Development
PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

### Attestor .env
```bash
# Attestor private key
ATTESTOR_PK=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# Blockchain Configuration
CHAIN_ID=31337
RPC_URL=http://localhost:8545

# Contract Addresses
ELIGIBILITY_TLS_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Service Configuration
PORT=3001
HOST=0.0.0.0
```

### Frontend .env.local
```bash
# Contract Addresses
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
NEXT_PUBLIC_ATTESTOR_URL=http://localhost:3001
```

## Troubleshooting

### Common Issues

1. **Attestor Service Not Running (TLS Path)**
   - Error: "Failed to get attestation"
   - Solution: Start attestor service with `cd attestor && npm run dev`

2. **Contract Not Deployed**
   - Error: "Contract not found"
   - Solution: Deploy contracts with `npx hardhat run scripts/deploy-complete.cjs`

3. **Tests Failing**
   - Check that `GATE_MODE` is set correctly
   - Ensure all dependencies are installed with `npm ci`
   - For TLS path, ensure attestor service is running

4. **Frontend Build Errors**
   - Check that all environment variables are set
   - Ensure contract addresses are correct
   - Run `npm run type-check` to identify TypeScript errors

### Debug Commands

```bash
# Check contract deployment
npx hardhat run scripts/checkAddress.ts --network localhost

# Verify attestor service
curl http://localhost:3001/health

# Check policy details
npx hardhat run scripts/checkPolicy.ts --network localhost

# Run type checking
npm run type-check

# Run linting
npm run lint
```

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Add tests for new functionality
- Update documentation for new features
- Use meaningful commit messages

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Update documentation if needed
6. Run tests for both paths
7. Submit a pull request

## Testing Checklist

Before submitting a PR, ensure:

- [ ] All tests pass for both TLS and NOIR paths
- [ ] Frontend builds without errors
- [ ] Attestor service works correctly (TLS path)
- [ ] Documentation is updated
- [ ] Environment variables are documented
- [ ] Type checking passes
- [ ] Linting passes

## Getting Help

- Check the [TLSNotary documentation](docs/tlsnotary.md)
- Review existing issues and pull requests
- Ask questions in the project discussions
- Check the [README.md](README.md) for quick start guides
