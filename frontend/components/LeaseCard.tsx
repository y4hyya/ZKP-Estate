'use client';

import { useState } from 'react';
import { Calendar, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface LeaseCardProps {
  id: string;
  policyId: string;
  tenant: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isConfirmed: boolean;
}

export default function LeaseCard({
  id,
  policyId,
  tenant,
  startTime,
  endTime,
  isActive,
  isConfirmed,
}: LeaseCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const getStatusColor = () => {
    if (isConfirmed) return 'text-green-600 bg-green-100 dark:bg-green-900/20';
    if (isActive) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
    return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
  };

  const getStatusText = () => {
    if (isConfirmed) return 'Completed';
    if (isActive) return 'Active';
    return 'Inactive';
  };

  const getStatusIcon = () => {
    if (isConfirmed) return <CheckCircle className="h-4 w-4" />;
    if (isActive) return <Clock className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    // TODO: Implement lease confirmation logic
    console.log('Confirming lease:', id);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    alert('Lease confirmed! (This is a demo)');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysRemaining = () => {
    const end = new Date(endTime);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        <span className="text-xs text-secondary-500 bg-secondary-100 dark:bg-secondary-700 px-2 py-1 rounded-full">
          Lease #{id}
        </span>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-300">
          <User className="h-4 w-4" />
          <span className="text-sm">
            Tenant: <span className="font-medium">{tenant}</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-300">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            Policy: <span className="font-medium">#{policyId}</span>
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-secondary-500 dark:text-secondary-400">Start Date</span>
            <p className="font-medium text-secondary-900 dark:text-white">
              {formatDate(startTime)}
            </p>
          </div>
          <div>
            <span className="text-secondary-500 dark:text-secondary-400">End Date</span>
            <p className="font-medium text-secondary-900 dark:text-white">
              {formatDate(endTime)}
            </p>
          </div>
        </div>

        {isActive && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>{getDaysRemaining()} days</strong> remaining in lease
            </p>
          </div>
        )}
      </div>

      <div className="flex space-x-3">
        {isActive && !isConfirmed && (
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Confirming...' : 'Confirm Completion'}
          </button>
        )}
        
        {isConfirmed && (
          <div className="flex-1 text-center py-2 text-green-600 font-medium">
            ✓ Lease Completed
          </div>
        )}
        
        <button className="btn-secondary">
          View Details
        </button>
      </div>

      {isActive && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            <strong>Note:</strong> Confirm lease completion to receive your security deposit refund.
          </p>
        </div>
      )}
    </div>
  );
}
