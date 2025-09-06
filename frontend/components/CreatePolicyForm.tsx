'use client';

import { useState } from 'react';
import { Plus, DollarSign, Shield, Calendar } from 'lucide-react';

export default function CreatePolicyForm() {
  const [formData, setFormData] = useState({
    rentAmount: '',
    deposit: '',
    duration: '',
    propertyDetails: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement contract interaction
      console.log('Creating policy with data:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Policy created successfully! (This is a demo)');
      
      // Reset form
      setFormData({
        rentAmount: '',
        deposit: '',
        duration: '',
        propertyDetails: '',
      });
    } catch (error) {
      console.error('Error creating policy:', error);
      alert('Error creating policy. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="max-w-2xl">
      <div className="card">
        <div className="flex items-center space-x-2 mb-6">
          <Plus className="h-6 w-6 text-primary-600" />
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-white">
            Create New Rental Policy
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Property Details
            </label>
            <textarea
              name="propertyDetails"
              value={formData.propertyDetails}
              onChange={handleChange}
              placeholder="Describe your property (e.g., Modern 2BR apartment in downtown)"
              className="input h-24 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Monthly Rent (ETH)
              </label>
              <input
                type="number"
                name="rentAmount"
                value={formData.rentAmount}
                onChange={handleChange}
                placeholder="1.0"
                step="0.1"
                min="0"
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                <Shield className="inline h-4 w-4 mr-1" />
                Security Deposit (ETH)
              </label>
              <input
                type="number"
                name="deposit"
                value={formData.deposit}
                onChange={handleChange}
                placeholder="2.0"
                step="0.1"
                min="0"
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Lease Duration (days)
            </label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              placeholder="30"
              min="1"
              className="input"
              required
            />
          </div>

          <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-primary-800 dark:text-primary-200 mb-2">
              ZK Verification Requirements
            </h4>
            <ul className="text-sm text-primary-700 dark:text-primary-300 space-y-1">
              <li>• Tenants must prove age ≥ 18 years</li>
              <li>• Income must be ≥ 3x monthly rent</li>
              <li>• Credit score must be ≥ 600</li>
              <li>• Must be employed or self-employed</li>
              <li>• No negative rental history</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Policy...' : 'Create Policy'}
            </button>
            <button
              type="button"
              onClick={() => setFormData({
                rentAmount: '',
                deposit: '',
                duration: '',
                propertyDetails: '',
              })}
              className="btn-secondary"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
