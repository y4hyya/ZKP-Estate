# ZKP-Estate Frontend

A Next.js frontend for the ZKP-Estate zero-knowledge rental protocol.

## Features

- **Wallet Integration**: Connect with MetaMask and other wallets using RainbowKit
- **Policy Management**: Create and browse rental policies
- **Lease Management**: Start, track, and confirm rental leases
- **ZK Proof Integration**: Generate and submit zero-knowledge proofs for eligibility
- **Responsive Design**: Mobile-first design with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your configuration
```

### Environment Variables

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key
NEXT_PUBLIC_CHAIN_ID=11155111
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
frontend/
├── app/                 # Next.js 13+ app directory
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── Header.tsx      # Navigation header
│   ├── PolicyCard.tsx  # Policy display card
│   ├── CreatePolicyForm.tsx # Policy creation form
│   └── LeaseCard.tsx   # Lease display card
├── lib/               # Utility functions
│   └── contracts.ts   # Contract addresses and ABIs
├── types/             # TypeScript type definitions
│   └── index.ts       # Main type definitions
└── public/            # Static assets
```

## Technologies

- **Next.js 14**: React framework with app directory
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS framework
- **RainbowKit**: Wallet connection UI
- **Wagmi**: React hooks for Ethereum
- **Viem**: TypeScript interface for Ethereum

## Contributing

1. Follow the existing code style
2. Use TypeScript for all new files
3. Add proper error handling
4. Write tests for new features
5. Update documentation as needed
