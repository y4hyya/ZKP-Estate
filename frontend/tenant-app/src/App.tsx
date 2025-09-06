import React, { useState } from 'react';
import TenantProofForm from './components/TenantProofForm';
import TestComponent from './components/TestComponent';
import './App.css';

function App() {
  const [showTest, setShowTest] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center">
          <button
            onClick={() => setShowTest(!showTest)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            {showTest ? 'Hide Tests' : 'Show Tests'}
          </button>
        </div>
        
        {showTest ? <TestComponent /> : <TenantProofForm />}
      </div>
    </div>
  );
}

export default App;
