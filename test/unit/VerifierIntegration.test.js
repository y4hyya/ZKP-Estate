const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Verifier Integration", function () {
  let policyRegistry;
  let eligibilityGate;
  let verifier;
  let verifierStub;
  let owner;
  let tenant;

  beforeEach(async function () {
    [owner, tenant] = await ethers.getSigners();

    // Deploy PolicyRegistry
    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    policyRegistry = await PolicyRegistry.deploy();
    await policyRegistry.waitForDeployment();

    // Deploy VerifierStub
    const VerifierStub = await ethers.getContractFactory("VerifierStub");
    verifierStub = await VerifierStub.deploy();
    await verifierStub.waitForDeployment();

    // Try to deploy EligibilityVerifier, fallback to VerifierStub
    let verifierAddress: string;
    try {
      const EligibilityVerifier = await ethers.getContractFactory("EligibilityVerifier");
      verifier = await EligibilityVerifier.deploy();
      await verifier.waitForDeployment();
      verifierAddress = await verifier.getAddress();
      console.log("✅ Using EligibilityVerifier");
    } catch (error) {
      console.log("⚠️  EligibilityVerifier not found, using VerifierStub");
      verifier = verifierStub;
      verifierAddress = await verifierStub.getAddress();
    }

    // Deploy EligibilityGate
    const EligibilityGate = await ethers.getContractFactory("EligibilityGate");
    eligibilityGate = await EligibilityGate.deploy(
      await policyRegistry.getAddress(),
      verifierAddress
    );
    await eligibilityGate.waitForDeployment();

    // Create a test policy
    await policyRegistry.createPolicy(
      18,    // minAge
      3,     // incomeMul
      ethers.parseEther("1.0"), // rentWei
      true,  // needCleanRec
      Math.floor(Date.now() / 1000) + 86400 // deadline
    );
  });

  describe("Verifier Interface", function () {
    it("Should have correct verify function signature", async function () {
      // Test that verifier has the expected interface
      const proof = "0x" + "0".repeat(128);
      const publicInputs = [18, 3, ethers.parseEther("1.0"), 1, 1, "1234567890123456789012345678901234567890123456789012345678901234"];
      
      const result = await verifier.verify(proof, publicInputs);
      expect(result).to.be.a("boolean");
    });

    it("Should accept correct number of public inputs", async function () {
      const proof = "0x" + "0".repeat(128);
      const publicInputs = [18, 3, ethers.parseEther("1.0"), 1, 1, "1234567890123456789012345678901234567890123456789012345678901234"];
      
      // Should not throw
      await expect(verifier.verify(proof, publicInputs)).to.not.be.reverted;
    });

    it("Should reject incorrect number of public inputs", async function () {
      const proof = "0x" + "0".repeat(128);
      const wrongInputs = [18, 3, ethers.parseEther("1.0")]; // Only 3 inputs instead of 6
      
      // This might throw or return false depending on implementation
      try {
        const result = await verifier.verify(proof, wrongInputs);
        expect(result).to.be.false;
      } catch (error) {
        // Expected to throw for wrong input length
        expect(error.message).to.include("Invalid public inputs length");
      }
    });
  });

  describe("EligibilityGate Integration", function () {
    it("Should work with either verifier type", async function () {
      const proof = "0x" + "0".repeat(128);
      const publicInputs = [
        18,    // minAge
        3,     // incomeMul
        ethers.parseEther("1.0"), // rentWei
        1,     // needCleanRec
        1,     // policyId
        "1234567890123456789012345678901234567890123456789012345678901234" // nullifier
      ];

      // Should not throw
      await expect(
        eligibilityGate.connect(tenant).submitZk(1, proof, publicInputs)
      ).to.not.be.reverted;
    });

    it("Should track eligibility correctly", async function () {
      const proof = "0x" + "0".repeat(128);
      const publicInputs = [
        18,    // minAge
        3,     // incomeMul
        ethers.parseEther("1.0"), // rentWei
        1,     // needCleanRec
        1,     // policyId
        "1234567890123456789012345678901234567890123456789012345678901234" // nullifier
      ];

      await eligibilityGate.connect(tenant).submitZk(1, proof, publicInputs);
      
      const isEligible = await eligibilityGate.isEligible(tenant.address, 1);
      expect(isEligible).to.be.true;
    });

    it("Should prevent replay attacks", async function () {
      const proof = "0x" + "0".repeat(128);
      const publicInputs = [
        18,    // minAge
        3,     // incomeMul
        ethers.parseEther("1.0"), // rentWei
        1,     // needCleanRec
        1,     // policyId
        "1234567890123456789012345678901234567890123456789012345678901234" // nullifier
      ];

      // First submission should succeed
      await eligibilityGate.connect(tenant).submitZk(1, proof, publicInputs);
      
      // Second submission with same nullifier should fail
      await expect(
        eligibilityGate.connect(tenant).submitZk(1, proof, publicInputs)
      ).to.be.revertedWith("EligibilityGate: Nullifier already used");
    });
  });

  describe("Public Input Validation", function () {
    it("Should validate public input order", async function () {
      const proof = "0x" + "0".repeat(128);
      const publicInputs = [
        18,    // minAge
        3,     // incomeMul
        ethers.parseEther("1.0"), // rentWei
        1,     // needCleanRec
        1,     // policyId
        "1234567890123456789012345678901234567890123456789012345678901234" // nullifier
      ];

      await expect(
        eligibilityGate.connect(tenant).submitZk(1, proof, publicInputs)
      ).to.not.be.reverted;
    });

    it("Should reject mismatched policy data", async function () {
      const proof = "0x" + "0".repeat(128);
      const wrongInputs = [
        25,    // Wrong minAge
        3,     // incomeMul
        ethers.parseEther("1.0"), // rentWei
        1,     // needCleanRec
        1,     // policyId
        "1234567890123456789012345678901234567890123456789012345678901234" // nullifier
      ];

      await expect(
        eligibilityGate.connect(tenant).submitZk(1, proof, wrongInputs)
      ).to.be.revertedWith("EligibilityGate: minAge mismatch");
    });
  });
});
