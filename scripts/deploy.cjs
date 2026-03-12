const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying ZKP-Estate contracts (TLS mode)...");

  const [owner, attestor] = await ethers.getSigners();

  // Get attestor address from environment or use second signer
  const attestorAddress =
    process.env.ATTESTOR_ADDRESS || (await attestor.getAddress());
  console.log("Attestor address:", attestorAddress);

  // Deploy PolicyRegistry
  console.log("\nDeploying PolicyRegistry...");
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const policyRegistry = await PolicyRegistry.deploy();
  await policyRegistry.waitForDeployment();
  const policyRegistryAddress = await policyRegistry.getAddress();
  console.log("PolicyRegistry deployed to:", policyRegistryAddress);

  // Deploy EligibilityGateTLS
  console.log("\nDeploying EligibilityGateTLS...");
  const EligibilityGateTLS = await ethers.getContractFactory(
    "EligibilityGateTLS"
  );
  const eligibilityGateTLS = await EligibilityGateTLS.deploy(
    attestorAddress,
    await owner.getAddress()
  );
  await eligibilityGateTLS.waitForDeployment();
  const eligibilityGateAddress = await eligibilityGateTLS.getAddress();
  console.log("EligibilityGateTLS deployed to:", eligibilityGateAddress);

  // Deploy LeaseEscrow
  console.log("\nDeploying LeaseEscrow...");
  const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
  const leaseEscrow = await LeaseEscrow.deploy(
    policyRegistryAddress,
    eligibilityGateAddress
  );
  await leaseEscrow.waitForDeployment();
  const leaseEscrowAddress = await leaseEscrow.getAddress();
  console.log("LeaseEscrow deployed to:", leaseEscrowAddress);

  // Create sample policy
  console.log("\nCreating sample policy...");
  const samplePolicyTx = await policyRegistry.createPolicy(
    18, // minAge
    3, // incomeMul
    ethers.parseEther("1.0"), // rentWei
    true, // needCleanRec
    Math.floor(Date.now() / 1000) + 86400 * 30 // deadline (30 days)
  );
  await samplePolicyTx.wait();
  console.log("Sample policy created (Policy ID: 1)");

  // Get network info
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: Number(network.chainId),
    contracts: {
      PolicyRegistry: {
        address: policyRegistryAddress,
        transactionHash: policyRegistry.deploymentTransaction()?.hash,
      },
      EligibilityGateTLS: {
        address: eligibilityGateAddress,
        transactionHash: eligibilityGateTLS.deploymentTransaction()?.hash,
      },
      LeaseEscrow: {
        address: leaseEscrowAddress,
        transactionHash: leaseEscrow.deploymentTransaction()?.hash,
      },
    },
    attestor: attestorAddress,
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", deploymentFile);

  // Verify deployment
  console.log("\nVerifying deployment...");
  const policyCount = await policyRegistry.getPolicyCount();
  console.log(`PolicyRegistry: ${policyCount} policies created`);
  const tlsAttestor = await eligibilityGateTLS.attestor();
  console.log(`EligibilityGateTLS: Attestor=${tlsAttestor}`);
  const escrowGate = await leaseEscrow.getEligibilityGate();
  console.log(`LeaseEscrow: EligibilityGate=${escrowGate}`);

  console.log("\nDeployment completed successfully!");
  console.log("\nContract Addresses:");
  console.log(`  PolicyRegistry:     ${policyRegistryAddress}`);
  console.log(`  EligibilityGateTLS: ${eligibilityGateAddress}`);
  console.log(`  LeaseEscrow:        ${leaseEscrowAddress}`);
  console.log(`  Attestor:           ${attestorAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
