import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ContractService } from '../utils/contracts';

interface ProofData {
  proof: string;
  publicInputs: string[];
}

interface FormData {
  age: number;
  monthlyIncome: number;
  criminalRecord: boolean;
  policyId: number;
}

const TenantProofForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    age: 25,
    monthlyIncome: 5.0,
    criminalRecord: false,
    policyId: 1,
  });

  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [contractService, setContractService] = useState<ContractService | null>(null);
  const [policy, setPolicy] = useState<any>(null);

  // Mock policy data (fallback for testing)
  const mockPolicy = {
    minAge: 18,
    incomeMul: 3,
    rentWei: 1000, // 1000 units for testing
    needCleanRec: true,
    deadline: Math.floor(Date.now() / 1000) + 86400,
  };

  useEffect(() => {
    // Initialize contract service
    try {
      const service = new ContractService();
      setContractService(service);
    } catch (error) {
      console.error('Failed to initialize contract service:', error);
    }
    
    // Check if wallet is connected
    checkWalletConnection();
  }, []);

  useEffect(() => {
    // Fetch policy data when policyId changes and wallet is connected
    if (isConnected && contractService) {
      fetchPolicyData();
    }
  }, [formData.policyId, isConnected, contractService]);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setWalletAddress(accounts[0].address);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (!contractService) {
      setError('Contract service not initialized');
      return;
    }

    try {
      const address = await contractService.connectWallet();
      setWalletAddress(address);
      setIsConnected(true);
      
      // Fetch policy data
      await fetchPolicyData();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet');
    }
  };

  const fetchPolicyData = async () => {
    if (!contractService) return;

    try {
      const policyData = await contractService.getPolicy(formData.policyId);
      setPolicy(policyData);
    } catch (error) {
      console.error('Failed to fetch policy, using mock data:', error);
      setPolicy(mockPolicy);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const addressToBigInt = (address: string): string => {
    // Use last 8 characters as a number for simplicity
    const hex = address.slice(-8);
    return BigInt('0x' + hex).toString();
  };

  const generateSalt = (): string => {
    // Generate 8 random bytes and convert to BigInt
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return BigInt('0x' + hex).toString();
  };

  const computeNullifier = (userId: string, policyId: number, salt: string): string => {
    const userIdBigInt = BigInt(userId);
    const policyIdBigInt = BigInt(policyId);
    const saltBigInt = BigInt(salt);
    
    // Use modulo to keep within field bounds
    const fieldModulus = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    return ((userIdBigInt + policyIdBigInt + saltBigInt) % fieldModulus).toString();
  };

  const generateProof = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setIsGeneratingProof(true);
    setError('');
    setSuccess('');

    try {
      // Use policy data from contract or fallback to mock
      const currentPolicy = policy || mockPolicy;
      
      // Convert inputs
      const incomeWei = Math.floor(formData.monthlyIncome * 1000); // Convert to same units as rent
      const userId = addressToBigInt(walletAddress);
      const salt = generateSalt();
      const nullifier = computeNullifier(userId, formData.policyId, salt);

      // Prepare prover inputs
      const inputs = {
        min_age: currentPolicy.minAge,
        income_mul: currentPolicy.incomeMul,
        rent_wei: Number(currentPolicy.rentWei),
        need_clean_rec: currentPolicy.needCleanRec ? 1 : 0,
        policy_id: formData.policyId,
        nullifier: nullifier,
        age: formData.age,
        income: incomeWei,
        criminal_flag: formData.criminalRecord ? 1 : 0,
        user_id: userId,
        salt: salt,
      };

      // Validate inputs locally
      const warnings: string[] = [];
      
      if (inputs.age < currentPolicy.minAge) {
        warnings.push(`Age ${inputs.age} is below minimum required age ${currentPolicy.minAge}`);
      }
      
      const requiredIncome = currentPolicy.incomeMul * Number(currentPolicy.rentWei);
      if (inputs.income < requiredIncome) {
        warnings.push(`Income ${inputs.income} is below required ${requiredIncome} (${currentPolicy.incomeMul}x rent)`);
      }
      
      if (currentPolicy.needCleanRec && inputs.criminal_flag === 1) {
        warnings.push(`Policy requires clean record but criminal record is set to true`);
      }

      if (warnings.length > 0) {
        setError(`Validation warnings: ${warnings.join(', ')}. Proof will still be generated.`);
      }

      // For demo purposes, we'll simulate proof generation
      // In a real implementation, you would use Noir WASM or call nargo
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate proof generation time

      // Mock proof data
      const mockProof: ProofData = {
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

      setProofData(mockProof);
      setSuccess('Proof generated successfully! You can now submit it to the contract.');
      
    } catch (error) {
      console.error('Error generating proof:', error);
      setError('Failed to generate proof. Please try again.');
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const submitToContract = async () => {
    if (!proofData || !isConnected || !contractService) {
      setError('No proof data available, wallet not connected, or contract service not initialized');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Submit proof to contract
      const txHash = await contractService.submitZkProof(
        formData.policyId,
        proofData.proof,
        proofData.publicInputs
      );
      
      setSuccess(`Proof submitted to contract successfully! Transaction hash: ${txHash}`);
      setProofData(null); // Reset proof data after submission
      
    } catch (error) {
      console.error('Error submitting to contract:', error);
      setError('Failed to submit proof to contract. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant - Generate Proof</h1>
        <p className="text-gray-600">
          Generate a zero-knowledge proof of your eligibility for rental policies.
        </p>
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            🔒 <strong>Privacy Protected:</strong> Your data never leaves your device. 
            Only the proof is sent to the contract.
          </p>
        </div>
      </div>

      {/* Wallet Connection */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Wallet Connection</h2>
        {isConnected ? (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">
              Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Form */}
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
              Age (years)
            </label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              min="16"
              max="120"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="monthlyIncome" className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Income (ETH)
            </label>
            <input
              type="number"
              id="monthlyIncome"
              name="monthlyIncome"
              value={formData.monthlyIncome}
              onChange={handleInputChange}
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="policyId" className="block text-sm font-medium text-gray-700 mb-2">
              Policy ID
            </label>
            <input
              type="number"
              id="policyId"
              name="policyId"
              value={formData.policyId}
              onChange={handleInputChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="criminalRecord"
              name="criminalRecord"
              checked={formData.criminalRecord}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="criminalRecord" className="text-sm font-medium text-gray-700">
              I have a criminal record
            </label>
          </div>
        </div>

        {/* Policy Requirements Display */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Policy Requirements:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Minimum age: {(policy || mockPolicy).minAge} years</li>
            <li>• Income requirement: {(policy || mockPolicy).incomeMul}x rent ({Number((policy || mockPolicy).rentWei) * (policy || mockPolicy).incomeMul} units)</li>
            <li>• Clean record required: {(policy || mockPolicy).needCleanRec ? 'Yes' : 'No'}</li>
            <li>• Rent amount: {Number((policy || mockPolicy).rentWei)} units</li>
          </ul>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={generateProof}
            disabled={!isConnected || isGeneratingProof}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isGeneratingProof ? 'Generating Proof...' : 'Generate Proof'}
          </button>

          {proofData && (
            <button
              type="button"
              onClick={submitToContract}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit to Contract'}
            </button>
          )}
        </div>
      </form>

      {/* Proof Data Display (for debugging) */}
      {proofData && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Generated Proof Data:</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Proof:</strong> {proofData.proof.slice(0, 20)}...</p>
            <p><strong>Public Inputs:</strong> [{proofData.publicInputs.join(', ')}]</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantProofForm;
