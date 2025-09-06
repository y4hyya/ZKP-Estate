// Simple test script to verify PolicyRegistry functionality
const { ethers } = require("hardhat");

async function testPolicyRegistry() {
  console.log("Testing PolicyRegistry...");
  
  // Get signers
  const [owner, tenant] = await ethers.getSigners();
  console.log("Owner:", owner.address);
  console.log("Tenant:", tenant.address);
  
  // Deploy PolicyRegistry
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const policyRegistry = await PolicyRegistry.deploy();
  await policyRegistry.waitForDeployment();
  
  console.log("PolicyRegistry deployed to:", await policyRegistry.getAddress());
  
  // Test parameters
  const minAge = 18;
  const incomeMul = 3;
  const rentWei = ethers.parseEther("1.0");
  const needCleanRec = true;
  const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  
  console.log("\n1. Testing createPolicy...");
  
  // Create policy
  const tx = await policyRegistry.connect(owner).createPolicy(
    minAge,
    incomeMul,
    rentWei,
    needCleanRec,
    deadline
  );
  
  const receipt = await tx.wait();
  console.log("Policy created! Transaction hash:", receipt.hash);
  
  // Check policy data
  console.log("\n2. Testing getPolicy...");
  const policy = await policyRegistry.getPolicy(1);
  console.log("Policy data:");
  console.log("- minAge:", policy.minAge.toString());
  console.log("- incomeMul:", policy.incomeMul.toString());
  console.log("- rentWei:", policy.rentWei.toString());
  console.log("- needCleanRec:", policy.needCleanRec);
  console.log("- deadline:", policy.deadline.toString());
  console.log("- owner:", policy.owner);
  console.log("- policyHash:", policy.policyHash);
  
  // Test owner check
  console.log("\n3. Testing isPolicyOwner...");
  const isOwner = await policyRegistry.connect(owner).isPolicyOwner(1);
  const isNotOwner = await policyRegistry.connect(tenant).isPolicyOwner(1);
  console.log("Owner is policy owner:", isOwner);
  console.log("Tenant is policy owner:", isNotOwner);
  
  // Test policy count
  console.log("\n4. Testing getPolicyCount...");
  const count = await policyRegistry.getPolicyCount();
  console.log("Policy count:", count.toString());
  
  // Test next policy ID
  console.log("\n5. Testing getNextPolicyId...");
  const nextId = await policyRegistry.getNextPolicyId();
  console.log("Next policy ID:", nextId.toString());
  
  // Test invalid deadline
  console.log("\n6. Testing invalid deadline...");
  try {
    await policyRegistry.connect(owner).createPolicy(
      minAge,
      incomeMul,
      rentWei,
      needCleanRec,
      Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    );
    console.log("ERROR: Should have reverted!");
  } catch (error) {
    console.log("✓ Correctly reverted for invalid deadline:", error.message.includes("Invalid deadline"));
  }
  
  console.log("\n✅ All tests completed successfully!");
}

// Run the test
testPolicyRegistry()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
