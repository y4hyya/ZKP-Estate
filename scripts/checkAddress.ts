import { ethers } from 'ethers';

async function main() {
  const privateKey = '0x59c6995e998f97a5a004496c17f0ab2411e6fd380fbcbc497a2f075b2ce1744b';
  const wallet = new ethers.Wallet(privateKey);
  console.log('Address for private key:', wallet.address);
  
  // Check what the contract expects
  const provider = new ethers.JsonRpcProvider('http://localhost:8545');
  const contractAddress = '0x922D6956C99E12DFeB3224DEA977D0939758A1Fe';
  
  const contract = new ethers.Contract(
    contractAddress,
    ['function attestor() view returns (address)'],
    provider
  );
  
  const expectedAttestor = await (contract as any).attestor();
  console.log('Contract expects attestor:', expectedAttestor);
}

main().catch(console.error);

