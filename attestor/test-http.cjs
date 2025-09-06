// Simple HTTP test for the attestor service
const http = require("http");

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAttestorService() {
  console.log("🧪 Testing Attestor Service (HTTP)");
  console.log("==================================\n");

  const baseUrl = "localhost";
  const port = 3001;

  try {
    // Test 1: Health check
    console.log("1️⃣ Testing health check...");
    const healthResponse = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: "/health",
      method: "GET",
    });
    
    if (healthResponse.status === 200) {
      console.log("✅ Health check passed:", healthResponse.data);
    } else {
      console.log("❌ Health check failed:", healthResponse);
      return;
    }
    console.log();

    // Test 2: Get attestor info
    console.log("2️⃣ Testing attestor info...");
    const infoResponse = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: "/info",
      method: "GET",
    });
    
    if (infoResponse.status === 200) {
      console.log("✅ Attestor info:", infoResponse.data);
    } else {
      console.log("❌ Attestor info failed:", infoResponse);
      return;
    }
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
        }
      }
    };

    const attestResponse = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: "/attest",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }, attestationRequest);

    if (attestResponse.status === 200) {
      console.log("✅ Attestation created successfully!");
      console.log("   Attestation:", attestResponse.data.attestation);
      console.log("   Signature:", attestResponse.data.signature);
      console.log("   Verification:", attestResponse.data.verification);
    } else {
      console.log("❌ Attestation failed:", attestResponse);
      return;
    }

    console.log("\n🎉 All HTTP tests passed!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("\n💡 Make sure the attestor service is running:");
    console.log("   node dist/index.js");
  }
}

testAttestorService();
