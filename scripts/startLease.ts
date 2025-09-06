import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const policyId = process.env.POLICY_ID || "1";
  
  console.log("Starting lease...");
  console.log("Contract address:", contractAddress);
  console.log("Policy ID:", policyId);
  
  // Get the contract
  const zkRent = await ethers.getContractAt("ZkRent", contractAddress);
  
  // Get policy details
  const policy = await zkRent.policies(policyId);
  console.log("Policy details:");
  console.log("Landlord:", policy.landlord);
  console.log("Rent amount:", ethers.formatEther(policy.rentAmount), "ETH");
  console.log("Deposit:", ethers.formatEther(policy.deposit), "ETH");
  console.log("Duration:", policy.duration.toString(), "days");
  console.log("Is active:", policy.isActive);
  
  if (!policy.isActive) {
    console.error("Policy is not active!");
    process.exit(1);
  }
  
  // Generate a mock proof hash for demo purposes
  const proofHash = ethers.keccak256(ethers.toUtf8Bytes(`proof_${policyId}_${Date.now()}`));
  console.log("Using proof hash:", proofHash);
  
  // Calculate total amount needed
  const totalAmount = policy.rentAmount + policy.deposit;
  console.log("Total amount required:", ethers.formatEther(totalAmount), "ETH");
  
  // Check if we have enough balance
  const [signer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < totalAmount) {
    console.error("Insufficient balance!");
    process.exit(1);
  }
  
  // Start the lease
  console.log("Starting lease...");
  const tx = await zkRent.startLease(policyId, proofHash, {
    value: totalAmount
  });
  
  const receipt = await tx.wait();
  console.log("Lease started! Transaction hash:", receipt?.hash);
  
  // Get the lease ID from the event
  const event = receipt?.logs.find(log => {
    try {
      const parsed = zkRent.interface.parseLog(log);
      return parsed?.name === "LeaseStarted";
    } catch {
      return false;
    }
  });
  
  if (event) {
    const parsed = zkRent.interface.parseLog(event);
    const leaseId = parsed?.args[2];
    console.log("Lease ID:", leaseId?.toString());
    
    // Get lease details
    const lease = await zkRent.leases(leaseId);
    console.log("\nLease details:");
    console.log("Tenant:", lease.tenant);
    console.log("Start time:", new Date(Number(lease.startTime) * 1000).toISOString());
    console.log("End time:", new Date(Number(lease.endTime) * 1000).toISOString());
    console.log("Is active:", lease.isActive);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
