import { expect } from "chai";
import { ethers } from "hardhat";
import { VerifierStub } from "../../typechain-types";

describe("VerifierStub", function () {
  let verifier: VerifierStub;
  let owner: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    const VerifierStub = await ethers.getContractFactory("VerifierStub");
    verifier = await VerifierStub.deploy();
    await verifier.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await verifier.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should return correct public input size", async function () {
      expect(await verifier.getPublicInputSize()).to.equal(3);
    });
  });

  describe("Proof Verification", function () {
    it("Should verify valid proof", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test_proof"));
      const publicInputs = [18, 3000, 600];

      const isValid = await verifier.verifyProof(proofHash, publicInputs);
      expect(isValid).to.be.true;

      // Check if proof is marked as verified
      const isVerified = await verifier.isProofVerified(proofHash);
      expect(isVerified).to.be.true;
    });

    it("Should emit ProofVerified event", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test_proof"));
      const publicInputs = [18, 3000, 600];

      await expect(verifier.verifyProof(proofHash, publicInputs))
        .to.emit(verifier, "ProofVerified")
        .withArgs(proofHash, true);
    });

    it("Should reject empty public inputs", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test_proof"));
      const emptyInputs: number[] = [];

      await expect(
        verifier.verifyProof(proofHash, emptyInputs)
      ).to.be.revertedWith("No public inputs provided");
    });

    it("Should reject zero public inputs", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test_proof"));
      const zeroInputs = [0, 3000, 600];

      await expect(
        verifier.verifyProof(proofHash, zeroInputs)
      ).to.be.revertedWith("Invalid public input");
    });

    it("Should reject negative public inputs", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test_proof"));
      const negativeInputs = [18, -1000, 600];

      await expect(
        verifier.verifyProof(proofHash, negativeInputs)
      ).to.be.revertedWith("Invalid public input");
    });
  });

  describe("Proof Status", function () {
    it("Should track verified proofs", async function () {
      const proofHash1 = ethers.keccak256(ethers.toUtf8Bytes("proof1"));
      const proofHash2 = ethers.keccak256(ethers.toUtf8Bytes("proof2"));
      const publicInputs = [18, 3000, 600];

      // Initially, proofs should not be verified
      expect(await verifier.isProofVerified(proofHash1)).to.be.false;
      expect(await verifier.isProofVerified(proofHash2)).to.be.false;

      // Verify first proof
      await verifier.verifyProof(proofHash1, publicInputs);
      expect(await verifier.isProofVerified(proofHash1)).to.be.true;
      expect(await verifier.isProofVerified(proofHash2)).to.be.false;

      // Verify second proof
      await verifier.verifyProof(proofHash2, publicInputs);
      expect(await verifier.isProofVerified(proofHash1)).to.be.true;
      expect(await verifier.isProofVerified(proofHash2)).to.be.true;
    });
  });
});
