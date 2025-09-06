import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("ZKP-Estate Contracts", function () {
  let policyRegistry: Contract;
  let eligibilityGate: Contract;
  let leaseEscrow: Contract;
  let verifierStub: Contract;
  let owner: Signer;
  let tenant: Signer;
  let other: Signer;

  beforeEach(async function () {
    [owner, tenant, other] = await ethers.getSigners();

    // Deploy VerifierStub
    const VerifierStub = await ethers.getContractFactory("VerifierStub");
    verifierStub = await VerifierStub.deploy();

    // Deploy PolicyRegistry
    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    policyRegistry = await PolicyRegistry.deploy();

    // Deploy EligibilityGate
    const EligibilityGate = await ethers.getContractFactory("EligibilityGate");
    eligibilityGate = await EligibilityGate.deploy(
      await policyRegistry.getAddress(),
      await verifierStub.getAddress()
    );

    // Deploy LeaseEscrow
    const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
    leaseEscrow = await LeaseEscrow.deploy(
      await policyRegistry.getAddress(),
      await eligibilityGate.getAddress()
    );
  });

  describe("PolicyRegistry", function () {
    it("should create and read policy correctly", async function () {
      const minAge = 18;
      const incomeMul = 3;
      const rentWei = ethers.parseEther("1.0");
      const needCleanRec = true;
      const deadline = Math.floor(Date.now() / 1000) + 86400; // 1 day from now

      const tx = await policyRegistry.createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );
      await tx.wait();

      const policy = await policyRegistry.getPolicy(0);
      expect(policy.minAge).to.equal(minAge);
      expect(policy.incomeMul).to.equal(incomeMul);
      expect(policy.rentWei).to.equal(rentWei);
      expect(policy.needCleanRec).to.equal(needCleanRec);
      expect(policy.deadline).to.equal(deadline);
      expect(policy.owner).to.equal(await owner.getAddress());
    });

    it("should revert when creating policy with past deadline", async function () {
      const minAge = 18;
      const incomeMul = 3;
      const rentWei = ethers.parseEther("1.0");
      const needCleanRec = true;
      const deadline = Math.floor(Date.now() / 1000) - 86400; // 1 day ago

      await expect(
        policyRegistry.createPolicy(
          minAge,
          incomeMul,
          rentWei,
          needCleanRec,
          deadline
        )
      ).to.be.revertedWith("PolicyRegistry: Invalid deadline");
    });

    it("should increment policy ID correctly", async function () {
      const minAge = 18;
      const incomeMul = 3;
      const rentWei = ethers.parseEther("1.0");
      const needCleanRec = true;
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      // Create first policy
      await policyRegistry.createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );

      // Create second policy
      await policyRegistry.createPolicy(
        minAge + 1,
        incomeMul + 1,
        rentWei + ethers.parseEther("0.1"),
        !needCleanRec,
        deadline + 86400
      );

      const policyCount = await policyRegistry.getPolicyCount();
      expect(policyCount).to.equal(2);

      const policy0 = await policyRegistry.getPolicy(0);
      const policy1 = await policyRegistry.getPolicy(1);
      expect(policy0.minAge).to.equal(minAge);
      expect(policy1.minAge).to.equal(minAge + 1);
    });
  });

  describe("EligibilityGate", function () {
    let policyId: number;
    let policy: any;
    let mockProof: string;
    let mockPublicInputs: bigint[];

    beforeEach(async function () {
      // Create a test policy
      const minAge = 18;
      const incomeMul = 3;
      const rentWei = ethers.parseEther("1.0");
      const needCleanRec = true;
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await policyRegistry.createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );

      policyId = 0;
      policy = await policyRegistry.getPolicy(policyId);

      // Mock proof and public inputs
      mockProof = "0x" + "0".repeat(128);
      mockPublicInputs = [
        BigInt(policy.minAge),
        BigInt(policy.incomeMul),
        policy.rentWei / BigInt(1e15), // Scaled down for u32
        policy.needCleanRec ? 1n : 0n,
        BigInt(policyId),
        BigInt("1234567890123456789012345678901234567890123456789012345678901234")
      ];
    });

    it("should successfully submit valid proof", async function () {
      const tx = await eligibilityGate
        .connect(tenant)
        .submitZk(policyId, mockProof, mockPublicInputs);
      await tx.wait();

      const isEligible = await eligibilityGate.isEligible(
        await tenant.getAddress(),
        policyId
      );
      expect(isEligible).to.be.true;
    });

    it("should prevent replay attacks with nullifier", async function () {
      // Submit proof first time
      await eligibilityGate
        .connect(tenant)
        .submitZk(policyId, mockProof, mockPublicInputs);

      // Try to submit same proof again
      await expect(
        eligibilityGate
          .connect(tenant)
          .submitZk(policyId, mockProof, mockPublicInputs)
      ).to.be.revertedWith("EligibilityGate: Nullifier already used");
    });

    it("should revert when policy deadline has passed", async function () {
      // Advance time past deadline
      const currentTime = await ethers.provider.getBlock("latest");
      const timeToAdvance = policy.deadline - currentTime!.timestamp + 1;
      await ethers.provider.send("evm_increaseTime", [Number(timeToAdvance)]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        eligibilityGate
          .connect(tenant)
          .submitZk(policyId, mockProof, mockPublicInputs)
      ).to.be.revertedWith("EligibilityGate: Policy deadline passed");
    });

    it("should revert with wrong policyId in public inputs", async function () {
      const wrongPublicInputs = [...mockPublicInputs];
      wrongPublicInputs[4] = BigInt(999); // Wrong policy ID

      await expect(
        eligibilityGate
          .connect(tenant)
          .submitZk(policyId, mockProof, wrongPublicInputs)
      ).to.be.revertedWith("EligibilityGate: policyId mismatch");
    });

    it("should revert with wrong minAge in public inputs", async function () {
      const wrongPublicInputs = [...mockPublicInputs];
      wrongPublicInputs[0] = BigInt(25); // Wrong min age

      await expect(
        eligibilityGate
          .connect(tenant)
          .submitZk(policyId, mockProof, wrongPublicInputs)
      ).to.be.revertedWith("EligibilityGate: minAge mismatch");
    });

    it("should revert with wrong rentWei in public inputs", async function () {
      const wrongPublicInputs = [...mockPublicInputs];
      wrongPublicInputs[2] = BigInt(2000); // Wrong rent (scaled)

      await expect(
        eligibilityGate
          .connect(tenant)
          .submitZk(policyId, mockProof, wrongPublicInputs)
      ).to.be.revertedWith("EligibilityGate: rentWei mismatch");
    });

    it("should revert with invalid public inputs length", async function () {
      const invalidPublicInputs = mockPublicInputs.slice(0, 5); // Missing nullifier

      await expect(
        eligibilityGate
          .connect(tenant)
          .submitZk(policyId, mockProof, invalidPublicInputs)
      ).to.be.revertedWith("EligibilityGate: Invalid public inputs length");
    });
  });

  describe("LeaseEscrow", function () {
    let policyId: number;
    let policy: any;
    let mockProof: string;
    let mockPublicInputs: bigint[];

    beforeEach(async function () {
      // Create a test policy
      const minAge = 18;
      const incomeMul = 3;
      const rentWei = ethers.parseEther("1.0");
      const needCleanRec = true;
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await policyRegistry.createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );

      policyId = 0;
      policy = await policyRegistry.getPolicy(policyId);

      // Mock proof and public inputs
      mockProof = "0x" + "0".repeat(128);
      mockPublicInputs = [
        BigInt(policy.minAge),
        BigInt(policy.incomeMul),
        policy.rentWei / BigInt(1e15), // Scaled down for u32
        policy.needCleanRec ? 1n : 0n,
        BigInt(policyId),
        BigInt("1234567890123456789012345678901234567890123456789012345678901234")
      ];

      // Submit proof to make tenant eligible
      await eligibilityGate
        .connect(tenant)
        .submitZk(policyId, mockProof, mockPublicInputs);
    });

    it("should start lease and allow owner to confirm release", async function () {
      const tenantAddress = await tenant.getAddress();
      const ownerAddress = await owner.getAddress();
      const initialOwnerBalance = await ethers.provider.getBalance(ownerAddress);

      // Start lease
      const startTx = await leaseEscrow
        .connect(tenant)
        .startLease(policyId, { value: policy.rentWei });
      await startTx.wait();

      // Check lease is active
      const lease = await leaseEscrow.getLease(policyId, tenantAddress);
      expect(lease.active).to.be.true;
      expect(lease.amount).to.equal(policy.rentWei);

      // Owner confirms lease
      const confirmTx = await leaseEscrow
        .connect(owner)
        .ownerConfirm(policyId, tenantAddress);
      await confirmTx.wait();

      // Check lease is no longer active
      const leaseAfter = await leaseEscrow.getLease(policyId, tenantAddress);
      expect(leaseAfter.active).to.be.false;

      // Check owner received funds
      const finalOwnerBalance = await ethers.provider.getBalance(ownerAddress);
      expect(finalOwnerBalance).to.be.greaterThan(initialOwnerBalance);
    });

    it("should allow tenant to claim timeout refund", async function () {
      const tenantAddress = await tenant.getAddress();
      const initialTenantBalance = await ethers.provider.getBalance(tenantAddress);

      // Start lease
      await leaseEscrow
        .connect(tenant)
        .startLease(policyId, { value: policy.rentWei });

      // Advance time past deadline
      const currentTime = await ethers.provider.getBlock("latest");
      const timeToAdvance = policy.deadline - currentTime!.timestamp + 1;
      await ethers.provider.send("evm_increaseTime", [Number(timeToAdvance)]);
      await ethers.provider.send("evm_mine", []);

      // Tenant claims refund
      const refundTx = await leaseEscrow
        .connect(tenant)
        .timeoutRefund(policyId);
      await refundTx.wait();

      // Check lease is no longer active
      const lease = await leaseEscrow.getLease(policyId, tenantAddress);
      expect(lease.active).to.be.false;

      // Check tenant got refund
      const finalTenantBalance = await ethers.provider.getBalance(tenantAddress);
      expect(finalTenantBalance).to.be.greaterThan(initialTenantBalance);
    });

    it("should revert when starting lease without eligibility", async function () {
      // Create another policy and don't submit proof
      const minAge = 21;
      const incomeMul = 4;
      const rentWei = ethers.parseEther("2.0");
      const needCleanRec = false;
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await policyRegistry.createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );

      const newPolicyId = 1;

      await expect(
        leaseEscrow
          .connect(tenant)
          .startLease(newPolicyId, { value: rentWei })
      ).to.be.revertedWith("LeaseEscrow: Tenant not eligible");
    });

    it("should revert when starting lease with wrong amount", async function () {
      const wrongAmount = ethers.parseEther("0.5"); // Half the required amount

      await expect(
        leaseEscrow
          .connect(tenant)
          .startLease(policyId, { value: wrongAmount })
      ).to.be.revertedWith("LeaseEscrow: Incorrect rent amount");
    });

    it("should revert when non-owner tries to confirm lease", async function () {
      const tenantAddress = await tenant.getAddress();

      // Start lease
      await leaseEscrow
        .connect(tenant)
        .startLease(policyId, { value: policy.rentWei });

      // Non-owner tries to confirm
      await expect(
        leaseEscrow
          .connect(other)
          .ownerConfirm(policyId, tenantAddress)
      ).to.be.revertedWith("LeaseEscrow: Not policy owner");
    });

    it("should revert when trying to confirm inactive lease", async function () {
      const tenantAddress = await tenant.getAddress();

      // Start lease
      await leaseEscrow
        .connect(tenant)
        .startLease(policyId, { value: policy.rentWei });

      // Owner confirms lease
      await leaseEscrow
        .connect(owner)
        .ownerConfirm(policyId, tenantAddress);

      // Try to confirm again
      await expect(
        leaseEscrow
          .connect(owner)
          .ownerConfirm(policyId, tenantAddress)
      ).to.be.revertedWith("LeaseEscrow: Lease not active");
    });

    it("should revert when trying to refund before deadline", async function () {
      // Start lease
      await leaseEscrow
        .connect(tenant)
        .startLease(policyId, { value: policy.rentWei });

      // Try to refund before deadline
      await expect(
        leaseEscrow
          .connect(tenant)
          .timeoutRefund(policyId)
      ).to.be.revertedWith("LeaseEscrow: Deadline not reached");
    });

    it("should revert when trying to refund inactive lease", async function () {
      const tenantAddress = await tenant.getAddress();

      // Start lease
      await leaseEscrow
        .connect(tenant)
        .startLease(policyId, { value: policy.rentWei });

      // Owner confirms lease (makes it inactive)
      await leaseEscrow
        .connect(owner)
        .ownerConfirm(policyId, tenantAddress);

      // Advance time past deadline
      const currentTime = await ethers.provider.getBlock("latest");
      const timeToAdvance = policy.deadline - currentTime!.timestamp + 1;
      await ethers.provider.send("evm_increaseTime", [Number(timeToAdvance)]);
      await ethers.provider.send("evm_mine", []);

      // Try to refund inactive lease
      await expect(
        leaseEscrow
          .connect(tenant)
          .timeoutRefund(policyId)
      ).to.be.revertedWith("LeaseEscrow: Lease not active");
    });

    it("should prevent reentrancy attacks", async function () {
      // Deploy malicious receiver contract
      const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
      const maliciousReceiver = await MaliciousReceiver.deploy(await leaseEscrow.getAddress());

      // Create policy for malicious receiver
      const minAge = 18;
      const incomeMul = 3;
      const rentWei = ethers.parseEther("1.0");
      const needCleanRec = true;
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await policyRegistry.createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );

      const maliciousPolicyId = 1;

      // Submit proof for malicious receiver
      const maliciousProof = "0x" + "0".repeat(128);
      const maliciousPublicInputs = [
        BigInt(minAge),
        BigInt(incomeMul),
        rentWei / BigInt(1e15),
        needCleanRec ? 1n : 0n,
        BigInt(maliciousPolicyId),
        BigInt("9876543210987654321098765432109876543210987654321098765432109876")
      ];

      await eligibilityGate
        .connect(owner)
        .submitZk(maliciousPolicyId, maliciousProof, maliciousPublicInputs);

      // Start lease with malicious receiver
      await leaseEscrow
        .connect(owner)
        .startLease(maliciousPolicyId, { value: rentWei });

      // Try to confirm lease (this should trigger reentrancy attempt)
      await expect(
        leaseEscrow
          .connect(owner)
          .ownerConfirm(maliciousPolicyId, await maliciousReceiver.getAddress())
      ).to.be.revertedWith("ReentrancyGuard: reentrant call");
    });
  });
});
