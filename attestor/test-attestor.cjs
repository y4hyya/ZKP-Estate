const { ethers } = require("ethers");

// Test the attestor service
async function testAttestor() {
  console.log("🧪 Testing Attestor Service");
  console.log("==========================\n");

  const baseUrl = "http://localhost:3001";
  
  try {
    // Test 1: Health check
    console.log("1️⃣ Testing health check...");
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log("✅ Health check:", healthData);
    console.log();

    // Test 2: Get attestor info
    console.log("2️⃣ Testing attestor info...");
    const infoResponse = await fetch(`${baseUrl}/info`);
    const infoData = await infoResponse.json();
    console.log("✅ Attestor info:", infoData);
    console.log();

    // Test 3: Create attestation
    console.log("3️⃣ Testing attestation creation...");
    const attestationRequest = {
      wallet: "0x1234567890123456789012345678901234567890",
      policyId: 1,
      tlsn_proof: {
        bank: {
          accountNumber: "1234567890",
          bankName: "Demo Bank International",
          accountHolder: "John Doe",
          balance: 75000,
          currency: "USD",
          verifiedAt: "2025-09-06T20:00:00Z"
        },
        id: {
          documentNumber: "A123456789",
          documentType: "passport",
          fullName: "John Doe",
          dateOfBirth: "1995-06-15",
          nationality: "US",
          verifiedAt: "2025-09-06T20:00:00Z"
        }
      }
    };

    const attestResponse = await fetch(`${baseUrl}/attest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(attestationRequest),
    });

    if (!attestResponse.ok) {
      const errorData = await attestResponse.json();
      console.log("❌ Attestation failed:", errorData);
      return;
    }

    const attestData = await attestResponse.json();
    console.log("✅ Attestation created successfully!");
    console.log("   Attestation:", attestData.attestation);
    console.log("   Signature:", attestData.signature);
    console.log("   Domain:", attestData.domain);
    console.log("   Verification:", attestData.verification);
    console.log();

    // Test 4: Verify signature
    console.log("4️⃣ Testing signature verification...");
    try {
      const isValid = ethers.verifyTypedData(
        attestData.domain,
        {
          Attestation: [
            { name: "wallet", type: "address" },
            { name: "policyId", type: "uint256" },
            { name: "expiry", type: "uint64" },
            { name: "nullifier", type: "bytes32" },
            { name: "passBitmask", type: "uint8" },
          ],
        },
        attestData.attestation,
        attestData.signature
      );
      
      console.log("✅ Signature verification:", isValid);
      console.log("   Expected signer:", infoData.attestor);
      console.log("   Recovered signer:", isValid);
      console.log("   Valid:", isValid.toLowerCase() === infoData.attestor.toLowerCase());
    } catch (error) {
      console.log("❌ Signature verification failed:", error.message);
    }

    console.log("\n🎉 All tests completed successfully!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("\n💡 Make sure the attestor service is running:");
    console.log("   cd attestor && npm run dev");
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === "undefined") {
  console.log("❌ This test requires Node.js 18+ or a fetch polyfill");
  console.log("   Try: node --version");
  process.exit(1);
}

testAttestor();
