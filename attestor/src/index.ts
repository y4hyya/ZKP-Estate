import Fastify from "fastify";
import cors from "@fastify/cors";
import { ethers } from "ethers";
import dotenv from "dotenv";
import { 
  Attestation, 
  generateNullifier, 
  calculatePassBitmask, 
  allChecksPassed 
} from "./eip712";
import { verifyTLSNProof, validateTLSNProof, TLSNProof } from "./verify_tlsn";
import { signAttestation } from "./sign";

// Load environment variables
dotenv.config();

// Environment variables
const ATTESTOR_PK = process.env.ATTESTOR_PK;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "31337");
const ELIGIBILITY_TLS_ADDRESS = process.env.ELIGIBILITY_TLS_ADDRESS;
const PORT = parseInt(process.env.PORT || "3001");
const HOST = process.env.HOST || "0.0.0.0";

// Validate required environment variables
if (!ATTESTOR_PK) {
  console.error("❌ ATTESTOR_PK environment variable is required");
  process.exit(1);
}

if (!ELIGIBILITY_TLS_ADDRESS) {
  console.error("❌ ELIGIBILITY_TLS_ADDRESS environment variable is required");
  process.exit(1);
}

// Initialize wallet
const wallet = new ethers.Wallet(ATTESTOR_PK);
console.log("🔑 Attestor wallet initialized:", wallet.address);

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// Register CORS
fastify.register(cors, {
  origin: true,
  credentials: true,
});

// Health check endpoint
fastify.get("/health", async (request, reply) => {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    attestor: wallet.address,
    chainId: CHAIN_ID,
    eligibilityTLS: ELIGIBILITY_TLS_ADDRESS,
  };
});

// Attestation endpoint
fastify.post("/attest", async (request, reply) => {
  try {
    const { wallet: userWallet, policyId, tlsn_proof } = request.body as {
      wallet: string;
      policyId: number;
      tlsn_proof: TLSNProof;
    };

    // Validate input
    if (!userWallet || !policyId || !tlsn_proof) {
      return reply.status(400).send({
        error: "Missing required fields: wallet, policyId, tlsn_proof",
      });
    }

    // Validate wallet address
    if (!ethers.isAddress(userWallet)) {
      return reply.status(400).send({
        error: "Invalid wallet address",
      });
    }

    // Validate TLSN proof
    if (!validateTLSNProof(tlsn_proof)) {
      return reply.status(400).send({
        error: "Invalid TLSN proof structure",
      });
    }

    console.log("📝 Processing attestation request:", {
      wallet: userWallet,
      policyId,
      hasTLSNProof: !!tlsn_proof,
    });

    // Verify TLSN proof (stub implementation)
    const verificationResult = verifyTLSNProof(tlsn_proof);

    // Check if all verifications passed
    if (!allChecksPassed(calculatePassBitmask(
      verificationResult.agePassed,
      verificationResult.incomePassed,
      verificationResult.cleanRecordPassed
    ))) {
      return reply.status(400).send({
        error: "Verification failed",
        details: verificationResult.details,
      });
    }

    // Generate nonce and nullifier
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const nullifier = generateNullifier(userWallet, policyId, nonce);

    // Calculate expiry (1 hour from now)
    const expiry = Math.floor(Date.now() / 1000) + 3600;

    // Calculate pass bitmask
    const passBitmask = calculatePassBitmask(
      verificationResult.agePassed,
      verificationResult.incomePassed,
      verificationResult.cleanRecordPassed
    );

    // Create attestation
    const attestation: Attestation = {
      wallet: userWallet,
      policyId,
      expiry,
      nullifier,
      passBitmask,
    };

    // Sign attestation
    const response = await signAttestation(
      attestation,
      wallet,
      CHAIN_ID,
      ELIGIBILITY_TLS_ADDRESS
    );

    console.log("✅ Attestation created successfully:", {
      wallet: userWallet,
      policyId,
      nullifier,
      passBitmask: `0x${passBitmask.toString(16)}`,
      expiry: new Date(expiry * 1000).toISOString(),
    });

    return reply.send({
      success: true,
      attestation: response.attestation,
      signature: response.signature,
      domain: response.domain,
      verification: verificationResult.details,
    });

  } catch (error) {
    console.error("❌ Attestation error:", error);
    return reply.status(500).send({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get attestor info endpoint
fastify.get("/info", async (request, reply) => {
  return {
    attestor: wallet.address,
    chainId: CHAIN_ID,
    eligibilityTLS: ELIGIBILITY_TLS_ADDRESS,
    domain: {
      name: "ZKPRent-TLS",
      version: "1",
      chainId: CHAIN_ID,
      verifyingContract: ELIGIBILITY_TLS_ADDRESS,
    },
  };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log("🚀 Attestor service started successfully!");
    console.log(`   URL: http://${HOST}:${PORT}`);
    console.log(`   Health: http://${HOST}:${PORT}/health`);
    console.log(`   Info: http://${HOST}:${PORT}/info`);
    console.log(`   Attest: POST http://${HOST}:${PORT}/attest`);
    console.log(`   Attestor: ${wallet.address}`);
    console.log(`   Chain ID: ${CHAIN_ID}`);
    console.log(`   Eligibility TLS: ${ELIGIBILITY_TLS_ADDRESS}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down attestor service...");
  await fastify.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down attestor service...");
  await fastify.close();
  process.exit(0);
});

start();
