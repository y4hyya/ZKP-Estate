import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const leaseId = process.env.LEASE_ID || "1";
  
  console.log("Processing refund for early termination...");
  console.log("Contract address:", contractAddress);
  console.log("Lease ID:", leaseId);
  
  // Get the contract
  const zkRent = await ethers.getContractAt("ZkRent", contractAddress);
  
  // Get lease details
  const lease = await zkRent.leases(leaseId);
  console.log("Lease details:");
  console.log("Tenant:", lease.tenant);
  console.log("Start time:", new Date(Number(lease.startTime) * 1000).toISOString());
  console.log("End time:", new Date(Number(lease.endTime) * 1000).toISOString());
  console.log("Is active:", lease.isActive);
  console.log("Is confirmed:", lease.isConfirmed);
  
  if (!lease.isActive) {
    console.error("Lease is not active!");
    process.exit(1);
  }
  
  // Get policy details
  const policy = await zkRent.policies(lease.policyId);
  console.log("Policy details:");
  console.log("Landlord:", policy.landlord);
  console.log("Original deposit:", ethers.formatEther(lease.deposit), "ETH");
  
  // Check if caller is the landlord
  const [signer] = await ethers.getSigners();
  if (signer.address.toLowerCase() !== policy.landlord.toLowerCase()) {
    console.error("Only the landlord can process refunds!");
    console.error("Expected landlord:", policy.landlord);
    console.error("Caller:", signer.address);
    process.exit(1);
  }
  
  // Check if lease has already ended
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime >= Number(lease.endTime)) {
    console.error("Lease has already ended. Use confirmLease instead.");
    process.exit(1);
  }
  
  // Calculate time remaining and expected refund
  const timeRemaining = Number(lease.endTime) - currentTime;
  const totalDuration = Number(lease.endTime) - Number(lease.startTime);
  const expectedRefund = (lease.deposit * BigInt(timeRemaining)) / BigInt(totalDuration);
  
  console.log("Time remaining:", timeRemaining, "seconds");
  console.log("Total duration:", totalDuration, "seconds");
  console.log("Expected refund:", ethers.formatEther(expectedRefund), "ETH");
  
  // Get tenant balance before refund
  const tenantBalanceBefore = await ethers.provider.getBalance(lease.tenant);
  console.log("Tenant balance before refund:", ethers.formatEther(tenantBalanceBefore), "ETH");
  
  // Process the refund
  console.log("Processing refund...");
  const tx = await zkRent.processRefund(leaseId);
  
  const receipt = await tx.wait();
  console.log("Refund processed! Transaction hash:", receipt?.hash);
  
  // Get tenant balance after refund
  const tenantBalanceAfter = await ethers.provider.getBalance(lease.tenant);
  console.log("Tenant balance after refund:", ethers.formatEther(tenantBalanceAfter), "ETH");
  
  const actualRefund = tenantBalanceAfter - tenantBalanceBefore;
  console.log("Actual refund amount:", ethers.formatEther(actualRefund), "ETH");
  
  // Verify lease status
  const updatedLease = await zkRent.leases(leaseId);
  console.log("\nUpdated lease status:");
  console.log("Is active:", updatedLease.isActive);
  console.log("Is confirmed:", updatedLease.isConfirmed);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
