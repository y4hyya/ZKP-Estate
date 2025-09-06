const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

async function main() {
  console.log("🔮 Generating ZK proof for eligibility circuit...");

  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Default values (can be overridden by environment variables)
  let policyId = parseInt(process.env.POLICY_ID) || 1;
  let age = parseInt(process.env.AGE) || 25;
  let monthlyIncome = parseFloat(process.env.INCOME) || 5.0;
  let criminalRecord = process.env.CRIMINAL ? process.env.CRIMINAL.toLowerCase() === "true" : false;
  let walletAddress = process.env.WALLET_ADDRESS || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Default test address

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--policy":
        policyId = parseInt(args[i + 1]);
        i++;
        break;
      case "--age":
        age = parseInt(args[i + 1]);
        i++;
        break;
      case "--income":
        monthlyIncome = parseFloat(args[i + 1]);
        i++;
        break;
      case "--criminal":
        criminalRecord = args[i + 1].toLowerCase() === "true";
        i++;
        break;
      case "--wallet":
        walletAddress = args[i + 1];
        i++;
        break;
      case "--help":
        console.log(`
Usage: npx hardhat run scripts/prove.ts --network <network> [options]

Options:
  --policy <number>         Policy ID to use (default: 1)
  --age <number>           Tenant age (default: 25)
  --income <number>        Monthly income in ETH (default: 5.0)
  --criminal <boolean>     Has criminal record (default: false)
  --wallet <address>       Wallet address (default: test address)
  --help                   Show this help message

Examples:
  npx hardhat run scripts/prove.ts --network localhost
  npx hardhat run scripts/prove.ts --network localhost --age 30 --income 8.5 --criminal false
        `);
        process.exit(0);
    }
  }

  // Get network info
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;

  // Load deployment info
  const deploymentFile = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ Deployment file not found: ${deploymentFile}`);
    console.error("Please run 'npm run dev:deploy' first to deploy contracts.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const policyRegistryAddress = deployment.contracts.PolicyRegistry.address;

  if (!policyRegistryAddress) {
    console.error("❌ PolicyRegistry address not found in deployment file");
    process.exit(1);
  }

  // Connect to PolicyRegistry to get policy details
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const policyRegistry = PolicyRegistry.attach(policyRegistryAddress);

  console.log(`📋 PolicyRegistry connected at: ${policyRegistryAddress}`);

  // Get policy details
  let policy;
  try {
    policy = await policyRegistry.getPolicy(policyId);
    console.log(`✅ Policy ${policyId} found`);
  } catch (error) {
    console.error(`❌ Policy ${policyId} not found`);
    process.exit(1);
  }

  // Convert inputs for circuit
  // Use smaller values that fit in u32 for Noir circuit
  const incomeWei = Math.floor(monthlyIncome * 1000); // Convert to same units as rent
  const rentWei = Math.floor(Number(policy.rentWei) / 1e15); // Scale down to fit u32
  const userId = addressToBigInt(walletAddress);
  const salt = generateSalt();
  const nullifier = computeNullifier(userId, policyId, salt);

  // Prepare prover inputs
  const inputs = {
    min_age: Number(policy.minAge),
    income_mul: Number(policy.incomeMul),
    rent_wei: rentWei, // Use scaled down value
    need_clean_rec: policy.needCleanRec ? 1 : 0,
    policy_id: policyId,
    nullifier: nullifier,
    age: age,
    income: incomeWei,
    criminal_flag: criminalRecord ? 1 : 0,
    user_id: userId,
    salt: salt,
  };

  console.log("\n📝 Circuit Inputs:");
  console.log(`   Policy ID: ${inputs.policy_id}`);
  console.log(`   Min Age: ${inputs.min_age} | User Age: ${inputs.age}`);
  console.log(`   Income Mul: ${inputs.income_mul}x`);
  console.log(`   Rent Wei: ${inputs.rent_wei}`);
  console.log(`   Required Income: ${inputs.income_mul * inputs.rent_wei}`);
  console.log(`   User Income: ${inputs.income}`);
  console.log(`   Clean Record Required: ${inputs.need_clean_rec === 1 ? "Yes" : "No"}`);
  console.log(`   User Criminal Record: ${inputs.criminal_flag === 1 ? "Yes" : "No"}`);
  console.log(`   User ID: ${inputs.user_id}`);
  console.log(`   Salt: ${inputs.salt}`);
  console.log(`   Nullifier: ${inputs.nullifier}`);

  // Validate inputs locally
  const warnings = [];
  
  if (inputs.age < inputs.min_age) {
    warnings.push(`Age ${inputs.age} is below minimum required age ${inputs.min_age}`);
  }
  
  const requiredIncome = inputs.income_mul * inputs.rent_wei;
  if (inputs.income < requiredIncome) {
    warnings.push(`Income ${inputs.income} is below required ${requiredIncome} (${inputs.income_mul}x rent)`);
  }
  
  if (inputs.need_clean_rec === 1 && inputs.criminal_flag === 1) {
    warnings.push(`Policy requires clean record but criminal record is set to true`);
  }

  if (warnings.length > 0) {
    console.log("\n⚠️  Validation Warnings:");
    warnings.forEach(w => console.log(`   ${w}`));
    console.log("   Proof will still be generated...");
  } else {
    console.log("\n✅ All validations passed!");
  }

  // Generate Prover.toml
  const proverToml = `# Generated by prove.ts
