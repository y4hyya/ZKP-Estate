# TLSNotary Path Documentation

## Overview

The TLSNotary path provides an alternative to the Noir ZK proof system for tenant eligibility verification in ZKP-Estate. This path offers faster MVP development, lower on-chain costs, and leverages HTTPS transcripts for proof generation, while maintaining reasonable security guarantees.

## Why TLS Path?

### Advantages over Noir
- **Faster MVP**: No complex circuit development or proof generation
- **Lower On-Chain Cost**: Simple signature verification vs. ZK proof verification
- **HTTPS Transcripts**: Leverages existing web infrastructure for data verification
- **Simpler Integration**: Standard EIP-712 signatures and web APIs

### Trade-offs
- **Privacy**: Less privacy-preserving than Noir (attestor sees data)
- **Trust Model**: Requires trusted attestor vs. cryptographic guarantees
- **Centralization**: Single point of failure in attestor service

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Tenant        │    │   Attestor       │    │   Smart         │
│   (TLSN Client) │    │   Service        │    │   Contracts     │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          │ 1. Request           │                       │
          │    Attestation       │                       │
          ├─────────────────────►│                       │
          │                      │                       │
          │ 2. TLS Transcript    │                       │
          │    + Verification    │                       │
          │◄─────────────────────┤                       │
          │                      │                       │
          │ 3. EIP-712           │                       │
          │    Attestation       │                       │
          │    + Signature       │                       │
          │◄─────────────────────┤                       │
          │                      │                       │
          │ 4. Submit TLS        │                       │
          │    to Contract       │                       │
          ├──────────────────────┼──────────────────────►│
          │                      │                       │
          │ 5. Eligible Event    │                       │
          │◄─────────────────────┼───────────────────────┤
          │                      │                       │
          │ 6. Start Lease       │                       │
          │    (Pay rent)        │                       │
          ├──────────────────────┼──────────────────────►│
          │                      │                       │
          │ 7. Owner Confirm     │                       │
          │    or Timeout        │                       │
          │    Refund            │                       │
          ├──────────────────────┼──────────────────────►│
```

### Data Flow

1. **Tenant** requests attestation with policy ID
2. **Attestor** verifies TLS transcript and extracts eligibility data
3. **Attestor** signs EIP-712 attestation with tenant's wallet address
4. **Tenant** submits attestation to `EligibilityGateTLS` contract
5. **Contract** verifies signature and marks tenant as eligible
6. **Tenant** starts lease by paying rent to `LeaseEscrow`
7. **Owner** confirms lease or **Tenant** requests timeout refund

### Component Flow

1. **Tenant (TLSN Client)**: Initiates attestation request with policy ID
2. **TLS Transcript**: Tenant provides HTTPS transcript from bank/income source
3. **Attestor Service**: Verifies TLS transcript and extracts eligibility data
4. **EIP-712 Attestation**: Attestor signs structured attestation with tenant's wallet
5. **EligibilityGateTLS**: On-chain verification of signature and attestation validity
6. **LeaseEscrow**: Standard lease management (start, confirm, refund)

## Trust & Safety

### Attestor Security
- **Key Management**: Attestor private key must be securely stored (HSM recommended)
- **Key Rotation**: Regular key rotation with contract updates
- **Multi-Attestor**: Optional support for multiple attestors for redundancy
- **Revocation**: Attestor can revoke attestations if needed

### Attestation Binding
- **Wallet Binding**: Attestation tied to specific wallet address
- **Policy Binding**: Attestation valid only for specific policy ID
- **Nullifier**: Prevents replay attacks with unique nullifier per attestation
- **Expiry**: Short validity period (e.g., 1 hour) to limit exposure

### On-Chain Verification
- **Signature Verification**: EIP-712 signature validation against attestor public key
- **Expiry Check**: Ensures attestation hasn't expired
- **Nullifier Check**: Prevents duplicate attestation usage
- **Wallet Match**: Ensures attestation is for the calling wallet

## Production Considerations

### Replace Stub Implementation
The current implementation uses a stub for TLSNotary verification. For production:

```typescript
// In attestor/src/verify_tlsn.ts
export async function verifyTLSNotaryProof(proof: TLSNotaryProof): Promise<VerificationResult> {
  // Replace with real TLSNotary verification
  // 1. Verify TLS transcript integrity
  // 2. Extract and validate data (age, income, clean record)
  // 3. Return structured verification result
}
```

### Security Enhancements
- **HSM Integration**: Use Hardware Security Module for attestor key storage
- **Attestor Registry**: On-chain registry of authorized attestors
- **Revocation List**: Contract to track revoked attestations
- **PII Avoidance**: Ensure no personally identifiable information in signed structs

### Monitoring & Alerting
- **Attestation Volume**: Monitor attestation request patterns
- **Failed Verifications**: Alert on unusual failure rates
- **Key Rotation**: Automated key rotation with proper notifications
- **Contract Events**: Monitor on-chain events for anomalies

## How to Run

### Prerequisites
- Node.js 18+
- Hardhat local blockchain
- Attestor service running

### Commands

#### 1. Start Local Blockchain
```bash
# Terminal 1
cd /path/to/ZKP-Estate
npx hardhat node
```

#### 2. Deploy Contracts (TLS Mode)
```bash
# Terminal 2
cd /path/to/ZKP-Estate
npx hardhat run scripts/deploy-complete.cjs --network localhost
```

#### 3. Start Attestor Service
```bash
# Terminal 3
cd /path/to/ZKP-Estate/attestor
npm run dev
```

#### 4. Start Frontend
```bash
# Terminal 4
cd /path/to/ZKP-Estate/frontend
npm run dev
```

### Demo Commands

#### Create Policy
```bash
# Create a policy for testing
npx hardhat run scripts/createPolicy.ts --network localhost
```

#### Request Attestation
```bash
# Request attestation from attestor service
curl -X POST http://localhost:3001/attest \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x...",
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

