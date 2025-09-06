const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("✅ Owner confirming lease...");

  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Default values (can be overridden by environment variables)
  let policyId = parseInt(process.env.POLICY_ID) || 1;
  let tenantAddress = process.env.TENANT_ADDRESS || null;
  let walletIndex = parseInt(process.env.WALLET_INDEX) || 0; // Use first account (owner) by default

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--policy":
        policyId = parseInt(args[i + 1]);
        i++;
        break;
      case "--tenant":
        tenantAddress = args[i + 1];
        i++;
        break;
      case "--wallet":
        walletIndex = parseInt(args[i + 1]);
        i++;
        break;
      case "--help":
        console.log(`
Usage: npx hardhat run scripts/ownerConfirm.ts --network <network> [options]

Options:
  --policy <number>         Policy ID (default: 1)
  --tenant <address>        Tenant address (required)
  --wallet <number>         Wallet index to use as owner (default: 0)
  --help                    Show this help message

Examples:
  npx hardhat run scripts/ownerConfirm.ts --network localhost --tenant 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  npx hardhat run scripts/ownerConfirm.ts --network localhost --policy 2 --tenant 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
        `);
        process.exit(0);
    }
  }

  if (!tenantAddress) {
    console.error("❌ Tenant address is required. Use --tenant <address>");
    process.exit(1);
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
  const owner = signers[walletIndex];
  
  if (!owner) {
    console.error(`❌ Wallet index ${walletIndex} not found`);
    process.exit(1);
  }

  console.log(`👤 Using owner wallet: ${owner.address}`);
  console.log(`👤 Tenant address: ${tenantAddress}`);

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

  // Check if caller is the policy owner
  if (policy.owner.toLowerCase() !== owner.address.toLowerCase()) {
    console.error(`❌ Not the policy owner`);
    console.error(`   Policy owner: ${policy.owner}`);
    console.error(`   Caller: ${owner.address}`);
    process.exit(1);
  }

  console.log(`✅ Caller is the policy owner`);

  // Get lease details
  let lease;
  try {
    lease = await leaseEscrow.getLease(policyId, tenantAddress);
    console.log(`✅ Lease found for tenant ${tenantAddress}`);
  } catch (error) {
    console.error(`❌ Lease not found for tenant ${tenantAddress}`);
    process.exit(1);
  }

  // Check if lease is active
  if (!lease.active) {
    console.error(`❌ Lease is not active`);
    console.error(`   Lease may have been already confirmed or refunded`);
    process.exit(1);
  }

  console.log(`✅ Lease is active`);

  // Check lease details
  console.log("\n📝 Lease Details:");
  console.log(`   Policy ID: ${policyId}`);
  console.log(`   Tenant: ${tenantAddress}`);
  console.log(`   Lease Amount: ${ethers.formatEther(lease.amount)} ETH`);
  console.log(`   Lease Deadline: ${new Date(Number(lease.deadline) * 1000).toISOString()}`);
  console.log(`   Lease Active: ${lease.active ? "Yes" : "No"}`);

  // Get owner balance before confirmation
  const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
  console.log(`💰 Owner balance before: ${ethers.formatEther(ownerBalanceBefore)} ETH`);

  // Confirm the lease
  console.log("\n🔄 Confirming lease...");
  
  try {
    const tx = await leaseEscrow.connect(owner).ownerConfirm(policyId, tenantAddress);

    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    // Get owner balance after confirmation
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    const receivedAmount = ownerBalanceAfter - ownerBalanceBefore + BigInt(receipt?.gasUsed || 0) * (receipt?.gasPrice || 0);

    // Check lease status
    const isActive = await leaseEscrow.isLeaseActive(policyId, tenantAddress);
    
    console.log(`\n🎉 Lease confirmed successfully!`);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Block Number: ${receipt?.blockNumber}`);
    console.log(`   Gas Used: ${receipt?.gasUsed.toString()}`);
    console.log(`   Lease Active: ${isActive ? "❌ No (confirmed)" : "✅ Yes"}`);
    console.log(`   Amount Received: ${ethers.formatEther(receivedAmount)} ETH`);
    console.log(`   Owner Balance After: ${ethers.formatEther(ownerBalanceAfter)} ETH`);

    // Show lease completion
    console.log(`\n✅ Lease Process Complete:`);
    console.log(`   1. ✅ Policy created`);
    console.log(`   2. ✅ ZK proof submitted`);
    console.log(`   3. ✅ Lease started`);
    console.log(`   4. ✅ Lease confirmed by owner`);
    console.log(`   💰 Funds transferred to owner: ${ethers.formatEther(receivedAmount)} ETH`);

  } catch (error) {
    console.error("❌ Failed to confirm lease:", error);
    
    // Try to provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes("Not policy owner")) {
        console.error("   Only the policy owner can confirm the lease.");
      } else if (error.message.includes("Lease not active")) {
        console.error("   The lease is not active or has already been processed.");
      } else if (error.message.includes("Lease amount is zero")) {
        console.error("   The lease amount is zero.");
      } else if (error.message.includes("Failed to transfer funds")) {
        console.error("   Failed to transfer funds to owner.");
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