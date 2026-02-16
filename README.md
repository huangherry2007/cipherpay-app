# CipherPay App

Privacy-preserving payment platform built on Solana with zero-knowledge proofs.

## 📦 Monorepo Structure

This is a monorepo containing three packages:

- **[@cipherpay/sdk](./packages/sdk)** - Core SDK for ZK proof generation and cryptographic operations
- **[@cipherpay/server](./packages/server)** - Backend API server with database and event monitoring
- **[@cipherpay/ui](./packages/ui)** - Frontend React application

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- MySQL database (for server)
- Solana CLI tools

### Installation

```bash
# Install dependencies for all packages
pnpm install

# Build SDK first (required by server and UI)
pnpm build:sdk

# Build all packages
pnpm build
```

### Development

```bash
# Run server in dev mode
pnpm dev:server

# Run UI in dev mode (in another terminal)
pnpm dev:ui
```

## 📖 Package Documentation

### SDK (@cipherpay/sdk)
Core library for:
- Zero-knowledge proof generation (Groth16)
- Commitment and nullifier computation
- Merkle tree operations
- Cryptographic utilities

See [packages/sdk/README.md](./packages/sdk/README.md) for details.

### Server (@cipherpay/server)
Backend services:
- RESTful API with Fastify
- Database (MySQL + Prisma)
- Solana event monitoring
- JWT authentication
- Message inbox and encryption

See [packages/server/README.md](./packages/server/README.md) for details.

### UI (@cipherpay/ui)
React frontend:
- Solana wallet integration
- Privacy-preserving deposits, transfers, withdrawals
- Encrypted messaging
- Activity history

See [packages/ui/README.md](./packages/ui/README.md) for details.

## 🔧 Common Commands

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:sdk
pnpm build:server
pnpm build:ui

# Development
pnpm dev:server
pnpm dev:ui

# Database operations
pnpm prisma:gen    # Generate Prisma client
pnpm prisma:pull   # Pull schema from database

# Clean all
pnpm clean
```

## 🏗️ Architecture

```
┌─────────────┐
│  UI (React) │
└──────┬──────┘
       │
       ├──uses──→ SDK
       │
       ↓
┌────────────────┐
│ Server (API)   │──uses──→ SDK
└────────┬───────┘
         │
         ├──→ MySQL Database
         ├──→ Solana RPC
         └──→ Relayer
```

## 🧪 Related Repositories

- [cipherpay-anchor](../cipherpay-anchor) - Solana smart contracts (Anchor)
- [cipherpay-circuits](../cipherpay-circuits) - ZK circuits (Circom)
- [cipherpay-relayer-solana](../cipherpay-relayer-solana) - Transaction relayer service
- [cipherpay-zkaudit](../cipherpay-zkaudit) - Zero-knowledge audit system

## 📝 Development Workflow

1. Make changes to SDK, server, or UI
2. Build SDK if you changed it: `pnpm build:sdk`
3. Test your changes
4. Commit (atomic commits across packages are now possible!)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## 📄 License

See [LICENSE](./LICENSE) for details.
