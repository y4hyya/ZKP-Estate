import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const leaseId = process.env.LEASE_ID || "1";
  
  console.log("Confirming lease completion...");
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
  
  if (lease.isConfirmed) {
    console.error("Lease is already confirmed!");
    process.exit(1);
  }
  
  // Check if lease has ended
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime < Number(lease.endTime)) {
    console.log("Warning: Lease has not yet ended.");
    console.log("Current time:", new Date(currentTime * 1000).toISOString());
    console.log("Lease end time:", new Date(Number(lease.endTime) * 1000).toISOString());
    console.log("Time remaining:", Number(lease.endTime) - currentTime, "seconds");
  }
  
  // Get account balance before confirmation
  const [signer] = await ethers.getSigners();
  const balanceBefore = await ethers.provider.getBalance(signer.address);
  console.log("Account balance before confirmation:", ethers.formatEther(balanceBefore), "ETH");
  
  // Confirm the lease
  console.log("Confirming lease...");
  const tx = await zkRent.confirmLease(leaseId);
  
  const receipt = await tx.wait();
  console.log("Lease confirmed! Transaction hash:", receipt?.hash);
  
  // Get account balance after confirmation
  const balanceAfter = await ethers.provider.getBalance(signer.address);
  console.log("Account balance after confirmation:", ethers.formatEther(balanceAfter), "ETH");
  
  const refundAmount = balanceAfter - balanceBefore;
  console.log("Deposit refunded:", ethers.formatEther(refundAmount), "ETH");
  
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
