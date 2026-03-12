'use client';

import { useState } from 'react';
import { MapPin, Bed, Bath, Square, Calendar, DollarSign, Shield } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  rentAmount: string;
  deposit: string;
  duration: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  imageUrl: string;
  landlord: string;
  requirements: string[];
  isAvailable: boolean;
}

interface PropertyCardProps {
  property: Property;
  onApply: (propertyId: string) => void;
}

export default function PropertyCard({ property, onApply }: PropertyCardProps) {
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    // Simulate application process
    await new Promise(resolve => setTimeout(resolve, 1000));
    onApply(property.id);
    setIsApplying(false);
  };

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden hover:shadow-md transition-shadow">
      {/* Property Image */}
      <div className="relative h-48 bg-secondary-100 dark:bg-secondary-700">
        <img
          src={property.imageUrl}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        {!property.isAvailable && (
          <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Rented
          </div>
        )}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-secondary-800 px-3 py-1 rounded-full text-sm font-medium text-secondary-700 dark:text-secondary-300">
          {property.rentAmount} ETH/month
        </div>
      </div>

      {/* Property Details */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">
            {property.title}
          </h3>
          <div className="flex items-center text-sm text-secondary-500 dark:text-secondary-400">
            <Shield className="h-4 w-4 mr-1" />
            {property.landlord}
          </div>
        </div>

        <p className="text-secondary-600 dark:text-secondary-300 mb-4 line-clamp-2">
          {property.description}
        </p>

        <div className="flex items-center text-sm text-secondary-500 dark:text-secondary-400 mb-4">
          <MapPin className="h-4 w-4 mr-1" />
          {property.location}
        </div>

        {/* Property Features */}
        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div className="flex items-center text-secondary-600 dark:text-secondary-300">
            <Bed className="h-4 w-4 mr-1" />
            {property.bedrooms} bed
          </div>
          <div className="flex items-center text-secondary-600 dark:text-secondary-300">
            <Bath className="h-4 w-4 mr-1" />
            {property.bathrooms} bath
          </div>
          <div className="flex items-center text-secondary-600 dark:text-secondary-300">
            <Square className="h-4 w-4 mr-1" />
            {property.area} sqft
          </div>
        </div>

        {/* Rent Details */}
        <div className="flex items-center justify-between mb-4 p-3 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
          <div className="flex items-center text-secondary-600 dark:text-secondary-300">
            <DollarSign className="h-4 w-4 mr-1" />
            <span className="text-sm">Deposit: {property.deposit} ETH</span>
          </div>
          <div className="flex items-center text-secondary-600 dark:text-secondary-300">
            <Calendar className="h-4 w-4 mr-1" />
            <span className="text-sm">{property.duration} days</span>
          </div>
        </div>

        {/* Requirements */}
        {property.requirements.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Requirements:
            </h4>
            <div className="flex flex-wrap gap-2">
              {property.requirements.map((requirement, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs rounded-full"
                >
                  {requirement}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Apply Button */}
        <button
          onClick={handleApply}
          disabled={!property.isAvailable || isApplying}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            property.isAvailable && !isApplying
              ? 'bg-primary-600 hover:bg-primary-700 text-white'
              : 'bg-secondary-300 dark:bg-secondary-600 text-secondary-500 dark:text-secondary-400 cursor-not-allowed'
          }`}
        >
          {isApplying ? 'Applying...' : property.isAvailable ? 'Apply Now' : 'Not Available'}
        </button>
      </div>
    </div>
  );
}



