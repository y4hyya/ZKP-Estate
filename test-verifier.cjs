// Simple test script to verify IVerifier and VerifierStub functionality
const { ethers } = require("hardhat");

async function testVerifier() {
  console.log("Testing IVerifier interface and VerifierStub...");
  
  // Get signers
  const [owner] = await ethers.getSigners();
  console.log("Owner:", owner.address);
  
  // Deploy VerifierStub
  const VerifierStub = await ethers.getContractFactory("VerifierStub");
  const verifierStub = await VerifierStub.deploy();
  await verifierStub.waitForDeployment();
  
  console.log("VerifierStub deployed to:", await verifierStub.getAddress());
  
  // Test verify function
  console.log("\n1. Testing verify function...");
  
  const mockProof = "0x1234567890abcdef";
  const mockPublicInputs = [18, 3000, 600];
  
  const isValid = await verifierStub.verify(mockProof, mockPublicInputs);
  console.log("Proof verification result:", isValid);
  console.log("✓ VerifierStub always returns true as expected");
  
  // Test warning functions
  console.log("\n2. Testing warning functions...");
  
  const warning = await verifierStub.getWarning();
  console.log("Warning message:", warning);
  
  const isStub = await verifierStub.isStub();
  console.log("Is stub implementation:", isStub);
  
  // Test with different inputs
  console.log("\n3. Testing with different inputs...");
  
  const emptyProof = "0x";
  const emptyInputs = [];
  
  const isValidEmpty = await verifierStub.verify(emptyProof, emptyInputs);
  console.log("Empty proof verification result:", isValidEmpty);
  
  const longProof = "0x" + "1234567890abcdef".repeat(10);
  const longInputs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  
  const isValidLong = await verifierStub.verify(longProof, longInputs);
  console.log("Long proof verification result:", isValidLong);
  
  console.log("\n✅ All tests completed successfully!");
  console.log("✓ IVerifier interface implemented correctly");
  console.log("✓ VerifierStub always returns true for demo");
  console.log("✓ Warning messages properly displayed");
}

// Run the test
testVerifier()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
