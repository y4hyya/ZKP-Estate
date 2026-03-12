const { execSync } = require("child_process");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Running End-to-End TLS Test...");
  console.log("=".repeat(50));

  const networkName = (await ethers.provider.getNetwork()).name;
  console.log(`Network: ${networkName}`);

  try {
    // Step 1: Deploy contracts
    console.log("\nStep 1: Deploying contracts...");
    execSync("npm run scripts:deploy", { stdio: "inherit" });
    console.log("Contracts deployed successfully");

    // Step 2: Create a policy
    console.log("\nStep 2: Creating a policy...");
    execSync("npm run scripts:createPolicy -- 25 4 2.0 true 60", { stdio: "inherit" });
    console.log("Policy created successfully");

    // Step 3: Start lease
    console.log("\nStep 3: Starting lease...");
    execSync("npm run scripts:startLease -- 2 2.0", { stdio: "inherit" });
    console.log("Lease started successfully");

    // Step 4: Owner confirm lease
    console.log("\nStep 4: Owner confirming lease...");
    const [signer] = await ethers.getSigners();
    execSync(`npm run scripts:confirm -- 2 ${signer.address}`, { stdio: "inherit" });
    console.log("Lease confirmed successfully");

    console.log("\nEnd-to-End Test Completed Successfully!");
    console.log("=".repeat(50));

    // Display final state
    const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}.json`);
    if (fs.existsSync(deploymentFile)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
      console.log("\nDeployed Contracts:");
      console.log(`  PolicyRegistry:     ${deployments.contracts.PolicyRegistry.address}`);
      console.log(`  EligibilityGateTLS: ${deployments.contracts.EligibilityGateTLS.address}`);
      console.log(`  LeaseEscrow:        ${deployments.contracts.LeaseEscrow.address}`);
    }

  } catch (error) {
    console.error("\nEnd-to-End Test Failed!");
    console.error("=".repeat(50));
    console.error("Error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
