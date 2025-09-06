import { expect } from "chai";
import { ethers } from "hardhat";
import { EligibilityGate, PolicyRegistry, VerifierStub } from "../../typechain-types";

describe("EligibilityGate", function () {
  let eligibilityGate: EligibilityGate;
  let policyRegistry: PolicyRegistry;
  let verifierStub: VerifierStub;
  let owner: any;
  let tenant: any;
  let other: any;

  const minAge = 18;
  const incomeMul = 3;
  const rentWei = ethers.parseEther("1.0");
  const needCleanRec = true;
  const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

  beforeEach(async function () {
    [owner, tenant, other] = await ethers.getSigners();

    // Deploy PolicyRegistry
    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    policyRegistry = await PolicyRegistry.deploy();
    await policyRegistry.waitForDeployment();

    // Deploy VerifierStub
    const VerifierStub = await ethers.getContractFactory("VerifierStub");
    verifierStub = await VerifierStub.deploy();
    await verifierStub.waitForDeployment();

    // Deploy EligibilityGate
    const EligibilityGate = await ethers.getContractFactory("EligibilityGate");
    eligibilityGate = await EligibilityGate.deploy(
      await policyRegistry.getAddress(),
      await verifierStub.getAddress()
    );
    await eligibilityGate.waitForDeployment();

    // Create a test policy
    await policyRegistry.connect(owner).createPolicy(
      minAge,
      incomeMul,
      rentWei,
      needCleanRec,
      deadline
    );
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await eligibilityGate.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set correct dependencies", async function () {
      expect(await eligibilityGate.getPolicyRegistry()).to.equal(await policyRegistry.getAddress());
      expect(await eligibilityGate.getVerifier()).to.equal(await verifierStub.getAddress());
    });

    it("Should revert with zero policy registry address", async function () {
      const EligibilityGate = await ethers.getContractFactory("EligibilityGate");
      await expect(
        EligibilityGate.deploy(ethers.ZeroAddress, await verifierStub.getAddress())
      ).to.be.revertedWith("EligibilityGate: Invalid policy registry");
    });

    it("Should revert with zero verifier address", async function () {
      const EligibilityGate = await ethers.getContractFactory("EligibilityGate");
      await expect(
        EligibilityGate.deploy(await policyRegistry.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("EligibilityGate: Invalid verifier");
    });
  });

  describe("submitZk", function () {
    const mockProof = "0x1234567890abcdef";
    const nullifierHi = 0x1234567890abcdef;
    const nullifierLo = 0xfedcba0987654321;
    const nullifier = (BigInt(nullifierHi) << 128n) | BigInt(nullifierLo);

    function getPublicInputs(policyId: number = 1) {
      return [
        minAge,
        incomeMul,
        rentWei,
        needCleanRec ? 1 : 0,
        policyId,
        nullifierHi,
        nullifierLo
      ];
    }

    it("Should successfully submit ZK proof and mark eligible", async function () {
      const publicInputs = getPublicInputs();
      
      await expect(
        eligibilityGate.connect(tenant).submitZk(1, mockProof, publicInputs)
      )
        .to.emit(eligibilityGate, "Eligible")
        .withArgs(tenant.address, 1, ethers.toBeHex(nullifier, 32));

      // Check eligibility
      expect(await eligibilityGate.isEligible(tenant.address, 1)).to.be.true;
      expect(await eligibilityGate.isNullifierUsed(ethers.toBeHex(nullifier, 32))).to.be.true;
    });

    it("Should revert with invalid public inputs length", async function () {
      const invalidInputs = [minAge, incomeMul, rentWei]; // Too few inputs
      
      await expect(
        eligibilityGate.connect(tenant).submitZk(1, mockProof, invalidInputs)
      ).to.be.revertedWith("EligibilityGate: Invalid public inputs length");
    });

    it("Should revert when policy deadline has passed", async function () {
      // Create a policy with past deadline
      const pastDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      await policyRegistry.connect(owner).createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        pastDeadline
      );

      const publicInputs = getPublicInputs(2);
      
      await expect(
        eligibilityGate.connect(tenant).submitZk(2, mockProof, publicInputs)
      ).to.be.revertedWith("EligibilityGate: Policy deadline passed");
    });

    it("Should revert with minAge mismatch", async function () {
      const publicInputs = getPublicInputs();
      publicInputs[0] = 25; // Wrong minAge
      
      await expect(
        eligibilityGate.connect(tenant).submitZk(1, mockProof, publicInputs)
      ).to.be.revertedWith("EligibilityGate: minAge mismatch");
    });

    it("Should revert with incomeMul mismatch", async function () {
      const publicInputs = getPublicInputs();
      publicInputs[1] = 5; // Wrong incomeMul
      
      await expect(
        eligibilityGate.connect(tenant).submitZk(1, mockProof, publicInputs)
      ).to.be.revertedWith("EligibilityGate: incomeMul mismatch");
    });

    it("Should revert with rentWei mismatch", async function () {
      const publicInputs = getPublicInputs();
      publicInputs[2] = ethers.parseEther("2.0"); // Wrong rentWei
      
      await expect(
        eligibilityGate.connect(tenant).submitZk(1, mockProof, publicInputs)
      ).to.be.revertedWith("EligibilityGate: rentWei mismatch");
    });

    it("Should revert with needCleanRec mismatch", async function () {
      const publicInputs = getPublicInputs();
      publicInputs[3] = 0; // Wrong needCleanRec (should be 1)
      
      await expect(
        eligibilityGate.connect(tenant).submitZk(1, mockProof, publicInputs)
      ).to.be.revertedWith("EligibilityGate: needCleanRec mismatch");
    });

    it("Should revert with policyId mismatch", async function () {
      const publicInputs = getPublicInputs();
      publicInputs[4] = 999; // Wrong policyId
      
      await expect(
        eligibilityGate.connect(tenant).submitZk(1, mockProof, publicInputs)
      ).to.be.revertedWith("EligibilityGate: policyId mismatch");
    });

    it("Should revert when nullifier already used (replay protection)", async function () {
      const publicInputs = getPublicInputs();
      
      // First submission should succeed
      await eligibilityGate.connect(tenant).submitZk(1, mockProof, publicInputs);
      
      // Second submission with same nullifier should fail
      await expect(
        eligibilityGate.connect(other).submitZk(1, mockProof, publicInputs)
      ).to.be.revertedWith("EligibilityGate: Nullifier already used");
    });

    it("Should allow different tenants to submit different nullifiers", async function () {
      const publicInputs1 = getPublicInputs();
      const publicInputs2 = getPublicInputs();
      publicInputs2[5] = 0xabcdef1234567890; // Different nullifierHi
      publicInputs2[6] = 0x0987654321fedcba; // Different nullifierLo
      
      // First tenant submission
      await eligibilityGate.connect(tenant).submitZk(1, mockProof, publicInputs1);
      
      // Second tenant submission with different nullifier should succeed
      await expect(
        eligibilityGate.connect(other).submitZk(1, mockProof, publicInputs2)
      ).to.emit(eligibilityGate, "Eligible");
      
      // Both should be eligible
      expect(await eligibilityGate.isEligible(tenant.address, 1)).to.be.true;
      expect(await eligibilityGate.isEligible(other.address, 1)).to.be.true;
    });

    it("Should handle false needCleanRec correctly", async function () {
      // Create policy with needCleanRec = false
      await policyRegistry.connect(owner).createPolicy(
        minAge,
        incomeMul,
        rentWei,
        false, // needCleanRec = false
        deadline
      );

      const publicInputs = [
        minAge,
        incomeMul,
        rentWei,
        0, // needCleanRec = 0 (false)
        2, // policyId
        nullifierHi,
        nullifierLo
      ];
      
      await expect(
        eligibilityGate.connect(tenant).submitZk(2, mockProof, publicInputs)
      ).to.emit(eligibilityGate, "Eligible");
    });
  });

  describe("isEligible", function () {
    it("Should return false for non-eligible address", async function () {
      expect(await eligibilityGate.isEligible(tenant.address, 1)).to.be.false;
    });

    it("Should return true after successful ZK submission", async function () {
      const publicInputs = [
        minAge,
        incomeMul,
        rentWei,
        needCleanRec ? 1 : 0,
        1,
        0x1234567890abcdef,
        0xfedcba0987654321
      ];
      
      await eligibilityGate.connect(tenant).submitZk(1, "0x1234567890abcdef", publicInputs);
      
      expect(await eligibilityGate.isEligible(tenant.address, 1)).to.be.true;
    });

    it("Should return false for different policy ID", async function () {
      const publicInputs = [
        minAge,
        incomeMul,
        rentWei,
        needCleanRec ? 1 : 0,
        1,
        0x1234567890abcdef,
        0xfedcba0987654321
      ];
      
      await eligibilityGate.connect(tenant).submitZk(1, "0x1234567890abcdef", publicInputs);
      
      // Should be eligible for policy 1
      expect(await eligibilityGate.isEligible(tenant.address, 1)).to.be.true;
      
      // Should not be eligible for policy 2 (doesn't exist)
      expect(await eligibilityGate.isEligible(tenant.address, 2)).to.be.false;
    });
  });

  describe("isNullifierUsed", function () {
    it("Should return false for unused nullifier", async function () {
      const nullifier = ethers.toBeHex((BigInt(0x1234567890abcdef) << 128n) | BigInt(0xfedcba0987654321), 32);
      expect(await eligibilityGate.isNullifierUsed(nullifier)).to.be.false;
    });

    it("Should return true after nullifier is used", async function () {
      const nullifierHi = 0x1234567890abcdef;
      const nullifierLo = 0xfedcba0987654321;
      const nullifier = ethers.toBeHex((BigInt(nullifierHi) << 128n) | BigInt(nullifierLo), 32);
      
      const publicInputs = [
        minAge,
        incomeMul,
        rentWei,
        needCleanRec ? 1 : 0,
        1,
        nullifierHi,
        nullifierLo
      ];
      
      await eligibilityGate.connect(tenant).submitZk(1, "0x1234567890abcdef", publicInputs);
      
      expect(await eligibilityGate.isNullifierUsed(nullifier)).to.be.true;
    });
  });

  describe("constructNullifier", function () {
    it("Should construct nullifier correctly", async function () {
      const nullifierHi = 0x1234567890abcdef;
      const nullifierLo = 0xfedcba0987654321;
      const expectedNullifier = ethers.toBeHex((BigInt(nullifierHi) << 128n) | BigInt(nullifierLo), 32);
      
      const result = await eligibilityGate.constructNullifier(nullifierHi, nullifierLo);
      expect(result).to.equal(expectedNullifier);
    });
  });

  describe("Edge cases", function () {
    it("Should handle zero nullifier", async function () {
      const publicInputs = [
        minAge,
        incomeMul,
        rentWei,
        needCleanRec ? 1 : 0,
        1,
        0, // nullifierHi = 0
        0  // nullifierLo = 0
      ];
      
      await expect(
        eligibilityGate.connect(tenant).submitZk(1, "0x1234567890abcdef", publicInputs)
      ).to.emit(eligibilityGate, "Eligible");
      
      expect(await eligibilityGate.isNullifierUsed(ethers.ZeroHash)).to.be.true;
    });

    it("Should handle maximum nullifier values", async function () {
      const maxUint128 = (1n << 128n) - 1n;
      const nullifierHi = maxUint128;
      const nullifierLo = maxUint128;
      
      const publicInputs = [
        minAge,
        incomeMul,
        rentWei,
        needCleanRec ? 1 : 0,
        1,
        nullifierHi,
        nullifierLo
      ];
      
      await expect(
        eligibilityGate.connect(tenant).submitZk(1, "0x1234567890abcdef", publicInputs)
      ).to.emit(eligibilityGate, "Eligible");
    });
  });
});
