#!/usr/bin/env node

/**
 * ZKP-Estate Attestor Integration Example
 * 
 * This script demonstrates how to integrate the attestor service
 * with the ZKP-Estate smart contracts for a complete workflow.
 */

const { ethers } = require('ethers');
const axios = require('axios');

// Configuration
const ATTESTOR_URL = 'http://localhost:3001';
const RPC_URL = 'http://localhost:8545';
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat account #0

// Contract addresses (update these with your deployed addresses)
const CONTRACTS = {
  policyRegistry: '0x162a433068f51e18b7d13932f27e66a3f99e6890',
  eligibilityGateTLS: '0x922d6956c99e12dfeb3224dea977d0939758a1fe',
  leaseEscrow: '0x5081a39b8a5f0e35a8d959395a630b68b74dd30f'
};

async function main() {
  console.log('🚀 ZKP-Estate Attestor Integration Example');
  console.log('==========================================\n');

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('📋 Wallet Address:', wallet.address);
  console.log('⛓️  Chain ID:', (await provider.getNetwork()).chainId);
  console.log('');

  try {
    // Step 1: Check attestor service health
    console.log('1️⃣ Checking Attestor Service Health...');
    const healthResponse = await axios.get(`${ATTESTOR_URL}/health`);
    console.log('✅ Attestor Status:', healthResponse.data.status);
    console.log('📄 Attestor Address:', healthResponse.data.attestor);
    console.log('');

    // Step 2: Get sample TLS Notary proof data
    console.log('2️⃣ Getting Sample TLS Notary Proof Data...');
    const samplesResponse = await axios.get(`${ATTESTOR_URL}/samples`);
    const bankProof = samplesResponse.data.samples.bank;
    console.log('📊 Sample Bank Proof:', JSON.stringify(bankProof, null, 2));
    console.log('');

    // Step 3: Request attestation from attestor service
    console.log('3️⃣ Requesting Attestation from Attestor Service...');
    const attestationRequest = {
      wallet: wallet.address,
      policyId: 1,
      tlsn_proof: bankProof
    };

    const attestationResponse = await axios.post(`${ATTESTOR_URL}/attest`, attestationRequest);
    const { attestation, signature } = attestationResponse.data;
    
    console.log('✅ Attestation Created:');
    console.log('   Wallet:', attestation.wallet);
    console.log('   Policy ID:', attestation.policyId);
    console.log('   Expiry:', new Date(attestation.expiry * 1000).toISOString());
    console.log('   Nullifier:', attestation.nullifier);
    console.log('   Pass Bitmask:', attestation.passBitmask.toString(2).padStart(3, '0'));
    console.log('   Signature:', signature);
    console.log('');

    // Step 4: Verify the attestation can be used with EligibilityGateTLS
    console.log('4️⃣ Verifying Attestation with EligibilityGateTLS Contract...');
    
    // Note: In a real integration, you would:
    // 1. Connect to the EligibilityGateTLS contract
    // 2. Call submitTLS(attestation, signature)
    // 3. Check isEligible(wallet, policyId)
    
    console.log('📋 Attestation Data for Contract Integration:');
    console.log('   Contract Address:', CONTRACTS.eligibilityGateTLS);
    console.log('   Method: submitTLS(attestation, signature)');
    console.log('   Attestation:', JSON.stringify(attestation, null, 2));
    console.log('   Signature:', signature);
    console.log('');

    // Step 5: Demonstrate different verification scenarios
    console.log('5️⃣ Testing Different Verification Scenarios...');
    
    // Test with government ID
    const idProof = samplesResponse.data.samples.id;
    console.log('   Testing Government ID verification...');
    const idAttestationResponse = await axios.post(`${ATTESTOR_URL}/attest`, {
      wallet: wallet.address,
      policyId: 2,
      tlsn_proof: idProof
    });
    console.log('   ✅ Government ID attestation created');
    
    // Test with failed verification
    const failedProof = {
      age: 16,
      income: 50000,
      cleanRecord: false,
      timestamp: Date.now(),
      source: 'background-check'
    };
    
    console.log('   Testing failed verification (underage + criminal record)...');
    try {
      await axios.post(`${ATTESTOR_URL}/attest`, {
        wallet: wallet.address,
        policyId: 3,
        tlsn_proof: failedProof
      });
    } catch (error) {
      console.log('   ❌ Verification failed as expected:', error.response.data.error);
    }
    console.log('');

    // Step 6: Show integration workflow
    console.log('6️⃣ Complete Integration Workflow:');
    console.log('   ┌─────────────────────────────────────────────────────────┐');
    console.log('   │ 1. User provides TLS Notary proof to frontend          │');
    console.log('   │ 2. Frontend sends proof to attestor service            │');
    console.log('   │ 3. Attestor verifies proof and creates attestation     │');
    console.log('   │ 4. Frontend receives signed attestation                │');
    console.log('   │ 5. Frontend submits attestation to EligibilityGateTLS  │');
    console.log('   │ 6. Contract verifies signature and marks as eligible   │');
    console.log('   │ 7. User can now interact with LeaseEscrow contract     │');
    console.log('   └─────────────────────────────────────────────────────────┘');
    console.log('');

    console.log('🎉 Integration Example Complete!');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Deploy contracts with GATE_MODE=TLS');
    console.log('2. Update contract addresses in this script');
    console.log('3. Implement frontend integration');
    console.log('4. Test end-to-end workflow');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
