# CipherPay UI Communication Configuration

## Overview
This document outlines the communication configuration required for the CipherPay UI to properly interact with the SDK, relayer, and Solana blockchain.

## Environment Variables

Create a `.env` file in the `cipherpay-ui` directory with the following variables:

### Local Development Configuration (Recommended for Testing)
```bash
# Solana RPC endpoint (local test validator)
REACT_APP_RPC_URL=http://127.0.0.1:8899

# Relayer service endpoint (local)
REACT_APP_RELAYER_URL=http://localhost:3000

# Authentication credentials (for local testing)
REACT_APP_RELAYER_API_KEY=test_api_key_123
REACT_APP_RELAYER_EMAIL=test@cipherpay.local
REACT_APP_RELAYER_PASSWORD=testpassword123

# Smart contract address (local deployment)
REACT_APP_CONTRACT_ADDRESS=your_local_contract_address
```

### Production Configuration
```bash
# Solana RPC endpoint
REACT_APP_RPC_URL=https://api.mainnet-beta.solana.com

# Relayer service endpoint
REACT_APP_RELAYER_URL=https://relayer.cipherpay.com

# Authentication credentials
REACT_APP_RELAYER_API_KEY=your_relayer_api_key_here
REACT_APP_RELAYER_EMAIL=your_relayer_email@example.com
REACT_APP_RELAYER_PASSWORD=your_relayer_password_here

# Smart contract address
REACT_APP_CONTRACT_ADDRESS=your_contract_address_here
```

### Circuit Files Configuration (Same for both environments)
```bash
# Transfer circuit files (for ZK proof generation)
REACT_APP_TRANSFER_WASM_URL=/circuits/transfer.wasm
REACT_APP_TRANSFER_ZKEY_URL=/circuits/transfer.zkey
REACT_APP_TRANSFER_VKEY_URL=/circuits/transfer.vkey.json

# Merkle circuit files
REACT_APP_MERKLE_WASM_URL=/circuits/merkle.wasm
REACT_APP_MERKLE_ZKEY_URL=/circuits/merkle.zkey
REACT_APP_MERKLE_VKEY_URL=/circuits/merkle.vkey.json
```

### Development Configuration
```bash
REACT_APP_ENABLE_DEBUG=true
REACT_APP_LOG_LEVEL=info
```

### Feature Flags
```bash
REACT_APP_ENABLE_COMPLIANCE=true
REACT_APP_ENABLE_STEALTH_ADDRESSES=true
REACT_APP_ENABLE_CACHING=true
```

## Local End-to-End Testing Setup

### Prerequisites
1. **Solana CLI** installed and configured
2. **Node.js** (v16+) and **npm** installed
3. **Git** for cloning repositories

### Step-by-Step Local Setup

#### 1. Start Local Solana Validator
```bash
# Terminal 1: Start local Solana test validator
solana-test-validator

# Verify it's running
solana config get
# Should show: http://127.0.0.1:8899
```

#### 2. Deploy Smart Contracts (if needed)
```bash
# Terminal 2: Deploy to local validator
cd cipherpay-anchor
anchor build
anchor deploy --provider.cluster localnet
```

#### 3. Start Relayer Service
```bash
# Terminal 3: Start the relayer
cd cipherpay-relayer-solana
npm install
npm run dev
# Should start on http://localhost:3000
```

#### 4. Start UI Application
```bash
# Terminal 4: Start the UI
cd cipherpay-ui
npm install
npm start
# Should start on http://localhost:3001
```

### Local Testing Environment Variables
Create `.env.local` in `cipherpay-ui` for local testing:

```bash
# Port Configuration (IMPORTANT: Set UI port to avoid conflicts)
PORT=3001

# Local Development Configuration
REACT_APP_RPC_URL=http://127.0.0.1:8899
REACT_APP_RELAYER_URL=http://localhost:3000
REACT_APP_RELAYER_API_KEY=test_api_key_123
REACT_APP_RELAYER_EMAIL=test@cipherpay.local
REACT_APP_RELAYER_PASSWORD=testpassword123
REACT_APP_CONTRACT_ADDRESS=your_local_contract_address

# Circuit files (serve from public folder)
REACT_APP_TRANSFER_WASM_URL=/circuits/transfer.wasm
REACT_APP_TRANSFER_ZKEY_URL=/circuits/transfer.zkey
REACT_APP_TRANSFER_VKEY_URL=/circuits/transfer.vkey.json

# Development flags
REACT_APP_ENABLE_DEBUG=true
REACT_APP_LOG_LEVEL=debug
```

