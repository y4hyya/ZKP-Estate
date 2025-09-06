import Fastify from 'fastify';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { AttestorSigner } from './sign.js';
import { TLSNotaryVerifier, TLSNotaryProof } from './verify_tlsn.js';
import { createEIP712Domain, Attestation } from './eip712.js';

// Load environment variables
dotenv.config();

const app = Fastify({
  logger: {
    level: 'info'
  }
});

// Configuration
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';
const ATTESTOR_PK = process.env.ATTESTOR_PK;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '31337');
const ELIGIBILITY_TLS_ADDRESS = process.env.ELIGIBILITY_TLS_ADDRESS || ethers.ZeroAddress;

if (!ATTESTOR_PK) {
  console.error('❌ ATTESTOR_PK environment variable is required');
  process.exit(1);
}

// Initialize services
const attestorSigner = new AttestorSigner(ATTESTOR_PK);
const tlsnVerifier = new TLSNotaryVerifier();

// CORS configuration
app.register(require('@fastify/cors'), {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Health check endpoint
app.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    attestor: attestorSigner.getAddress(),
    chainId: CHAIN_ID,
    eligibilityContract: ELIGIBILITY_TLS_ADDRESS
  };
});

// Attestation endpoint
app.post('/attest', async (request, reply) => {
  try {
    const { wallet, policyId, tlsn_proof } = request.body as {
      wallet: string;
      policyId: number;
      tlsn_proof: TLSNotaryProof;
    };

    // Validate input
    if (!wallet || !policyId || !tlsn_proof) {
      return reply.status(400).send({
        error: 'Missing required fields: wallet, policyId, tlsn_proof'
      });
    }

    // Validate wallet address
    if (!ethers.isAddress(wallet)) {
      return reply.status(400).send({
        error: 'Invalid wallet address'
      });
    }

    // Verify TLS Notary proof (stub implementation)
    const verificationResult = await tlsnVerifier.verifyTLSNotaryProof(tlsn_proof);
    
    if (!verificationResult.ageOK || !verificationResult.incomeOK || !verificationResult.cleanOK) {
      return reply.status(400).send({
        error: 'TLS Notary verification failed',
        details: verificationResult.details
      });
    }

    // Generate nonce and nullifier
    const nonce = ethers.randomBytes(32);
    const nullifier = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'bytes32'],
        [wallet, policyId, nonce]
      )
    );

    // Build pass bitmask (0b111 = all checks passed)
    const passBitmask = 0x07; // 0b111

    // Set expiry to 1 hour from now
    const expiry = Math.floor(Date.now() / 1000) + 3600;

    // Construct attestation
    const attestation: Attestation = {
      wallet,
      policyId,
      expiry,
      nullifier,
      passBitmask
    };

    // Create EIP-712 domain
    const domain = createEIP712Domain(CHAIN_ID, ELIGIBILITY_TLS_ADDRESS);

    // Sign the attestation
    const signature = await attestorSigner.signAttestation(attestation, domain);

    app.log.info({
      wallet,
      policyId,
      nullifier,
      passBitmask,
      expiry,
      attestor: attestorSigner.getAddress()
    }, 'Attestation created and signed');

    return {
      attestation,
      signature,
      verification: verificationResult.details
    };

  } catch (error) {
    app.log.error(error, 'Error processing attestation request');
    return reply.status(500).send({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Sample data endpoint for testing
app.get('/samples', async (request, reply) => {
  const samples = {
    bank: tlsnVerifier.generateSampleProof('bank'),
    id: tlsnVerifier.generateSampleProof('id'),
    pass: tlsnVerifier.generateSampleProof('pass')
  };

  return {
    samples,
    attestor: attestorSigner.getAddress(),
    chainId: CHAIN_ID,
    eligibilityContract: ELIGIBILITY_TLS_ADDRESS
  };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 Attestor service running on http://${HOST}:${PORT}`);
    console.log(`📋 Attestor address: ${attestorSigner.getAddress()}`);
    console.log(`⛓️  Chain ID: ${CHAIN_ID}`);
    console.log(`📄 Eligibility contract: ${ELIGIBILITY_TLS_ADDRESS}`);
    console.log(`🔗 Health check: http://${HOST}:${PORT}/health`);
    console.log(`📊 Sample data: http://${HOST}:${PORT}/samples`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();