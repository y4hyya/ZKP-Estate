# ZKP-Estate Attestor Service

Off-chain microservice that verifies TLS Notary proofs (stub for hackathon) and issues EIP-712 attestations signed by an attestor key.

## Features

- **TLS Notary Verification**: Stub implementation for verifying TLS Notary proofs
- **EIP-712 Signing**: Creates and signs attestations using EIP-712 standard
- **RESTful API**: Fastify-based HTTP server with health checks and sample data
- **Nullifier Generation**: Prevents replay attacks using unique nullifiers
- **Configurable**: Environment-based configuration for different networks

## Quick Start

1. **Install dependencies**:
   ```bash
   cd attestor
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the service**:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run build
   npm start
   ```

## API Endpoints

### `GET /health`
Health check endpoint returning service status and configuration.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2023-09-06T20:30:00.000Z",
  "attestor": "0x...",
  "chainId": 31337,
  "eligibilityContract": "0x..."
}
```

### `POST /attest`
Creates and signs an EIP-712 attestation based on TLS Notary proof.

**Request Body**:
```json
{
  "wallet": "0x742d35Cc6634C0532925a3b8D0C0C4C4C4C4C4C4C",
  "policyId": 1,
  "tlsn_proof": {
    "age": 28,
    "income": 120000,
    "cleanRecord": true,
    "timestamp": 1694000000000,
    "source": "bank-statement"
  }
}
```

**Response**:
```json
{
  "attestation": {
    "wallet": "0x742d35Cc6634C0532925a3b8D0C0C4C4C4C4C4C4C",
    "policyId": 1,
    "expiry": 1694003600,
    "nullifier": "0x...",
    "passBitmask": 7
  },
  "signature": "0x...",
  "verification": {
    "age": 28,
    "income": 120000,
    "cleanRecord": true,
    "source": "bank-statement"
  }
}
```

### `GET /samples`
Returns sample TLS Notary proof data for testing.

## Configuration

Environment variables in `.env`:

- `ATTESTOR_PK`: Private key for signing attestations (required)
- `CHAIN_ID`: Ethereum chain ID for EIP-712 domain (default: 31337)
- `ELIGIBILITY_TLS_ADDRESS`: EligibilityGateTLS contract address
- `PORT`: Server port (default: 3001)
- `HOST`: Server host (default: 0.0.0.0)

## TLS Notary Verification

The service includes a stub implementation of TLS Notary verification for hackathon purposes. In production, this would:

1. Verify actual TLS Notary proofs
2. Extract age, income, and background check data
3. Validate the proof's authenticity and timestamp
4. Return boolean results for each verification criterion

## EIP-712 Attestation

Attestations follow the EIP-712 standard with:

- **Domain**: `ZKPRent-TLS` v1
- **Types**: `Attestation(address wallet,uint256 policyId,uint64 expiry,bytes32 nullifier,uint8 passBitmask)`
- **Signing**: Uses the attestor's private key via `ethers.Wallet.signTypedData()`

## Nullifier Generation

Nullifiers prevent replay attacks by combining:
- Wallet address
- Policy ID  
- Random nonce (32 bytes)

```typescript
nullifier = keccak256(abi.encode(wallet, policyId, nonce))
```

## Sample Data

The `fixtures/tlsn/` directory contains sample TLS Notary proof data:

- `sample_bank.json`: Bank statement verification
- `sample_id.json`: Government ID verification  
- `sample_background_check.json`: Background check with violations

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Clean build artifacts
npm run clean
```

## Integration with ZKP-Estate

This service integrates with the ZKP-Estate contracts:

1. **EligibilityGateTLS**: Accepts the signed attestations
2. **PolicyRegistry**: Provides policy requirements for verification
3. **LeaseEscrow**: Uses eligibility status for lease management

The attestor service acts as a trusted third party that verifies off-chain data and provides cryptographic attestations for on-chain use.