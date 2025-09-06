const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("📤 Submitting ZK proof to EligibilityGate...");

  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Default values (can be overridden by environment variables)
  let proofFile = process.env.PROOF_FILE || "artifacts/proofs/sample.json";
  let policyId = process.env.POLICY_ID ? parseInt(process.env.POLICY_ID) : null;
  let walletIndex = parseInt(process.env.WALLET_INDEX) || 0; // Use first account by default

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--proof-file":
        proofFile = args[i + 1];
        i++;
        break;
      case "--policy":
        policyId = parseInt(args[i + 1]);
        i++;
        break;
      case "--wallet":
        walletIndex = parseInt(args[i + 1]);
        i++;
        break;
      case "--help":
        console.log(`
Usage: npx hardhat run scripts/submitZk.ts --network <network> [options]

Options:
  --proof-file <path>      Path to proof JSON file (default: artifacts/proofs/sample.json)
  --policy <number>        Policy ID (if not specified, will use from proof file)
  --wallet <number>        Wallet index to use (default: 0)
  --help                   Show this help message

Examples:
  npx hardhat run scripts/submitZk.ts --network localhost
  npx hardhat run scripts/submitZk.ts --network localhost --proof-file artifacts/proofs/my-proof.json
        `);
        process.exit(0);
    }
  }

  // Get network info
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;

  // Load deployment info
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ Deployment file not found: ${deploymentFile}`);
    console.error("Please run 'npm run dev:deploy' first to deploy contracts.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const eligibilityGateAddress = deployment.contracts.EligibilityGate.address;

  if (!eligibilityGateAddress) {
    console.error("❌ EligibilityGate address not found in deployment file");
    process.exit(1);
  }

  // Load proof file
  const proofFilePath = path.join(__dirname, "..", proofFile);
  
  if (!fs.existsSync(proofFilePath)) {
    console.error(`❌ Proof file not found: ${proofFilePath}`);
    console.error("Please run 'npm run scripts:prove' first to generate a proof.");
    process.exit(1);
  }

  const proofData = JSON.parse(fs.readFileSync(proofFilePath, "utf8"));
  
  if (!proofData.proof || !proofData.publicInputs) {
    console.error("❌ Invalid proof file format. Expected {proof, publicInputs}");
    process.exit(1);
  }

  // Use policy ID from proof file if not specified
  if (policyId === null) {
    if (proofData.metadata && proofData.metadata.policyId) {
      policyId = proofData.metadata.policyId;
    } else {
      console.error("❌ Policy ID not specified and not found in proof file");
      process.exit(1);
    }
  }

  console.log(`📋 Using proof file: ${proofFile}`);
  console.log(`📋 Policy ID: ${policyId}`);
  console.log(`📋 Public Inputs: [${proofData.publicInputs.join(', ')}]`);

  // Get signer
  const signers = await ethers.getSigners();
  const signer = signers[walletIndex];
  
  if (!signer) {
    console.error(`❌ Wallet index ${walletIndex} not found`);
    process.exit(1);
  }

  console.log(`👤 Using wallet: ${signer.address}`);

  // Connect to EligibilityGate
  const EligibilityGate = await ethers.getContractFactory("EligibilityGate");
  const eligibilityGate = EligibilityGate.attach(eligibilityGateAddress);

  console.log(`🔐 EligibilityGate connected at: ${eligibilityGateAddress}`);

  // Check if already eligible
  try {
    const isEligible = await eligibilityGate.isEligible(signer.address, policyId);
    if (isEligible) {
      console.log("⚠️  Address is already eligible for this policy");
      console.log("   Use a different wallet or policy ID to test");
      process.exit(0);
    }
  } catch (error) {
    console.log("ℹ️  Could not check eligibility status, proceeding...");
  }

  // Convert proof to bytes
  const proofBytes = ethers.getBytes(proofData.proof);
  
  // Convert public inputs to BigInt array
  const publicInputsBigInt = proofData.publicInputs.map(input => BigInt(input));

  console.log("\n🔄 Submitting proof...");
  console.log(`   Proof length: ${proofBytes.length} bytes`);
  console.log(`   Public inputs count: ${publicInputsBigInt.length}`);

  try {
    // Submit the proof
    const tx = await eligibilityGate.connect(signer).submitZk(
      policyId,
      proofBytes,
      publicInputsBigInt
    );

    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    // Check eligibility status
    const isEligible = await eligibilityGate.isEligible(signer.address, policyId);
    
    console.log(`\n🎉 Proof submitted successfully!`);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Block Number: ${receipt?.blockNumber}`);
    console.log(`   Gas Used: ${receipt?.gasUsed.toString()}`);
    console.log(`   Eligibility Status: ${isEligible ? "✅ Eligible" : "❌ Not Eligible"}`);

    // Get nullifier from public inputs
    const nullifier = proofData.publicInputs[5]; // Last element is nullifier
    console.log(`   Nullifier: ${nullifier}`);

    // Check if nullifier is marked as used (convert to bytes32)
    const nullifierBytes32 = ethers.zeroPadValue(ethers.toBeHex(nullifier), 32);
    const nullifierUsed = await eligibilityGate.isNullifierUsed(nullifierBytes32);
    console.log(`   Nullifier Used: ${nullifierUsed ? "✅ Yes" : "❌ No"}`);

  } catch (error) {
    console.error("❌ Failed to submit proof:", error);
    
    // Try to provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes("Policy deadline passed")) {
        console.error("   The policy deadline has passed. Create a new policy with a future deadline.");
      } else if (error.message.includes("Nullifier already used")) {
        console.error("   This nullifier has already been used. Generate a new proof with different inputs.");
      } else if (error.message.includes("Invalid proof")) {
        console.error("   The proof is invalid. Check that the circuit and inputs are correct.");
      } else if (error.message.includes("mismatch")) {
        console.error("   Public input mismatch. Ensure the proof was generated for the correct policy.");
      }
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });