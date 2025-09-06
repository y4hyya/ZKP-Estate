# Generate Solidity Verifier for Eligibility Circuit

This document explains how to generate a Solidity verifier contract for the compiled Noir eligibility circuit using Barretenberg (bb).

## Prerequisites

1. **Install Barretenberg (bb)**:
   ```bash
   # Install bb via npm
   npm install -g @noir-lang/barretenberg
   
   # Or install via cargo
   cargo install --git https://github.com/noir-lang/barretenberg.git
   ```

2. **Compile the Noir circuit**:
   ```bash
   cd circuits/eligibility
   nargo compile
   ```

## Generate Solidity Verifier

### Step 1: Navigate to Circuit Directory
```bash
cd circuits/eligibility
```

### Step 2: Generate Solidity Verifier
```bash
# Generate the verifier contract
bb generate-verifier --contract-name EligibilityVerifier --output-dir ../../contracts/verifier
```

**Alternative command if the above doesn't work:**
```bash
# Try this alternative syntax
bb generate-verifier --contract-name EligibilityVerifier --output ../../contracts/verifier/EligibilityVerifier.sol
```

### Step 3: Verify Generated Contract
The generated contract should be located at:
```
contracts/verifier/EligibilityVerifier.sol
```

## Public Input Order and Types

The verifier expects public inputs in the following order (matching Prompt 4 layout):

### Expected Public Input Array:
```solidity
uint256[] publicInputs = [
    min_age,        // uint256: Minimum age requirement
    income_mul,     // uint256: Income multiplier (e.g., 3x rent)
    rent_wei,       // uint256: Rent amount in wei
    need_clean_rec, // uint256: 0 or 1 (clean record required)
    policy_id,      // uint256: Policy identifier
    nullifier       // uint256: Poseidon hash of (user_id, policy_id, salt)
];
```

### Type Mapping:
- **Noir `u32`** → **Solidity `uint256`**
- **Noir `Field`** → **Solidity `uint256`**

### Verification Function Signature:
```solidity
function verify(
    bytes calldata proof,
    uint256[] calldata publicInputs
) external view returns (bool)
```

## Integration with EligibilityGate

The generated verifier will be integrated into the `EligibilityGate` contract:

1. **Default behavior**: Use `EligibilityVerifier` if available
2. **Fallback**: Use `VerifierStub` for development/testing
3. **Environment flag**: `USE_STUB=1` to force stub usage

## File Structure After Generation

```
contracts/
├── verifier/
│   └── EligibilityVerifier.sol    # Generated verifier contract
├── EligibilityGate.sol            # Updated to use real verifier
├── mocks/
│   └── VerifierStub.sol           # Fallback stub verifier
└── interfaces/
    └── IVerifier.sol              # Common interface
```

## Troubleshooting

### If bb command fails:
1. **Check bb installation**: `bb --version`
2. **Verify circuit compilation**: `nargo check` in circuits/eligibility
3. **Try alternative syntax**: Different bb command variations
4. **Manual generation**: Use other Noir tooling if available

### If verifier doesn't match expected interface:
1. **Check public input order** in generated contract
2. **Verify function signature** matches `IVerifier` interface
3. **Update EligibilityGate** if needed for different interface

## Testing the Verifier

After generation, test the verifier:

```bash
# Compile contracts
npm run build

# Run tests
npm test

# Test with stub flag
USE_STUB=1 npm run test
```

## Production Deployment

For production deployment:

1. **Generate verifier**: Follow steps above
2. **Deploy verifier**: Deploy `EligibilityVerifier` to blockchain
3. **Update EligibilityGate**: Point to real verifier address
4. **Remove stub flag**: Don't use `USE_STUB=1` in production

## Notes

- The verifier contract is large and gas-intensive
- Consider using a verifier registry for multiple circuits
- Test thoroughly before production deployment
- Monitor gas costs for proof verification
