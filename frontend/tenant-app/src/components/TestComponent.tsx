import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">🧪 Test Mode</h2>
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-lg font-semibold text-green-800 mb-2">✅ System Status</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Frontend: Çalışıyor</li>
            <li>• React: Çalışıyor</li>
            <li>• CSS: Çalışıyor</li>
            <li>• Vite Dev Server: Çalışıyor</li>
          </ul>
        </div>
        
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">🔗 Services</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Hardhat Node: localhost:8545</li>
            <li>• Frontend: localhost:5173</li>
            <li>• Attestor: localhost:3001</li>
          </ul>
        </div>
        
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Note</h3>
          <p className="text-sm text-yellow-700">
            Bu test modudur. Gerçek uygulamayı görmek için "Hide Tests" butonuna tıklayın.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestComponent;