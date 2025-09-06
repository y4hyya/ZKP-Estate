#!/bin/bash

# Generate Solidity Verifier for Eligibility Circuit
# This script uses Barretenberg (bb) to generate a Solidity verifier contract

set -e

echo "🔧 Generating Solidity Verifier for Eligibility Circuit..."

# Check if bb is installed
if ! command -v bb &> /dev/null; then
    echo "❌ Barretenberg (bb) is not installed"
    echo "📋 Please install bb first:"
    echo "   npm install -g @noir-lang/barretenberg"
    echo "   or"
    echo "   cargo install --git https://github.com/noir-lang/barretenberg.git"
    exit 1
fi

# Navigate to circuit directory
cd circuits/eligibility

# Check if circuit is compiled
if [ ! -f "target/eligibility.json" ]; then
    echo "📦 Compiling Noir circuit first..."
    nargo compile
fi

# Create verifier directory if it doesn't exist
mkdir -p ../../contracts/verifier

# Generate the verifier contract
echo "🔨 Generating verifier contract..."
bb generate-verifier \
    --contract-name EligibilityVerifier \
    --output-dir ../../contracts/verifier \
    --circuit target/eligibility.json

# Check if generation was successful
if [ -f "../../contracts/verifier/EligibilityVerifier.sol" ]; then
    echo "✅ Verifier contract generated successfully!"
    echo "📄 Location: contracts/verifier/EligibilityVerifier.sol"
    
    # Show file size
    file_size=$(wc -c < "../../contracts/verifier/EligibilityVerifier.sol")
    echo "📊 File size: $file_size bytes"
    
    # Show first few lines
    echo "📋 First few lines of generated contract:"
    head -20 "../../contracts/verifier/EligibilityVerifier.sol"
    
else
    echo "❌ Verifier generation failed"
    echo "🔍 Trying alternative method..."
    
    # Try alternative command
    bb generate-verifier \
        --contract-name EligibilityVerifier \
        --output ../../contracts/verifier/EligibilityVerifier.sol \
        --circuit target/eligibility.json
    
    if [ -f "../../contracts/verifier/EligibilityVerifier.sol" ]; then
        echo "✅ Verifier contract generated successfully (alternative method)!"
    else
        echo "❌ All generation methods failed"
        echo "📋 Manual steps:"
        echo "   1. Ensure circuit is compiled: nargo compile"
        echo "   2. Check bb installation: bb --version"
        echo "   3. Try manual generation with different parameters"
        exit 1
    fi
fi

echo "🎉 Verifier generation completed!"
echo "📋 Next steps:"
echo "   1. Review the generated contract"
echo "   2. Deploy with: npm run dev:deploy"
echo "   3. Test with: npm test"
