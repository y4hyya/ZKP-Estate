const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying ZKP-Estate contracts...");
  
  // Check gate mode (TLS or NOIR)
  const gateMode = process.env.GATE_MODE || "TLS";
  const useStub = process.env.USE_STUB === "1";
  console.log(`📋 Gate Mode: ${gateMode}`);
  console.log(`📋 Using ${useStub ? "VerifierStub" : "EligibilityVerifier"}`);

  // Get contract factories
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
  
  // Deploy PolicyRegistry first (needed for EligibilityGate)
  console.log("\n📋 Deploying PolicyRegistry...");
  const policyRegistry = await PolicyRegistry.deploy();
  await policyRegistry.waitForDeployment();
  const policyRegistryAddress = await policyRegistry.getAddress();
  console.log("✅ PolicyRegistry deployed to:", policyRegistryAddress);

  let eligibilityGateAddress;
  let verifierAddress = null;
  let attestorAddress = null;
  let gateType;

  if (gateMode === "TLS") {
    // Deploy TLS-based eligibility gate
    console.log("\n🔐 Deploying EligibilityGateTLS...");
    
    // Get attestor address from environment
    attestorAddress = process.env.ATTESTOR_ADDRESS;
    if (!attestorAddress) {
      // Use second account as default attestor
      const [owner, attestor] = await ethers.getSigners();
      attestorAddress = await attestor.getAddress();
      console.log(`⚠️  ATTESTOR_ADDRESS not set, using default: ${attestorAddress}`);
    }
    
    const EligibilityGateTLS = await ethers.getContractFactory("EligibilityGateTLS");
    const [owner] = await ethers.getSigners();
    const eligibilityGateTLS = await EligibilityGateTLS.deploy(attestorAddress, await owner.getAddress());
    await eligibilityGateTLS.waitForDeployment();
    eligibilityGateAddress = await eligibilityGateTLS.getAddress();
    gateType = "EligibilityGateTLS";
    console.log("✅ EligibilityGateTLS deployed to:", eligibilityGateAddress);
    console.log("✅ Attestor address:", attestorAddress);
    
  } else {
    // Deploy Noir-based eligibility gate
    console.log("\n🔐 Deploying EligibilityGate (Noir)...");
    
    let Verifier;
    
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
    
    const EligibilityGate = await ethers.getContractFactory("EligibilityGate");
    const eligibilityGate = await EligibilityGate.deploy(policyRegistryAddress, verifierAddress);
    await eligibilityGate.waitForDeployment();
    eligibilityGateAddress = await eligibilityGate.getAddress();
    gateType = "EligibilityGate";
    console.log("✅ EligibilityGate deployed to:", eligibilityGateAddress);
  }

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
    gateMode: gateMode,
    gateType: gateType,
    contracts: {
      PolicyRegistry: {
        address: policyRegistryAddress,
        transactionHash: policyRegistry.deploymentTransaction()?.hash,
      },
      EligibilityGate: {
        address: eligibilityGateAddress,
        type: gateType,
        transactionHash: gateMode === "TLS" 
          ? (await ethers.getContractAt("EligibilityGateTLS", eligibilityGateAddress)).deploymentTransaction()?.hash
          : (await ethers.getContractAt("EligibilityGate", eligibilityGateAddress)).deploymentTransaction()?.hash,
      },
      LeaseEscrow: {
        address: leaseEscrowAddress,
        transactionHash: leaseEscrow.deploymentTransaction()?.hash,
      },
    },
    timestamp: new Date().toISOString(),
    useStub: useStub,
  };

  // Add verifier info only for Noir mode
  if (gateMode === "NOIR" && verifierAddress) {
    deploymentInfo.contracts.Verifier = {
      address: verifierAddress,
      type: useStub ? "VerifierStub" : "EligibilityVerifier",
      transactionHash: (await ethers.getContractAt("VerifierStub", verifierAddress)).deploymentTransaction()?.hash,
    };
  }

  // Add attestor info only for TLS mode
  if (gateMode === "TLS" && attestorAddress) {
    deploymentInfo.attestor = attestorAddress;
  }

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
    network: networkName,
    chainId: Number(network.chainId),
    gateMode: gateMode,
    gateType: gateType,
  };

  // Add verifier info only for Noir mode
  if (gateMode === "NOIR" && verifierAddress) {
    frontendContracts.Verifier = verifierAddress;
  }

  // Add attestor info only for TLS mode
  if (gateMode === "TLS" && attestorAddress) {
    frontendContracts.attestor = attestorAddress;
  }

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
  
  // Test EligibilityGate based on mode
  if (gateMode === "TLS") {
    const tlsGate = await ethers.getContractAt("EligibilityGateTLS", eligibilityGateAddress);
    const tlsAttestor = await tlsGate.attestor();
    console.log(`✅ EligibilityGateTLS: Attestor=${tlsAttestor}`);
  } else {
    const noirGate = await ethers.getContractAt("EligibilityGate", eligibilityGateAddress);
    const gatePolicyRegistry = await noirGate.getPolicyRegistry();
    const gateVerifier = await noirGate.getVerifier();
    console.log(`✅ EligibilityGate: PolicyRegistry=${gatePolicyRegistry}, Verifier=${gateVerifier}`);
  }
  
  // Test LeaseEscrow
  const escrowPolicyRegistry = await leaseEscrow.getPolicyRegistry();
  const escrowEligibilityGate = await leaseEscrow.getEligibilityGate();
  console.log(`✅ LeaseEscrow: PolicyRegistry=${escrowPolicyRegistry}, EligibilityGate=${escrowEligibilityGate}`);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log(`   PolicyRegistry: ${policyRegistryAddress}`);
  console.log(`   EligibilityGate: ${eligibilityGateAddress} (${gateType})`);
  console.log(`   LeaseEscrow: ${leaseEscrowAddress}`);
  
  if (gateMode === "TLS") {
    console.log(`   Attestor: ${attestorAddress}`);
  } else if (verifierAddress) {
    console.log(`   Verifier: ${verifierAddress} (${useStub ? "Stub" : "Real"})`);
  }
  
  console.log("\n🔧 Environment Variables for Frontend:");
  console.log(`   VITE_POLICY_REGISTRY_ADDRESS=${policyRegistryAddress}`);
  console.log(`   VITE_ELIGIBILITY_GATE_ADDRESS=${eligibilityGateAddress}`);
  console.log(`   VITE_LEASE_ESCROW_ADDRESS=${leaseEscrowAddress}`);
  console.log(`   VITE_GATE_MODE=${gateMode}`);
  
  if (gateMode === "TLS") {
    console.log(`   VITE_ATTESTOR_ADDRESS=${attestorAddress}`);
  } else if (verifierAddress) {
    console.log(`   VITE_VERIFIER_ADDRESS=${verifierAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });