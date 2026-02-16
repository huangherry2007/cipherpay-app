# Quick Start Guide

## For New Users

### 1. Clone and Install

```bash
git clone <repo-url> cipherpay-app
cd cipherpay-app
pnpm install
```

### 2. Build Packages

```bash
# Build SDK first (required by server and UI)
pnpm build:sdk

# Build all packages
pnpm build
```

### 3. Configure Server

```bash
cd packages/server

# Copy environment template
cp .env.example .env

# Edit .env with your settings:
# - DATABASE_URL
# - JWT_SECRET
# - SOLANA_RPC_URL
# etc.

# Generate Prisma client
pnpm prisma:gen
```

### 4. Run in Development

```bash
# Terminal 1: Server
pnpm dev:server

# Terminal 2: UI
pnpm dev:ui
```

### 5. Access

- **UI**: http://localhost:3000
- **Server API**: http://localhost:8788
- **API Docs**: http://localhost:8788/documentation (if configured)

## For Existing Developers

If you previously worked with separate repos:

### Old Workflow
```bash
# Clone three repos
git clone <sdk-repo>
git clone <server-repo>
git clone <ui-repo>

# Build SDK
cd cipherpay-sdk && npm install && npm run build

# Run server
cd cipherpay-server && npm install && npm run dev

# Run UI
cd cipherpay-ui && npm install && npm run dev
```

### New Workflow
```bash
# Clone one repo
git clone <monorepo-url> cipherpay-app
cd cipherpay-app

# Install and build
pnpm install
pnpm build

# Run
pnpm dev:server  # Terminal 1
pnpm dev:ui      # Terminal 2
```

## Common Tasks

### Build Everything
```bash
pnpm build
```

### Build Specific Package
```bash
pnpm build:sdk
pnpm build:server
pnpm build:ui
```

### Run Tests (when available)
```bash
pnpm test
```

### Clean Everything
```bash
pnpm clean
```

### Update Dependencies
```bash
pnpm update -r
```

### Add Package to SDK
```bash
cd packages/sdk
pnpm add <package-name>
```

### Add Package to Server
```bash
cd packages/server
pnpm add <package-name>
```

### Database Migrations
```bash
pnpm prisma:gen   # Generate Prisma client
pnpm prisma:pull  # Pull schema from DB
```

## Development Tips

### 1. SDK Changes
When you modify the SDK:
```bash
# Rebuild SDK
pnpm build:sdk

# Server/UI will automatically use the updated version
```

### 2. Parallel Development
You can work on all three packages simultaneously:
- Change SDK code
- Change server code that uses SDK
- Change UI code that uses SDK
- Commit all changes atomically

### 3. TypeScript
All packages share the base TypeScript config:
- Edit `tsconfig.base.json` for shared settings
- Each package has its own `tsconfig.json` that extends the base

### 4. Debugging
To debug server with SDK source:
```bash
# Server will use SDK source maps
pnpm dev:server
```

## Project Structure

```
cipherpay-app/
├── packages/
│   ├── sdk/              # Core SDK
│   │   ├── src/
│   │   ├── dist/         # Built output
│   │   └── package.json
│   ├── server/           # Backend API
│   │   ├── src/
│   │   ├── prisma/
│   │   └── package.json
│   └── ui/               # Frontend
│       ├── src/
│       ├── public/
│       └── package.json
├── package.json          # Root package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Troubleshooting

### SDK not found
```bash
# Rebuild SDK
pnpm build:sdk

# Reinstall dependencies
pnpm install
```

### Port conflicts
- Server: Default 8788, change in `.env`
- UI: Default 3000, change in `vite.config.js`

### Database connection errors
1. Check MySQL is running
2. Verify DATABASE_URL in `packages/server/.env`
3. Run `pnpm prisma:gen`

### Build errors
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

## Getting Help

- Check package-specific READMEs in `packages/*/README.md`
- Review migration docs in `MIGRATION_PLAN.md`
- Check external dependency updates in `UPDATE_EXTERNAL_DEPS.md`
