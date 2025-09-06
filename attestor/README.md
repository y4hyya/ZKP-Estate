# ZKP-Estate Attestor Service

Off-chain attestor microservice for ZKP-Estate TLS verification with stub TLSN implementation.

## Features

- **EIP-712 Signature Generation**: Real cryptographic signatures for attestations
- **TLSN Verification Stub**: Mock verification of bank, ID, and location data
- **RESTful API**: Simple HTTP endpoints for attestation requests
- **Environment Configuration**: Flexible configuration via environment variables

## Quick Start

### 1. Install Dependencies

```bash
cd attestor
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
ATTESTOR_PK=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
CHAIN_ID=31337
ELIGIBILITY_TLS_ADDRESS=0x922D6956C99E12DFeB3224DEA977D0939758A1Fe
PORT=3001
HOST=0.0.0.0
```

### 3. Start the Service

```bash
npm run dev
```

The service will start on `http://localhost:3001`

## API Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-06T20:00:00Z",
  "attestor": "0x...",
  "chainId": 31337,
  "eligibilityTLS": "0x..."
}
```

### GET /info
Get attestor information and EIP-712 domain.

**Response:**
```json
{
  "attestor": "0x...",
  "chainId": 31337,
  "eligibilityTLS": "0x...",
  "domain": {
    "name": "ZKPRent-TLS",
    "version": "1",
    "chainId": 31337,
    "verifyingContract": "0x..."
  }
}
```

### POST /attest
Create and sign an attestation.

**Request Body:**
```json
{
  "wallet": "0x1234567890123456789012345678901234567890",
  "policyId": 1,
  "tlsn_proof": {
    "bank": {
      "accountNumber": "1234567890",
      "bankName": "Demo Bank",
      "accountHolder": "John Doe",
      "balance": 75000,
      "currency": "USD",
      "verifiedAt": "2025-09-06T20:00:00Z"
    },
    "id": {
      "documentNumber": "A123456789",
      "documentType": "passport",
      "fullName": "John Doe",
      "dateOfBirth": "1995-06-15",
      "nationality": "US",
      "verifiedAt": "2025-09-06T20:00:00Z"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "attestation": {
    "wallet": "0x1234567890123456789012345678901234567890",
    "policyId": 1,
    "expiry": 1694030400,
    "nullifier": "0x...",
    "passBitmask": 7
  },
  "signature": "0x...",
  "domain": {
    "name": "ZKPRent-TLS",
    "version": "1",
    "chainId": 31337,
    "verifyingContract": "0x..."
  },
  "verification": {
    "age": 25,
    "income": 75000,
    "hasCriminalRecord": false,
    "verificationSource": "stub-verifier"
  }
}
```

## Testing with cURL

### 1. Health Check
```bash
curl http://localhost:3001/health
```

### 2. Get Attestor Info
```bash
curl http://localhost:3001/info
```

### 3. Create Attestation
```bash
curl -X POST http://localhost:3001/attest \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x1234567890123456789012345678901234567890",
    "policyId": 1,
    "tlsn_proof": {
      "bank": {
        "accountNumber": "1234567890",
        "bankName": "Demo Bank",
        "accountHolder": "John Doe",
        "balance": 75000,
        "currency": "USD",
        "verifiedAt": "2025-09-06T20:00:00Z"
      }
    }
  }'
```

## Sample TLSN Proofs

The `fixtures/tlsn/` directory contains sample TLSN proof structures:

- `sample_bank.json` - Bank verification only
- `sample_id.json` - ID verification only  
- `sample_complete.json` - Complete verification (bank + ID + location)

## TLSN Verification (Stub)

The current implementation uses stub verification that:

- ✅ Always passes age verification (≥18)
- ✅ Always passes income verification (≥$30,000)
- ✅ Always passes clean record check
- ✅ Extracts basic information from TLSN proof structure

In a real implementation, this would:
- Verify TLS certificates from trusted providers
- Validate location attestations
- Check against government databases
- Verify bank account information
- Perform identity verification

## Integration with EligibilityGateTLS

The generated attestations can be submitted directly to the `EligibilityGateTLS` contract:

```solidity
// Submit the attestation to the contract
eligibilityGateTLS.submitTLS(attestation, signature);
```

The contract will verify:
- EIP-712 signature matches the attestor
- Attestation hasn't expired
- All checks passed (passBitmask = 0x07)
- Nullifier hasn't been used
- Wallet matches the submitter
