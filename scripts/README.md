# ZKP-Estate Scripts

This directory contains scripts for interacting with the ZKP-Estate protocol. All scripts support command-line arguments and provide help with `--help`.

## Available Scripts

### 1. Deploy Scripts

#### `deploy.ts` - Deploy all contracts
Deploys PolicyRegistry, EligibilityVerifier/VerifierStub, EligibilityGate, and LeaseEscrow.

```bash
# Deploy with real verifier (if available)
npm run dev:deploy

# Deploy with stub verifier
npm run dev:deploy:stub

# Or run directly
npx hardhat run scripts/deploy.ts --network localhost
USE_STUB=1 npx hardhat run scripts/deploy.ts --network localhost
```

**Outputs:**
- Contract addresses saved to `deployments/<network>.json`
- Light version saved to `frontend/tenant-app/src/contracts.json`

### 2. Policy Management

#### `createPolicy.ts` - Create a new rental policy
Creates a new policy in the PolicyRegistry.

```bash
# Create with default values
npx hardhat run scripts/createPolicy.ts --network localhost

# Create with custom values
npx hardhat run scripts/createPolicy.ts --network localhost \
  --min-age 21 \
  --income-mul 4 \
  --rent-eth 2.5 \
  --clean-record true \
  --deadline-days 14
```

**Options:**
- `--min-age <number>` - Minimum age requirement (default: 18)
- `--income-mul <number>` - Income multiplier (default: 3)
- `--rent-eth <number>` - Rent amount in ETH (default: 1.0)
- `--clean-record <boolean>` - Require clean record (default: true)
- `--deadline-days <number>` - Deadline in days from now (default: 30)

### 3. ZK Proof Generation

#### `prove.ts` - Generate ZK proof
Generates a ZK proof for tenant eligibility using the Noir circuit.

```bash
# Generate with default values
npx hardhat run scripts/prove.ts --network localhost

# Generate with custom values
npx hardhat run scripts/prove.ts --network localhost \
  --policy 1 \
  --age 25 \
  --income 5.0 \
  --criminal false \
  --wallet 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**Options:**
- `--policy <number>` - Policy ID to use (default: 1)
- `--age <number>` - Tenant age (default: 25)
- `--income <number>` - Monthly income in ETH (default: 5.0)
- `--criminal <boolean>` - Has criminal record (default: false)
- `--wallet <address>` - Wallet address (default: test address)

**Outputs:**
- Generates `circuits/eligibility/Prover.toml`
- Saves proof to `artifacts/proofs/sample.json`

### 4. ZK Proof Submission

#### `submitZk.ts` - Submit ZK proof to contract
Submits a generated proof to the EligibilityGate contract.

```bash
# Submit default proof
npx hardhat run scripts/submitZk.ts --network localhost

# Submit specific proof
npx hardhat run scripts/submitZk.ts --network localhost \
  --proof-file artifacts/proofs/my-proof.json \
  --policy 2 \
  --wallet 1
```

**Options:**
- `--proof-file <path>` - Path to proof JSON file (default: artifacts/proofs/sample.json)
- `--policy <number>` - Policy ID (if not specified, uses proof file metadata)
- `--wallet <number>` - Wallet index to use (default: 0)

### 5. Lease Management

#### `startLease.ts` - Start a rental lease
Allows an eligible tenant to start a lease by depositing rent.

```bash
# Start lease with default values
npx hardhat run scripts/startLease.ts --network localhost

# Start lease with custom values
npx hardhat run scripts/startLease.ts --network localhost \
  --policy 2 \
  --wallet 1 \
  --rent 2.0
```

**Options:**
- `--policy <number>` - Policy ID to use (default: 1)
- `--wallet <number>` - Wallet index to use as tenant (default: 1)
- `--rent <amount>` - Rent amount in ETH (if not specified, uses policy amount)

#### `ownerConfirm.ts` - Owner confirms lease
Allows the policy owner to confirm a lease and receive funds.

```bash
# Confirm lease
npx hardhat run scripts/ownerConfirm.ts --network localhost \
  --policy 2 \
  --tenant 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --wallet 0
