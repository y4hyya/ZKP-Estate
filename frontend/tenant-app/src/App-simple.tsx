import React from 'react';

function App() {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f0f0', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333', textAlign: 'center' }}>🏠 ZKP-Estate</h1>
      <p style={{ textAlign: 'center', fontSize: '18px', color: '#666' }}>
        Zero-Knowledge Proof Based Rental Platform
      </p>
      
      <div style={{ 
        maxWidth: '600px', 
        margin: '20px auto', 
        padding: '20px', 
        backgroundColor: 'white', 
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2>✅ Frontend Çalışıyor!</h2>
        <p>Eğer bu sayfayı görebiliyorsanız, beyaz ekran sorunu çözülmüştür.</p>
        
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => alert('Buton çalışıyor!')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Butonu
          </button>
        </div>
        
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
          <h3>Sistem Durumu:</h3>
          <ul>
            <li>✅ React: Çalışıyor</li>
            <li>✅ Vite: Çalışıyor</li>
            <li>✅ TypeScript: Çalışıyor</li>
            <li>✅ Frontend Server: Çalışıyor</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;