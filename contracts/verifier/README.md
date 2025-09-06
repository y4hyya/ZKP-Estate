# Eligibility Verifier Contract

This directory contains the Solidity verifier contract for the eligibility circuit.

## Files

- `EligibilityVerifier.sol` - Generated Solidity verifier contract

## Generation

The verifier contract is generated using Barretenberg (bb) from the compiled Noir circuit.

### Prerequisites

1. **Install Barretenberg**:
   ```bash
   npm install -g @noir-lang/barretenberg
   # or
   cargo install --git https://github.com/noir-lang/barretenberg.git
   ```

2. **Compile the circuit**:
   ```bash
   cd circuits/eligibility
   nargo compile
   ```

### Generate Verifier

```bash
# From project root
./scripts/generate-verifier.sh

# Or manually
cd circuits/eligibility
bb generate-verifier --contract-name EligibilityVerifier --output-dir ../../contracts/verifier
```

## Public Input Layout

The verifier expects public inputs in the following order:

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

## Usage

### In Solidity

```solidity
import "./verifier/EligibilityVerifier.sol";

contract MyContract {
    EligibilityVerifier public verifier;
    
    constructor(address _verifier) {
        verifier = EligibilityVerifier(_verifier);
    }
    
    function verifyProof(bytes calldata proof, uint256[] calldata publicInputs) external view returns (bool) {
        return verifier.verify(proof, publicInputs);
    }
}
```

### In JavaScript/TypeScript

```typescript
import { ethers } from "ethers";

const verifier = new ethers.Contract(verifierAddress, verifierABI, provider);

const proof = "0x..."; // Generated proof
const publicInputs = [
    18,    // minAge
    3,     // incomeMul
    ethers.parseEther("1.0"), // rentWei
    1,     // needCleanRec
    1,     // policyId
    "1234567890123456789012345678901234567890123456789012345678901234" // nullifier
];

const isValid = await verifier.verify(proof, publicInputs);
```

## Integration with EligibilityGate

The `EligibilityGate` contract uses this verifier to validate ZK proofs:

1. **Default behavior**: Uses `EligibilityVerifier` if available
2. **Fallback**: Uses `VerifierStub` for development/testing
3. **Environment flag**: `USE_STUB=1` to force stub usage

## Deployment

### With Real Verifier

```bash
npm run dev:deploy
```

### With Stub Verifier

```bash
npm run dev:deploy:stub
```

## Testing

```bash
# Run verifier integration tests
npm test test/unit/VerifierIntegration.test.ts

# Test with stub
USE_STUB=1 npm test
```

## Gas Costs

The generated verifier contract is gas-intensive due to the cryptographic operations:

- **Verification cost**: ~200,000-500,000 gas
- **Contract size**: ~50KB+ (may require proxy pattern for deployment)
- **Optimization**: Consider using a verifier registry for multiple circuits

## Troubleshooting

### Generation Issues

1. **bb not found**: Install Barretenberg
2. **Circuit not compiled**: Run `nargo compile` first
3. **Generation fails**: Check circuit compatibility

### Deployment Issues

1. **Contract too large**: Use proxy pattern or optimize circuit
2. **Gas limit exceeded**: Increase gas limit or optimize
3. **Verification fails**: Check public input order and types

### Integration Issues

1. **ABI mismatch**: Ensure interface matches generated contract
2. **Public input order**: Verify order matches circuit expectations
3. **Type conversion**: Check uint256 vs other types

## Security Considerations

- **Proof validation**: Always validate proof format before verification
- **Public input validation**: Verify inputs match expected policy
- **Replay protection**: Use nullifiers to prevent double-spending
- **Gas limits**: Monitor gas costs for verification operations

## Future Improvements

- [ ] Verifier registry for multiple circuits
- [ ] Batch verification for multiple proofs
- [ ] Optimized verifier for specific use cases
- [ ] Proxy pattern for large contracts
- [ ] Gas optimization techniques