```

**Options:**
- `--policy <number>` - Policy ID (default: 1)
- `--tenant <address>` - Tenant address (required)
- `--wallet <number>` - Wallet index to use as owner (default: 0)

#### `timeoutRefund.ts` - Process timeout refund
Allows tenant to get refund if lease deadline passes without owner confirmation.

```bash
# Process refund
npx hardhat run scripts/timeoutRefund.ts --network localhost \
  --policy 2 \
  --wallet 1 \
  --advance-time true
```

**Options:**
- `--policy <number>` - Policy ID (default: 1)
- `--wallet <number>` - Wallet index to use as tenant (default: 1)
- `--advance-time <boolean>` - Advance blockchain time for testing (default: false)

### 6. End-to-End Testing

#### `testFlow.ts` - Complete flow test
Runs the entire ZKP-Estate flow from deployment to completion.

```bash
# Test complete flow with stub verifier
npm run test:flow:stub

# Test complete flow with real verifier
npm run test:flow

# Or run directly
npx hardhat run scripts/testFlow.ts --network localhost
USE_STUB=1 npx hardhat run scripts/testFlow.ts --network localhost
```

**Flow Steps:**
1. Deploy contracts
2. Create a new policy
3. Generate ZK proof
4. Submit ZK proof
5. Start lease
6. Owner confirms lease

## Usage Examples

### Complete Workflow

```bash
# 1. Start local blockchain
npm run dev:node

# 2. Deploy contracts (in new terminal)
npm run dev:deploy:stub

# 3. Create a policy
npx hardhat run scripts/createPolicy.ts --network localhost \
  --min-age 21 --rent-eth 2.0 --clean-record true

# 4. Generate proof
npx hardhat run scripts/prove.ts --network localhost \
  --policy 2 --age 25 --income 6.0 --criminal false

# 5. Submit proof
npx hardhat run scripts/submitZk.ts --network localhost \
  --policy 2 --wallet 1

# 6. Start lease
npx hardhat run scripts/startLease.ts --network localhost \
  --policy 2 --wallet 1

# 7. Owner confirms
npx hardhat run scripts/ownerConfirm.ts --network localhost \
  --policy 2 --tenant <TENANT_ADDRESS> --wallet 0
```

### Testing Timeout Refund

```bash
# 1. Start lease (steps 1-5 above)
# 2. Advance time and refund
npx hardhat run scripts/timeoutRefund.ts --network localhost \
  --policy 2 --wallet 1 --advance-time true
```

### Quick Test

```bash
# Run complete flow automatically
npm run test:flow:stub
```

## Error Handling

All scripts provide detailed error messages and suggestions:

- **Policy not found**: Create a policy first
- **Not eligible**: Submit ZK proof first
- **Insufficient balance**: Add funds to wallet
- **Deadline passed**: Create new policy with future deadline
- **Already processed**: Use different policy/tenant combination

## File Outputs

- `deployments/<network>.json` - Contract deployment information
- `frontend/tenant-app/src/contracts.json` - Light contract addresses for frontend
- `circuits/eligibility/Prover.toml` - Circuit input file
- `artifacts/proofs/sample.json` - Generated proof data

## Network Support

Scripts work with any Hardhat network:
- `localhost` - Local development
- `hardhat` - In-memory testing
- `sepolia` - Testnet (requires RPC_URL and PRIVATE_KEY)
- `mainnet` - Mainnet (requires RPC_URL and PRIVATE_KEY)

## Troubleshooting

1. **Contracts not deployed**: Run `npm run dev:deploy` first
2. **Proof generation fails**: Ensure nargo is installed and circuit compiles
3. **Transaction fails**: Check wallet balance and network connection
4. **Permission denied**: Ensure you're using the correct wallet for the operation
