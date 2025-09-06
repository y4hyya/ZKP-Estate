import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Deploying ZkRent contracts...");

  // Get the contract factory
  const ZkRent = await ethers.getContractFactory("ZkRent");
  
  // Deploy the contract
  const zkRent = await ZkRent.deploy();
  await zkRent.waitForDeployment();

  const zkRentAddress = await zkRent.getAddress();
  console.log("ZkRent deployed to:", zkRentAddress);

  // Get the VerifierStub address
  const verifierAddress = await zkRent.verifier();
  console.log("VerifierStub deployed to:", verifierAddress);

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    contracts: {
      ZkRent: {
        address: zkRentAddress,
        transactionHash: zkRent.deploymentTransaction()?.hash,
      },
      VerifierStub: {
        address: verifierAddress,
      },
    },
    timestamp: new Date().toISOString(),
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  const networkName = (await ethers.provider.getNetwork()).name;
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("Deployment info saved to:", deploymentFile);

  // Verify deployment
  console.log("\nVerifying deployment...");
  const platformFee = await zkRent.platformFee();
  console.log("Platform fee:", platformFee.toString(), "basis points");

  console.log("\nDeployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
