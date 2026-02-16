#!/bin/bash

set -e  # Exit on error

echo "🚀 Starting CipherPay App monorepo migration..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}Step 1: Checking source directories...${NC}"
if [ ! -d "$PARENT_DIR/cipherpay-sdk" ]; then
    echo "❌ Error: cipherpay-sdk not found at $PARENT_DIR/cipherpay-sdk"
    exit 1
fi
if [ ! -d "$PARENT_DIR/cipherpay-server" ]; then
    echo "❌ Error: cipherpay-server not found at $PARENT_DIR/cipherpay-server"
    exit 1
fi
if [ ! -d "$PARENT_DIR/cipherpay-ui" ]; then
    echo "❌ Error: cipherpay-ui not found at $PARENT_DIR/cipherpay-ui"
    exit 1
fi
echo -e "${GREEN}✓ All source directories found${NC}"
echo ""

echo -e "${BLUE}Step 2: Copying packages...${NC}"

# Copy SDK
echo "  Copying SDK..."
cp -r "$PARENT_DIR/cipherpay-sdk"/* "$SCRIPT_DIR/packages/sdk/" 2>/dev/null || true
cp -r "$PARENT_DIR/cipherpay-sdk"/.* "$SCRIPT_DIR/packages/sdk/" 2>/dev/null || true
rm -f "$SCRIPT_DIR/packages/sdk/.git" 2>/dev/null || true

# Copy Server
echo "  Copying Server..."
cp -r "$PARENT_DIR/cipherpay-server"/* "$SCRIPT_DIR/packages/server/" 2>/dev/null || true
cp -r "$PARENT_DIR/cipherpay-server"/.* "$SCRIPT_DIR/packages/server/" 2>/dev/null || true
rm -f "$SCRIPT_DIR/packages/server/.git" 2>/dev/null || true

# Copy UI
echo "  Copying UI..."
cp -r "$PARENT_DIR/cipherpay-ui"/* "$SCRIPT_DIR/packages/ui/" 2>/dev/null || true
cp -r "$PARENT_DIR/cipherpay-ui"/.* "$SCRIPT_DIR/packages/ui/" 2>/dev/null || true
rm -f "$SCRIPT_DIR/packages/ui/.git" 2>/dev/null || true

echo -e "${GREEN}✓ Packages copied${NC}"
echo ""

echo -e "${BLUE}Step 3: Updating package.json files...${NC}"

# Update SDK package.json
cd "$SCRIPT_DIR/packages/sdk"
if [ -f "package.json" ]; then
    # Update name to @cipherpay/sdk
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.name = '@cipherpay/sdk';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo -e "  ${GREEN}✓ Updated SDK package.json${NC}"
fi

# Update Server package.json
cd "$SCRIPT_DIR/packages/server"
if [ -f "package.json" ]; then
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.name = '@cipherpay/server';
    // Update SDK dependency to workspace
    if (pkg.dependencies && pkg.dependencies['cipherpay-sdk']) {
        pkg.dependencies['@cipherpay/sdk'] = 'workspace:*';
        delete pkg.dependencies['cipherpay-sdk'];
    }
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo -e "  ${GREEN}✓ Updated Server package.json${NC}"
fi

# Update UI package.json
cd "$SCRIPT_DIR/packages/ui"
if [ -f "package.json" ]; then
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.name = '@cipherpay/ui';
    // Update SDK dependency to workspace
    if (pkg.dependencies && pkg.dependencies['@cipherpay/sdk']) {
        pkg.dependencies['@cipherpay/sdk'] = 'workspace:*';
    }
    // Update postinstall script
    if (pkg.scripts && pkg.scripts.postinstall) {
        pkg.scripts.postinstall = pkg.scripts.postinstall.replace('../cipherpay-sdk', '../sdk');
    }
    // Update browser field
    if (pkg.browser && pkg.browser['@cipherpay/sdk']) {
        pkg.browser['@cipherpay/sdk'] = '@cipherpay/sdk/dist/browser/cipherpay-sdk.browser.js';
    }
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo -e "  ${GREEN}✓ Updated UI package.json${NC}"
fi

cd "$SCRIPT_DIR"
echo ""

echo -e "${BLUE}Step 4: Updating TypeScript configs...${NC}"

# Update SDK tsconfig
cd "$SCRIPT_DIR/packages/sdk"
if [ -f "tsconfig.json" ]; then
    node -e "
    const fs = require('fs');
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    tsconfig.extends = '../../tsconfig.base.json';
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.outDir = './dist';
    tsconfig.compilerOptions.rootDir = './src';
    fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2) + '\n');
    "
    echo -e "  ${GREEN}✓ Updated SDK tsconfig.json${NC}"
fi

# Update Server tsconfig
cd "$SCRIPT_DIR/packages/server"
if [ -f "tsconfig.json" ]; then
    node -e "
    const fs = require('fs');
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    tsconfig.extends = '../../tsconfig.base.json';
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.outDir = './dist';
    tsconfig.compilerOptions.rootDir = './src';
    fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2) + '\n');
    "
    echo -e "  ${GREEN}✓ Updated Server tsconfig.json${NC}"
fi

cd "$SCRIPT_DIR"
echo ""

echo -e "${BLUE}Step 5: Installing dependencies...${NC}"
pnpm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${BLUE}Step 6: Building packages...${NC}"
echo "  Building SDK..."
pnpm build:sdk
echo "  Building Server..."
pnpm build:server
echo "  Building UI..."
pnpm build:ui
echo -e "${GREEN}✓ All packages built successfully${NC}"
echo ""

echo -e "${GREEN}✅ Migration complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test the packages: pnpm dev:server and pnpm dev:ui"
echo "  2. Update external dependencies (cipherpay-circuits, cipherpay-zkaudit)"
echo "  3. Archive or remove old directories: cipherpay-sdk, cipherpay-server, cipherpay-ui"
echo ""
echo -e "${YELLOW}Commands you can run:${NC}"
echo "  pnpm build           - Build all packages"
echo "  pnpm dev:server      - Run server in dev mode"
echo "  pnpm dev:ui          - Run UI in dev mode"
echo "  pnpm build:sdk       - Build SDK only"
echo ""
