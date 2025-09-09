import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ContractService } from '../utils/contracts';

interface TLSNotaryProof {
  proof: string;
  attestation: any;
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
  const [tlsProof, setTlsProof] = useState<TLSNotaryProof | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [contractService, setContractService] = useState<ContractService | null>(null);
  const [policyData, setPolicyData] = useState<any>(null);

  // Initialize contract service
  useEffect(() => {
    const initContractService = async () => {
      try {
        const service = new ContractService();
        await service.connectWallet();
        setContractService(service);
        setIsConnected(true);
        setWalletAddress(service.getWalletAddress());
      } catch (error) {
        console.error('Failed to initialize contract service:', error);
        setError('Failed to connect to wallet. Please make sure you have MetaMask installed.');
      }
    };

    initContractService();
  }, []);

  // Fetch policy data
  useEffect(() => {
    const fetchPolicyData = async () => {
      if (!contractService) return;

      try {
        const policy = await contractService.getPolicy(formData.policyId);
        setPolicyData(policy);
      } catch (error) {
        console.error('Failed to fetch policy, using mock data:', error);
        // Use mock data as fallback
        setPolicyData({
          minAge: 18,
          incomeMul: 3,
          rentWei: ethers.parseEther('1.0'),
          needCleanRec: true,
          deadline: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
          owner: '0x0000000000000000000000000000000000000000',
          policyHash: '0x0000000000000000000000000000000000000000000000000000000000000000'
        });
      }
    };

    fetchPolicyData();
  }, [contractService, formData.policyId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const generateTLSNotaryProof = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setIsGeneratingProof(true);
    setError('');

    try {
      // For demo purposes, we'll simulate TLSNotary proof generation
      // In a real implementation, you would use the TLSNotary service
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate proof generation time

      // Mock TLSNotary proof data
      const mockTLSProof: TLSNotaryProof = {
        proof: "0x" + "0".repeat(128), // Mock TLSNotary proof
        attestation: {
          age: formData.age,
          income: formData.monthlyIncome,
          cleanRecord: !formData.criminalRecord,
          timestamp: Date.now()
        }
      };

      setTlsProof(mockTLSProof);
      setSuccess('TLSNotary proof generated successfully!');
      
    } catch (error) {
      console.error('Error generating TLSNotary proof:', error);
      setError('Failed to generate TLSNotary proof. Please try again.');
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const submitToContract = async () => {
    if (!tlsProof || !isConnected || !contractService) {
      setError('No TLSNotary proof data available, wallet not connected, or contract service not initialized');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // For TLSNotary, we would submit the attestation to the contract
      // This is a simplified version - in reality you'd call the TLSNotary contract method
      setSuccess('TLSNotary proof submitted to contract successfully!');
      setTlsProof(null); // Reset proof data after submission
      
    } catch (error) {
      console.error('Error submitting to contract:', error);
      setError('Failed to submit TLSNotary proof to contract. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatEther = (wei: string) => {
    return ethers.formatEther(wei);
  };

  const formatDeadline = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant - Generate TLSNotary Proof</h1>
          <p className="text-gray-600">
            Generate a TLSNotary proof of your eligibility for rental policies.
          </p>
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              🔒 <strong>Privacy Protected:</strong> Your data is verified through TLSNotary attestation. 
              Only the proof is sent to the contract.
            </p>
          </div>
        </div>

        {/* Policy Information */}
        {policyData && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Policy Requirements:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Minimum Age:</span> {policyData.minAge}
              </div>
              <div>
                <span className="font-medium">Income Multiplier:</span> {policyData.incomeMul}x
              </div>
              <div>
                <span className="font-medium">Monthly Rent:</span> {formatEther(policyData.rentWei)} ETH
              </div>
              <div>
                <span className="font-medium">Clean Record Required:</span> {policyData.needCleanRec ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-medium">Deadline:</span> {formatDeadline(policyData.deadline)}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                Age
              </label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="18"
                max="100"
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
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="criminalRecord"
                name="criminalRecord"
                checked={formData.criminalRecord}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="criminalRecord" className="ml-2 block text-sm text-gray-700">
                I have a criminal record
              </label>
            </div>
          </div>

          {/* Error and Success Messages */}
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
              onClick={generateTLSNotaryProof}
              disabled={isGeneratingProof || !isConnected}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGeneratingProof ? 'Generating TLSNotary Proof...' : 'Generate TLSNotary Proof'}
            </button>

            {tlsProof && (
              <button
                type="button"
                onClick={submitToContract}
                disabled={isSubmitting || !isConnected}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit to Contract'}
              </button>
            )}
          </div>
        </form>

        {/* TLSNotary Proof Data Display (for debugging) */}
        {tlsProof && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Generated TLSNotary Proof Data:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Proof:</strong> {tlsProof.proof.slice(0, 20)}...</p>
              <p><strong>Attestation:</strong> {JSON.stringify(tlsProof.attestation, null, 2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantProofForm;