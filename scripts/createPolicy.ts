import { ethers } from "hardhat";

async function main() {
  // Get contract address from command line or use default
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  // Get the contract
  const zkRent = await ethers.getContractAt("ZkRent", contractAddress);
  
  // Policy parameters
  const rentAmount = ethers.parseEther("1.0"); // 1 ETH per month
  const deposit = ethers.parseEther("2.0"); // 2 ETH deposit
  const duration = 30; // 30 days
  const propertyDetails = "QmPropertyHash123..."; // IPFS hash
  
  console.log("Creating rental policy...");
  console.log("Rent amount:", ethers.formatEther(rentAmount), "ETH");
  console.log("Deposit:", ethers.formatEther(deposit), "ETH");
  console.log("Duration:", duration, "days");
  
  // Create the policy
  const tx = await zkRent.createPolicy(
    rentAmount,
    deposit,
    duration,
    propertyDetails
  );
  
  const receipt = await tx.wait();
  console.log("Policy created! Transaction hash:", receipt?.hash);
  
  // Get the policy ID from the event
  const event = receipt?.logs.find(log => {
    try {
      const parsed = zkRent.interface.parseLog(log);
      return parsed?.name === "PolicyCreated";
    } catch {
      return false;
    }
  });
  
  if (event) {
    const parsed = zkRent.interface.parseLog(event);
    const policyId = parsed?.args[0];
    console.log("Policy ID:", policyId?.toString());
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
