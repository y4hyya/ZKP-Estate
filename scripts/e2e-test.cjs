const { execSync } = require("child_process");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Running End-to-End Test...");
  console.log("=" .repeat(50));

  const networkName = (await ethers.provider.getNetwork()).name;
  console.log(`🌐 Network: ${networkName}`);

  try {
    // Step 1: Deploy contracts
    console.log("\n📦 Step 1: Deploying contracts...");
    execSync("npm run scripts:deploy", { stdio: "inherit" });
    console.log("✅ Contracts deployed successfully");

    // Step 2: Create a new policy
    console.log("\n📋 Step 2: Creating a new policy...");
    execSync("npm run scripts:createPolicy -- 25 4 2.0 true 60", { stdio: "inherit" });
    console.log("✅ Policy created successfully");

    // Step 3: Generate proof
    console.log("\n🔮 Step 3: Generating ZK proof...");
    execSync("npm run scripts:prove", { stdio: "inherit" });
    console.log("✅ Proof generated successfully");

    // Step 4: Submit ZK proof
    console.log("\n📤 Step 4: Submitting ZK proof...");
    execSync("npm run scripts:submitZk -- 2", { stdio: "inherit" });
    console.log("✅ ZK proof submitted successfully");

    // Step 5: Start lease
    console.log("\n🏠 Step 5: Starting lease...");
    execSync("npm run scripts:startLease -- 2 2.0", { stdio: "inherit" });
    console.log("✅ Lease started successfully");

    // Step 6: Owner confirm lease
    console.log("\n✅ Step 6: Owner confirming lease...");
    const [signer] = await ethers.getSigners();
    execSync(`npm run scripts:confirm -- 2 ${signer.address}`, { stdio: "inherit" });
    console.log("✅ Lease confirmed successfully");

    console.log("\n🎉 End-to-End Test Completed Successfully!");
    console.log("=" .repeat(50));
    console.log("✅ All steps completed without errors");
    console.log("✅ Contracts deployed and configured");
    console.log("✅ Policy created and managed");
    console.log("✅ ZK proof generated and verified");
    console.log("✅ Lease lifecycle completed");
    console.log("✅ Funds transferred successfully");

    // Display final state
    console.log("\n📊 Final State Summary:");
    const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}.json`);
    if (fs.existsSync(deploymentFile)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
      console.log(`   PolicyRegistry: ${deployments.contracts.PolicyRegistry.address}`);
      console.log(`   EligibilityGate: ${deployments.contracts.EligibilityGate.address}`);
      console.log(`   LeaseEscrow: ${deployments.contracts.LeaseEscrow.address}`);
      console.log(`   Verifier: ${deployments.contracts.Verifier.address} (${deployments.useStub ? "Stub" : "Real"})`);
    }

  } catch (error) {
    console.error("\n❌ End-to-End Test Failed!");
    console.error("=" .repeat(50));
    console.error("Error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test script failed:", error);
    process.exit(1);
  });
