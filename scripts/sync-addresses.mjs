#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractsPath = path.join(__dirname, '..', 'deployments', 'localhost.json');
const envPath = path.join(__dirname, '..', '.env.local');

console.log('Syncing contract addresses...');

try {
  if (!fs.existsSync(contractsPath)) {
    console.error('Deployment file not found. Run deploy first.');
    process.exit(1);
  }

  const contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const updates = {
    'NEXT_PUBLIC_RPC_URL': 'http://127.0.0.1:8545',
    'NEXT_PUBLIC_CHAIN_ID': contracts.chainId.toString(),
    'NEXT_PUBLIC_POLICY_REGISTRY_ADDRESS': contracts.contracts.PolicyRegistry.address,
    'NEXT_PUBLIC_ELIGIBILITY_GATE_ADDRESS': contracts.contracts.EligibilityGateTLS.address,
    'NEXT_PUBLIC_LEASE_ESCROW_ADDRESS': contracts.contracts.LeaseEscrow.address,
  };

  if (contracts.attestor) {
    updates['NEXT_PUBLIC_ATTESTOR_ADDRESS'] = contracts.attestor;
  }

  let lines = envContent.split('\n');
  const existingKeys = new Set();

  lines = lines.map(line => {
    const match = line.match(/^([^=]+)=/);
    if (match) {
      const key = match[1];
      existingKeys.add(key);
      if (updates[key] !== undefined) {
        return `${key}=${updates[key]}`;
      }
    }
    return line;
  });

  Object.entries(updates).forEach(([key, value]) => {
    if (!existingKeys.has(key)) {
      lines.push(`${key}=${value}`);
    }
  });

  fs.writeFileSync(envPath, lines.join('\n'));

  console.log('Environment variables updated:');
  Object.entries(updates).forEach(([key, value]) => {
    console.log(`  ${key}=${value}`);
  });

} catch (error) {
  console.error('Failed to sync addresses:', error.message);
  process.exit(1);
}
