'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import CreatePolicyForm from './CreatePolicyForm';
import LeaseCard from './LeaseCard';
import PropertyCard from './PropertyCard';

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  landlord: string;
  rentAmount: string;
  deposit: string;
  duration: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  imageUrl: string;
  requirements: string[];
  isAvailable: boolean;
}

interface TLSTabProps {
  userType?: 'tenant' | 'landlord';
}

export default function TLSTab({ userType = 'landlord' }: TLSTabProps) {
  const { address } = useAccount();
  // Use demo address if no wallet connected
  const demoAddress = address || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'my-leases'>('browse');
  
  // Shared properties data - both tenants and landlords see the same properties
  const [allProperties, setAllProperties] = useState<Property[]>([
    {
      id: "1",
      title: "Modern Downtown Apartment",
      description: "Beautiful modern apartment in the heart of downtown with stunning city views and premium amenities.",
      location: "Downtown, Istanbul",
      landlord: "0x1234...5678",
      rentAmount: "1.2",
      deposit: "2.4",
      duration: 30,
      bedrooms: 2,
      bathrooms: 1,
      area: 850,
      imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      requirements: ["Income Proof", "Credit Check", "Employment Verification"],
      isAvailable: true
    },
    {
      id: "2",
      title: "Luxury Condo with Ocean View",
      description: "Spacious luxury condo with breathtaking ocean views, private balcony, and premium finishes throughout.",
      location: "Bosphorus, Istanbul",
      landlord: "0xabcd...efgh",
      rentAmount: "2.5",
      deposit: "5.0",
      duration: 60,
      bedrooms: 3,
      bathrooms: 2,
      area: 1200,
      imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      requirements: ["Income Proof", "Credit Check", "References"],
      isAvailable: true
    },
    {
      id: "3",
      title: "Cozy Studio in Historic District",
      description: "Charming studio apartment in a historic building with original features and modern conveniences.",
      location: "Sultanahmet, Istanbul",
      landlord: "0x9876...5432",
      rentAmount: "0.8",
      deposit: "1.6",
      duration: 30,
      bedrooms: 1,
      bathrooms: 1,
      area: 450,
      imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2080&q=80",
      requirements: ["Income Proof", "Employment Verification"],
      isAvailable: true
    },
    {
      id: "4",
      title: "Family House with Garden",
      description: "Perfect family home with private garden, multiple bedrooms, and close to schools and parks.",
      location: "Kadıköy, Istanbul",
      landlord: "0x4567...8901",
      rentAmount: "1.8",
      deposit: "3.6",
      duration: 90,
      bedrooms: 4,
      bathrooms: 3,
      area: 1800,
      imageUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      requirements: ["Income Proof", "Credit Check", "Family References"],
      isAvailable: false
    },
    {
      id: "5",
      title: "Penthouse with Rooftop Terrace",
      description: "Exclusive penthouse with private rooftop terrace, panoramic city views, and luxury amenities.",
      location: "Levent, Istanbul",
      landlord: "0x2468...1357",
      rentAmount: "3.5",
      deposit: "7.0",
      duration: 120,
      bedrooms: 3,
      bathrooms: 2,
      area: 1500,
      imageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80",
      requirements: ["Income Proof", "Credit Check", "References", "Background Check"],
      isAvailable: true
    }
  ]);

  // Function to add new property (for landlords)
  const addProperty = (propertyData: any) => {
    // Convert CreatePolicyForm data to Property format
    const newProperty: Property = {
      id: (allProperties.length + 1).toString(),
      title: propertyData.title || "New Property",
      description: propertyData.propertyDetails || "Property description",
      location: propertyData.location || "Istanbul, Turkey",
      landlord: demoAddress ? `${demoAddress.slice(0, 6)}...${demoAddress.slice(-4)}` : "0x0000...0000",
      rentAmount: propertyData.rentAmount,
      deposit: propertyData.deposit,
      duration: propertyData.duration,
      bedrooms: Math.floor(Math.random() * 4) + 1, // Random bedrooms 1-4
      bathrooms: Math.floor(Math.random() * 3) + 1, // Random bathrooms 1-3
      area: Math.floor(Math.random() * 1000) + 500, // Random area 500-1500
      imageUrl: propertyData.imageUrl || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      requirements: generateRequirementsFromZK(propertyData.zkRequirements),
      isAvailable: true
    };
    setAllProperties(prev => [newProperty, ...prev]);
    console.log('New property added:', newProperty);
  };

  // Helper function to convert ZK requirements to readable requirements
  const generateRequirementsFromZK = (zkRequirements: any) => {
    const requirements = [];
    if (zkRequirements.minAge > 18) {
      requirements.push(`Minimum Age: ${zkRequirements.minAge}`);
    }
    if (zkRequirements.incomeMultiplier > 1) {
      requirements.push(`Income: ${zkRequirements.incomeMultiplier}x rent`);
    }
    if (zkRequirements.minCreditScore > 300) {
      requirements.push(`Credit Score: ${zkRequirements.minCreditScore}+`);
    }
    if (zkRequirements.employmentStatus && zkRequirements.employmentStatus.length > 0 && !zkRequirements.employmentStatus.includes('does-not-care')) {
      requirements.push("Employment Verification");
    }
    if (zkRequirements.rentalHistory === 'no-negative-history') {
      requirements.push("Clean Rental History");
    }
    return requirements.length > 0 ? requirements : ["Basic Requirements"];
  };

  // Function to handle property application (for tenants)
  const handlePropertyApplication = (propertyId: string) => {
    console.log(`Applied for property ${propertyId}`);
    // Here you would typically integrate with your smart contract
    // For now, just show a success message
    alert('Application submitted successfully! You will be contacted by the landlord.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
          {userType === 'tenant' ? 'For Tenants' : 'For Landlords'}
        </h2>
        <p className="text-secondary-600 dark:text-secondary-300">
          {userType === 'tenant' 
            ? 'Browse available properties and submit your applications'
            : 'Create rental policies and manage your leases'
          }
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-secondary-200 dark:bg-secondary-700 p-1 rounded-lg w-fit">
        {userType === 'tenant' && (
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
        )}
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'create'
              ? 'bg-white dark:bg-secondary-600 text-primary-600 shadow-sm'
              : 'text-secondary-600 dark:text-secondary-300 hover:text-primary-600'
          }`}
        >
          {userType === 'tenant' ? 'My Applications' : 'Create Policy'}
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
      {userType === 'tenant' && activeTab === 'browse' && (
        <div>
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-6">
            Browse Properties
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onApply={handlePropertyApplication}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div>
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-6">
            {userType === 'tenant' ? 'My Applications' : 'Create Rental Policy'}
          </h3>
          {userType === 'tenant' ? (
            <div className="text-center py-12">
              <p className="text-secondary-600 dark:text-secondary-300 mb-4">
                Your applications will appear here once you apply for properties.
              </p>
              <button
                onClick={() => setActiveTab('browse')}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                Browse Properties
              </button>
            </div>
          ) : (
            <CreatePolicyForm onPropertyCreated={addProperty} />
          )}
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
