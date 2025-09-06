const { ethers } = require("hardhat");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing complete ZKP-Estate flow...");
  console.log("=" .repeat(50));

  const network = "localhost";
  const useStub = process.env.USE_STUB === "1";

  try {
    // Step 1: Deploy contracts
    console.log("\n📋 Step 1: Deploying contracts...");
    const deployCmd = useStub ? "npm run dev:deploy:stub" : "npm run dev:deploy";
    execSync(deployCmd, { stdio: "inherit" });
    console.log("✅ Contracts deployed successfully");

    // Step 2: Create a new policy
    console.log("\n📋 Step 2: Creating a new policy...");
    const createPolicyEnv = {
      ...process.env,
      MIN_AGE: "18",
      RENT_ETH: "1.0",
      CLEAN_RECORD: "true",
      DEADLINE_DAYS: "7"
    };
    execSync(`npx hardhat run scripts/createPolicy.cjs --network ${network} --no-compile`, { stdio: "inherit", env: createPolicyEnv });
    console.log("✅ Policy created successfully");

    // Step 3: Generate proof
    console.log("\n📋 Step 3: Generating ZK proof...");
    const proveEnv = {
      ...process.env,
      POLICY_ID: "2", // Use the sample policy created during deployment
      AGE: "25",
      INCOME: "3.0", // Match the 3x rent requirement
      CRIMINAL: "false"
    };
    execSync(`npx hardhat run scripts/prove.cjs --network ${network} --no-compile`, { stdio: "inherit", env: proveEnv });
    console.log("✅ Proof generated successfully");

    // Step 4: Submit proof
    console.log("\n📋 Step 4: Submitting ZK proof...");
    const submitEnv = {
      ...process.env,
      POLICY_ID: "2",
      WALLET_INDEX: "1"
    };
    execSync(`npx hardhat run scripts/submitZk.cjs --network ${network} --no-compile`, { stdio: "inherit", env: submitEnv });
    console.log("✅ Proof submitted successfully");

    // Step 5: Start lease
    console.log("\n📋 Step 5: Starting lease...");
    const startLeaseEnv = {
      ...process.env,
      POLICY_ID: "2",
      WALLET_INDEX: "1"
    };
    execSync(`npx hardhat run scripts/startLease.cjs --network ${network} --no-compile`, { stdio: "inherit", env: startLeaseEnv });
    console.log("✅ Lease started successfully");

    // Step 6: Owner confirms lease
    console.log("\n📋 Step 6: Owner confirming lease...");
    const signers = await ethers.getSigners();
    const tenantAddress = await signers[1].getAddress();
    const confirmEnv = {
      ...process.env,
      POLICY_ID: "2",
      TENANT_ADDRESS: tenantAddress,
      WALLET_INDEX: "0"
    };
    execSync(`npx hardhat run scripts/ownerConfirm.cjs --network ${network} --no-compile`, { stdio: "inherit", env: confirmEnv });
    console.log("✅ Lease confirmed successfully");

    console.log("\n🎉 Complete flow test passed!");
    console.log("=" .repeat(50));
    console.log("✅ All steps completed successfully:");
    console.log("   1. ✅ Contracts deployed");
    console.log("   2. ✅ Policy created");
    console.log("   3. ✅ ZK proof generated");
    console.log("   4. ✅ ZK proof submitted");
    console.log("   5. ✅ Lease started");
    console.log("   6. ✅ Lease confirmed by owner");

  } catch (error) {
    console.error("\n❌ Flow test failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