#### Submit TLS Attestation
```bash
# Submit attestation to contract
npx hardhat run scripts/submitTLS.ts --network localhost
```

#### Start Lease
```bash
# Start lease with rent payment
npx hardhat run scripts/startLease.ts --network localhost
```

#### Owner Confirm
```bash
# Owner confirms lease
npx hardhat run scripts/ownerConfirm.ts --network localhost
```

#### Timeout Refund
```bash
# Tenant requests refund after deadline
npx hardhat run scripts/timeoutRefund.ts --network localhost
```

### Minimal Demo Flow

1. **Start Services**: Local node + attestor + frontend
2. **Create Policy**: Use frontend or script to create rental policy
3. **Request Attestation**: Use frontend TLS tab to get attestation
4. **Submit TLS**: Submit attestation to become eligible
5. **Start Lease**: Pay rent to start lease
6. **Complete**: Either owner confirms or tenant requests refund

## UI Integration

### TLS Tab Features
- **Policy ID Input**: Enter target policy ID
- **Wallet Display**: Shows connected wallet address
- **Get Attestation**: Calls attestor service for EIP-712 attestation
- **Submit TLS**: Submits attestation to EligibilityGateTLS contract
- **Start Lease**: Pays rent to start lease
- **Owner Confirm**: Owner confirms lease (releases funds)
- **Timeout Refund**: Tenant requests refund after deadline
- **Status Panel**: Real-time status and event updates

### Noir Tab
- **Still Available**: Original ZK proof-based flow remains functional
- **Separate UI**: Clean separation between TLS and Noir paths
- **Same Escrow**: Both paths use the same LeaseEscrow contract

## Screenshots Placeholders

### 1. Attestation JSON
**Location**: After clicking "Get Attestation" button
**Content**: Show the EIP-712 attestation structure with wallet, policyId, expiry, nullifier, and passBitmask

### 2. Eligible Event
**Location**: After clicking "Submit TLS" button
**Content**: Show the Eligible event in the events panel with tenant address, policy ID, and nullifier

### 3. Escrow Release
**Location**: After clicking "Owner Confirm" button
**Content**: Show the LeaseReleased event and updated balance in the status panel

## Contract Addresses (Localhost)

```
PolicyRegistry:     0x5FbDB2315678afecb367f032d93F642f64180aa3
EligibilityGateTLS: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
LeaseEscrow:        0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Attestor:           0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

## Troubleshooting

### Common Issues

1. **Attestor Service Not Running**
   - Error: "Failed to get attestation"
   - Solution: Start attestor service with `npm run dev` in attestor directory

2. **Contract Not Deployed**
   - Error: "Contract not found"
   - Solution: Deploy contracts with `npx hardhat run scripts/deploy-complete.cjs`

3. **Wallet Not Connected**
   - Error: "Please connect your wallet first"
   - Solution: Connect wallet using RainbowKit button

4. **Attestation Expired**
   - Error: "Attestation expired"
   - Solution: Request new attestation from attestor service

5. **Insufficient Funds**
   - Error: "Insufficient funds for rent"
   - Solution: Ensure wallet has enough ETH for rent payment

### Debug Commands

```bash
# Check contract deployment
npx hardhat run scripts/checkAddress.ts --network localhost

# Verify attestor service
curl http://localhost:3001/health

# Check policy details
npx hardhat run scripts/checkPolicy.ts --network localhost
```

## Security Audit Checklist

- [ ] Attestor private key stored securely (HSM)
- [ ] Key rotation mechanism implemented
- [ ] Multi-attestor support (optional)
- [ ] Revocation mechanism for compromised attestations
- [ ] PII not included in signed attestations
- [ ] Attestation expiry properly enforced
- [ ] Nullifier uniqueness guaranteed
- [ ] Wallet binding verified on-chain
- [ ] Policy binding verified on-chain
- [ ] Event monitoring and alerting configured

## Future Enhancements

- **Multi-Attestor Support**: Multiple attestors for redundancy
- **Attestation Revocation**: On-chain revocation mechanism
- **Cross-Chain Support**: Attestations valid across multiple chains
- **Batch Attestations**: Multiple policies in single attestation
- **Attestation History**: Queryable attestation history
- **Integration APIs**: REST APIs for third-party integration
