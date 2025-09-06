'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, Home, BookOpen, Info, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleSectionClick = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <header className="bg-white dark:bg-secondary-800 shadow-sm border-b border-secondary-200 dark:border-secondary-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary-600" />
              <Home className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
                ZKP-Estate
              </h1>
              <p className="text-sm text-secondary-600 dark:text-secondary-300">
                Zero-Knowledge Rental Protocol
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex space-x-6">
              <button
                onClick={() => handleSectionClick('how-it-works')}
                className="flex items-center space-x-1 text-secondary-600 dark:text-secondary-300 hover:text-primary-600 transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                <span>How it Works</span>
              </button>
              <button
                onClick={() => handleSectionClick('documentation')}
                className="flex items-center space-x-1 text-secondary-600 dark:text-secondary-300 hover:text-primary-600 transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                <span>Documentation</span>
              </button>
              <button
                onClick={() => handleSectionClick('about')}
                className="flex items-center space-x-1 text-secondary-600 dark:text-secondary-300 hover:text-primary-600 transition-colors"
              >
                <Info className="h-4 w-4" />
                <span>About</span>
              </button>
            </nav>
            <ConnectButton />
          </div>
        </div>
        
        {/* Dropdown sections */}
        {activeSection && (
          <div className="mt-4 p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg border border-secondary-200 dark:border-secondary-600">
            {activeSection === 'how-it-works' && (
              <div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">How it Works</h3>
                <div className="space-y-2 text-sm text-secondary-600 dark:text-secondary-300">
                  <p>• <strong>Path A (Noir ZK):</strong> Privacy-first approach using zero-knowledge circuits</p>
                  <p>• <strong>Path B (TLSNotary):</strong> Faster MVP with HTTPS transcript verification</p>
                  <p>• <strong>Create Policy:</strong> Set up rental requirements and conditions</p>
                  <p>• <strong>Submit Proof:</strong> Provide eligibility verification</p>
                  <p>• <strong>Start Lease:</strong> Begin secure rental agreement</p>
                </div>
              </div>
            )}
            
            {activeSection === 'documentation' && (
              <div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">Documentation</h3>
                <div className="space-y-2 text-sm text-secondary-600 dark:text-secondary-300">
                  <p>• <strong>Smart Contracts:</strong> Solidity contracts for rental management</p>
                  <p>• <strong>ZK Circuits:</strong> Noir circuits for eligibility verification</p>
                  <p>• <strong>Attestor Service:</strong> TLSNotary verification service</p>
                  <p>• <strong>API Reference:</strong> Contract interaction methods</p>
                  <p>• <strong>Examples:</strong> Sample implementations and use cases</p>
                </div>
              </div>
            )}
            
            {activeSection === 'about' && (
              <div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">About ZKP-Estate</h3>
                <div className="space-y-2 text-sm text-secondary-600 dark:text-secondary-300">
                  <p>ZKP-Estate is a revolutionary rental platform that uses zero-knowledge proofs to enable privacy-preserving rental agreements.</p>
                  <p><strong>Key Features:</strong></p>
                  <p>• Privacy-first rental verification</p>
                  <p>• Dual verification paths (ZK circuits & TLSNotary)</p>
                  <p>• Smart contract escrow system</p>
                  <p>• Decentralized and trustless</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
