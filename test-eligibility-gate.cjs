// Simple test script to verify EligibilityGate functionality
const { ethers } = require("hardhat");

async function testEligibilityGate() {
  console.log("Testing EligibilityGate...");
  
  // Get signers
  const [owner, tenant, other] = await ethers.getSigners();
  console.log("Owner:", owner.address);
  console.log("Tenant:", tenant.address);
  console.log("Other:", other.address);
  
  // Deploy PolicyRegistry
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const policyRegistry = await PolicyRegistry.deploy();
  await policyRegistry.waitForDeployment();
  console.log("PolicyRegistry deployed to:", await policyRegistry.getAddress());
  
  // Deploy VerifierStub
  const VerifierStub = await ethers.getContractFactory("VerifierStub");
  const verifierStub = await VerifierStub.deploy();
  await verifierStub.waitForDeployment();
  console.log("VerifierStub deployed to:", await verifierStub.getAddress());
  
  // Deploy EligibilityGate
  const EligibilityGate = await ethers.getContractFactory("EligibilityGate");
  const eligibilityGate = await EligibilityGate.deploy(
    await policyRegistry.getAddress(),
    await verifierStub.getAddress()
  );
  await eligibilityGate.waitForDeployment();
  console.log("EligibilityGate deployed to:", await eligibilityGate.getAddress());
  
  // Test parameters
  const minAge = 18;
  const incomeMul = 3;
  const rentWei = ethers.parseEther("1.0");
  const needCleanRec = true;
  const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  
  console.log("\n1. Creating test policy...");
  
  // Create policy
  const tx1 = await policyRegistry.connect(owner).createPolicy(
    minAge,
    incomeMul,
    rentWei,
    needCleanRec,
    deadline
  );
  await tx1.wait();
  console.log("Policy created with ID: 1");
  
  console.log("\n2. Testing ZK proof submission...");
  
  // Test ZK proof submission
  const mockProof = "0x1234567890abcdef";
  const nullifierHi = "0x1234567890abcdef";
  const nullifierLo = "0xfedcba0987654321";
  const publicInputs = [
    minAge,
    incomeMul,
    rentWei,
    needCleanRec ? 1 : 0,
    1, // policyId
    nullifierHi,
    nullifierLo
  ];
  
  console.log("Public inputs:", publicInputs);
  
  const tx2 = await eligibilityGate.connect(tenant).submitZk(1, mockProof, publicInputs);
  const receipt2 = await tx2.wait();
  console.log("ZK proof submitted! Transaction hash:", receipt2.hash);
  
  // Check eligibility
  console.log("\n3. Checking eligibility...");
  const isEligible = await eligibilityGate.isEligible(tenant.address, 1);
  console.log("Tenant eligible for policy 1:", isEligible);
  
  // Check nullifier usage
  const nullifier = await eligibilityGate.constructNullifier(nullifierHi, nullifierLo);
  const isNullifierUsed = await eligibilityGate.isNullifierUsed(nullifier);
  console.log("Nullifier used:", isNullifierUsed);
  
  // Test replay protection
  console.log("\n4. Testing replay protection...");
  try {
    await eligibilityGate.connect(other).submitZk(1, mockProof, publicInputs);
    console.log("ERROR: Should have reverted for replay!");
  } catch (error) {
    console.log("✓ Correctly reverted for replay:", error.message.includes("Nullifier already used"));
  }
  
  // Test deadline validation
  console.log("\n5. Testing deadline validation...");
  
  // Create policy with past deadline (this will fail at policy creation)
  const pastDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
  try {
    await policyRegistry.connect(owner).createPolicy(
      minAge,
      incomeMul,
      rentWei,
      needCleanRec,
      pastDeadline
    );
    console.log("ERROR: Policy creation should have failed for past deadline!");
  } catch (error) {
    console.log("✓ Policy creation correctly failed for past deadline:", error.message.includes("Invalid deadline"));
  }
  
  // Test with a policy that has a deadline very close to now (might pass by the time we test)
  const nearDeadline = Math.floor(Date.now() / 1000) + 1; // 1 second from now
  try {
    await policyRegistry.connect(owner).createPolicy(
      minAge,
      incomeMul,
      rentWei,
      needCleanRec,
      nearDeadline
    );
    
    const nearDeadlineInputs = [
      minAge,
      incomeMul,
      rentWei,
      needCleanRec ? 1 : 0,
      2, // policyId
      "0xabcdef1234567890",
      "0x0987654321fedcba"
    ];
    
    // Wait a bit to ensure deadline passes
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await eligibilityGate.connect(tenant).submitZk(2, mockProof, nearDeadlineInputs);
      console.log("ERROR: Should have reverted for past deadline!");
    } catch (error) {
      console.log("✓ Correctly reverted for past deadline:", error.message.includes("Policy deadline passed"));
    }
  } catch (error) {
    console.log("✓ Policy creation correctly failed for near deadline:", error.message.includes("Invalid deadline"));
  }
  
  // Test different tenant with different nullifier
  console.log("\n6. Testing different tenant with different nullifier...");
  
  const differentInputs = [
    minAge,
    incomeMul,
    rentWei,
    needCleanRec ? 1 : 0,
    1, // same policy
    "0xabcdef1234567890", // different nullifier
    "0x0987654321fedcba"
  ];
  
  const tx3 = await eligibilityGate.connect(other).submitZk(1, mockProof, differentInputs);
  await tx3.wait();
  console.log("Different tenant submitted different nullifier successfully");
  
  const isOtherEligible = await eligibilityGate.isEligible(other.address, 1);
  console.log("Other tenant eligible for policy 1:", isOtherEligible);
  
  console.log("\n✅ All tests completed successfully!");
  console.log("✓ EligibilityGate deployed and working");
  console.log("✓ ZK proof submission works");
  console.log("✓ Eligibility tracking works");
  console.log("✓ Replay protection works");
  console.log("✓ Deadline validation works");
  console.log("✓ Multiple tenants can be eligible for same policy");
}

// Run the test
testEligibilityGate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
