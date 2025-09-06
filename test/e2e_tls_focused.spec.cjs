const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TLS End-to-End Flow - Focused", function () {
  let policyRegistry;
  let eligibilityGateTLS;
  let leaseEscrow;
  let attestor;
  let owner;
  let tenant;

  // Test constants
  const POLICY_ID = 1;
  const MIN_AGE = 18;
  const INCOME_MUL = 3;
  const RENT_WEI = ethers.parseEther("1.0");
  const NEED_CLEAN_REC = true;
  const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const ALL_CHECKS_PASSED = 0x07; // 0b111

  beforeEach(async function () {
    [owner, attestor, tenant] = await ethers.getSigners();

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

  it("should complete full TLS flow: policy creation → attestation → lease → owner confirm", async function () {
    console.log("🏠 Starting complete TLS end-to-end flow...");

    // Step 1: Create a policy
    console.log("📋 Step 1: Creating policy...");
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
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
      nullifier: ethers.keccak256(ethers.toUtf8Bytes("e2e-test-nullifier-123")),
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
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
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
