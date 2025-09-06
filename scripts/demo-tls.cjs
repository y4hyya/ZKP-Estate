const { ethers } = require("hardhat");

async function main() {
  console.log("🔐 ZKP-Estate TLS Eligibility Gate Demo");
  console.log("=====================================\n");

  // Get signers
  const [owner, attestor, tenant] = await ethers.getSigners();
  console.log(`Owner: ${await owner.getAddress()}`);
  console.log(`Attestor: ${await attestor.getAddress()}`);
  console.log(`Tenant: ${await tenant.getAddress()}\n`);

  // Deploy EligibilityGateTLS
  console.log("📋 Deploying EligibilityGateTLS...");
  const EligibilityGateTLS = await ethers.getContractFactory("EligibilityGateTLS");
  const eligibilityGateTLS = await EligibilityGateTLS.deploy(
    await attestor.getAddress(),
    await owner.getAddress()
  );
  await eligibilityGateTLS.waitForDeployment();
  console.log(`✅ EligibilityGateTLS deployed at: ${await eligibilityGateTLS.getAddress()}\n`);

  // Create attestation
  const policyId = 1;
  const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const nullifier = ethers.keccak256(ethers.toUtf8Bytes(`tls-nullifier-${Date.now()}`));
  
  const attestation = {
    wallet: await tenant.getAddress(),
    policyId: policyId,
    expiry: expiry,
    nullifier: nullifier,
    passBitmask: 0x07 // All checks passed (age, income, clean record)
  };

  console.log("📝 Creating EIP-712 attestation...");
  console.log(`   Wallet: ${attestation.wallet}`);
  console.log(`   Policy ID: ${attestation.policyId}`);
  console.log(`   Expiry: ${new Date(attestation.expiry * 1000).toISOString()}`);
  console.log(`   Nullifier: ${attestation.nullifier}`);
  console.log(`   Pass Bitmask: 0x${attestation.passBitmask.toString(16)} (all checks passed)\n`);

  // Create EIP-712 signature
  const domain = {
    name: "ZKPRent-TLS",
    version: "1",
    chainId: 31337, // Hardhat default
    verifyingContract: await eligibilityGateTLS.getAddress()
  };

  const types = {
    Attestation: [
      { name: "wallet", type: "address" },
      { name: "policyId", type: "uint256" },
      { name: "expiry", type: "uint64" },
      { name: "nullifier", type: "bytes32" },
      { name: "passBitmask", type: "uint8" }
    ]
  };

  const signature = await attestor.signTypedData(domain, types, attestation);
  console.log(`✅ Attestation signed by attestor\n`);

  // Check initial eligibility
  console.log("🔍 Checking initial eligibility...");
  const initialEligibility = await eligibilityGateTLS.isEligible(await tenant.getAddress(), policyId);
  console.log(`   Eligible: ${initialEligibility ? "✅ Yes" : "❌ No"}\n`);

  // Submit attestation
  console.log("📤 Submitting TLS attestation...");
  const tx = await eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature);
  const receipt = await tx.wait();
  console.log(`✅ Attestation submitted in transaction: ${tx.hash}`);

  // Check eligibility after submission
  console.log("\n🔍 Checking eligibility after submission...");
  const finalEligibility = await eligibilityGateTLS.isEligible(await tenant.getAddress(), policyId);
  console.log(`   Eligible: ${finalEligibility ? "✅ Yes" : "❌ No"}`);

  // Check nullifier usage
  const nullifierUsed = await eligibilityGateTLS.nullifierUsed(nullifier);
  console.log(`   Nullifier Used: ${nullifierUsed ? "✅ Yes" : "❌ No"}`);

  console.log("\n🎉 TLS Eligibility Gate Demo completed successfully!");
  console.log("\n📋 Summary:");
  console.log(`   - Contract: ${await eligibilityGateTLS.getAddress()}`);
  console.log(`   - Attestor: ${await attestor.getAddress()}`);
  console.log(`   - Tenant: ${await tenant.getAddress()}`);
  console.log(`   - Policy ID: ${policyId}`);
  console.log(`   - Eligible: ${finalEligibility ? "Yes" : "No"}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
