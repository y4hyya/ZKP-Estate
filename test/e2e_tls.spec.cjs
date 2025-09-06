const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TLS End-to-End Flow", function () {
  let policyRegistry;
  let eligibilityGateTLS;
  let leaseEscrow;
  let attestor;
  let owner;
  let tenant;
  let other;

  // Test constants
  const POLICY_ID = 1;
  const MIN_AGE = 18;
  const INCOME_MUL = 3;
  const RENT_WEI = ethers.parseEther("1.0");
  const NEED_CLEAN_REC = true;
  const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const NULLIFIER = ethers.keccak256(ethers.toUtf8Bytes("e2e-test-nullifier-123"));
  const ALL_CHECKS_PASSED = 0x07; // 0b111

  // Helper function to get fresh deadline
  function getFreshDeadline() {
    return Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  }

  beforeEach(async function () {
    [owner, attestor, tenant, other] = await ethers.getSigners();

    // Deploy PolicyRegistry
    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    policyRegistry = await PolicyRegistry.deploy();
    await policyRegistry.waitForDeployment();

    // Deploy EligibilityGateTLS
    const EligibilityGateTLS = await ethers.getContractFactory("EligibilityGateTLS");
    eligibilityGateTLS = await EligibilityGateTLS.deploy(
      await attestor.getAddress(),
      await owner.getAddress()
    );
    await eligibilityGateTLS.waitForDeployment();

    // Deploy LeaseEscrow with TLS gate
    const LeaseEscrow = await ethers.getContractFactory("LeaseEscrow");
    leaseEscrow = await LeaseEscrow.deploy(
      await policyRegistry.getAddress(),
      await eligibilityGateTLS.getAddress()
    );
    await leaseEscrow.waitForDeployment();
  });

  describe("Complete TLS Flow", function () {
    it("should complete full TLS flow: policy creation → attestation → lease → owner confirm", async function () {
      console.log("🏠 Starting complete TLS end-to-end flow...");

      // Step 1: Create a policy
      console.log("📋 Step 1: Creating policy...");
      const deadline = getFreshDeadline();
      const createPolicyTx = await policyRegistry.connect(owner).createPolicy(
        MIN_AGE,
        INCOME_MUL,
        RENT_WEI,
        NEED_CLEAN_REC,
        deadline
      );
      await createPolicyTx.wait();

      // Verify policy was created
      const policy = await policyRegistry.getPolicy(POLICY_ID);
      expect(policy.minAge).to.equal(MIN_AGE);
      expect(policy.incomeMul).to.equal(INCOME_MUL);
      expect(policy.rentWei).to.equal(RENT_WEI);
      expect(policy.needCleanRec).to.equal(NEED_CLEAN_REC);
      expect(policy.owner).to.equal(await owner.getAddress());
      console.log("✅ Policy created successfully");

      // Step 2: Simulate obtaining attestation (mock attestor service)
      console.log("🔐 Step 2: Simulating attestation process...");
      const attestation = {
        wallet: await tenant.getAddress(),
        policyId: POLICY_ID,
        expiry: FUTURE_EXPIRY,
        nullifier: NULLIFIER,
        passBitmask: ALL_CHECKS_PASSED
      };

      // Create EIP-712 signature from attestor
      const signature = await createEIP712Signature(attestor, attestation, await eligibilityGateTLS.getAddress());
      console.log("✅ Attestation signed by attestor");

      // Step 3: Submit TLS attestation and verify eligibility
      console.log("📤 Step 3: Submitting TLS attestation...");
      const submitTx = await eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature);
      const submitReceipt = await submitTx.wait();

      // Verify eligibility is set
      const isEligible = await eligibilityGateTLS.isEligible(await tenant.getAddress(), POLICY_ID);
      expect(isEligible).to.be.true;
      console.log("✅ Tenant is now eligible for policy");

      // Verify event was emitted
      const eligibleEvent = submitReceipt.logs.find(log => {
        try {
          const parsed = eligibilityGateTLS.interface.parseLog(log);
          return parsed && parsed.name === "Eligible";
        } catch {
          return false;
        }
      });
      expect(eligibleEvent).to.not.be.undefined;
      console.log("✅ Eligible event emitted");

      // Step 4: Start lease with rentWei payment
      console.log("🏠 Step 4: Starting lease...");
      
      // Get initial balances
      const tenantBalanceBefore = await ethers.provider.getBalance(tenant.address);
      const contractBalanceBefore = await ethers.provider.getBalance(leaseEscrow.getAddress());
      
      const startLeaseTx = await leaseEscrow.connect(tenant).startLease(POLICY_ID, { value: RENT_WEI });
      const startLeaseReceipt = await startLeaseTx.wait();

      // Verify lease was created
      const lease = await leaseEscrow.getLease(POLICY_ID, tenant.address);
      expect(lease.tenant).to.equal(tenant.address);
      expect(lease.amount).to.equal(RENT_WEI);
      expect(lease.deadline).to.equal(deadline);
      expect(lease.active).to.be.true;
      console.log("✅ Lease started successfully");

      // Verify contract received payment
      const contractBalanceAfter = await ethers.provider.getBalance(leaseEscrow.getAddress());
      expect(contractBalanceAfter - contractBalanceBefore).to.equal(RENT_WEI);
      console.log("✅ Payment received by contract");

      // Verify LeaseStarted event
      const leaseStartedEvent = startLeaseReceipt.logs.find(log => {
        try {
          const parsed = leaseEscrow.interface.parseLog(log);
          return parsed && parsed.name === "LeaseStarted";
        } catch {
          return false;
        }
      });
      expect(leaseStartedEvent).to.not.be.undefined;
      console.log("✅ LeaseStarted event emitted");

      // Step 5: Owner confirms lease and receives funds
      console.log("✅ Step 5: Owner confirming lease...");
      
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      const confirmTx = await leaseEscrow.connect(owner).ownerConfirm(POLICY_ID, tenant.address);
      const confirmReceipt = await confirmTx.wait();

      // Verify lease is deactivated
      const leaseAfterConfirm = await leaseEscrow.getLease(POLICY_ID, tenant.address);
      expect(leaseAfterConfirm.active).to.be.false;
      console.log("✅ Lease deactivated after confirmation");

      // Verify owner received funds
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const ownerGain = ownerBalanceAfter - ownerBalanceBefore;
      expect(ownerGain).to.be.closeTo(RENT_WEI, ethers.parseEther("0.01")); // Allow for gas
      console.log("✅ Owner received payment");

      // Verify contract balance is zero
      const contractBalanceFinal = await ethers.provider.getBalance(leaseEscrow.getAddress());
      expect(contractBalanceFinal).to.equal(0);
      console.log("✅ Contract balance cleared");

      // Verify LeaseReleased event
      const leaseReleasedEvent = confirmReceipt.logs.find(log => {
        try {
          const parsed = leaseEscrow.interface.parseLog(log);
          return parsed && parsed.name === "LeaseReleased";
        } catch {
          return false;
        }
      });
      expect(leaseReleasedEvent).to.not.be.undefined;
      console.log("✅ LeaseReleased event emitted");

      console.log("🎉 Complete TLS flow completed successfully!");
    });

    it("should complete TLS flow with timeout refund", async function () {
      console.log("🏠 Starting TLS flow with timeout refund...");

      // Step 1: Create policy
      console.log("📋 Step 1: Creating policy...");
      const deadline = getFreshDeadline();
      await policyRegistry.connect(owner).createPolicy(
        MIN_AGE,
        INCOME_MUL,
        RENT_WEI,
        NEED_CLEAN_REC,
        deadline
      );

      // Step 2: Submit attestation
      console.log("🔐 Step 2: Submitting attestation...");
      const attestation = {
        wallet: await tenant.getAddress(),
        policyId: POLICY_ID,
        expiry: FUTURE_EXPIRY,
        nullifier: ethers.keccak256(ethers.toUtf8Bytes("timeout-test-nullifier")),
        passBitmask: ALL_CHECKS_PASSED
      };

      const signature = await createEIP712Signature(attestor, attestation, await eligibilityGateTLS.getAddress());
      await eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature);

      // Step 3: Start lease
      console.log("🏠 Step 3: Starting lease...");
      const tenantBalanceBefore = await ethers.provider.getBalance(tenant.address);
      
      await leaseEscrow.connect(tenant).startLease(POLICY_ID, { value: RENT_WEI });

      // Step 4: Fast forward time past deadline
      console.log("⏰ Step 4: Fast forwarding past deadline...");
      const currentTime = await ethers.provider.getBlock('latest');
      const timeToAdd = deadline - currentTime.timestamp + 1; // 1 second past deadline
      
      await ethers.provider.send("evm_increaseTime", [timeToAdd]);
      await ethers.provider.send("evm_mine", []);

      // Step 5: Tenant requests timeout refund
      console.log("💰 Step 5: Requesting timeout refund...");
      const refundTx = await leaseEscrow.connect(tenant).timeoutRefund(POLICY_ID);
      const refundReceipt = await refundTx.wait();

      // Verify lease is deactivated
      const lease = await leaseEscrow.getLease(POLICY_ID, tenant.address);
      expect(lease.active).to.be.false;
      console.log("✅ Lease deactivated after refund");

      // Verify tenant received refund
      const tenantBalanceAfter = await ethers.provider.getBalance(tenant.address);
      const tenantGain = tenantBalanceAfter - tenantBalanceBefore;
      expect(tenantGain).to.be.closeTo(0, ethers.parseEther("0.01")); // Should be close to 0 (refund - gas)
      console.log("✅ Tenant received refund");

      // Verify contract balance is zero
      const contractBalance = await ethers.provider.getBalance(leaseEscrow.getAddress());
      expect(contractBalance).to.equal(0);
      console.log("✅ Contract balance cleared");

      // Verify LeaseRefunded event
      const leaseRefundedEvent = refundReceipt.logs.find(log => {
        try {
          const parsed = leaseEscrow.interface.parseLog(log);
          return parsed && parsed.name === "LeaseRefunded";
        } catch {
          return false;
        }
      });
      expect(leaseRefundedEvent).to.not.be.undefined;
      console.log("✅ LeaseRefunded event emitted");

      console.log("🎉 TLS flow with timeout refund completed successfully!");
    });

    it("should handle multiple tenants with different policies", async function () {
      console.log("🏠 Starting multi-tenant TLS flow...");

      // Create two policies
      console.log("📋 Creating multiple policies...");
      const deadline1 = getFreshDeadline();
      await policyRegistry.connect(owner).createPolicy(
        MIN_AGE,
        INCOME_MUL,
        RENT_WEI,
        NEED_CLEAN_REC,
        deadline1
      );

      const RENT_WEI_2 = ethers.parseEther("2.0");
      const deadline2 = getFreshDeadline();
      await policyRegistry.connect(owner).createPolicy(
        MIN_AGE + 5,
        INCOME_MUL + 1,
        RENT_WEI_2,
        false,
        deadline2
      );

      // Tenant 1 gets eligible for policy 1
      console.log("🔐 Tenant 1 getting eligible for policy 1...");
      const attestation1 = {
        wallet: await tenant.getAddress(),
        policyId: 1,
        expiry: FUTURE_EXPIRY,
        nullifier: ethers.keccak256(ethers.toUtf8Bytes("multi-tenant-1")),
        passBitmask: ALL_CHECKS_PASSED
      };

      const signature1 = await createEIP712Signature(attestor, attestation1, await eligibilityGateTLS.getAddress());
      await eligibilityGateTLS.connect(tenant).submitTLS(attestation1, signature1);

      // Tenant 2 gets eligible for policy 2
      console.log("🔐 Tenant 2 getting eligible for policy 2...");
      const attestation2 = {
        wallet: await other.getAddress(),
        policyId: 2,
        expiry: FUTURE_EXPIRY,
        nullifier: ethers.keccak256(ethers.toUtf8Bytes("multi-tenant-2")),
        passBitmask: ALL_CHECKS_PASSED
      };

      const signature2 = await createEIP712Signature(attestor, attestation2, await eligibilityGateTLS.getAddress());
      await eligibilityGateTLS.connect(other).submitTLS(attestation2, signature2);

      // Both tenants start leases
      console.log("🏠 Both tenants starting leases...");
      await leaseEscrow.connect(tenant).startLease(1, { value: RENT_WEI });
      await leaseEscrow.connect(other).startLease(2, { value: RENT_WEI_2 });

      // Verify both leases are active
      const lease1 = await leaseEscrow.getLease(1, tenant.address);
      const lease2 = await leaseEscrow.getLease(2, other.address);
      
      expect(lease1.active).to.be.true;
      expect(lease2.active).to.be.true;
      expect(lease1.amount).to.equal(RENT_WEI);
      expect(lease2.amount).to.equal(RENT_WEI_2);
      console.log("✅ Both leases started successfully");

      // Owner confirms both leases
      console.log("✅ Owner confirming both leases...");
      await leaseEscrow.connect(owner).ownerConfirm(1, tenant.address);
      await leaseEscrow.connect(owner).ownerConfirm(2, other.address);

      // Verify both leases are deactivated
      const lease1After = await leaseEscrow.getLease(1, tenant.address);
      const lease2After = await leaseEscrow.getLease(2, other.address);
      
      expect(lease1After.active).to.be.false;
      expect(lease2After.active).to.be.false;
      console.log("✅ Both leases confirmed and deactivated");

      console.log("🎉 Multi-tenant TLS flow completed successfully!");
    });

    it("should prevent unauthorized access and invalid operations", async function () {
      console.log("🛡️ Testing security and access controls...");

      // Create policy
      const testDeadline = getFreshDeadline();
      await policyRegistry.connect(owner).createPolicy(
        MIN_AGE,
        INCOME_MUL,
        RENT_WEI,
        NEED_CLEAN_REC,
        testDeadline
      );

      // Test 1: Non-eligible tenant cannot start lease
      console.log("❌ Testing non-eligible tenant cannot start lease...");
      await expect(
        leaseEscrow.connect(other).startLease(POLICY_ID, { value: RENT_WEI })
      ).to.be.revertedWith("LeaseEscrow: Not eligible for policy");
      console.log("✅ Non-eligible tenant blocked");

      // Test 2: Wrong payment amount
      console.log("❌ Testing wrong payment amount...");
      const attestation = {
        wallet: await tenant.getAddress(),
        policyId: POLICY_ID,
        expiry: FUTURE_EXPIRY,
        nullifier: ethers.keccak256(ethers.toUtf8Bytes("security-test")),
        passBitmask: ALL_CHECKS_PASSED
      };

      const signature = await createEIP712Signature(attestor, attestation, await eligibilityGateTLS.getAddress());
      await eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature);

      await expect(
        leaseEscrow.connect(tenant).startLease(POLICY_ID, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("LeaseEscrow: Incorrect payment amount");
      console.log("✅ Wrong payment amount blocked");

      // Test 3: Non-owner cannot confirm lease
      console.log("❌ Testing non-owner cannot confirm lease...");
      await leaseEscrow.connect(tenant).startLease(POLICY_ID, { value: RENT_WEI });

      await expect(
        leaseEscrow.connect(other).ownerConfirm(POLICY_ID, tenant.address)
      ).to.be.revertedWith("LeaseEscrow: Not policy owner");
      console.log("✅ Non-owner confirmation blocked");

      // Test 4: Cannot confirm inactive lease
      console.log("❌ Testing cannot confirm inactive lease...");
      await leaseEscrow.connect(owner).ownerConfirm(POLICY_ID, tenant.address);

      await expect(
        leaseEscrow.connect(owner).ownerConfirm(POLICY_ID, tenant.address)
      ).to.be.revertedWith("LeaseEscrow: Lease not active");
      console.log("✅ Inactive lease confirmation blocked");

      console.log("🎉 Security tests completed successfully!");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("should handle expired attestations", async function () {
      console.log("⏰ Testing expired attestation handling...");

      // Create policy
      const testDeadline = getFreshDeadline();
      await policyRegistry.connect(owner).createPolicy(
        MIN_AGE,
        INCOME_MUL,
        RENT_WEI,
        NEED_CLEAN_REC,
        testDeadline
      );

      // Create expired attestation
      const expiredAttestation = {
        wallet: await tenant.getAddress(),
        policyId: POLICY_ID,
        expiry: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        nullifier: ethers.keccak256(ethers.toUtf8Bytes("expired-test")),
        passBitmask: ALL_CHECKS_PASSED
      };

      const signature = await createEIP712Signature(attestor, expiredAttestation, await eligibilityGateTLS.getAddress());

      // Should fail with expired attestation
      await expect(
        eligibilityGateTLS.connect(tenant).submitTLS(expiredAttestation, signature)
      ).to.be.revertedWith("EligibilityGateTLS: Attestation expired");
      console.log("✅ Expired attestation properly rejected");
    });

    it("should handle policy deadline expiration", async function () {
      console.log("⏰ Testing policy deadline expiration...");

      // Create policy with very short deadline
      const shortDeadline = Math.floor(Date.now() / 1000) + 1; // 1 second from now
      await policyRegistry.connect(owner).createPolicy(
        MIN_AGE,
        INCOME_MUL,
        RENT_WEI,
        NEED_CLEAN_REC,
        shortDeadline
      );

      // Submit attestation
      const attestation = {
        wallet: await tenant.getAddress(),
        policyId: POLICY_ID,
        expiry: FUTURE_EXPIRY,
        nullifier: ethers.keccak256(ethers.toUtf8Bytes("deadline-test")),
        passBitmask: ALL_CHECKS_PASSED
      };

      const signature = await createEIP712Signature(attestor, attestation, await eligibilityGateTLS.getAddress());
      await eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature);

      // Fast forward past policy deadline
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);

      // Should fail to start lease due to expired policy
      await expect(
        leaseEscrow.connect(tenant).startLease(POLICY_ID, { value: RENT_WEI })
      ).to.be.revertedWith("LeaseEscrow: Policy deadline passed");
      console.log("✅ Expired policy properly rejected");
    });
  });

  describe("Balance and Event Verification", function () {
    it("should track balance changes accurately throughout the flow", async function () {
      console.log("💰 Testing balance tracking throughout TLS flow...");

      // Create policy
      const testDeadline = getFreshDeadline();
      await policyRegistry.connect(owner).createPolicy(
        MIN_AGE,
        INCOME_MUL,
        RENT_WEI,
        NEED_CLEAN_REC,
        testDeadline
      );

      // Get initial balances
      const tenantInitialBalance = await ethers.provider.getBalance(tenant.address);
      const ownerInitialBalance = await ethers.provider.getBalance(owner.address);
      const contractInitialBalance = await ethers.provider.getBalance(leaseEscrow.getAddress());

      console.log(`📊 Initial balances:`);
      console.log(`   Tenant: ${ethers.formatEther(tenantInitialBalance)} ETH`);
      console.log(`   Owner: ${ethers.formatEther(ownerInitialBalance)} ETH`);
      console.log(`   Contract: ${ethers.formatEther(contractInitialBalance)} ETH`);

      // Submit attestation
      const attestation = {
        wallet: await tenant.getAddress(),
        policyId: POLICY_ID,
        expiry: FUTURE_EXPIRY,
        nullifier: ethers.keccak256(ethers.toUtf8Bytes("balance-test")),
        passBitmask: ALL_CHECKS_PASSED
      };

      const signature = await createEIP712Signature(attestor, attestation, await eligibilityGateTLS.getAddress());
      await eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature);

      // Start lease
      const startLeaseTx = await leaseEscrow.connect(tenant).startLease(POLICY_ID, { value: RENT_WEI });
      const startLeaseReceipt = await startLeaseTx.wait();

      // Check balances after lease start
      const tenantAfterLease = await ethers.provider.getBalance(tenant.address);
      const contractAfterLease = await ethers.provider.getBalance(leaseEscrow.getAddress());

      console.log(`📊 After lease start:`);
      console.log(`   Tenant: ${ethers.formatEther(tenantAfterLease)} ETH`);
      console.log(`   Contract: ${ethers.formatEther(contractAfterLease)} ETH`);

      // Verify tenant paid exactly RENT_WEI (accounting for gas)
      const tenantPayment = tenantInitialBalance - tenantAfterLease;
      expect(tenantPayment).to.be.closeTo(RENT_WEI, ethers.parseEther("0.01")); // Allow for gas

      // Verify contract received exactly RENT_WEI
      expect(contractAfterLease - contractInitialBalance).to.equal(RENT_WEI);

      // Owner confirms lease
      const confirmTx = await leaseEscrow.connect(owner).ownerConfirm(POLICY_ID, tenant.address);
      const confirmReceipt = await confirmTx.wait();

      // Check final balances
      const tenantFinalBalance = await ethers.provider.getBalance(tenant.address);
      const ownerFinalBalance = await ethers.provider.getBalance(owner.address);
      const contractFinalBalance = await ethers.provider.getBalance(leaseEscrow.getAddress());

      console.log(`📊 Final balances:`);
      console.log(`   Tenant: ${ethers.formatEther(tenantFinalBalance)} ETH`);
      console.log(`   Owner: ${ethers.formatEther(ownerFinalBalance)} ETH`);
      console.log(`   Contract: ${ethers.formatEther(contractFinalBalance)} ETH`);

      // Verify owner received the payment (accounting for gas)
      const ownerGain = ownerFinalBalance - ownerInitialBalance;
      expect(ownerGain).to.be.closeTo(RENT_WEI, ethers.parseEther("0.01")); // Allow for gas

      // Verify contract balance is zero
      expect(contractFinalBalance).to.equal(0);

      console.log("✅ Balance tracking completed successfully!");
    });

    it("should emit all expected events in correct order", async function () {
      console.log("📡 Testing event emission throughout TLS flow...");

      // Create policy
      const testDeadline = getFreshDeadline();
      await policyRegistry.connect(owner).createPolicy(
        MIN_AGE,
        INCOME_MUL,
        RENT_WEI,
        NEED_CLEAN_REC,
        testDeadline
      );

      // Submit attestation
      const attestation = {
        wallet: await tenant.getAddress(),
        policyId: POLICY_ID,
        expiry: FUTURE_EXPIRY,
        nullifier: ethers.keccak256(ethers.toUtf8Bytes("event-test")),
        passBitmask: ALL_CHECKS_PASSED
      };

      const signature = await createEIP712Signature(attestor, attestation, await eligibilityGateTLS.getAddress());
      const submitTx = await eligibilityGateTLS.connect(tenant).submitTLS(attestation, signature);
      const submitReceipt = await submitTx.wait();

      // Verify Eligible event
      const eligibleEvent = submitReceipt.logs.find(log => {
        try {
          const parsed = eligibilityGateTLS.interface.parseLog(log);
          return parsed && parsed.name === "Eligible";
        } catch {
          return false;
        }
      });
      expect(eligibleEvent).to.not.be.undefined;
      console.log("✅ Eligible event emitted");

      // Start lease
      const startLeaseTx = await leaseEscrow.connect(tenant).startLease(POLICY_ID, { value: RENT_WEI });
      const startLeaseReceipt = await startLeaseTx.wait();

      // Verify LeaseStarted event
      const leaseStartedEvent = startLeaseReceipt.logs.find(log => {
        try {
          const parsed = leaseEscrow.interface.parseLog(log);
          return parsed && parsed.name === "LeaseStarted";
        } catch {
          return false;
        }
      });
      expect(leaseStartedEvent).to.not.be.undefined;
      console.log("✅ LeaseStarted event emitted");

      // Owner confirms lease
      const confirmTx = await leaseEscrow.connect(owner).ownerConfirm(POLICY_ID, tenant.address);
      const confirmReceipt = await confirmTx.wait();

      // Verify LeaseReleased event
      const leaseReleasedEvent = confirmReceipt.logs.find(log => {
        try {
          const parsed = leaseEscrow.interface.parseLog(log);
          return parsed && parsed.name === "LeaseReleased";
        } catch {
          return false;
        }
      });
      expect(leaseReleasedEvent).to.not.be.undefined;
      console.log("✅ LeaseReleased event emitted");

      console.log("✅ All expected events emitted successfully!");
    });
  });
});

/**
 * Helper function to create EIP-712 signature
 */
async function createEIP712Signature(
  signer,
  attestation,
  contractAddress
) {
  const domain = {
    name: "ZKPRent-TLS",
    version: "1",
    chainId: 31337, // Hardhat default
    verifyingContract: contractAddress
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

  return await signer.signTypedData(domain, types, attestation);
}