'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import Header from '@/components/Header';
import NoirTab from '@/components/NoirTab';
import TLSTab from '@/components/TLSTab';

export default function Home() {
  const { isConnected } = useAccount();
  const [pathTab, setPathTab] = useState<'tenant' | 'landlord'>('tenant');

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
            {/* Path Selection Tabs */}
            <div className="flex space-x-1 mb-8 bg-secondary-200 dark:bg-secondary-700 p-1 rounded-lg w-fit">
              <button
                onClick={() => setPathTab('tenant')}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  pathTab === 'tenant'
                    ? 'bg-white dark:bg-secondary-600 text-primary-600 shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-300 hover:text-primary-600'
                }`}
              >
                For Tenant
              </button>
              <button
                onClick={() => setPathTab('landlord')}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  pathTab === 'landlord'
                    ? 'bg-white dark:bg-secondary-600 text-primary-600 shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-300 hover:text-primary-600'
                }`}
              >
                For Landlords
              </button>
            </div>

            {/* Tab Content */}
            {pathTab === 'tenant' && <NoirTab />}
            {pathTab === 'landlord' && <TLSTab />}
          </>
        )}
      </main>
    </div>
  );
}
