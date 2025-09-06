import { expect } from "chai";
import { ethers } from "hardhat";
import { ZkRent, VerifierStub } from "../../typechain-types";

describe("ZkRent", function () {
  let zkRent: ZkRent;
  let verifier: VerifierStub;
  let owner: any;
  let landlord: any;
  let tenant: any;
  let other: any;

  beforeEach(async function () {
    [owner, landlord, tenant, other] = await ethers.getSigners();

    const ZkRent = await ethers.getContractFactory("ZkRent");
    zkRent = await ZkRent.deploy();
    await zkRent.waitForDeployment();

    verifier = await ethers.getContractAt("VerifierStub", await zkRent.verifier());
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await zkRent.owner()).to.equal(owner.address);
    });

    it("Should set the right platform fee", async function () {
      expect(await zkRent.platformFee()).to.equal(250); // 2.5%
    });

    it("Should deploy VerifierStub", async function () {
      expect(await zkRent.verifier()).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Policy Creation", function () {
    it("Should create a policy successfully", async function () {
      const rentAmount = ethers.parseEther("1.0");
      const deposit = ethers.parseEther("2.0");
      const duration = 30;
      const propertyDetails = "QmPropertyHash123...";

      await expect(
        zkRent.connect(landlord).createPolicy(
          rentAmount,
          deposit,
          duration,
          propertyDetails
        )
      )
        .to.emit(zkRent, "PolicyCreated")
        .withArgs(1, landlord.address, rentAmount, deposit);

      const policy = await zkRent.policies(1);
      expect(policy.landlord).to.equal(landlord.address);
      expect(policy.rentAmount).to.equal(rentAmount);
      expect(policy.deposit).to.equal(deposit);
      expect(policy.duration).to.equal(duration);
      expect(policy.isActive).to.be.true;
    });

    it("Should reject zero rent amount", async function () {
      await expect(
        zkRent.connect(landlord).createPolicy(0, ethers.parseEther("2.0"), 30, "test")
      ).to.be.revertedWith("Rent amount must be positive");
    });

    it("Should reject zero deposit", async function () {
      await expect(
        zkRent.connect(landlord).createPolicy(ethers.parseEther("1.0"), 0, 30, "test")
      ).to.be.revertedWith("Deposit must be positive");
    });

    it("Should reject zero duration", async function () {
      await expect(
        zkRent.connect(landlord).createPolicy(ethers.parseEther("1.0"), ethers.parseEther("2.0"), 0, "test")
      ).to.be.revertedWith("Duration must be positive");
    });
  });

  describe("Lease Management", function () {
    let policyId: number;
    const rentAmount = ethers.parseEther("1.0");
    const deposit = ethers.parseEther("2.0");
    const totalAmount = rentAmount + deposit;

    beforeEach(async function () {
      await zkRent.connect(landlord).createPolicy(
        rentAmount,
        deposit,
        30,
        "QmPropertyHash123..."
      );
      policyId = 1;
    });

    it("Should start a lease successfully", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test_proof"));

      await expect(
        zkRent.connect(tenant).startLease(policyId, proofHash, {
          value: totalAmount
        })
      )
        .to.emit(zkRent, "LeaseStarted")
        .withArgs(policyId, tenant.address, 1);

      const lease = await zkRent.leases(1);
      expect(lease.policyId).to.equal(policyId);
      expect(lease.tenant).to.equal(tenant.address);
      expect(lease.isActive).to.be.true;
      expect(lease.proofHash).to.equal(proofHash);
    });

    it("Should reject insufficient payment", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test_proof"));

      await expect(
        zkRent.connect(tenant).startLease(policyId, proofHash, {
          value: rentAmount // Missing deposit
        })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should reject starting lease on inactive policy", async function () {
      // Deactivate policy (this would require additional functionality)
      // For now, we'll test with a non-existent policy
      await expect(
        zkRent.connect(tenant).startLease(999, ethers.keccak256(ethers.toUtf8Bytes("test_proof")), {
          value: totalAmount
        })
      ).to.be.revertedWith("Policy not active");
    });

    it("Should reject landlord renting own property", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test_proof"));

      await expect(
        zkRent.connect(landlord).startLease(policyId, proofHash, {
          value: totalAmount
        })
      ).to.be.revertedWith("Cannot rent own property");
    });
  });

  describe("Proof Verification", function () {
    it("Should verify proof successfully", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test_proof"));
      const publicInputs = [18, 3000, 600];

      const isValid = await zkRent.verifyProof(proofHash, publicInputs);
      expect(isValid).to.be.true;
    });

    it("Should reject invalid public inputs", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test_proof"));
      const invalidInputs: number[] = [];

      await expect(
        zkRent.verifyProof(proofHash, invalidInputs)
      ).to.be.revertedWith("No public inputs provided");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to set platform fee", async function () {
      await zkRent.connect(owner).setPlatformFee(500);
      expect(await zkRent.platformFee()).to.equal(500);
    });

    it("Should reject non-owner setting platform fee", async function () {
      await expect(
        zkRent.connect(tenant).setPlatformFee(500)
      ).to.be.revertedWithCustomError(zkRent, "OwnableUnauthorizedAccount");
    });

    it("Should reject fee exceeding 10%", async function () {
      await expect(
        zkRent.connect(owner).setPlatformFee(1001)
      ).to.be.revertedWith("Fee cannot exceed 10%");
    });
  });
});
