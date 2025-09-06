import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("📋 Creating new rental policy...");

  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Default values
  let minAge = 18;
  let incomeMul = 3;
  let rentWei = ethers.parseEther("1.0");
  let needCleanRec = true;
  let deadline = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days from now

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--min-age":
        minAge = parseInt(args[i + 1]);
        i++;
        break;
      case "--income-mul":
        incomeMul = parseInt(args[i + 1]);
        i++;
        break;
      case "--rent-eth":
        rentWei = ethers.parseEther(args[i + 1]);
        i++;
        break;
      case "--clean-record":
        needCleanRec = args[i + 1].toLowerCase() === "true";
        i++;
        break;
      case "--deadline-days":
        deadline = Math.floor(Date.now() / 1000) + parseInt(args[i + 1]) * 86400;
        i++;
        break;
      case "--help":
        console.log(`
Usage: npx hardhat run scripts/createPolicy.ts --network <network> [options]

Options:
  --min-age <number>        Minimum age requirement (default: 18)
  --income-mul <number>     Income multiplier (default: 3)
  --rent-eth <number>       Rent amount in ETH (default: 1.0)
  --clean-record <boolean>  Require clean record (default: true)
  --deadline-days <number>  Deadline in days from now (default: 30)
  --help                    Show this help message

Examples:
  npx hardhat run scripts/createPolicy.ts --network localhost
  npx hardhat run scripts/createPolicy.ts --network localhost --min-age 21 --rent-eth 2.5
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
  const policyRegistryAddress = deployment.contracts.PolicyRegistry.address;

  if (!policyRegistryAddress) {
    console.error("❌ PolicyRegistry address not found in deployment file");
    process.exit(1);
  }

  // Connect to PolicyRegistry
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const policyRegistry = PolicyRegistry.attach(policyRegistryAddress);

  console.log(`📋 PolicyRegistry connected at: ${policyRegistryAddress}`);

  // Display policy parameters
  console.log("\n📝 Policy Parameters:");
  console.log(`   Minimum Age: ${minAge} years`);
  console.log(`   Income Multiplier: ${incomeMul}x rent`);
  console.log(`   Rent Amount: ${ethers.formatEther(rentWei)} ETH`);
  console.log(`   Clean Record Required: ${needCleanRec ? "Yes" : "No"}`);
  console.log(`   Deadline: ${new Date(deadline * 1000).toISOString()}`);

  // Create the policy
  console.log("\n🔄 Creating policy...");
  
  try {
    const tx = await policyRegistry.createPolicy(
      minAge,
      incomeMul,
      rentWei,
      needCleanRec,
      deadline
    );

    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    // Get the new policy ID
    const policyCount = await policyRegistry.getPolicyCount();
    const policyId = policyCount;

    console.log(`\n🎉 Policy created successfully!`);
    console.log(`   Policy ID: ${policyId}`);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Block Number: ${receipt?.blockNumber}`);

    // Get policy details
    const policy = await policyRegistry.getPolicy(policyId);
    console.log(`\n📋 Policy Details:`);
    console.log(`   Min Age: ${policy.minAge}`);
    console.log(`   Income Mul: ${policy.incomeMul}`);
    console.log(`   Rent Wei: ${policy.rentWei.toString()}`);
    console.log(`   Need Clean Rec: ${policy.needCleanRec}`);
    console.log(`   Deadline: ${new Date(Number(policy.deadline) * 1000).toISOString()}`);
    console.log(`   Owner: ${policy.owner}`);
    console.log(`   Policy Hash: ${policy.policyHash}`);

  } catch (error) {
    console.error("❌ Failed to create policy:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });