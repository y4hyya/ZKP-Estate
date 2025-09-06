# TLS Path Frontend Implementation

This document describes the TLS (Path B) frontend implementation for ZKP-Estate.

## Features

### Path Selection
- **Path A (Noir)**: Original ZK proof-based flow
- **Path B (TLS)**: New TLS attestation-based flow

### TLS Tab Components

#### 1. Input Section
- **Policy ID**: User-entered policy identifier
- **Wallet Address**: Auto-populated from connected wallet
- **Get Attestation**: Calls local Attestor service (POST /attest)
- **Submit TLS**: Calls `EligibilityGateTLS.submitTLS()` on-chain

#### 2. Policy Information Display
- Shows policy details from `PolicyRegistry.getPolicy()`
- Displays min age, income multiplier, rent amount, clean record requirement, deadline, and owner

#### 3. Status Section
- **Eligibility Status**: Shows if user is eligible for the policy
- **Lease Status**: Shows if lease is active
- **Action Buttons**:
  - **Start Lease**: Sends `rentWei` to `LeaseEscrow.startLease()`
  - **Owner Confirm**: Calls `LeaseEscrow.ownerConfirm()` (owner only)
  - **Timeout Refund**: Calls `LeaseEscrow.timeoutRefund()` (after deadline)

#### 4. Events Panel
- Live display of transaction events and status updates
- Shows Eligible, LeaseStarted, LeaseReleased, LeaseRefunded events
- Real-time feedback for user actions

## Technical Implementation

### Dependencies
- **wagmi**: Wallet connection and contract interactions
- **viem**: Ethereum utilities and type safety
- **ethers v6**: Alternative Ethereum library support

### Contract Integration
- **EligibilityGateTLS**: TLS attestation submission and eligibility checking
- **LeaseEscrow**: Lease management and fund handling
- **PolicyRegistry**: Policy information retrieval

### Attestor Service Integration
- Calls local Attestor service at `http://localhost:3001`
- Endpoints: `/health`, `/attest`, `/samples`
- Handles EIP-712 signature generation and attestation creation

## Usage Flow

1. **Connect Wallet**: User connects their wallet
2. **Select Path B (TLS)**: Switch to TLS tab
3. **Enter Policy ID**: Input the policy ID to work with
4. **Get Attestation**: Call attestor service to get signed attestation
5. **Submit TLS**: Submit attestation to on-chain contract
6. **Start Lease**: Pay rent and start lease if eligible
7. **Complete Lease**: Either owner confirms or tenant requests timeout refund

## Security Notes

- **TLSNotary Verification**: Currently stubbed for demo purposes
- **No PII Storage**: Only attestation and signature data goes on-chain
- **Wallet Integration**: Uses secure wallet connection for all transactions
- **Real-time Updates**: Contract state changes are reflected immediately

## Environment Variables

```env
NEXT_PUBLIC_ATTESTOR_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://localhost:8545
```

## Contract Addresses

The frontend reads contract addresses from `lib/contracts.ts`:
- PolicyRegistry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- EligibilityGateTLS: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- LeaseEscrow: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- Attestor: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

## Development

To run the frontend with TLS support:

1. Start local blockchain (Hardhat)
2. Deploy contracts with TLS mode
3. Start Attestor service (`cd attestor && npm run dev`)
4. Start frontend (`cd frontend && npm run dev`)
5. Open browser to `http://localhost:3000`
6. Connect wallet and select "Path B (TLS)"
