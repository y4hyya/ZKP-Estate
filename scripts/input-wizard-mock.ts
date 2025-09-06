#!/usr/bin/env tsx

import { ethers } from "ethers";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import * as readline from "readline";
import dotenv from "dotenv";

// Types
interface Policy {
  minAge: number;
  incomeMul: number;
  rentWei: bigint;
  needCleanRec: boolean;
  deadline: number;
  owner: string;
  policyHash: string;
}

interface ProverInputs {
  min_age: number;
  income_mul: number;
  rent_wei: number;
  need_clean_rec: number;
  policy_id: number;
  nullifier: string;
  age: number;
  income: number;
  criminal_flag: number;
  user_id: string;
  salt: string;
}

interface ProofOutput {
  proof: string;
  publicInputs: string[];
}

class InputWizardMock {
  private rl: readline.Interface;
  private network: string;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    // Load environment variables
    dotenv.config();
    
    // Determine network from command line args or default to localhost
    this.network = this.getNetworkFromArgs();
  }

  private getNetworkFromArgs(): string {
    const args = process.argv.slice(2);
    const networkIndex = args.findIndex(arg => arg === '--network');
    return networkIndex !== -1 && args[networkIndex + 1] 
      ? args[networkIndex + 1] 
      : 'localhost';
  }

  private async question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  private async getWalletAddress(): Promise<string> {
    while (true) {
      const address = await this.question('🔑 Wallet address (0x...): ');
      
      if (ethers.isAddress(address)) {
        return address;
      }
      
      console.log('❌ Invalid Ethereum address format. Please try again.');
    }
  }

  private async getAge(): Promise<number> {
    while (true) {
      const ageStr = await this.question('👤 Age (years): ');
      const age = parseInt(ageStr);
      
      if (isNaN(age) || age < 16 || age > 120) {
        console.log('❌ Age must be a number between 16 and 120.');
        continue;
      }
      
      return age;
    }
  }

  private async getMonthlyIncome(): Promise<number> {
    while (true) {
      const incomeStr = await this.question('💰 Monthly income (ETH): ');
      const income = parseFloat(incomeStr);
      
      if (isNaN(income) || income <= 0) {
        console.log('❌ Income must be a positive number.');
        continue;
      }
      
      return income;
    }
  }

  private async getCriminalRecord(): Promise<number> {
    while (true) {
      const answer = await this.question('🚨 Criminal record? (Yes/No): ');
      const lowerAnswer = answer.toLowerCase();
      
      if (lowerAnswer === 'yes' || lowerAnswer === 'y') {
        return 1;
      } else if (lowerAnswer === 'no' || lowerAnswer === 'n') {
        return 0;
      }
      
      console.log('❌ Please answer Yes or No.');
    }
  }

  private async getPolicyId(): Promise<number> {
    while (true) {
      const policyIdStr = await this.question('📋 Policy ID: ');
      const policyId = parseInt(policyIdStr);
      
      if (isNaN(policyId) || policyId <= 0) {
        console.log('❌ Policy ID must be a positive number.');
        continue;
      }
      
      return policyId;
    }
  }

  private getMockPolicy(policyId: number): Policy {
    // Mock policy data for testing
    return {
      minAge: 18,
      incomeMul: 3,
      rentWei: ethers.parseEther("1.0"), // 1 ETH
      needCleanRec: true,
      deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      owner: "0x1234567890123456789012345678901234567890",
      policyHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    };
  }

  private addressToBigInt(address: string): string {
    // Remove 0x prefix and convert to BigInt
    const hex = address.slice(2);
    return BigInt('0x' + hex).toString();
  }

  private generateSalt(): string {
    // Generate 32 random bytes and convert to BigInt
    const randomBytes = ethers.randomBytes(32);
    return BigInt('0x' + ethers.hexlify(randomBytes).slice(2)).toString();
  }

  private computeNullifier(userId: string, policyId: number, salt: string): string {
    // Simple nullifier computation: userId + policyId + salt
    // In production, this should use Poseidon hash
    const userIdBigInt = BigInt(userId);
    const policyIdBigInt = BigInt(policyId);
    const saltBigInt = BigInt(salt);
    
    return (userIdBigInt + policyIdBigInt + saltBigInt).toString();
  }

  private validateInputs(inputs: ProverInputs, policy: Policy): string[] {
    const warnings: string[] = [];
    
    // Age validation
    if (inputs.age < policy.minAge) {
      warnings.push(`⚠️  Age ${inputs.age} is below minimum required age ${policy.minAge}`);
    }
    
    // Income validation
    const requiredIncome = policy.incomeMul * Number(policy.rentWei);
    if (inputs.income < requiredIncome) {
      warnings.push(`⚠️  Income ${inputs.income} wei is below required ${requiredIncome} wei (${policy.incomeMul}x rent)`);
    }
    
    // Clean record validation
    if (policy.needCleanRec && inputs.criminal_flag === 1) {
      warnings.push(`⚠️  Policy requires clean record but criminal_flag is set to 1`);
    }
    
    return warnings;
  }

  private generateProverToml(inputs: ProverInputs): string {
    return `# Generated by input-wizard.ts
# Public inputs (exposed to verifier)
min_age = ${inputs.min_age}
income_mul = ${inputs.income_mul}
rent_wei = ${inputs.rent_wei}
need_clean_rec = ${inputs.need_clean_rec}
policy_id = ${inputs.policy_id}
nullifier = ${inputs.nullifier}

# Private inputs (witness only)
age = ${inputs.age}
income = ${inputs.income}
criminal_flag = ${inputs.criminal_flag}
user_id = ${inputs.user_id}
salt = ${inputs.salt}
`;
  }

  private async generateProof(inputs: ProverInputs): Promise<ProofOutput> {
    console.log('🔮 Generating proof with nargo...');
    
    try {
      // Change to circuits directory
      const circuitsDir = join(process.cwd(), 'circuits', 'eligibility');
      
      // Run nargo execute
      const output = execSync('nargo execute', { 
        cwd: circuitsDir,
        encoding: 'utf8'
      });
      
      console.log('✅ Proof generated successfully');
      
      // For now, return a mock proof structure
      // In a real implementation, you'd parse the actual proof from nargo output
      return {
        proof: "0x" + "0".repeat(128), // Mock proof
        publicInputs: [
          inputs.min_age.toString(),
          inputs.income_mul.toString(),
          inputs.rent_wei.toString(),
          inputs.need_clean_rec.toString(),
          inputs.policy_id.toString(),
          inputs.nullifier
        ]
      };
    } catch (error) {
      console.error('❌ Failed to generate proof:', error);
      throw error;
    }
  }

  private saveProof(proof: ProofOutput): void {
    const artifactsDir = join(process.cwd(), 'artifacts', 'proofs');
    
    if (!existsSync(artifactsDir)) {
      mkdirSync(artifactsDir, { recursive: true });
    }
    
    const proofPath = join(artifactsDir, 'sample.json');
    writeFileSync(proofPath, JSON.stringify(proof, null, 2));
    
    console.log(`💾 Proof saved to ${proofPath}`);
  }

  private printSummary(inputs: ProverInputs, policy: Policy, warnings: string[]): void {
    console.log('\n📊 Summary:');
    console.log('='.repeat(50));
    console.log(`Policy ID: ${inputs.policy_id}`);
    console.log(`Min Age: ${policy.minAge} | User Age: ${inputs.age}`);
    console.log(`Income Multiplier: ${policy.incomeMul}x`);
    console.log(`Rent: ${ethers.formatEther(policy.rentWei)} ETH`);
    console.log(`Required Income: ${ethers.formatEther(BigInt(policy.incomeMul * Number(policy.rentWei)))} ETH`);
    console.log(`User Income: ${ethers.formatEther(BigInt(inputs.income))} ETH`);
    console.log(`Clean Record Required: ${policy.needCleanRec ? 'Yes' : 'No'}`);
    console.log(`User Criminal Record: ${inputs.criminal_flag ? 'Yes' : 'No'}`);
    console.log(`Policy Deadline: ${new Date(policy.deadline * 1000).toISOString()}`);
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(warning));
    } else {
      console.log('\n✅ All validations passed!');
    }
  }

  public async run(): Promise<void> {
    try {
      console.log('🧙‍♂️ ZKP-Estate Input Wizard (Mock Mode)');
      console.log('='.repeat(45));
      console.log('ℹ️  Using mock policy data for testing');
      
      // Get user inputs
      const walletAddress = await this.getWalletAddress();
      const age = await this.getAge();
      const monthlyIncome = await this.getMonthlyIncome();
      const criminalFlag = await this.getCriminalRecord();
      const policyId = await this.getPolicyId();
      
      // Get mock policy
      const policy = this.getMockPolicy(policyId);
      
      // Convert inputs
      const incomeWei = ethers.parseEther(monthlyIncome.toString());
      const userId = this.addressToBigInt(walletAddress);
      const salt = this.generateSalt();
      const nullifier = this.computeNullifier(userId, policyId, salt);
      
      // Prepare prover inputs
      const inputs: ProverInputs = {
        min_age: policy.minAge,
        income_mul: policy.incomeMul,
        rent_wei: Number(policy.rentWei),
        need_clean_rec: policy.needCleanRec ? 1 : 0,
        policy_id: policyId,
        nullifier: nullifier,
        age: age,
        income: Number(incomeWei),
        criminal_flag: criminalFlag,
        user_id: userId,
        salt: salt,
      };
      
      // Validate inputs
      const warnings = this.validateInputs(inputs, policy);
      
      // Generate Prover.toml
      const proverToml = this.generateProverToml(inputs);
      const proverPath = join(process.cwd(), 'circuits', 'eligibility', 'Prover.toml');
      writeFileSync(proverPath, proverToml);
      console.log(`📝 Prover.toml generated at ${proverPath}`);
      
      // Generate proof if requested
      const shouldProve = process.argv.includes('--prove');
      if (shouldProve) {
        const proof = await this.generateProof(inputs);
        this.saveProof(proof);
      }
      
      // Print summary
      this.printSummary(inputs, policy, warnings);
      
    } catch (error) {
      console.error('❌ Wizard failed:', error);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const wizard = new InputWizardMock();
  wizard.run();
}

export { InputWizardMock };
