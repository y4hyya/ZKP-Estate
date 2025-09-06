export interface TLSNotaryProof {
  // Stub structure for hackathon - in production this would contain actual TLS Notary proof data
  age?: number;
  income?: number;
  cleanRecord?: boolean;
  // Additional fields that might be present in real TLS Notary proofs
  timestamp?: number;
  source?: string;
  [key: string]: any;
}

export interface VerificationResult {
  ageOK: boolean;
  incomeOK: boolean;
  cleanOK: boolean;
  details: {
    age?: number;
    income?: number;
    cleanRecord?: boolean;
    source?: string;
  };
}

export class TLSNotaryVerifier {
  private minAge: number = 18;
  private minIncomeMultiplier: number = 3;

  constructor(minAge?: number, minIncomeMultiplier?: number) {
    if (minAge !== undefined) this.minAge = minAge;
    if (minIncomeMultiplier !== undefined) this.minIncomeMultiplier = minIncomeMultiplier;
  }

  /**
   * Stub implementation for TLS Notary verification
   * In production, this would verify actual TLS Notary proofs
   */
  async verifyTLSNotaryProof(
    tlsnProof: TLSNotaryProof,
    policyRequirements?: {
      minAge?: number;
      minIncomeMultiplier?: number;
      rentAmount?: number;
      needCleanRecord?: boolean;
    }
  ): Promise<VerificationResult> {
    // For hackathon purposes, we'll simulate verification based on the proof data
    const age = tlsnProof.age || 25; // Default to 25 if not provided
    const income = tlsnProof.income || 100000; // Default to $100k if not provided
    const cleanRecord = tlsnProof.cleanRecord !== undefined ? tlsnProof.cleanRecord : true;

    // Apply policy requirements if provided
    const requiredMinAge = policyRequirements?.minAge || this.minAge;
    const requiredMinIncomeMultiplier = policyRequirements?.minIncomeMultiplier || this.minIncomeMultiplier;
    const requiredCleanRecord = policyRequirements?.needCleanRecord !== false; // Default to true

    // Calculate minimum required income based on rent amount
    let requiredMinIncome = 0;
    if (policyRequirements?.rentAmount) {
      requiredMinIncome = policyRequirements.rentAmount * requiredMinIncomeMultiplier;
    }

    const ageOK = age >= requiredMinAge;
    const incomeOK = income >= requiredMinIncome;
    const cleanOK = !requiredCleanRecord || cleanRecord;

    return {
      ageOK,
      incomeOK,
      cleanOK,
      details: {
        age,
        income,
        cleanRecord,
        source: tlsnProof.source || 'stub-verification'
      }
    };
  }

  /**
   * Generate a sample TLS Notary proof for testing
   */
  generateSampleProof(type: 'bank' | 'id' | 'pass'): TLSNotaryProof {
    switch (type) {
      case 'bank':
        return {
          age: 28,
          income: 120000,
          cleanRecord: true,
          timestamp: Date.now(),
          source: 'bank-statement',
          accountType: 'checking',
          balance: 50000
        };
      case 'id':
        return {
          age: 30,
          income: 95000,
          cleanRecord: true,
          timestamp: Date.now(),
          source: 'government-id',
          documentType: 'drivers-license',
          issuedBy: 'DMV'
        };
      case 'pass':
        return {
          age: 22,
          income: 80000,
          cleanRecord: false,
          timestamp: Date.now(),
          source: 'background-check',
          criminalRecord: true,
          reason: 'minor-traffic-violation'
        };
      default:
        return {
          age: 25,
          income: 100000,
          cleanRecord: true,
          timestamp: Date.now(),
          source: 'default'
        };
    }
  }
}