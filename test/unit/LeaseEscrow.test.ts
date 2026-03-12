import { expect } from "chai";
import { ethers } from "hardhat";
import { LeaseEscrow, PolicyRegistry, EligibilityGateTLS } from "../../typechain-types";

describe("LeaseEscrow", function () {
  let leaseEscrow: LeaseEscrow;
  let policyRegistry: PolicyRegistry;
  let eligibilityGateTLS: EligibilityGateTLS;
  let owner: any;
  let tenant: any;
  let attestor: any;
  let other: any;

  const minAge = 18;
  const incomeMul = 3;
  const rentWei = ethers.parseEther("1.0");
  const needCleanRec = true;
  const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

  // EIP-712 domain and types for signing attestations
  const DOMAIN_NAME = "ZKPRent-TLS";
  const DOMAIN_VERSION = "1";

  async function signAttestation(
    signer: any,
    gateTLSAddress: string,
    wallet: string,
    policyId: number,
    expiry: number,
    nullifier: string,
    passBitmask: number
  ) {
    const domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: gateTLSAddress,
    };
    const types = {
      Attestation: [
        { name: "wallet", type: "address" },
        { name: "policyId", type: "uint256" },
        { name: "expiry", type: "uint64" },
        { name: "nullifier", type: "bytes32" },
        { name: "passBitmask", type: "uint8" },
      ],
    };
    const value = { wallet, policyId, expiry, nullifier, passBitmask };
    return signer.signTypedData(domain, types, value);
  }

  async function makeEligible(tenantSigner: any, policyId: number, nullifier: string) {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const gateAddress = await eligibilityGateTLS.getAddress();
    const sig = await signAttestation(
      attestor,
      gateAddress,
      tenantSigner.address,
      policyId,
      expiry,
      nullifier,
      7 // all checks passed
    );
    await eligibilityGateTLS.connect(tenantSigner).submitTLS(
      {
        wallet: tenantSigner.address,
        policyId,
        expiry,
        nullifier,
        passBitmask: 7,
      },
      sig
    );
  }

  beforeEach(async function () {
    [owner, tenant, attestor, other] = await ethers.getSigners();

    // Deploy PolicyRegistry
    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    policyRegistry = await PolicyRegistry.deploy();
    await policyRegistry.waitForDeployment();

    // Deploy EligibilityGateTLS
    const EligibilityGateTLS = await ethers.getContractFactory("EligibilityGateTLS");
    eligibilityGateTLS = await EligibilityGateTLS.deploy(
      attestor.address,
      owner.address
    );
    await eligibilityGateTLS.waitForDeployment();

    // Deploy LeaseEscrow
    const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
    leaseEscrow = await LeaseEscrow.deploy(
      await policyRegistry.getAddress(),
      await eligibilityGateTLS.getAddress()
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

    // Make tenant eligible via TLS attestation
    const nullifier = ethers.hexlify(ethers.randomBytes(32));
    await makeEligible(tenant, 1, nullifier);
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await leaseEscrow.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set correct dependencies", async function () {
      expect(await leaseEscrow.getPolicyRegistry()).to.equal(await policyRegistry.getAddress());
      expect(await leaseEscrow.getEligibilityGate()).to.equal(await eligibilityGateTLS.getAddress());
    });

    it("Should revert with zero policy registry address", async function () {
      const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
      await expect(
        LeaseEscrow.deploy(ethers.ZeroAddress, await eligibilityGateTLS.getAddress())
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

      const lease = await leaseEscrow.getLease(1, tenant.address);
      expect(lease.tenant).to.equal(tenant.address);
      expect(lease.amount).to.equal(rentWei);
      expect(lease.deadline).to.equal(deadline);
      expect(lease.active).to.be.true;

      expect(await leaseEscrow.getBalance()).to.equal(rentWei);
    });

    it("Should revert if not eligible", async function () {
      await policyRegistry.connect(owner).createPolicy(
        minAge, incomeMul, rentWei, needCleanRec, deadline
      );

      await expect(
        leaseEscrow.connect(tenant).startLease(2, { value: rentWei })
      ).to.be.revertedWith("LeaseEscrow: Not eligible for policy");
    });

    it("Should revert with incorrect payment amount", async function () {
      await expect(
        leaseEscrow.connect(tenant).startLease(1, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("LeaseEscrow: Incorrect payment amount");
    });

    it("Should revert if lease already exists", async function () {
      await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });
      await expect(
        leaseEscrow.connect(tenant).startLease(1, { value: rentWei })
      ).to.be.revertedWith("LeaseEscrow: Lease already exists");
    });

    it("Should handle multiple tenants for same policy", async function () {
      const nullifier2 = ethers.hexlify(ethers.randomBytes(32));
      await makeEligible(other, 1, nullifier2);

      await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });
      await leaseEscrow.connect(other).startLease(1, { value: rentWei });

      expect(await leaseEscrow.isLeaseActive(1, tenant.address)).to.be.true;
      expect(await leaseEscrow.isLeaseActive(1, other.address)).to.be.true;
    });
  });

  describe("ownerConfirm", function () {
    beforeEach(async function () {
      await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });
    });

    it("Should successfully confirm lease and release funds", async function () {
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      await expect(
        leaseEscrow.connect(owner).ownerConfirm(1, tenant.address)
      )
        .to.emit(leaseEscrow, "LeaseReleased")
        .withArgs(1, tenant.address, rentWei);

      const lease = await leaseEscrow.getLease(1, tenant.address);
      expect(lease.active).to.be.false;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.be.closeTo(rentWei, ethers.parseEther("0.01"));
    });

    it("Should revert if not policy owner", async function () {
      await expect(
        leaseEscrow.connect(other).ownerConfirm(1, tenant.address)
      ).to.be.revertedWith("LeaseEscrow: Not policy owner");
    });

    it("Should revert if lease not active", async function () {
      await leaseEscrow.connect(owner).ownerConfirm(1, tenant.address);
      await expect(
        leaseEscrow.connect(owner).ownerConfirm(1, tenant.address)
      ).to.be.revertedWith("LeaseEscrow: Lease not active");
    });
  });

  describe("timeoutRefund", function () {
    beforeEach(async function () {
      await leaseEscrow.connect(tenant).startLease(1, { value: rentWei });
    });

    it("Should successfully refund after deadline", async function () {
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);

      const tenantBalanceBefore = await ethers.provider.getBalance(tenant.address);

      await expect(
        leaseEscrow.connect(tenant).timeoutRefund(1)
      )
        .to.emit(leaseEscrow, "LeaseRefunded")
        .withArgs(1, tenant.address, rentWei);

      const lease = await leaseEscrow.getLease(1, tenant.address);
      expect(lease.active).to.be.false;

      const tenantBalanceAfter = await ethers.provider.getBalance(tenant.address);
      expect(tenantBalanceAfter - tenantBalanceBefore).to.be.closeTo(rentWei, ethers.parseEther("0.01"));
    });

    it("Should revert if deadline not yet passed", async function () {
      await expect(
        leaseEscrow.connect(tenant).timeoutRefund(1)
      ).to.be.revertedWith("LeaseEscrow: Deadline not yet passed");
    });

    it("Should revert if lease not active", async function () {
      await leaseEscrow.connect(owner).ownerConfirm(1, tenant.address);
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      await expect(
        leaseEscrow.connect(tenant).timeoutRefund(1)
      ).to.be.revertedWith("LeaseEscrow: Lease not active");
    });

    it("Should revert if called by wrong tenant", async function () {
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);
      await expect(
        leaseEscrow.connect(other).timeoutRefund(1)
      ).to.be.revertedWith("LeaseEscrow: Lease not active");
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
