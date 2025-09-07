'use client';

import { useState } from 'react';
import { MapPin, Calendar, DollarSign, Shield } from 'lucide-react';

interface PolicyCardProps {
  id: string;
  landlord: string;
  rentAmount: string;
  deposit: string;
  duration: number;
  propertyDetails: string;
  imageUrl?: string;
}

export default function PolicyCard({
  id,
  landlord,
  rentAmount,
  deposit,
  duration,
  propertyDetails,
  imageUrl,
}: PolicyCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRent = async () => {
    setIsLoading(true);
    // TODO: Implement rental logic with ZK proof generation
    console.log('Starting rental process for policy:', id);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    alert('Rental process started! (This is a demo)');
  };

  return (
    <div className="card hover:shadow-xl transition-shadow duration-200 overflow-hidden">
      {/* Property Image */}
      {imageUrl && (
        <div className="relative h-48 w-full mb-4">
          <img
            src={imageUrl}
            alt={propertyDetails}
            className="w-full h-full object-cover rounded-t-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-primary-600">ZK Verified</span>
        </div>
        <span className="text-xs text-secondary-500 bg-secondary-100 dark:bg-secondary-700 px-2 py-1 rounded-full">
          Policy #{id}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
        {propertyDetails}
      </h3>

      <div className="space-y-3 mb-6">
        <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-300">
          <DollarSign className="h-4 w-4" />
          <span className="text-sm">
            <span className="font-medium">{rentAmount} ETH</span> / month
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-300">
          <Shield className="h-4 w-4" />
          <span className="text-sm">
            Deposit: <span className="font-medium">{deposit} ETH</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-300">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            Duration: <span className="font-medium">{duration} days</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-300">
          <MapPin className="h-4 w-4" />
          <span className="text-sm truncate">
            Landlord: {landlord}
          </span>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleRent}
          disabled={isLoading}
          className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Proposal with ZK Proof'}
        </button>
        <button className="btn-secondary">
          View Details
        </button>
      </div>

      <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
        <p className="text-xs text-primary-700 dark:text-primary-300">
          <strong>Privacy Note:</strong> Your personal information is verified using zero-knowledge proofs. 
          Only your eligibility is confirmed, not your actual details.
        </p>
      </div>
    </div>
  );
}
