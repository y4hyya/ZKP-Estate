#!/usr/bin/env ts-node

/**
 * ZKP-Estate TLS Attestation Request Script
 * 
 * Requests an off-chain EIP-712 attestation from the Attestor service
 * and saves it to artifacts/attestations/ for later on-chain submission.
 */

import { ethers } from 'ethers';
import axios from 'axios';
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

interface AttestationResponse {
  attestation: Attestation;
  signature: string;
  verification: {
    age: number;
    income: number;
    cleanRecord: boolean;
    source: string;
  };
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

interface Policy {
  minAge: number;
  incomeMul: number;
  rentWei: string;
  needCleanRec: boolean;
  deadline: number;
  owner: string;
}

// Configuration
const DEFAULT_ATTESTOR_URL = 'http://localhost:3001';
const DEFAULT_FIXTURES_DIR = 'fixtures/tlsn';
const DEFAULT_ARTIFACTS_DIR = 'artifacts/attestations';

// CLI setup
program
  .name('requestAttestation')
  .description('Request off-chain EIP-712 attestation from Attestor service')
  .version('1.0.0')
  .requiredOption('--policy <id>', 'Policy ID to request attestation for')
  .option('--wallet <address>', 'Wallet address (default: first local signer)')
  .option('--attestor <url>', 'Attestor service URL', DEFAULT_ATTESTOR_URL)
  .option('--fixtures <dir>', 'TLS Notary fixtures directory', DEFAULT_FIXTURES_DIR)
  .option('--nonce <hex>', 'Custom nonce (hex or int)')
  .option('--rpc <url>', 'RPC URL')
  .option('--network <name>', 'Network name', 'localhost')
  .option('--gate <address>', 'EligibilityGateTLS contract address')
  .parse();

const options = program.opts();

async function main() {
  try {
    console.log('🔐 ZKP-Estate TLS Attestation Request');
    console.log('=====================================\n');

    // 1. Setup provider and signer
    const provider = new ethers.JsonRpcProvider(options.rpc || 'http://localhost:8545');
    const signers = await provider.listAccounts();
    
    if (signers.length === 0) {
      throw new Error('No accounts available. Make sure Hardhat node is running.');
    }

    const wallet = options.wallet || signers[0]!.address;
    const chainId = Number((await provider.getNetwork()).chainId);
    
    console.log(`📋 Wallet: ${wallet}`);
    console.log(`⛓️  Chain ID: ${chainId}`);
    console.log(`🔗 Attestor URL: ${options.attestor}\n`);

    // 2. Resolve EligibilityGateTLS address
    let gateAddress = options.gate;
    if (!gateAddress) {
      const deploymentsPath = `deployments/${options.network}.json`;
      if (fs.existsSync(deploymentsPath)) {
        const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
        gateAddress = deployments.contracts.EligibilityGate.address;
        if (!gateAddress) {
          throw new Error(`EligibilityGateTLS address not found in ${deploymentsPath}`);
        }
      } else {
        throw new Error(`Deployments file not found: ${deploymentsPath}`);
      }
    }

    console.log(`📄 EligibilityGateTLS: ${gateAddress}`);

    // 3. Read policy information (optional UX enhancement)
    try {
      const policyRegistryAddress = await getPolicyRegistryAddress(options.network);
      if (policyRegistryAddress) {
        const policyRegistry = new ethers.Contract(
          policyRegistryAddress,
          ['function getPolicy(uint256) view returns (tuple(uint256 minAge, uint256 incomeMul, uint256 rentWei, bool needCleanRec, uint256 deadline, address owner))'],
          provider
        );
        
        const policy: Policy = await (policyRegistry as any).getPolicy(options.policy);
        console.log(`💰 Policy ${options.policy}: ${ethers.formatEther(policy.rentWei)} ETH rent, deadline: ${new Date(Number(policy.deadline) * 1000).toISOString()}`);
      }
    } catch (error: any) {
      console.log(`⚠️  Could not fetch policy details: ${error.message}`);
    }

    // 4. Read TLS Notary proof from fixtures
    const tlsnProof = await readTLSNotaryProof(options.fixtures);
    console.log(`📊 TLS Notary proof loaded from: ${options.fixtures}`);

    // 5. Request attestation from Attestor service
    console.log('\n🔄 Requesting attestation from Attestor service...');
    
    const attestationRequest = {
      wallet,
      policyId: parseInt(options.policy),
      tlsn_proof: tlsnProof
    };

    const response = await axios.post<AttestationResponse>(
      `${options.attestor}/attest`,
      attestationRequest,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    const { attestation, signature } = response.data;

    // 6. Create EIP-712 domain
    const domain: EIP712Domain = {
      name: 'ZKPRent-TLS',
      version: '1',
      chainId,
      verifyingContract: gateAddress
    };

    // 7. Save attestation to file
    const attestationFile: AttestationFile = {
      domain,
      attestation,
      signature
    };

    const fileName = `${options.policy}-${wallet.toLowerCase()}.json`;
    const filePath = path.join(DEFAULT_ARTIFACTS_DIR, chainId.toString(), fileName);
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    
    fs.writeFileSync(filePath, JSON.stringify(attestationFile, null, 2));

    // 8. Safe logging (no PII)
    const nullifierShort = `${attestation.nullifier.slice(0, 10)}...`;
    const expiryISO = new Date(attestation.expiry * 1000).toISOString();
    const bitmaskBinary = attestation.passBitmask.toString(2).padStart(3, '0');

    console.log('\n✅ Attestation created successfully!');
    console.log(`📋 Policy ID: ${attestation.policyId}`);
    console.log(`👤 Wallet: ${attestation.wallet}`);
    console.log(`🔑 Nullifier: ${nullifierShort}`);
    console.log(`⏰ Expiry: ${expiryISO}`);
    console.log(`🎯 Bitmask: ${bitmaskBinary} (${attestation.passBitmask})`);
    console.log(`💾 Saved to: ${filePath}`);

    // Check if expiring soon
    const timeUntilExpiry = attestation.expiry - Math.floor(Date.now() / 1000);
    if (timeUntilExpiry < 120) { // Less than 2 minutes
      console.log(`⚠️  WARNING: Attestation expires in ${timeUntilExpiry} seconds!`);
    }

    console.log('\n🎉 Ready for on-chain submission with submitTLS.ts');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);
    console.error('   Stack:', error.stack);
    if (error.response?.data) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

async function getPolicyRegistryAddress(network: string): Promise<string | null> {
  try {
    const deploymentsPath = `deployments/${network}.json`;
    if (fs.existsSync(deploymentsPath)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
      return deployments.contracts.PolicyRegistry.address || null;
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
}

async function readTLSNotaryProof(fixturesPath: string): Promise<any> {
  // Check if it's a file or directory
  if (fs.existsSync(fixturesPath)) {
    const stat = fs.statSync(fixturesPath);
    if (stat.isFile()) {
      // It's a specific file
      const fixtureData = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
      fixtureData.timestamp = Date.now();
      return fixtureData;
    } else if (stat.isDirectory()) {
      // It's a directory, find the first JSON file
      const files = fs.readdirSync(fixturesPath).filter(f => f.endsWith('.json'));
      if (files.length === 0) {
        throw new Error(`No JSON files found in ${fixturesPath}`);
      }

      const fixtureFile = files[0];
      if (!fixtureFile) {
        throw new Error(`No valid fixture files found in ${fixturesPath}`);
      }
      const fixtureFilePath = path.join(fixturesPath, fixtureFile);
      const fixtureData = JSON.parse(fs.readFileSync(fixtureFilePath, 'utf8'));
      fixtureData.timestamp = Date.now();
      return fixtureData;
    }
  }
  
  throw new Error(`Fixtures path not found: ${fixturesPath}`);
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}
