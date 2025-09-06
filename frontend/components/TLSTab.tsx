'use client';

import { useState, useEffect } from 'react';
import { useAccount, useContractWrite, useContractRead, useWaitForTransaction } from 'wagmi';
import { parseEther, formatEther, keccak256, stringToBytes } from 'viem';
import { CONTRACT_ADDRESSES, ELIGIBILITY_GATE_TLS_ABI, LEASE_ESCROW_ABI, POLICY_REGISTRY_ABI, ATTESTOR_CONFIG } from '@/lib/contracts';

interface Attestation {
  wallet: string;
  policyId: number;
  expiry: number;
  nullifier: string;
  passBitmask: number;
}

interface AttestationResponse {
  attestation: Attestation;
  signature: string;
  verification: {
    age: number;
    income: number;
    cleanRecord: boolean;
    source: string;
  };
}

interface Policy {
  minAge: number;
  incomeMul: number;
  rentWei: bigint;
  needCleanRec: boolean;
  deadline: number;
  owner: string;
}

interface Lease {
  tenant: string;
  amount: bigint;
  deadline: number;
  active: boolean;
}

export default function TLSTab() {
  const { address } = useAccount();
  const [policyId, setPolicyId] = useState<string>('1');
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [signature, setSignature] = useState<string>('');
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [lease, setLease] = useState<Lease | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Contract reads
  const { data: policyData } = useContractRead({
    address: CONTRACT_ADDRESSES.PolicyRegistry as `0x${string}`,
    abi: POLICY_REGISTRY_ABI,
    functionName: 'getPolicy',
    args: [BigInt(policyId || '0')],
  });

  const { data: eligibilityData } = useContractRead({
    address: CONTRACT_ADDRESSES.EligibilityGateTLS as `0x${string}`,
    abi: ELIGIBILITY_GATE_TLS_ABI,
    functionName: 'isEligible',
    args: address ? [address, BigInt(policyId || '0')] : undefined,
  });

  const { data: leaseData } = useContractRead({
    address: CONTRACT_ADDRESSES.LeaseEscrow as `0x${string}`,
    abi: LEASE_ESCROW_ABI,
    functionName: 'getLease',
    args: address ? [BigInt(policyId || '0'), address] : undefined,
  });

  // Contract writes
  const { write: writeEligibilityGate, data: submitTLSHash } = useContractWrite({
    address: CONTRACT_ADDRESSES.EligibilityGateTLS as `0x${string}`,
    abi: ELIGIBILITY_GATE_TLS_ABI,
    functionName: 'submitTLS',
  });

  const { write: writeLeaseEscrow, data: startLeaseHash } = useContractWrite({
    address: CONTRACT_ADDRESSES.LeaseEscrow as `0x${string}`,
    abi: LEASE_ESCROW_ABI,
    functionName: 'startLease',
  });

  const { write: writeOwnerConfirm, data: confirmHash } = useContractWrite({
    address: CONTRACT_ADDRESSES.LeaseEscrow as `0x${string}`,
    abi: LEASE_ESCROW_ABI,
    functionName: 'ownerConfirm',
  });

  const { write: writeTimeoutRefund, data: refundHash } = useContractWrite({
    address: CONTRACT_ADDRESSES.LeaseEscrow as `0x${string}`,
    abi: LEASE_ESCROW_ABI,
    functionName: 'timeoutRefund',
  });

  // Transaction receipts
  const { data: submitTLSReceipt } = useWaitForTransaction({ hash: submitTLSHash?.hash });
  const { data: startLeaseReceipt } = useWaitForTransaction({ hash: startLeaseHash?.hash });
  const { data: confirmReceipt } = useWaitForTransaction({ hash: confirmHash?.hash });
  const { data: refundReceipt } = useWaitForTransaction({ hash: refundHash?.hash });

  // Update state when contract data changes
  useEffect(() => {
    if (policyData && Array.isArray(policyData)) {
      setPolicy({
        minAge: Number(policyData[0]),
        incomeMul: Number(policyData[1]),
        rentWei: policyData[2] as bigint,
        needCleanRec: policyData[3] as boolean,
        deadline: Number(policyData[4]),
        owner: policyData[5] as string,
      });
    }
  }, [policyData]);

  useEffect(() => {
    if (eligibilityData !== undefined && typeof eligibilityData === 'boolean') {
      setIsEligible(eligibilityData);
    }
  }, [eligibilityData]);

  useEffect(() => {
    if (leaseData && Array.isArray(leaseData)) {
      setLease({
        tenant: leaseData[0] as string,
        amount: leaseData[1] as bigint,
        deadline: Number(leaseData[2]),
        active: leaseData[3] as boolean,
      });
    }
  }, [leaseData]);

  // Handle transaction receipts
  useEffect(() => {
    if (submitTLSReceipt) {
      addEvent('✅ TLS attestation submitted successfully!');
      setIsEligible(true);
    }
  }, [submitTLSReceipt]);

  useEffect(() => {
    if (startLeaseReceipt) {
      addEvent('🏠 Lease started successfully!');
    }
  }, [startLeaseReceipt]);

  useEffect(() => {
    if (confirmReceipt) {
      addEvent('✅ Lease confirmed by owner!');
    }
  }, [confirmReceipt]);

  useEffect(() => {
    if (refundReceipt) {
      addEvent('💰 Timeout refund processed!');
    }
  }, [refundReceipt]);

  const addEvent = (message: string) => {
    setEvents((prev: string[]) => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 9)]);
  };

  const generateNonce = () => {
    return keccak256(stringToBytes(`nonce-${Date.now()}-${Math.random()}`));
  };

  const getAttestation = async () => {
    if (!address) {
      addEvent('❌ Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      // Generate nonce and nullifier
      const nonce = generateNonce();
      const nullifier = keccak256(stringToBytes(`nullifier-${address}-${policyId}-${nonce}`));

      // Call attestor service
      const response = await fetch(`${ATTESTOR_CONFIG.baseUrl}${ATTESTOR_CONFIG.endpoints.attest}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: address,
          policyId: parseInt(policyId),
          tlsn_proof: {
            age: 28,
            income: 120000,
            cleanRecord: true,
            timestamp: Date.now(),
            source: 'bank-statement'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get attestation');
      }

      const data: AttestationResponse = await response.json();
      setAttestation(data.attestation);
      setSignature(data.signature);
      addEvent('🔐 Attestation received from attestor service');
    } catch (error) {
      console.error('Error getting attestation:', error);
      addEvent('❌ Failed to get attestation. Make sure attestor service is running.');
    } finally {
      setLoading(false);
    }
  };

  const submitTLS = async () => {
    if (!attestation || !signature) {
      addEvent('❌ Please get attestation first');
      return;
    }

    try {
      writeEligibilityGate({
        args: [attestation, signature as `0x${string}`],
      });
      addEvent('📤 Submitting TLS attestation...');
    } catch (error) {
      console.error('Error submitting TLS:', error);
      addEvent('❌ Failed to submit TLS attestation');
    }
  };

  const startLease = async () => {
    if (!policy) {
      addEvent('❌ Policy not found');
      return;
    }

    try {
      writeLeaseEscrow({
        args: [BigInt(policyId)],
        value: policy.rentWei,
      });
      addEvent('🏠 Starting lease...');
    } catch (error) {
      console.error('Error starting lease:', error);
      addEvent('❌ Failed to start lease');
    }
  };

  const ownerConfirm = async () => {
    if (!address) {
      addEvent('❌ Please connect your wallet first');
      return;
    }

    try {
      writeOwnerConfirm({
        args: [BigInt(policyId), address],
      });
      addEvent('✅ Confirming lease as owner...');
    } catch (error) {
      console.error('Error confirming lease:', error);
      addEvent('❌ Failed to confirm lease');
    }
  };

  const timeoutRefund = async () => {
    try {
      writeTimeoutRefund({
        args: [BigInt(policyId)],
      });
      addEvent('💰 Requesting timeout refund...');
    } catch (error) {
      console.error('Error requesting refund:', error);
      addEvent('❌ Failed to request refund');
    }
  };

  const isDeadlinePassed = policy ? Date.now() / 1000 > policy.deadline : false;

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> TLSNotary verification is stubbed for the demo; production must use real TLSN verification.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">TLS Attestation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Policy ID
            </label>
            <input
              type="number"
              value={policyId}
              onChange={(e) => setPolicyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter policy ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              value={address || 'Not connected'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={getAttestation}
            disabled={loading || !address}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Getting...' : 'Get Attestation'}
          </button>
          
          <button
            onClick={submitTLS}
            disabled={!attestation || !signature}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit TLS
          </button>
        </div>
      </div>

      {/* Policy Information */}
      {policy && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Policy Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Min Age:</span>
              <span className="ml-2 font-medium">{policy.minAge}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Income Multiplier:</span>
              <span className="ml-2 font-medium">{policy.incomeMul}x</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Rent:</span>
              <span className="ml-2 font-medium">{formatEther(policy.rentWei)} ETH</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Clean Record:</span>
              <span className="ml-2 font-medium">{policy.needCleanRec ? 'Required' : 'Not Required'}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Deadline:</span>
              <span className="ml-2 font-medium">{new Date(policy.deadline * 1000).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Owner:</span>
              <span className="ml-2 font-medium text-xs">{policy.owner}</span>
            </div>
          </div>
        </div>
      )}

      {/* Status Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status</h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isEligible ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm">Eligible: {isEligible ? 'Yes' : 'No'}</span>
          </div>
          
          {lease && (
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${lease.active ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm">Lease Active: {lease.active ? 'Yes' : 'No'}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {isEligible && policy && (
          <div className="space-y-2">
            {!lease?.active ? (
              <button
                onClick={startLease}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Start Lease ({formatEther(policy.rentWei)} ETH)
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={ownerConfirm}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Owner Confirm
                </button>
                <button
                  onClick={timeoutRefund}
                  disabled={!isDeadlinePassed}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Timeout Refund
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Events Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Events & Status</h3>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 max-h-64 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No events yet...</p>
          ) : (
            <div className="space-y-1">
              {events.map((event: string, index: number) => (
                <div key={index} className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {event}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
