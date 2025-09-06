'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, Home } from 'lucide-react';

export default function Header() {
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
              <a
                href="#"
                className="text-secondary-600 dark:text-secondary-300 hover:text-primary-600 transition-colors"
              >
                How it Works
              </a>
              <a
                href="#"
                className="text-secondary-600 dark:text-secondary-300 hover:text-primary-600 transition-colors"
              >
                Documentation
              </a>
              <a
                href="#"
                className="text-secondary-600 dark:text-secondary-300 hover:text-primary-600 transition-colors"
              >
                About
              </a>
            </nav>
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
