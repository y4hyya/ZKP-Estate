#!/usr/bin/env ts-node

/**
 * ZKP-Estate TLS Attestation Submission Script
 * 
 * Loads a saved attestation JSON and submits it to EligibilityGateTLS contract.
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { program } from 'commander';

// Types
interface Attestation {
  wallet: string;
  policyId: number;
  expiry: number;
  nullifier: string;
  passBitmask: number;
}

interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

interface AttestationFile {
  domain: EIP712Domain;
  attestation: Attestation;
  signature: string;
}

// CLI setup
program
  .name('submitTLS')
  .description('Submit TLS attestation to EligibilityGateTLS contract')
  .version('1.0.0')
  .option('--file <path>', 'Direct path to attestation file')
  .option('--policy <id>', 'Policy ID (if not using --file)')
  .option('--wallet <address>', 'Wallet address (if not using --file)')
  .option('--chainId <n>', 'Chain ID (if not using --file)')
  .option('--rpc <url>', 'RPC URL')
  .option('--network <name>', 'Network name', 'localhost')
  .option('--gate <address>', 'EligibilityGateTLS contract address')
  .parse();

const options = program.opts();

async function main() {
  try {
    console.log('🔐 ZKP-Estate TLS Attestation Submission');
    console.log('========================================\n');

    // 1. Load attestation file
    let attestationFile: AttestationFile;
    let filePath: string;

    if (options.file) {
      filePath = options.file;
      if (!fs.existsSync(filePath)) {
        throw new Error(`Attestation file not found: ${filePath}`);
      }
    } else {
      if (!options.policy) {
        throw new Error('Either --file or --policy must be provided');
      }
      filePath = await resolveAttestationFilePath(options);
    }

    console.log(`📄 Loading attestation from: ${filePath}`);
    attestationFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Validate attestation file structure
    validateAttestationFile(attestationFile);

    // 2. Setup provider and signer
    const provider = new ethers.JsonRpcProvider(options.rpc || 'http://localhost:8545');
    const signers = await provider.listAccounts();
    
    if (signers.length === 0) {
      throw new Error('No accounts available. Make sure Hardhat node is running.');
    }

    const wallet = signers[0]!.address; // Use first signer for transaction
    const chainId = Number((await provider.getNetwork()).chainId);
    
    console.log(`👤 Transaction signer: ${wallet}`);
    console.log(`⛓️  Chain ID: ${chainId}`);

    // 3. Resolve EligibilityGateTLS address and verify GATE_MODE
    let gateAddress = options.gate;
    if (!gateAddress) {
      const deploymentsPath = `deployments/${options.network}.json`;
      if (fs.existsSync(deploymentsPath)) {
        const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
        
        if (deployments.gateMode !== 'TLS') {
          throw new Error(`GATE_MODE is not TLS. Current mode: ${deployments.gateMode}. Please deploy with GATE_MODE=TLS.`);
        }
        
        gateAddress = deployments.contracts.EligibilityGate.address;
        if (!gateAddress) {
          throw new Error(`EligibilityGateTLS address not found in ${deploymentsPath}`);
        }
      } else {
        throw new Error(`Deployments file not found: ${deploymentsPath}`);
      }
    }

    console.log(`📄 EligibilityGateTLS: ${gateAddress}`);

    // 4. Verify domain matches current network
    if (attestationFile.domain.chainId !== chainId) {
      throw new Error(`Chain ID mismatch: attestation is for chain ${attestationFile.domain.chainId}, current chain is ${chainId}`);
    }

    if (attestationFile.domain.verifyingContract.toLowerCase() !== gateAddress.toLowerCase()) {
      throw new Error(`Contract address mismatch: attestation is for ${attestationFile.domain.verifyingContract}, current contract is ${gateAddress}`);
    }

    // 5. Verify EIP-712 signature locally (defense-in-depth)
    console.log('\n🔍 Verifying EIP-712 signature locally...');
    const recoveredSigner = await verifyEIP712Signature(attestationFile);
    console.log(`✅ Signature verified. Signer: ${recoveredSigner}`);

    // Check if signer matches configured attestor
    try {
      const deploymentsPath = `deployments/${options.network}.json`;
      if (fs.existsSync(deploymentsPath)) {
        const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
        const configuredAttestor = deployments.attestor;
        if (configuredAttestor && recoveredSigner.toLowerCase() !== configuredAttestor.toLowerCase()) {
          console.log(`⚠️  WARNING: Recovered signer (${recoveredSigner}) does not match configured attestor (${configuredAttestor})`);
        }
      }
    } catch (error: any) {
      console.log(`⚠️  Could not verify against configured attestor: ${error.message}`);
    }

    // 6. Check attestation expiry
    const currentTime = Math.floor(Date.now() / 1000);
    if (attestationFile.attestation.expiry <= currentTime) {
      throw new Error(`Attestation has expired. Expiry: ${new Date(attestationFile.attestation.expiry * 1000).toISOString()}`);
    }

    const timeUntilExpiry = attestationFile.attestation.expiry - currentTime;
    if (timeUntilExpiry < 300) { // Less than 5 minutes
      console.log(`⚠️  WARNING: Attestation expires in ${timeUntilExpiry} seconds!`);
    }

    // 7. Submit to contract
    console.log('\n🚀 Submitting attestation to contract...');
    
    const signer = await provider.getSigner();
    const eligibilityGateTLS = new ethers.Contract(
      gateAddress,
      [
        'function submitTLS(tuple(address wallet, uint256 policyId, uint64 expiry, bytes32 nullifier, uint8 passBitmask) attestation, bytes signature) external',
        'function isEligible(address who, uint256 policyId) external view returns (bool)',
        'function nullifierUsed(bytes32 nullifier) external view returns (bool)'
      ],
      signer
    );

    // Check if nullifier already used
    const nullifierUsed = await (eligibilityGateTLS as any).nullifierUsed(attestationFile.attestation.nullifier);
    if (nullifierUsed) {
      throw new Error('Nullifier already used. This attestation has been submitted before.');
    }

    // Convert attestation to contract format
    const contractAttestation = [
      attestationFile.attestation.wallet,
      attestationFile.attestation.policyId,
      attestationFile.attestation.expiry,
      attestationFile.attestation.nullifier,
      attestationFile.attestation.passBitmask
    ];

    // Submit transaction
    const tx = await (eligibilityGateTLS as any).submitTLS(contractAttestation, attestationFile.signature);
    console.log(`📝 Transaction submitted: ${tx.hash}`);

    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    
    if (receipt.status === 0) {
      throw new Error('Transaction failed');
    }

    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

    // Verify eligibility was set
    const isEligible = await (eligibilityGateTLS as any).isEligible(
      attestationFile.attestation.wallet,
      attestationFile.attestation.policyId
    );

    if (isEligible) {
      console.log('🎉 Success! User is now eligible for the policy.');
    } else {
      console.log('❌ Error: User eligibility was not set correctly.');
    }

    console.log('\n✅ TLS attestation submission complete!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    // Try to provide helpful error messages
    if (error.message.includes('revert')) {
      console.log('\n💡 Common revert reasons:');
      console.log('   - Attestation expired');
      console.log('   - Wallet mismatch');
      console.log('   - Nullifier already used (replay attack)');
      console.log('   - Incomplete bitmask (not all checks passed)');
      console.log('   - Invalid signature');
    }
    
    process.exit(1);
  }
}

function validateAttestationFile(file: any): asserts file is AttestationFile {
  if (!file.domain || !file.attestation || !file.signature) {
    throw new Error('Invalid attestation file: missing required fields');
  }

  const { domain, attestation, signature } = file;

  if (!domain.name || !domain.version || !domain.chainId || !domain.verifyingContract) {
    throw new Error('Invalid domain in attestation file');
  }

  if (!attestation.wallet || !attestation.policyId || !attestation.expiry || !attestation.nullifier || attestation.passBitmask === undefined) {
    throw new Error('Invalid attestation in file');
  }

  if (!signature || !signature.startsWith('0x')) {
    throw new Error('Invalid signature in file');
  }
}

async function resolveAttestationFilePath(options: any): Promise<string> {
  const chainId = options.chainId || (await new ethers.JsonRpcProvider(options.rpc || 'http://localhost:8545').getNetwork()).chainId;
  const wallet = options.wallet || (await new ethers.JsonRpcProvider(options.rpc || 'http://localhost:8545').listAccounts())[0]!.address;
  
  const fileName = `${options.policy}-${wallet.toLowerCase()}.json`;
  const filePath = path.join('artifacts', 'attestations', chainId.toString(), fileName);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Attestation file not found: ${filePath}`);
  }
  
  return filePath;
}

async function verifyEIP712Signature(attestationFile: AttestationFile): Promise<string> {
  const { domain, attestation, signature } = attestationFile;

  // Create the EIP-712 typed data
  const types = {
    Attestation: [
      { name: 'wallet', type: 'address' },
      { name: 'policyId', type: 'uint256' },
      { name: 'expiry', type: 'uint64' },
      { name: 'nullifier', type: 'bytes32' },
      { name: 'passBitmask', type: 'uint8' }
    ]
  };

  // Compute the EIP-712 hash
  const structHash = ethers.TypedDataEncoder.hashStruct('Attestation', types, attestation);
  const domainSeparator = ethers.TypedDataEncoder.hashDomain(domain);
  const digest = ethers.keccak256(ethers.concat([
    '0x1901',
    domainSeparator,
    structHash
  ]));

  // Recover the signer
  const recoveredAddress = ethers.verifyMessage(ethers.getBytes(digest), signature);
  return recoveredAddress;
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}
