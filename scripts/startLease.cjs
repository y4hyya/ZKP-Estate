const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🏠 Starting rental lease...");

  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Default values (can be overridden by environment variables)
  let policyId = parseInt(process.env.POLICY_ID) || 1;
  let walletIndex = parseInt(process.env.WALLET_INDEX) || 1; // Use second account (tenant) by default
  let rentAmount = process.env.RENT_AMOUNT || null; // Will be fetched from policy

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--policy":
        policyId = parseInt(args[i + 1]);
        i++;
        break;
      case "--wallet":
        walletIndex = parseInt(args[i + 1]);
        i++;
        break;
      case "--rent":
        rentAmount = args[i + 1];
        i++;
        break;
      case "--help":
        console.log(`
Usage: npx hardhat run scripts/startLease.ts --network <network> [options]

Options:
  --policy <number>         Policy ID to use (default: 1)
  --wallet <number>         Wallet index to use as tenant (default: 1)
  --rent <amount>           Rent amount in ETH (if not specified, will use policy amount)
  --help                    Show this help message

Examples:
  npx hardhat run scripts/startLease.ts --network localhost
  npx hardhat run scripts/startLease.ts --network localhost --policy 2 --wallet 2
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
  const leaseEscrowAddress = deployment.contracts.LeaseEscrow.address;

  if (!policyRegistryAddress || !leaseEscrowAddress) {
    console.error("❌ Required contract addresses not found in deployment file");
    process.exit(1);
  }

  // Get signer
  const signers = await ethers.getSigners();
  const tenant = signers[walletIndex];
  
  if (!tenant) {
    console.error(`❌ Wallet index ${walletIndex} not found`);
    process.exit(1);
  }

  console.log(`👤 Using tenant wallet: ${tenant.address}`);

  // Connect to contracts
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
  
  const policyRegistry = PolicyRegistry.attach(policyRegistryAddress);
  const leaseEscrow = LeaseEscrow.attach(leaseEscrowAddress);

  console.log(`📋 PolicyRegistry connected at: ${policyRegistryAddress}`);
  console.log(`💰 LeaseEscrow connected at: ${leaseEscrowAddress}`);

  // Get policy details
  let policy;
  try {
    policy = await policyRegistry.getPolicy(policyId);
    console.log(`✅ Policy ${policyId} found`);
  } catch (error) {
    console.error(`❌ Policy ${policyId} not found`);
    process.exit(1);
  }

  // Check if policy deadline has passed
  const currentTime = Math.floor(Date.now() / 1000);
  if (Number(policy.deadline) < currentTime) {
    console.error(`❌ Policy deadline has passed`);
    console.error(`   Policy deadline: ${new Date(Number(policy.deadline) * 1000).toISOString()}`);
    console.error(`   Current time: ${new Date(currentTime * 1000).toISOString()}`);
    process.exit(1);
  }

  // Check if tenant is eligible
  try {
    const eligibilityGateAddress = await leaseEscrow.getEligibilityGate();
    const EligibilityGateTLS = await ethers.getContractFactory("EligibilityGateTLS");
    const eligibilityGate = EligibilityGateTLS.attach(eligibilityGateAddress);

    const isEligible = await eligibilityGate.isEligible(tenant.address, policyId);
    if (!isEligible) {
      console.error(`❌ Tenant is not eligible for policy ${policyId}`);
      console.error("   Please submit a TLS attestation first.");
      process.exit(1);
    }
    console.log(`✅ Tenant is eligible for policy ${policyId}`);
  } catch (error) {
    console.error("❌ Could not check eligibility status:", error);
    process.exit(1);
  }

  // Check if lease already exists
  try {
    const existingLease = await leaseEscrow.getLease(policyId, tenant.address);
    if (existingLease.active) {
      console.error(`❌ Active lease already exists for this tenant and policy`);
      console.error(`   Lease amount: ${ethers.formatEther(existingLease.amount)} ETH`);
      console.error(`   Lease deadline: ${new Date(Number(existingLease.deadline) * 1000).toISOString()}`);
      process.exit(1);
    }
  } catch (error) {
    // Lease doesn't exist, which is fine
  }

  // Determine rent amount
  const rentWei = rentAmount ? ethers.parseEther(rentAmount) : policy.rentWei;
  
  console.log("\n📝 Lease Details:");
  console.log(`   Policy ID: ${policyId}`);
  console.log(`   Tenant: ${tenant.address}`);
  console.log(`   Rent Amount: ${ethers.formatEther(rentWei)} ETH`);
  console.log(`   Policy Deadline: ${new Date(Number(policy.deadline) * 1000).toISOString()}`);
  console.log(`   Min Age: ${policy.minAge}`);
  console.log(`   Income Mul: ${policy.incomeMul}x`);
  console.log(`   Clean Record Required: ${policy.needCleanRec ? "Yes" : "No"}`);

  // Check tenant balance
  const balance = await ethers.provider.getBalance(tenant.address);
  if (balance < rentWei) {
    console.error(`❌ Insufficient balance`);
    console.error(`   Required: ${ethers.formatEther(rentWei)} ETH`);
    console.error(`   Available: ${ethers.formatEther(balance)} ETH`);
    process.exit(1);
  }

  console.log(`✅ Tenant balance sufficient: ${ethers.formatEther(balance)} ETH`);

  // Start the lease
  console.log("\n🔄 Starting lease...");
  
  try {
    const tx = await leaseEscrow.connect(tenant).startLease(policyId, { value: rentWei });

    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    // Get lease details
    const lease = await leaseEscrow.getLease(policyId, tenant.address);
    const isActive = await leaseEscrow.isLeaseActive(policyId, tenant.address);
    
    console.log(`\n🎉 Lease started successfully!`);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Block Number: ${receipt?.blockNumber}`);
    console.log(`   Gas Used: ${receipt?.gasUsed.toString()}`);
    console.log(`   Lease Active: ${isActive ? "✅ Yes" : "❌ No"}`);
    console.log(`   Lease Amount: ${ethers.formatEther(lease.amount)} ETH`);
    console.log(`   Lease Deadline: ${new Date(Number(lease.deadline) * 1000).toISOString()}`);

    // Show next steps
    console.log(`\n📋 Next Steps:`);
    console.log(`   1. Owner can confirm lease: npm run scripts:confirm -- --policy ${policyId} --tenant ${tenant.address}`);
    console.log(`   2. Tenant can refund after deadline: npm run scripts:refund -- --policy ${policyId}`);

  } catch (error) {
    console.error("❌ Failed to start lease:", error);
    
    // Try to provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes("Tenant not eligible")) {
        console.error("   The tenant is not eligible. Submit a ZK proof first.");
      } else if (error.message.includes("Incorrect rent amount")) {
        console.error("   The rent amount doesn't match the policy requirement.");
      } else if (error.message.includes("Lease already active")) {
        console.error("   An active lease already exists for this tenant and policy.");
      } else if (error.message.includes("Policy deadline passed")) {
        console.error("   The policy deadline has passed.");
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