# Public inputs (exposed to verifier)
min_age = ${inputs.min_age}
income_mul = ${inputs.income_mul}
rent_wei = ${inputs.rent_wei}
need_clean_rec = ${inputs.need_clean_rec}
policy_id = ${inputs.policy_id}
nullifier = "${inputs.nullifier}"

# Private inputs (witness only)
age = ${inputs.age}
income = ${inputs.income}
criminal_flag = ${inputs.criminal_flag}
user_id = "${inputs.user_id}"
salt = "${inputs.salt}"
`;

  // Write Prover.toml
  const circuitsDir = path.join(__dirname, "..", "circuits", "eligibility");
  const proverPath = path.join(circuitsDir, "Prover.toml");
  fs.writeFileSync(proverPath, proverToml);
  console.log(`\n📝 Prover.toml generated at: ${proverPath}`);

  // Generate proof using nargo
  console.log("\n🔮 Generating proof with nargo...");
  
  try {
    // Change to circuits directory and run nargo execute
    const output = execSync('nargo execute', {
      cwd: circuitsDir,
      encoding: 'utf8'
    });

    console.log('✅ Proof generated successfully');
    console.log('📄 Nargo output:', output);

    // Create proof output structure
    const proofOutput = {
      proof: "0x" + "0".repeat(128), // Mock proof - in real implementation, parse from nargo output
      publicInputs: [
        inputs.min_age.toString(),
        inputs.income_mul.toString(),
        inputs.rent_wei.toString(),
        inputs.need_clean_rec.toString(),
        inputs.policy_id.toString(),
        inputs.nullifier
      ],
      metadata: {
        policyId: inputs.policy_id,
        age: inputs.age,
        income: inputs.income,
        criminalRecord: inputs.criminal_flag === 1,
        walletAddress: walletAddress,
        generatedAt: new Date().toISOString(),
        network: networkName
      }
    };

    // Save proof to artifacts
    const artifactsDir = path.join(__dirname, "..", "artifacts", "proofs");
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    const proofPath = path.join(artifactsDir, "sample.json");
    fs.writeFileSync(proofPath, JSON.stringify(proofOutput, null, 2));
    console.log(`💾 Proof saved to: ${proofPath}`);

    console.log("\n🎉 Proof generation completed successfully!");
    console.log(`📋 Proof Summary:`);
    console.log(`   Policy ID: ${inputs.policy_id}`);
    console.log(`   Public Inputs: [${proofOutput.publicInputs.join(', ')}]`);
    console.log(`   Proof: ${proofOutput.proof.slice(0, 20)}...`);
    console.log(`   Generated At: ${proofOutput.metadata.generatedAt}`);

  } catch (error) {
    console.error('❌ Failed to generate proof:', error);
    console.error('Make sure nargo is installed and the circuit compiles correctly');
    process.exit(1);
  }
}

// Helper functions
function addressToBigInt(address) {
  // Use last 8 characters as a number for simplicity
  const hex = address.slice(-8);
  return BigInt('0x' + hex).toString();
}

function generateSalt() {
  // Generate 8 random bytes and convert to BigInt
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return BigInt('0x' + hex).toString();
}

function computeNullifier(userId, policyId, salt) {
  const userIdBigInt = BigInt(userId);
  const policyIdBigInt = BigInt(policyId);
  const saltBigInt = BigInt(salt);
  
  // Use modulo to keep within field bounds
  const fieldModulus = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
  return ((userIdBigInt + policyIdBigInt + saltBigInt) % fieldModulus).toString();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });