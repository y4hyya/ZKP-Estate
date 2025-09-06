import { ethers } from 'ethers';

async function main() {
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  const contractAddress = '0x922D6956C99E12DFeB3224DEA977D0939758A1Fe';
  
  const contract = new ethers.Contract(
    contractAddress,
    ['function attestor() view returns (address)'],
    provider
  );
  
  const attestor = await (contract as any).attestor();
  console.log('Configured attestor:', attestor);
  
  // Check what the attestor service is using
  const response = await fetch('http://localhost:3001/health');
  const health: any = await response.json();
  console.log('Attestor service address:', health.attestor);
}

main().catch(console.error);
