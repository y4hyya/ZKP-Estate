'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import Header from '@/components/Header';
import PolicyCard from '@/components/PolicyCard';
import CreatePolicyForm from '@/components/CreatePolicyForm';
import LeaseCard from '@/components/LeaseCard';

export default function Home() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'my-leases'>('browse');

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="text-center py-16">
            <h1 className="text-4xl font-bold text-secondary-900 dark:text-white mb-4">
              Welcome to ZKP-Estate
            </h1>
            <p className="text-xl text-secondary-600 dark:text-secondary-300 mb-8">
              Privacy-preserving rental agreements using zero-knowledge proofs
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex space-x-1 mb-8 bg-secondary-200 dark:bg-secondary-700 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'browse'
                    ? 'bg-white dark:bg-secondary-600 text-primary-600 shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-300 hover:text-primary-600'
                }`}
              >
                Browse Properties
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'create'
                    ? 'bg-white dark:bg-secondary-600 text-primary-600 shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-300 hover:text-primary-600'
                }`}
              >
                Create Policy
              </button>
              <button
                onClick={() => setActiveTab('my-leases')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'my-leases'
                    ? 'bg-white dark:bg-secondary-600 text-primary-600 shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-300 hover:text-primary-600'
                }`}
              >
                My Leases
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'browse' && (
              <div>
                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-6">
                  Available Properties
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <PolicyCard
                    id="1"
                    landlord="0x1234...5678"
                    rentAmount="1.0"
                    deposit="2.0"
                    duration={30}
                    propertyDetails="Modern apartment in downtown"
                  />
                  <PolicyCard
                    id="2"
                    landlord="0xabcd...efgh"
                    rentAmount="1.5"
                    deposit="3.0"
                    duration={60}
                    propertyDetails="Luxury condo with ocean view"
                  />
                </div>
              </div>
            )}

            {activeTab === 'create' && (
              <div>
                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-6">
                  Create Rental Policy
                </h2>
                <CreatePolicyForm />
              </div>
            )}

            {activeTab === 'my-leases' && (
              <div>
                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-6">
                  My Leases
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <LeaseCard
                    id="1"
                    policyId="1"
                    tenant="0x1234...5678"
                    startTime="2024-01-01"
                    endTime="2024-01-31"
                    isActive={true}
                    isConfirmed={false}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
