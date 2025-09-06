const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying ZKP-Estate contracts...");
  
  // Check if we should use stub verifier
  const useStub = process.env.USE_STUB === "1";
  console.log(`📋 Using ${useStub ? "VerifierStub" : "EligibilityVerifier"}`);

  // Get contract factories
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const EligibilityGate = await ethers.getContractFactory("EligibilityGate");
  const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
  
  let Verifier;
  let verifierAddress;
  
  if (useStub) {
    // Use VerifierStub for development/testing
    Verifier = await ethers.getContractFactory("VerifierStub");
    const verifierStub = await Verifier.deploy();
    await verifierStub.waitForDeployment();
    verifierAddress = await verifierStub.getAddress();
    console.log("✅ VerifierStub deployed to:", verifierAddress);
  } else {
    // Use real EligibilityVerifier
    try {
      Verifier = await ethers.getContractFactory("EligibilityVerifier");
      const eligibilityVerifier = await Verifier.deploy();
      await eligibilityVerifier.waitForDeployment();
      verifierAddress = await eligibilityVerifier.getAddress();
      console.log("✅ EligibilityVerifier deployed to:", verifierAddress);
    } catch (error) {
      console.warn("⚠️  EligibilityVerifier not found, falling back to VerifierStub");
      Verifier = await ethers.getContractFactory("VerifierStub");
      const verifierStub = await Verifier.deploy();
      await verifierStub.waitForDeployment();
      verifierAddress = await verifierStub.getAddress();
      console.log("✅ VerifierStub deployed to:", verifierAddress);
    }
  }

  // Deploy PolicyRegistry
  console.log("\n📋 Deploying PolicyRegistry...");
  const policyRegistry = await PolicyRegistry.deploy();
  await policyRegistry.waitForDeployment();
  const policyRegistryAddress = await policyRegistry.getAddress();
  console.log("✅ PolicyRegistry deployed to:", policyRegistryAddress);

  // Deploy EligibilityGate
  console.log("\n🔐 Deploying EligibilityGate...");
  const eligibilityGate = await EligibilityGate.deploy(policyRegistryAddress, verifierAddress);
  await eligibilityGate.waitForDeployment();
  const eligibilityGateAddress = await eligibilityGate.getAddress();
  console.log("✅ EligibilityGate deployed to:", eligibilityGateAddress);

  // Deploy LeaseEscrow
  console.log("\n💰 Deploying LeaseEscrow...");
  const leaseEscrow = await LeaseEscrow.deploy(policyRegistryAddress, eligibilityGateAddress);
  await leaseEscrow.waitForDeployment();
  const leaseEscrowAddress = await leaseEscrow.getAddress();
  console.log("✅ LeaseEscrow deployed to:", leaseEscrowAddress);

  // Create sample policy for testing
  console.log("\n📝 Creating sample policy...");
  const samplePolicyTx = await policyRegistry.createPolicy(
    18,    // minAge
    3,     // incomeMul
    ethers.parseEther("1.0"), // rentWei (1 ETH)
    true,  // needCleanRec
    Math.floor(Date.now() / 1000) + 86400 * 30 // deadline (30 days from now)
  );
  await samplePolicyTx.wait();
  console.log("✅ Sample policy created (Policy ID: 1)");

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
      EligibilityGate: {
        address: eligibilityGateAddress,
        transactionHash: eligibilityGate.deploymentTransaction()?.hash,
      },
      LeaseEscrow: {
        address: leaseEscrowAddress,
        transactionHash: leaseEscrow.deploymentTransaction()?.hash,
      },
      Verifier: {
        address: verifierAddress,
        type: useStub ? "VerifierStub" : "EligibilityVerifier",
        transactionHash: (await ethers.getContractAt("VerifierStub", verifierAddress)).deploymentTransaction()?.hash,
      },
    },
    timestamp: new Date().toISOString(),
    useStub: useStub,
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📄 Deployment info saved to:", deploymentFile);

  // Create light version for frontend
  const frontendContracts = {
    PolicyRegistry: policyRegistryAddress,
    EligibilityGate: eligibilityGateAddress,
    LeaseEscrow: leaseEscrowAddress,
    Verifier: verifierAddress,
    network: networkName,
    chainId: Number(network.chainId),
  };

  // Create frontend contracts directory
  const frontendContractsDir = path.join(__dirname, "..", "frontend", "tenant-app", "src");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  const frontendContractsFile = path.join(frontendContractsDir, "contracts.json");
  fs.writeFileSync(frontendContractsFile, JSON.stringify(frontendContracts, null, 2));

  console.log("📄 Frontend contracts saved to:", frontendContractsFile);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  
  // Test PolicyRegistry
  const policyCount = await policyRegistry.getPolicyCount();
  console.log(`✅ PolicyRegistry: ${policyCount} policies created`);
  
  // Test EligibilityGate
  const gatePolicyRegistry = await eligibilityGate.getPolicyRegistry();
  const gateVerifier = await eligibilityGate.getVerifier();
  console.log(`✅ EligibilityGate: PolicyRegistry=${gatePolicyRegistry}, Verifier=${gateVerifier}`);
  
  // Test LeaseEscrow
  const escrowPolicyRegistry = await leaseEscrow.getPolicyRegistry();
  const escrowEligibilityGate = await leaseEscrow.getEligibilityGate();
  console.log(`✅ LeaseEscrow: PolicyRegistry=${escrowPolicyRegistry}, EligibilityGate=${escrowEligibilityGate}`);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log(`   PolicyRegistry: ${policyRegistryAddress}`);
  console.log(`   EligibilityGate: ${eligibilityGateAddress}`);
  console.log(`   LeaseEscrow: ${leaseEscrowAddress}`);
  console.log(`   Verifier: ${verifierAddress} (${useStub ? "Stub" : "Real"})`);
  
  console.log("\n🔧 Environment Variables for Frontend:");
  console.log(`   VITE_POLICY_REGISTRY_ADDRESS=${policyRegistryAddress}`);
  console.log(`   VITE_ELIGIBILITY_GATE_ADDRESS=${eligibilityGateAddress}`);
  console.log(`   VITE_LEASE_ESCROW_ADDRESS=${leaseEscrowAddress}`);
  console.log(`   VITE_VERIFIER_ADDRESS=${verifierAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });