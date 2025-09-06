const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EligibilityGateTLS", function () {
  let eligibilityGateTLS;
  let attestor;
  let owner;
  let tenant;
  let other;

  beforeEach(async function () {
    [owner, attestor, tenant, other] = await ethers.getSigners();

    // Deploy EligibilityGateTLS
    const EligibilityGateTLS = await ethers.getContractFactory("EligibilityGateTLS");
    eligibilityGateTLS = await EligibilityGateTLS.deploy(
      await attestor.getAddress(),
      await owner.getAddress()
    );
    await eligibilityGateTLS.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct attestor and owner", async function () {
      expect(await eligibilityGateTLS.attestor()).to.equal(await attestor.getAddress());
      expect(await eligibilityGateTLS.owner()).to.equal(await owner.getAddress());
    });

    it("Should have correct EIP-712 domain", async function () {
      // This would require more complex testing with EIP-712 domain verification
      // For now, we'll just ensure the contract deploys successfully
      expect(await eligibilityGateTLS.getAddress()).to.be.properAddress;
    });
  });

  describe("Attestor Management", function () {
    it("Should allow owner to update attestor", async function () {
      const newAttestor = other;
      
      await expect(eligibilityGateTLS.setAttestor(await newAttestor.getAddress()))
        .to.emit(eligibilityGateTLS, "AttestorUpdated")
        .withArgs(await attestor.getAddress(), await newAttestor.getAddress());
      
      expect(await eligibilityGateTLS.attestor()).to.equal(await newAttestor.getAddress());
    });

    it("Should not allow non-owner to update attestor", async function () {
      await expect(
        eligibilityGateTLS.connect(tenant).setAttestor(await other.getAddress())
      ).to.be.revertedWithCustomError(eligibilityGateTLS, "OwnableUnauthorizedAccount");
    });

    it("Should not allow setting zero address as attestor", async function () {
      await expect(
        eligibilityGateTLS.setAttestor(ethers.ZeroAddress)
      ).to.be.revertedWith("EligibilityGateTLS: Invalid attestor");
    });
  });

  describe("Eligibility Check", function () {
    it("Should return false for non-eligible addresses", async function () {
      expect(await eligibilityGateTLS.isEligible(await tenant.getAddress(), 1)).to.be.false;
    });
  });

  describe("Attestation Submission", function () {
    let attestation;
    let signature;

    beforeEach(async function () {
      // Create a valid attestation
      attestation = {
        wallet: await tenant.getAddress(),
        policyId: 1,
        expiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        nullifier: ethers.keccak256(ethers.toUtf8Bytes("test-nullifier-1")),
        passBitmask: 0x07 // All checks passed
      };

      // Create EIP-712 signature
      const domain = {
        name: "ZKPRent-TLS",
        version: "1",
        chainId: 31337, // Hardhat default
        verifyingContract: await eligibilityGateTLS.getAddress()
      };

      const types = {
        Attestation: [
          { name: "wallet", type: "address" },
          { name: "policyId", type: "uint256" },
          { name: "expiry", type: "uint64" },
          { name: "nullifier", type: "bytes32" },
          { name: "passBitmask", type: "uint8" }
        ]
      };

      const value = attestation;
      signature = await attestor.signTypedData(domain, types, value);
    });

    it("Should accept valid attestation", async function () {
      await expect(eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature))
        .to.emit(eligibilityGateTLS, "Eligible")
        .withArgs(await tenant.getAddress(), 1, attestation.nullifier);

      expect(await eligibilityGateTLS.isEligible(await tenant.getAddress(), 1)).to.be.true;
      expect(await eligibilityGateTLS.nullifierUsed(attestation.nullifier)).to.be.true;
    });

    it("Should reject expired attestation", async function () {
      attestation.expiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      
      // Recreate signature with new expiry
      const domain = {
        name: "ZKPRent-TLS",
        version: "1",
        chainId: 31337,
        verifyingContract: await eligibilityGateTLS.getAddress()
      };
      const types = {
        Attestation: [
          { name: "wallet", type: "address" },
          { name: "policyId", type: "uint256" },
          { name: "expiry", type: "uint64" },
          { name: "nullifier", type: "bytes32" },
          { name: "passBitmask", type: "uint8" }
        ]
      };
      const value = attestation;
      signature = await attestor.signTypedData(domain, types, value);

      await expect(
        eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature)
      ).to.be.revertedWith("EligibilityGateTLS: Attestation expired");
    });

    it("Should reject attestation with incomplete checks", async function () {
      attestation.passBitmask = 0x05; // Only age and clean record passed, income failed
      
      // Recreate signature
      const domain = {
        name: "ZKPRent-TLS",
        version: "1",
        chainId: 31337,
        verifyingContract: await eligibilityGateTLS.getAddress()
      };
      const types = {
        Attestation: [
          { name: "wallet", type: "address" },
          { name: "policyId", type: "uint256" },
          { name: "expiry", type: "uint64" },
          { name: "nullifier", type: "bytes32" },
          { name: "passBitmask", type: "uint8" }
        ]
      };
      const value = attestation;
      signature = await attestor.signTypedData(domain, types, value);

      await expect(
        eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature)
      ).to.be.revertedWith("EligibilityGateTLS: Not all checks passed");
    });

    it("Should reject reused nullifier", async function () {
      // First submission should succeed
      await eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature);
      
      // Second submission with same nullifier should fail
      await expect(
        eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature)
      ).to.be.revertedWith("EligibilityGateTLS: Nullifier already used");
    });

    it("Should reject attestation from wrong wallet", async function () {
      attestation.wallet = await other.getAddress();
      
      // Recreate signature
      const domain = {
        name: "ZKPRent-TLS",
        version: "1",
        chainId: 31337,
        verifyingContract: await eligibilityGateTLS.getAddress()
      };
      const types = {
        Attestation: [
          { name: "wallet", type: "address" },
          { name: "policyId", type: "uint256" },
          { name: "expiry", type: "uint64" },
          { name: "nullifier", type: "bytes32" },
          { name: "passBitmask", type: "uint8" }
        ]
      };
      const value = attestation;
      signature = await attestor.signTypedData(domain, types, value);

      await expect(
        eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature)
      ).to.be.revertedWith("EligibilityGateTLS: Wallet mismatch");
    });

    it("Should reject attestation with invalid signature", async function () {
      // Use signature from different signer
      const wrongSignature = await other.signTypedData(
        {
          name: "ZKPRent-TLS",
          version: "1",
          chainId: 31337,
          verifyingContract: await eligibilityGateTLS.getAddress()
        },
        {
          Attestation: [
            { name: "wallet", type: "address" },
            { name: "policyId", type: "uint256" },
            { name: "expiry", type: "uint64" },
            { name: "nullifier", type: "bytes32" },
            { name: "passBitmask", type: "uint8" }
          ]
        },
        attestation
      );

      await expect(
        eligibilityGateTLS.connect(tenant).submitTLS(attestation, wrongSignature)
      ).to.be.revertedWith("EligibilityGateTLS: Invalid signature");
    });
  });
});
