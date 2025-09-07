'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import CreatePolicyForm from './CreatePolicyForm';
import LeaseCard from './LeaseCard';

interface Property {
  id: string;
  landlord: string;
  rentAmount: string;
  deposit: string;
  duration: number;
  propertyDetails: string;
  imageUrl?: string;
}

export default function TLSTab() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'create' | 'my-leases'>('create');
  
  // Initial properties data for landlords
  const [properties, setProperties] = useState<Property[]>([
    {
      id: "1",
      landlord: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "0x0000...0000",
      rentAmount: "1.0",
      deposit: "2.0",
      duration: 30,
      propertyDetails: "Modern apartment in downtown",
      imageUrl: "https://cf.bstatic.com/xdata/images/hotel/max1024x768/691762003.jpg?k=f9b3a2c9f576a42a4770236eb6750816ebb9cde02d2eb2555b50a80e38c23645&o="
    },
    {
      id: "2",
      landlord: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "0x0000...0000",
      rentAmount: "1.5",
      deposit: "3.0",
      duration: 60,
      propertyDetails: "Luxury condo with ocean view",
      imageUrl: "https://media.vrbo.com/lodging/46000000/45800000/45791100/45791057/4ca90a22.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill"
    }
  ]);

  // Function to add new property
  const addProperty = (propertyData: Omit<Property, 'id' | 'landlord'>) => {
    const newProperty: Property = {
      ...propertyData,
      id: (properties.length + 1).toString(),
      landlord: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "0x0000...0000"
    };
    setProperties(prev => [newProperty, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
          For Landlords
        </h2>
        <p className="text-secondary-600 dark:text-secondary-300">
          Create rental policies and manage your leases
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-secondary-200 dark:bg-secondary-700 p-1 rounded-lg w-fit">
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
      {activeTab === 'create' && (
        <div>
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-6">
            Create Rental Policy
          </h3>
          <CreatePolicyForm onPropertyCreated={addProperty} />
        </div>
      )}

      {activeTab === 'my-leases' && (
        <div>
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-6">
            My Leases
          </h3>
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
            <LeaseCard
              id="2"
              policyId="2"
              tenant="0xabcd...efgh"
              startTime="2024-02-01"
              endTime="2024-02-28"
              isActive={true}
              isConfirmed={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
