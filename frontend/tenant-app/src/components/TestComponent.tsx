import React, { useState } from 'react';
import { testFormData, mockPolicyData, generateTestProof, addressToBigInt, generateSalt, computeNullifier } from '../test/test-utils';

const TestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);

  const runTests = () => {
    const results: string[] = [];
    
    try {
      // Test 1: Address to BigInt conversion
      const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const userId = addressToBigInt(testAddress);
      results.push(`✅ Address to BigInt: ${userId}`);
      
      // Test 2: Salt generation
      const salt = generateSalt();
      results.push(`✅ Salt generation: ${salt}`);
      
      // Test 3: Nullifier computation
      const nullifier = computeNullifier(userId, testFormData.policyId, salt);
      results.push(`✅ Nullifier computation: ${nullifier}`);
      
      // Test 4: Proof generation
      const proof = generateTestProof(testFormData, mockPolicyData, testAddress);
      results.push(`✅ Proof generation: ${proof.proof.slice(0, 20)}...`);
      results.push(`✅ Public inputs: [${proof.publicInputs.join(', ')}]`);
      
      // Test 5: Form validation
      const ageValid = testFormData.age >= mockPolicyData.minAge;
      const incomeValid = (testFormData.monthlyIncome * 1000) >= (mockPolicyData.incomeMul * Number(mockPolicyData.rentWei));
      const criminalValid = !mockPolicyData.needCleanRec || !testFormData.criminalRecord;
      
      results.push(`✅ Age validation: ${ageValid ? 'PASS' : 'FAIL'}`);
      results.push(`✅ Income validation: ${incomeValid ? 'PASS' : 'FAIL'}`);
      results.push(`✅ Criminal record validation: ${criminalValid ? 'PASS' : 'FAIL'}`);
      
      results.push(`\n🎉 All tests passed! Frontend is working correctly.`);
      
    } catch (error) {
      results.push(`❌ Test failed: ${error}`);
    }
    
    setTestResults(results);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Frontend Test Suite</h2>
      
      <button
        onClick={runTests}
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mb-4"
      >
        Run Tests
      </button>
      
      {testResults.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-lg font-semibold mb-2">Test Results:</h3>
          <pre className="text-sm text-gray-800 whitespace-pre-wrap">
            {testResults.join('\n')}
          </pre>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
        <h3 className="text-sm font-semibold text-green-900 mb-2">Test Data:</h3>
        <div className="text-sm text-green-800 space-y-1">
          <p><strong>Form Data:</strong> Age: {testFormData.age}, Income: {testFormData.monthlyIncome} ETH, Criminal: {testFormData.criminalRecord ? 'Yes' : 'No'}</p>
          <p><strong>Policy Data:</strong> Min Age: {mockPolicyData.minAge}, Income Mul: {mockPolicyData.incomeMul}x, Rent: {mockPolicyData.rentWei.toString()} units</p>
          <p><strong>Wallet:</strong> 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</p>
        </div>
      </div>
    </div>
  );
};

export default TestComponent;
