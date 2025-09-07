'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import PolicyCard from './PolicyCard';
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

export default function NoirTab() {
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState<'browse'>('browse');
  
  // Initial properties data
  const [properties, setProperties] = useState<Property[]>([
    {
      id: "1",
      landlord: "0x1234...5678",
      rentAmount: "1.0",
      deposit: "2.0",
      duration: 30,
      propertyDetails: "Modern apartment in downtown",
      imageUrl: "https://cf.bstatic.com/xdata/images/hotel/max1024x768/691762003.jpg?k=f9b3a2c9f576a42a4770236eb6750816ebb9cde02d2eb2555b50a80e38c23645&o="
    },
    {
      id: "2",
      landlord: "0xabcd...efgh",
      rentAmount: "1.5",
      deposit: "3.0",
      duration: 60,
      propertyDetails: "Luxury condo with ocean view",
      imageUrl: "https://media.vrbo.com/lodging/46000000/45800000/45791100/45791057/4ca90a22.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill"
    },
    {
      id: "3",
      landlord: "0x9876...5432",
      rentAmount: "0.8",
      deposit: "1.6",
      duration: 45,
      propertyDetails: "Cozy studio near university",
      imageUrl: "https://cf.bstatic.com/xdata/images/hotel/max1024x768/142721467.jpg?k=8d7a6d594f4ceacd066f32f0dd091599e4370f23b742688bd5268be68938c33d&o=&hp=1"
    },
    {
      id: "4",
      landlord: "0x4567...8901",
      rentAmount: "2.2",
      deposit: "4.4",
      duration: 90,
      propertyDetails: "Spacious family house with garden",
      imageUrl: "https://storage.remax-centarnekretnina.com/sites/3/upload/listings/1754764319_dji_fly_20250808_191900_953_1754673583482_photo_optimized.jpg"
    },
    {
      id: "5",
      landlord: "0x2345...6789",
      rentAmount: "1.3",
      deposit: "2.6",
      duration: 75,
      propertyDetails: "Contemporary loft in arts district",
      imageUrl: "https://media.vrbo.com/lodging/87000000/86570000/86563900/86563892/96a401b0.jpg?impolicy=resizecrop&rw=575&rh=575&ra=fill"
    },
    {
      id: "6",
      landlord: "0x7890...1234",
      rentAmount: "1.8",
      deposit: "3.6",
      duration: 120,
      propertyDetails: "Penthouse with city skyline view",
      imageUrl: "https://thumbs.dreamstime.com/b/elegant-penthouse-bedroom-night-stunning-city-skyline-views-luxurious-offers-breathtaking-creating-serene-340530352.jpg"
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
          For Tenant
        </h2>
        <p className="text-secondary-600 dark:text-secondary-300">
          Browse available rental properties and submit your ZK proof for eligibility verification
        </p>
      </div>

      {/* Properties Grid */}
      <div>
        <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-6">
          Available Properties
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PolicyCard
              key={property.id}
              id={property.id}
              landlord={property.landlord}
              rentAmount={property.rentAmount}
              deposit={property.deposit}
              duration={property.duration}
              propertyDetails={property.propertyDetails}
              imageUrl={property.imageUrl}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