## Communication Flow

### Local Testing Flow
```
UI (localhost:3001) → SDK → Relayer (localhost:3000) → Solana (localhost:8899)
```

### Production Flow
```
UI → SDK → Relayer → Solana Mainnet
```

### 1. UI → SDK
- **Method**: Direct SDK method calls
- **Authentication**: None (local SDK instance)
- **Data**: Transaction requests, proof generation, note management

### 2. SDK → Relayer
- **Method**: HTTP REST API calls
- **Authentication**: JWT tokens or API keys
- **Endpoints**:
  - `POST /api/v1/submit-transaction` - Submit shielded transactions
  - `GET /api/v1/transaction/:id` - Check transaction status
  - `POST /api/v1/estimate-fees` - Estimate transaction fees
  - `POST /api/v1/verify-proof` - Verify ZK proofs
  - `GET /api/v1/circuits` - Get supported circuits

### 3. Relayer → Solana Program
- **Method**: Solana transaction submission
- **Authentication**: Relayer keypair signature
- **Instructions**:
  - `verify_transfer_proof` - Verify transfer proofs
  - `verify_withdraw_proof` - Verify withdrawal proofs
  - `verify_merkle_proof_circuit` - Verify Merkle proofs
  - `verify_nullifier_proof` - Verify nullifier proofs

## Security Considerations

### Local Testing
1. **No HTTPS Required**: Local testing uses HTTP
2. **Simple Authentication**: Use test credentials
3. **No Rate Limiting**: Disabled for local development
4. **Debug Mode**: Enable detailed logging

### Production
1. **API Keys**: Store relayer API keys securely and rotate regularly
2. **JWT Tokens**: Tokens expire after 24 hours, implement refresh logic
3. **Circuit Files**: Serve circuit files from secure, CDN-backed locations
4. **HTTPS**: All external communications should use HTTPS
5. **Rate Limiting**: Respect relayer rate limits (100 requests per 15 minutes)

## Error Handling

The communication stack includes:
- **Retry Logic**: Exponential backoff for failed requests
- **Circuit Breaker**: Prevents cascading failures
- **Timeout Handling**: 30-second timeout for API calls
- **Graceful Degradation**: Fallback mechanisms for service failures

## Testing

### Local Integration Testing
```bash
# Test relayer integration
cd cipherpay-relayer-solana
npm run test:integration

# Test SDK integration
cd cipherpay-sdk
npm run test:integration

# Test UI integration
cd cipherpay-ui
npm run test:integration
```

### Manual Testing Checklist
1. **Solana Validator**: Verify `solana-test-validator` is running
2. **Relayer Health**: Check `http://localhost:3000/health`
3. **UI Connection**: Verify UI can connect to relayer
4. **Transaction Flow**: Test complete transaction submission
5. **Error Handling**: Test with invalid inputs

## Troubleshooting

### Common Local Testing Issues

1. **Port Conflicts**:
   ```bash
   # Check if ports are in use
   lsof -i :8899  # Solana validator
   lsof -i :3000  # Relayer
   lsof -i :3001  # UI
   ```

2. **Solana Validator Issues**:
   ```bash
   # Reset local validator
   solana-test-validator --reset
   
   # Check validator logs
   solana logs
   ```

3. **Relayer Connection Issues**:
   ```bash
   # Check relayer status
   curl http://localhost:3000/health
   
   # Check relayer logs
   tail -f cipherpay-relayer-solana/logs/app.log
   ```

4. **UI Build Issues**:
   ```bash
   # Clear build cache
   rm -rf node_modules/.cache
   npm run build
   ```

### Network Issues
- Verify all endpoints are reachable
- Check firewall and proxy configurations
- Monitor rate limiting and timeout settings
- Ensure CORS is properly configured for local development 