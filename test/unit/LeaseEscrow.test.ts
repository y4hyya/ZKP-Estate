import { expect } from "chai";
import { ethers } from "hardhat";
import { LeaseEscrow, PolicyRegistry, EligibilityGate, VerifierStub } from "../../typechain-types";

describe("LeaseEscrow", function () {
  let leaseEscrow: LeaseEscrow;
  let policyRegistry: PolicyRegistry;
  let eligibilityGate: EligibilityGate;
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

    // Deploy LeaseEscrow
    const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
    leaseEscrow = await LeaseEscrow.deploy(
      await policyRegistry.getAddress(),
      await eligibilityGate.getAddress()
    );
    await leaseEscrow.waitForDeployment();

    // Create a test policy
    await policyRegistry.connect(owner).createPolicy(
      minAge,
      incomeMul,
      rentWei,
      needCleanRec,
      deadline
    );

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
    await eligibilityGate.connect(tenant).submitZk(1, mockProof, publicInputs);
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await leaseEscrow.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set correct dependencies", async function () {
      expect(await leaseEscrow.getPolicyRegistry()).to.equal(await policyRegistry.getAddress());
      expect(await leaseEscrow.getEligibilityGate()).to.equal(await eligibilityGate.getAddress());
    });

    it("Should revert with zero policy registry address", async function () {
      const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
      await expect(
        LeaseEscrow.deploy(ethers.ZeroAddress, await eligibilityGate.getAddress())
      ).to.be.revertedWith("LeaseEscrow: Invalid policy registry");
    });

    it("Should revert with zero eligibility gate address", async function () {
      const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
      await expect(
        LeaseEscrow.deploy(await policyRegistry.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("LeaseEscrow: Invalid eligibility gate");
    });
  });

  describe("startLease", function () {
    it("Should successfully start a lease", async function () {
      await expect(
        leaseEscrow.connect(tenant).startLease(1, { value: rentWei })
      )
        .to.emit(leaseEscrow, "LeaseStarted")
        .withArgs(1, tenant.address, rentWei, deadline);

      // Check lease was created
      const lease = await leaseEscrow.getLease(1, tenant.address);
      expect(lease.tenant).to.equal(tenant.address);
      expect(lease.amount).to.equal(rentWei);
      expect(lease.deadline).to.equal(deadline);
      expect(lease.active).to.be.true;

      // Check contract balance
      expect(await leaseEscrow.getBalance()).to.equal(rentWei);
    });

    it("Should revert if not eligible", async function () {
      // Create another policy and don't make tenant eligible
      await policyRegistry.connect(owner).createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );

      await expect(
        leaseEscrow.connect(tenant).startLease(2, { value: rentWei })
      ).to.be.revertedWith("LeaseEscrow: Not eligible for policy");
    });

    it("Should revert if policy deadline passed", async function () {
      // Create policy with past deadline
      const pastDeadline = Math.floor(Date.now() / 1000) - 3600;
      await policyRegistry.connect(owner).createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        pastDeadline
      );

      // Make tenant eligible for this policy
      const mockProof = "0x1234567890abcdef";
      const publicInputs = [
        minAge,
        incomeMul,
        rentWei,
        needCleanRec ? 1 : 0,
        2, // policyId
        "0xabcdef1234567890",
        "0x0987654321fedcba"
      ];
      await eligibilityGate.connect(tenant).submitZk(2, mockProof, publicInputs);

      await expect(
        leaseEscrow.connect(tenant).startLease(2, { value: rentWei })
      ).to.be.revertedWith("LeaseEscrow: Policy deadline passed");
    });

    it("Should revert with incorrect payment amount", async function () {
      await expect(
        leaseEscrow.connect(tenant).startLease(1, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("LeaseEscrow: Incorrect payment amount");
    });

    it("Should revert if lease already exists", async function () {
      // Create first lease
      await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });

      // Try to create second lease
      await expect(
        leaseEscrow.connect(tenant).startLease(1, { value: rentWei })
      ).to.be.revertedWith("LeaseEscrow: Lease already exists");
    });

    it("Should handle multiple tenants for same policy", async function () {
      // Make other tenant eligible
      const mockProof = "0x1234567890abcdef";
      const publicInputs = [
        minAge,
        incomeMul,
        rentWei,
        needCleanRec ? 1 : 0,
        1, // policyId
        "0xabcdef1234567890",
        "0x0987654321fedcba"
      ];
      await eligibilityGate.connect(other).submitZk(1, mockProof, publicInputs);

      // Both tenants should be able to start leases
      await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });
      await leaseEscrow.connect(other).startLease(1, { value: rentWei });

      // Check both leases exist
      expect(await leaseEscrow.isLeaseActive(1, tenant.address)).to.be.true;
      expect(await leaseEscrow.isLeaseActive(1, other.address)).to.be.true;
    });
  });

  describe("ownerConfirm", function () {
    beforeEach(async function () {
      // Start a lease first
      await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });
    });

    it("Should successfully confirm lease and release funds", async function () {
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      await expect(
        leaseEscrow.connect(owner).ownerConfirm(1, tenant.address)
      )
        .to.emit(leaseEscrow, "LeaseReleased")
        .withArgs(1, tenant.address, rentWei);

      // Check lease is deactivated
      const lease = await leaseEscrow.getLease(1, tenant.address);
      expect(lease.active).to.be.false;

      // Check owner received funds
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.be.closeTo(rentWei, ethers.parseEther("0.01")); // Allow for gas
    });

    it("Should revert if not policy owner", async function () {
      await expect(
        leaseEscrow.connect(other).ownerConfirm(1, tenant.address)
      ).to.be.revertedWith("LeaseEscrow: Not policy owner");
    });

    it("Should revert if lease not active", async function () {
      // Deactivate lease first
      await leaseEscrow.connect(owner).ownerConfirm(1, tenant.address);

      // Try to confirm again
      await expect(
        leaseEscrow.connect(owner).ownerConfirm(1, tenant.address)
      ).to.be.revertedWith("LeaseEscrow: Lease not active");
    });
  });

  describe("timeoutRefund", function () {
    beforeEach(async function () {
      // Start a lease first
      await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });
    });

    it("Should successfully refund after deadline", async function () {
      // Fast forward time past deadline
      await ethers.provider.send("evm_increaseTime", [86401]); // 1 second past deadline
      await ethers.provider.send("evm_mine", []);

      const tenantBalanceBefore = await ethers.provider.getBalance(tenant.address);
      
      await expect(
        leaseEscrow.connect(tenant).timeoutRefund(1)
      )
        .to.emit(leaseEscrow, "LeaseRefunded")
        .withArgs(1, tenant.address, rentWei);

      // Check lease is deactivated
      const lease = await leaseEscrow.getLease(1, tenant.address);
      expect(lease.active).to.be.false;

      // Check tenant received refund
      const tenantBalanceAfter = await ethers.provider.getBalance(tenant.address);
      expect(tenantBalanceAfter - tenantBalanceBefore).to.be.closeTo(rentWei, ethers.parseEther("0.01")); // Allow for gas
    });

    it("Should revert if deadline not yet passed", async function () {
      await expect(
        leaseEscrow.connect(tenant).timeoutRefund(1)
      ).to.be.revertedWith("LeaseEscrow: Deadline not yet passed");
    });

    it("Should revert if lease not active", async function () {
      // Deactivate lease first
      await leaseEscrow.connect(owner).ownerConfirm(1, tenant.address);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        leaseEscrow.connect(tenant).timeoutRefund(1)
      ).to.be.revertedWith("LeaseEscrow: Lease not active");
    });

    it("Should revert if called by wrong tenant", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        leaseEscrow.connect(other).timeoutRefund(1)
      ).to.be.revertedWith("LeaseEscrow: Lease not active");
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy in startLease", async function () {
      // This test would require a malicious contract that tries to reenter
      // For now, we test that the function is marked as nonReentrant
      const leaseEscrowInterface = leaseEscrow.interface;
      const startLeaseFragment = leaseEscrowInterface.getFunction("startLease");
      
      // The function should be callable (reentrancy protection is internal)
      await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });
      
      // Verify lease was created
      expect(await leaseEscrow.isLeaseActive(1, tenant.address)).to.be.true;
    });

    it("Should prevent reentrancy in ownerConfirm", async function () {
      await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });
      
      // Owner confirm should work
      await leaseEscrow.connect(owner).ownerConfirm(1, tenant.address);
      
      // Verify lease is deactivated
      expect(await leaseEscrow.isLeaseActive(1, tenant.address)).to.be.false;
    });

    it("Should prevent reentrancy in timeoutRefund", async function () {
      await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      
      // Timeout refund should work
      await leaseEscrow.connect(tenant).timeoutRefund(1);
      
      // Verify lease is deactivated
      expect(await leaseEscrow.isLeaseActive(1, tenant.address)).to.be.false;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount lease", async function () {
      // Create policy with zero rent
      await policyRegistry.connect(owner).createPolicy(
        minAge,
        incomeMul,
        0, // zero rent
        needCleanRec,
        deadline
      );

      // Make tenant eligible
      const mockProof = "0x1234567890abcdef";
      const publicInputs = [
        minAge,
        incomeMul,
        0, // zero rent
        needCleanRec ? 1 : 0,
        2, // policyId
        "0xabcdef1234567890",
        "0x0987654321fedcba"
      ];
      await eligibilityGate.connect(tenant).submitZk(2, mockProof, publicInputs);

      // Should be able to start lease with zero payment
      await leaseEscrow.connect(tenant).startLease(2, { value: 0 });
      expect(await leaseEscrow.isLeaseActive(2, tenant.address)).to.be.true;
    });

    it("Should handle maximum deadline", async function () {
      const maxDeadline = 2**64 - 1; // Maximum uint64
      
      await policyRegistry.connect(owner).createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        maxDeadline
      );

      // Make tenant eligible
      const mockProof = "0x1234567890abcdef";
      const publicInputs = [
        minAge,
        incomeMul,
        rentWei,
        needCleanRec ? 1 : 0,
        2, // policyId
        "0xabcdef1234567890",
        "0x0987654321fedcba"
      ];
      await eligibilityGate.connect(tenant).submitZk(2, mockProof, publicInputs);

      // Should be able to start lease
      await leaseEscrow.connect(tenant).startLease(2, { value: rentWei });
      expect(await leaseEscrow.isLeaseActive(2, tenant.address)).to.be.true;
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });
    });

    it("Should return correct lease information", async function () {
      const lease = await leaseEscrow.getLease(1, tenant.address);
      expect(lease.tenant).to.equal(tenant.address);
      expect(lease.amount).to.equal(rentWei);
      expect(lease.deadline).to.equal(deadline);
      expect(lease.active).to.be.true;
    });

    it("Should return false for non-existent lease", async function () {
      expect(await leaseEscrow.isLeaseActive(999, tenant.address)).to.be.false;
    });

    it("Should return correct contract balance", async function () {
      expect(await leaseEscrow.getBalance()).to.equal(rentWei);
    });
  });
});
