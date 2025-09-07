'use client';

import { useState, useRef } from 'react';
import { Plus, DollarSign, Shield, Calendar, Image, Upload } from 'lucide-react';

interface PropertyData {
  rentAmount: string;
  deposit: string;
  duration: number;
  propertyDetails: string;
  imageUrl?: string;
}

interface CreatePolicyFormProps {
  onPropertyCreated?: (propertyData: PropertyData) => void;
}

export default function CreatePolicyForm({ onPropertyCreated }: CreatePolicyFormProps) {
  const [formData, setFormData] = useState({
    rentAmount: '',
    deposit: '',
    duration: '',
    propertyDetails: '',
    imageUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement contract interaction
      console.log('Creating policy with data:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Call the callback to add property to the list
      if (onPropertyCreated) {
        onPropertyCreated({
          rentAmount: formData.rentAmount,
          deposit: formData.deposit,
          duration: parseInt(formData.duration),
          propertyDetails: formData.propertyDetails,
          imageUrl: formData.imageUrl || undefined,
        });
      }
      
      alert('Policy created successfully! Check Browse Properties to see your new listing.');
      
      // Reset form
      setFormData({
        rentAmount: '',
        deposit: '',
        duration: '',
        propertyDetails: '',
        imageUrl: '',
      });
      setUploadedImage(null);
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

  const handleFileUpload = (file: File) => {
    if (file.type !== 'image/png') {
      alert('Lütfen sadece PNG formatında resim yükleyin.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Resim boyutu 5MB\'dan küçük olmalıdır.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setFormData(prev => ({
        ...prev,
        imageUrl: result, // Use data URL for uploaded images
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    setFormData(prev => ({
      ...prev,
      imageUrl: '',
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <Image className="inline h-4 w-4 mr-1" />
              Property Image (PNG Only)
            </label>
            
            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
                isDragOver
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {uploadedImage ? (
                <div className="space-y-3">
                  <img
                    src={uploadedImage}
                    alt="Property preview"
                    className="w-full h-32 object-cover rounded-lg border border-secondary-200 dark:border-secondary-700 mx-auto"
                  />
                  <div className="flex justify-center space-x-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      onClick={clearImage}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-8 w-8 text-secondary-400 mx-auto" />
                  <div>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      PNG resminizi buraya sürükleyip bırakın
                    </p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-500 mt-1">
                      veya
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Dosya Seç
                    </button>
                  </div>
                  <p className="text-xs text-secondary-500 dark:text-secondary-500">
                    Maksimum dosya boyutu: 5MB
                  </p>
                </div>
              )}
            </div>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,image/png"
              onChange={handleFileInputChange}
              className="hidden"
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
              onClick={() => {
                setFormData({
                  rentAmount: '',
                  deposit: '',
                  duration: '',
                  propertyDetails: '',
                  imageUrl: '',
                });
                setUploadedImage(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
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
