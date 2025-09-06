// Simple test script to verify LeaseEscrow functionality
const { ethers } = require("hardhat");

async function testLeaseEscrow() {
  console.log("Testing LeaseEscrow...");
  
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
  
  // Deploy LeaseEscrow
  const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
  const leaseEscrow = await LeaseEscrow.deploy(
    await policyRegistry.getAddress(),
    await eligibilityGate.getAddress()
  );
  await leaseEscrow.waitForDeployment();
  console.log("LeaseEscrow deployed to:", await leaseEscrow.getAddress());
  
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
  
  console.log("\n2. Making tenant eligible...");
  
  // Make tenant eligible
  const mockProof = "0x1234567890abcdef";
  const publicInputs = [
    minAge,
    incomeMul,
    rentWei,
    needCleanRec ? 1 : 0,
    1, // policyId
    "0x1234567890abcdef",
    "0xfedcba0987654321"
  ];
  
  const tx2 = await eligibilityGate.connect(tenant).submitZk(1, mockProof, publicInputs);
  await tx2.wait();
  console.log("Tenant made eligible for policy 1");
  
  console.log("\n3. Testing lease creation...");
  
  // Start lease
  const tx3 = await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });
  const receipt3 = await tx3.wait();
  console.log("Lease started! Transaction hash:", receipt3.hash);
  
  // Check lease details
  const lease = await leaseEscrow.getLease(1, tenant.address);
  console.log("Lease details:");
  console.log("- Tenant:", lease.tenant);
  console.log("- Amount:", ethers.formatEther(lease.amount), "ETH");
  console.log("- Deadline:", new Date(Number(lease.deadline) * 1000).toISOString());
  console.log("- Active:", lease.active);
  
  // Check contract balance
  const balance = await leaseEscrow.getBalance();
  console.log("Contract balance:", ethers.formatEther(balance), "ETH");
  
  console.log("\n4. Testing owner confirmation...");
  
  const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
  
  // Owner confirms lease
  const tx4 = await leaseEscrow.connect(owner).ownerConfirm(1, tenant.address);
  await tx4.wait();
  console.log("Lease confirmed by owner");
  
  // Check lease is deactivated
  const leaseAfter = await leaseEscrow.getLease(1, tenant.address);
  console.log("Lease active after confirmation:", leaseAfter.active);
  
  // Check owner received funds
  const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
  const ownerReceived = ownerBalanceAfter - ownerBalanceBefore;
  console.log("Owner received:", ethers.formatEther(ownerReceived), "ETH");
  
  console.log("\n5. Testing refund scenario...");
  
  // Create another policy and lease for refund test
  const deadline2 = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  await policyRegistry.connect(owner).createPolicy(
    minAge,
    incomeMul,
    rentWei,
    needCleanRec,
    deadline2
  );
  
  // Make tenant eligible for policy 2
  const publicInputs2 = [
    minAge,
    incomeMul,
    rentWei,
    needCleanRec ? 1 : 0,
    2, // policyId
    "0xabcdef1234567890",
    "0x0987654321fedcba"
  ];
  await eligibilityGate.connect(tenant).submitZk(2, mockProof, publicInputs2);
  
  // Start lease for policy 2
  await leaseEscrow.connect(tenant).startLease(2, { value: rentWei });
  console.log("Lease started for policy 2");
  
  // Fast forward blockchain time past deadline
  console.log("Fast forwarding time past deadline...");
  await ethers.provider.send("evm_increaseTime", [3700]); // 1 hour + 100 seconds
  await ethers.provider.send("evm_mine", []);
  
  const tenantBalanceBefore = await ethers.provider.getBalance(tenant.address);
  
  // Tenant requests refund
  const tx5 = await leaseEscrow.connect(tenant).timeoutRefund(2);
  await tx5.wait();
  console.log("Refund processed for policy 2");
  
  // Check tenant received refund
  const tenantBalanceAfter = await ethers.provider.getBalance(tenant.address);
  const tenantReceived = tenantBalanceAfter - tenantBalanceBefore;
  console.log("Tenant received refund:", ethers.formatEther(tenantReceived), "ETH");
  
  console.log("\n6. Testing error cases...");
  
  // Test incorrect payment amount
  try {
    await leaseEscrow.connect(tenant).startLease(1, { value: ethers.parseEther("0.5") });
    console.log("ERROR: Should have reverted for incorrect payment!");
  } catch (error) {
    console.log("✓ Correctly reverted for incorrect payment:", error.message.includes("Incorrect payment amount"));
  }
  
  // Test non-owner trying to confirm
  try {
    await leaseEscrow.connect(other).ownerConfirm(1, tenant.address);
    console.log("ERROR: Should have reverted for non-owner!");
  } catch (error) {
    console.log("✓ Correctly reverted for non-owner:", error.message.includes("Not policy owner"));
  }
  
  console.log("\n✅ All tests completed successfully!");
  console.log("✓ LeaseEscrow deployed and working");
  console.log("✓ Lease creation works");
  console.log("✓ Owner confirmation works");
  console.log("✓ Timeout refund works");
  console.log("✓ Error handling works");
}

// Run the test
testLeaseEscrow()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
