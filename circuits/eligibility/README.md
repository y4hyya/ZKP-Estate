# Eligibility Circuit

This directory contains the Noir zero-knowledge circuit for tenant eligibility verification in the ZKP-Estate protocol.

## Overview

The eligibility circuit verifies that a tenant meets the requirements for a rental policy without revealing sensitive personal information. The circuit takes public policy parameters and private tenant data, then proves eligibility through cryptographic constraints.

## Circuit Logic

### Public Inputs
- `min_age`: Minimum age requirement
- `income_mul`: Income multiplier (e.g., 3x rent)
- `rent_wei`: Rent amount in wei
- `need_clean_rec`: Whether clean criminal record is required (0/1)
- `policy_id`: Unique policy identifier
- `nullifier`: Unique nullifier to prevent replay attacks

### Private Inputs
- `age`: Tenant's actual age
- `income`: Tenant's actual income
- `criminal_flag`: Whether tenant has criminal record (0/1)
- `user_id`: Unique user identifier
- `salt`: Random salt for nullifier generation

### Constraints
1. **Age Requirement**: `age >= min_age`
2. **Income Requirement**: `income >= income_mul * rent_wei`
3. **Clean Record**: If `need_clean_rec == 1`, then `criminal_flag == 0`
4. **Nullifier Generation**: `nullifier = Poseidon(user_id, policy_id, salt)`

## Installation

### Prerequisites
- Node.js 18+ 
- Rust (for Noir compilation)

### Install Noir and Barretenberg

1. **Install noirup** (Noir version manager):
   ```bash
   curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
   source ~/.bashrc  # or ~/.zshrc
   ```

2. **Install nargo** (Noir compiler):
   ```bash
   noirup install
   ```

3. **Install bb** (Barretenberg - proving backend):
   ```bash
   # On macOS
   brew install aztecprotocol/barretenberg/barretenberg
   
   # On Linux
   curl -L https://github.com/AztecProtocol/barretenberg/releases/latest/download/barretenberg-linux-amd64.tar.gz | tar -xz
   sudo mv barretenberg /usr/local/bin/
   
   # On Windows
   # Download from: https://github.com/AztecProtocol/barretenberg/releases
   ```

## Usage

### 1. Check Circuit Syntax
```bash
nargo check
```

### 2. Compile Circuit
```bash
nargo compile
```
This generates the circuit bytecode and ABI.

### 3. Generate Proof
```bash
nargo prove
```
This creates a proof using the inputs from `Prover.toml`.

### 4. Verify Proof
```bash
nargo verify
```
This verifies the generated proof.

### 5. Generate Solidity Verifier
```bash
# Generate verifier contract
bb write_vk -k target/eligibility.vk -o target/verifier_key.json
bb contract -k target/verifier_key.json -o target/Verifier.sol
```

## Sample Inputs

The `Prover.toml` file contains sample inputs for testing:

```toml
# Public inputs
min_age = "18"
income_mul = "3"
rent_wei = "1000000000000000000"  # 1 ETH
need_clean_rec = "1"
policy_id = "1"
nullifier = "0x1234..."  # Computed from private inputs

# Private inputs
age = "25"
income = "5000000000000000000"  # 5 ETH (5x rent)
criminal_flag = "0"  # Clean record
user_id = "0xabcdef..."
salt = "0x9876..."
```

## Integration with Smart Contracts

The generated verifier contract can be deployed and used by the `EligibilityGate` contract:

1. Deploy the generated `Verifier.sol` contract
2. Pass the verifier address to `EligibilityGate` constructor
3. Submit proofs via `submitZk()` function

## Security Considerations

- **Nullifier Uniqueness**: Each proof must use a unique nullifier to prevent replay attacks
- **Salt Randomness**: The salt must be cryptographically random for each proof
- **Input Validation**: All inputs are validated within the circuit constraints
- **Privacy**: Private inputs are never exposed, only the proof of satisfaction

## Development

### Adding New Constraints
To add new eligibility requirements:

1. Add new private inputs to the circuit
2. Add corresponding constraints in `main.nr`
3. Update `Prover.toml` with sample values
4. Test with `nargo prove` and `nargo verify`

### Debugging
- Use `nargo check` to validate syntax
- Check constraint satisfaction with sample inputs
- Verify nullifier computation matches expected output

## Troubleshooting

### Common Issues

1. **Compilation Errors**: Ensure all dependencies are installed and versions are compatible
2. **Proof Generation Fails**: Check that all constraints are satisfied with given inputs
3. **Verification Fails**: Ensure the proof was generated with the same circuit and inputs

### Getting Help
- [Noir Documentation](https://noir-lang.org/)
- [Barretenberg Documentation](https://github.com/AztecProtocol/barretenberg)
- [Noir Community](https://discord.gg/noir-lang)
