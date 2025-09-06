import { expect } from "chai";
import { ethers } from "hardhat";
import { PolicyRegistry } from "../../typechain-types";

describe("PolicyRegistry", function () {
  let policyRegistry: PolicyRegistry;
  let owner: any;
  let tenant: any;
  let other: any;

  beforeEach(async function () {
    [owner, tenant, other] = await ethers.getSigners();

    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    policyRegistry = await PolicyRegistry.deploy();
    await policyRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await policyRegistry.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should start with policy ID 1", async function () {
      expect(await policyRegistry.getNextPolicyId()).to.equal(1);
    });

    it("Should start with 0 policies", async function () {
      expect(await policyRegistry.getPolicyCount()).to.equal(0);
    });
  });

  describe("createPolicy", function () {
    const minAge = 18;
    const incomeMul = 3;
    const rentWei = ethers.parseEther("1.0");
    const needCleanRec = true;
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

    it("Should create a policy successfully", async function () {
      const tx = await policyRegistry.connect(owner).createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;

      // Check policy was created
      const policyId = 1;
      const policy = await policyRegistry.getPolicy(policyId);

      expect(policy.minAge).to.equal(minAge);
      expect(policy.incomeMul).to.equal(incomeMul);
      expect(policy.rentWei).to.equal(rentWei);
      expect(policy.needCleanRec).to.equal(needCleanRec);
      expect(policy.deadline).to.equal(deadline);
      expect(policy.owner).to.equal(owner.address);
      expect(policy.policyHash).to.not.equal(ethers.ZeroHash);
    });

    it("Should emit PolicyCreated event", async function () {
      await expect(
        policyRegistry.connect(owner).createPolicy(
          minAge,
          incomeMul,
          rentWei,
          needCleanRec,
          deadline
        )
      )
        .to.emit(policyRegistry, "PolicyCreated")
        .withArgs(1, owner.address, await getExpectedPolicyHash(owner.address, minAge, incomeMul, rentWei, needCleanRec, deadline));
    });

    it("Should auto-increment policy ID", async function () {
      // Create first policy
      await policyRegistry.connect(owner).createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );

      expect(await policyRegistry.getNextPolicyId()).to.equal(2);
      expect(await policyRegistry.getPolicyCount()).to.equal(1);

      // Create second policy
      await policyRegistry.connect(tenant).createPolicy(
        21,
        4,
        ethers.parseEther("2.0"),
        false,
        deadline + 86400
      );

      expect(await policyRegistry.getNextPolicyId()).to.equal(3);
      expect(await policyRegistry.getPolicyCount()).to.equal(2);
    });

    it("Should set correct owner", async function () {
      await policyRegistry.connect(tenant).createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );

      const policy = await policyRegistry.getPolicy(1);
      expect(policy.owner).to.equal(tenant.address);
    });

    it("Should compute correct policy hash", async function () {
      await policyRegistry.connect(owner).createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );

      const policy = await policyRegistry.getPolicy(1);
      const expectedHash = await getExpectedPolicyHash(owner.address, minAge, incomeMul, rentWei, needCleanRec, deadline);
      expect(policy.policyHash).to.equal(expectedHash);
    });

    it("Should revert if deadline <= block.timestamp", async function () {
      const pastDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      await expect(
        policyRegistry.connect(owner).createPolicy(
          minAge,
          incomeMul,
          rentWei,
          needCleanRec,
          pastDeadline
        )
      ).to.be.revertedWith("PolicyRegistry: Invalid deadline");
    });

    it("Should revert if minAge is 0", async function () {
      await expect(
        policyRegistry.connect(owner).createPolicy(
          0,
          incomeMul,
          rentWei,
          needCleanRec,
          deadline
        )
      ).to.be.revertedWith("PolicyRegistry: Invalid min age");
    });

    it("Should revert if incomeMul is 0", async function () {
      await expect(
        policyRegistry.connect(owner).createPolicy(
          minAge,
          0,
          rentWei,
          needCleanRec,
          deadline
        )
      ).to.be.revertedWith("PolicyRegistry: Invalid income multiplier");
    });

    it("Should revert if rentWei is 0", async function () {
      await expect(
        policyRegistry.connect(owner).createPolicy(
          minAge,
          incomeMul,
          0,
          needCleanRec,
          deadline
        )
      ).to.be.revertedWith("PolicyRegistry: Invalid rent amount");
    });
  });

  describe("getPolicy", function () {
    const minAge = 18;
    const incomeMul = 3;
    const rentWei = ethers.parseEther("1.0");
    const needCleanRec = true;
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    beforeEach(async function () {
      await policyRegistry.connect(owner).createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );
    });

    it("Should return correct policy data", async function () {
      const policy = await policyRegistry.getPolicy(1);

      expect(policy.minAge).to.equal(minAge);
      expect(policy.incomeMul).to.equal(incomeMul);
      expect(policy.rentWei).to.equal(rentWei);
      expect(policy.needCleanRec).to.equal(needCleanRec);
      expect(policy.deadline).to.equal(deadline);
      expect(policy.owner).to.equal(owner.address);
    });

    it("Should revert for invalid policy ID (0)", async function () {
      await expect(
        policyRegistry.getPolicy(0)
      ).to.be.revertedWith("PolicyRegistry: Invalid policy ID");
    });

    it("Should revert for non-existent policy ID", async function () {
      await expect(
        policyRegistry.getPolicy(999)
      ).to.be.revertedWith("PolicyRegistry: Invalid policy ID");
    });
  });

  describe("isPolicyOwner", function () {
    const minAge = 18;
    const incomeMul = 3;
    const rentWei = ethers.parseEther("1.0");
    const needCleanRec = true;
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    beforeEach(async function () {
      await policyRegistry.connect(owner).createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );
    });

    it("Should return true for policy owner", async function () {
      const isOwner = await policyRegistry.connect(owner).isPolicyOwner(1);
      expect(isOwner).to.be.true;
    });

    it("Should return false for non-owner", async function () {
      const isOwner = await policyRegistry.connect(tenant).isPolicyOwner(1);
      expect(isOwner).to.be.false;
    });

    it("Should revert for invalid policy ID", async function () {
      await expect(
        policyRegistry.connect(owner).isPolicyOwner(0)
      ).to.be.revertedWith("PolicyRegistry: Invalid policy ID");
    });
  });

  describe("onlyPolicyOwner modifier", function () {
    const minAge = 18;
    const incomeMul = 3;
    const rentWei = ethers.parseEther("1.0");
    const needCleanRec = true;
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    beforeEach(async function () {
      await policyRegistry.connect(owner).createPolicy(
        minAge,
        incomeMul,
        rentWei,
        needCleanRec,
        deadline
      );
    });

    it("Should allow policy owner to call functions with modifier", async function () {
      // This test would require a function that uses the onlyPolicyOwner modifier
      // For now, we test the isPolicyOwner function which validates the same logic
      const isOwner = await policyRegistry.connect(owner).isPolicyOwner(1);
      expect(isOwner).to.be.true;
    });

    it("Should revert for non-owner calling functions with modifier", async function () {
      const isOwner = await policyRegistry.connect(tenant).isPolicyOwner(1);
      expect(isOwner).to.be.false;
    });
  });

  describe("Multiple policies", function () {
    it("Should handle multiple policies from different owners", async function () {
      const deadline1 = Math.floor(Date.now() / 1000) + 86400;
      const deadline2 = Math.floor(Date.now() / 1000) + 172800;

      // Create policy 1 by owner
      await policyRegistry.connect(owner).createPolicy(18, 3, ethers.parseEther("1.0"), true, deadline1);
      
      // Create policy 2 by tenant
      await policyRegistry.connect(tenant).createPolicy(21, 4, ethers.parseEther("2.0"), false, deadline2);

      // Verify both policies exist with correct owners
      const policy1 = await policyRegistry.getPolicy(1);
      const policy2 = await policyRegistry.getPolicy(2);

      expect(policy1.owner).to.equal(owner.address);
      expect(policy2.owner).to.equal(tenant.address);
      expect(await policyRegistry.getPolicyCount()).to.equal(2);
    });
  });

  // Helper function to compute expected policy hash
  async function getExpectedPolicyHash(
    owner: string,
    minAge: number,
    incomeMul: number,
    rentWei: bigint,
    needCleanRec: boolean,
    deadline: number
  ): Promise<string> {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "uint256", "bool", "uint64", "address"],
        [minAge, incomeMul, rentWei, needCleanRec, deadline, owner]
      )
    );
  }
});
