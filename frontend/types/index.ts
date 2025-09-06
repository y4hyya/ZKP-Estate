// Contract types
export interface RentalPolicy {
  landlord: string;
  rentAmount: string;
  deposit: string;
  duration: number;
  isActive: boolean;
  propertyDetails: string;
}

export interface Lease {
  policyId: number;
  tenant: string;
  startTime: number;
  endTime: number;
  totalRent: string;
  deposit: string;
  isActive: boolean;
  isConfirmed: boolean;
  proofHash: string;
}

export interface ZKProof {
  proof: string;
  publicInputs: number[];
  proofHash: string;
  timestamp: string;
}

// Form types
export interface CreatePolicyFormData {
  rentAmount: string;
  deposit: string;
  duration: string;
  propertyDetails: string;
}

// UI types
export type TabType = 'browse' | 'create' | 'my-leases';

export interface PolicyCardProps {
  id: string;
  landlord: string;
  rentAmount: string;
  deposit: string;
  duration: number;
  propertyDetails: string;
}

export interface LeaseCardProps {
  id: string;
  policyId: string;
  tenant: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isConfirmed: boolean;
}
