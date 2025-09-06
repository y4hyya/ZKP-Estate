const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("💰 Processing timeout refund...");

  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Default values (can be overridden by environment variables)
  let policyId = parseInt(process.env.POLICY_ID) || 1;
  let walletIndex = parseInt(process.env.WALLET_INDEX) || 1; // Use second account (tenant) by default
  let advanceTime = process.env.ADVANCE_TIME ? process.env.ADVANCE_TIME.toLowerCase() === "true" : false; // Whether to advance blockchain time for testing

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
      case "--advance-time":
        advanceTime = args[i + 1].toLowerCase() === "true";
        i++;
        break;
      case "--help":
        console.log(`
Usage: npx hardhat run scripts/timeoutRefund.ts --network <network> [options]

Options:
  --policy <number>         Policy ID (default: 1)
  --wallet <number>         Wallet index to use as tenant (default: 1)
  --advance-time <boolean>  Advance blockchain time for testing (default: false)
  --help                    Show this help message

Examples:
  npx hardhat run scripts/timeoutRefund.ts --network localhost
  npx hardhat run scripts/timeoutRefund.ts --network localhost --policy 2 --advance-time true
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
  const leaseEscrowAddress = deployment.contracts.LeaseEscrow.address;

  if (!leaseEscrowAddress) {
    console.error("❌ LeaseEscrow address not found in deployment file");
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

  // Connect to LeaseEscrow
  const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
  const leaseEscrow = LeaseEscrow.attach(leaseEscrowAddress);

  console.log(`💰 LeaseEscrow connected at: ${leaseEscrowAddress}`);

  // Get lease details
  let lease;
  try {
    lease = await leaseEscrow.getLease(policyId, tenant.address);
    console.log(`✅ Lease found for policy ${policyId}`);
  } catch (error) {
    console.error(`❌ Lease not found for policy ${policyId} and tenant ${tenant.address}`);
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
  console.log(`   Tenant: ${tenant.address}`);
  console.log(`   Lease Amount: ${ethers.formatEther(lease.amount)} ETH`);
  console.log(`   Lease Deadline: ${new Date(Number(lease.deadline) * 1000).toISOString()}`);

  // Check current time vs deadline
  const currentTime = Math.floor(Date.now() / 1000);
  const deadline = Number(lease.deadline);
  
  console.log(`   Current Time: ${new Date(currentTime * 1000).toISOString()}`);
  console.log(`   Time Until Deadline: ${deadline - currentTime} seconds`);

  // Advance time if requested (for testing)
  if (advanceTime) {
    console.log("\n⏰ Advancing blockchain time for testing...");
    const timeToAdvance = deadline - currentTime + 3600; // 1 hour past deadline
    
    try {
      await ethers.provider.send("evm_increaseTime", [timeToAdvance]);
      await ethers.provider.send("evm_mine", []);
      
      const newTime = Math.floor(Date.now() / 1000);
      console.log(`✅ Time advanced by ${timeToAdvance} seconds`);
      console.log(`   New Time: ${new Date(newTime * 1000).toISOString()}`);
    } catch (error) {
      console.error("❌ Failed to advance time:", error);
      process.exit(1);
    }
  }

  // Check if deadline has passed
  const currentBlockTime = await ethers.provider.getBlock("latest").then(block => block?.timestamp || 0);
  if (currentBlockTime <= deadline) {
    console.error(`❌ Deadline has not passed yet`);
    console.error(`   Current block time: ${new Date(currentBlockTime * 1000).toISOString()}`);
    console.error(`   Lease deadline: ${new Date(deadline * 1000).toISOString()}`);
    console.error(`   Use --advance-time true to advance time for testing`);
    process.exit(1);
  }

  console.log(`✅ Deadline has passed`);

  // Get tenant balance before refund
  const tenantBalanceBefore = await ethers.provider.getBalance(tenant.address);
  console.log(`💰 Tenant balance before: ${ethers.formatEther(tenantBalanceBefore)} ETH`);

  // Process the refund
  console.log("\n🔄 Processing timeout refund...");
  
  try {
    const tx = await leaseEscrow.connect(tenant).timeoutRefund(policyId);

    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    // Get tenant balance after refund
    const tenantBalanceAfter = await ethers.provider.getBalance(tenant.address);
    const refundedAmount = tenantBalanceAfter - tenantBalanceBefore + BigInt(receipt?.gasUsed || 0) * (receipt?.gasPrice || 0);

    // Check lease status
    const isActive = await leaseEscrow.isLeaseActive(policyId, tenant.address);
    
    console.log(`\n🎉 Timeout refund processed successfully!`);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Block Number: ${receipt?.blockNumber}`);
    console.log(`   Gas Used: ${receipt?.gasUsed.toString()}`);
    console.log(`   Lease Active: ${isActive ? "❌ No (refunded)" : "✅ Yes"}`);
    console.log(`   Amount Refunded: ${ethers.formatEther(refundedAmount)} ETH`);
    console.log(`   Tenant Balance After: ${ethers.formatEther(tenantBalanceAfter)} ETH`);

    // Show refund completion
    console.log(`\n💰 Refund Process Complete:`);
    console.log(`   1. ✅ Policy created`);
    console.log(`   2. ✅ ZK proof submitted`);
    console.log(`   3. ✅ Lease started`);
    console.log(`   4. ⏰ Lease deadline passed`);
    console.log(`   5. ✅ Timeout refund processed`);
    console.log(`   💰 Funds refunded to tenant: ${ethers.formatEther(refundedAmount)} ETH`);

  } catch (error) {
    console.error("❌ Failed to process timeout refund:", error);
    
    // Try to provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes("Not lease tenant")) {
        console.error("   Only the lease tenant can request a refund.");
      } else if (error.message.includes("Lease not active")) {
        console.error("   The lease is not active or has already been processed.");
      } else if (error.message.includes("Deadline not passed yet")) {
        console.error("   The lease deadline has not passed yet.");
      } else if (error.message.includes("Lease amount is zero")) {
        console.error("   The lease amount is zero.");
      } else if (error.message.includes("Failed to refund tenant")) {
        console.error("   Failed to refund tenant.");
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