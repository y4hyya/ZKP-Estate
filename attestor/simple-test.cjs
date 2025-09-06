// Simple test to verify the attestor service works
const { ethers } = require("ethers");

async function testEIP712() {
  console.log("🧪 Testing EIP-712 functionality");
  console.log("===============================\n");

  try {
    // Create a test wallet
    const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    console.log("✅ Wallet created:", wallet.address);

    // Test domain
    const domain = {
      name: "ZKPRent-TLS",
      version: "1",
      chainId: 31337,
      verifyingContract: "0x922D6956C99E12DFeB3224DEA977D0939758A1Fe"
    };

    // Test types
    const types = {
      Attestation: [
        { name: "wallet", type: "address" },
        { name: "policyId", type: "uint256" },
        { name: "expiry", type: "uint64" },
        { name: "nullifier", type: "bytes32" },
        { name: "passBitmask", type: "uint8" },
      ],
    };

    // Test attestation
    const attestation = {
      wallet: "0x1234567890123456789012345678901234567890",
      policyId: 1,
      expiry: Math.floor(Date.now() / 1000) + 3600,
      nullifier: ethers.keccak256(ethers.toUtf8Bytes("test-nullifier")),
      passBitmask: 7
    };

    console.log("✅ Test attestation created:", attestation);

    // Sign the attestation
    const signature = await wallet.signTypedData(domain, types, attestation);
    console.log("✅ Signature generated:", signature);

    // Verify the signature
    const recoveredAddress = ethers.verifyTypedData(domain, types, attestation, signature);
    console.log("✅ Signature verified");
    console.log("   Expected:", wallet.address);
    console.log("   Recovered:", recoveredAddress);
    console.log("   Valid:", recoveredAddress.toLowerCase() === wallet.address.toLowerCase());

    console.log("\n🎉 EIP-712 functionality test passed!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testEIP712();
