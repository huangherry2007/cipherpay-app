#!/bin/bash

# CipherPay Local Testing Setup Script
# This script helps set up the local end-to-end testing environment

set -e

echo "🚀 Starting CipherPay Local Testing Environment"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Solana CLI is installed
    if ! command -v solana &> /dev/null; then
        print_error "Solana CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install it first."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Check if ports are available
check_ports() {
    print_status "Checking if required ports are available..."
    
    local ports=(8899 3000 3001)
    
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Port $port is already in use. Please stop the service using this port."
        else
            print_success "Port $port is available"
        fi
    done
}

# Create local environment file
create_env_file() {
    print_status "Creating local environment configuration..."
    
    if [ ! -f .env.local ]; then
        cat > .env.local << EOF
# Port Configuration (IMPORTANT: Set UI port to avoid conflicts)
PORT=3001

# Local Development Configuration
REACT_APP_USE_REAL_SDK=true
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
REACT_APP_ENABLE_COMPLIANCE=true
REACT_APP_ENABLE_STEALTH_ADDRESSES=true
REACT_APP_ENABLE_CACHING=true
EOF
        print_success "Created .env.local file"
    else
        print_warning ".env.local already exists. Checking configuration..."
        validate_env_file
    fi
}

# Validate and update existing .env.local file
validate_env_file() {
    local needs_update=false
    
    # Check for required configurations
    if ! grep -q "^PORT=3001" .env.local; then
        print_warning "PORT=3001 not found in .env.local"
        needs_update=true
    fi
    
    if ! grep -q "^REACT_APP_USE_REAL_SDK=true" .env.local; then
        print_warning "REACT_APP_USE_REAL_SDK=true not found in .env.local"
        needs_update=true
    fi
    
    if ! grep -q "^REACT_APP_RPC_URL=http://127.0.0.1:8899" .env.local; then
        print_warning "Local RPC URL not found in .env.local"
        needs_update=true
    fi
    
    if ! grep -q "^REACT_APP_RELAYER_URL=http://localhost:3000" .env.local; then
        print_warning "Local relayer URL not found in .env.local"
        needs_update=true
    fi
    
    if [ "$needs_update" = true ]; then
        print_warning "Current .env.local needs updates for local testing"
        print_status "Backing up current .env.local to .env.local.backup"
        cp .env.local .env.local.backup
        
        print_status "Creating updated .env.local with local testing configuration"
        cat > .env.local << EOF
# Port Configuration (IMPORTANT: Set UI port to avoid conflicts)
PORT=3001

# Local Development Configuration
REACT_APP_USE_REAL_SDK=true
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
REACT_APP_ENABLE_COMPLIANCE=true
REACT_APP_ENABLE_STEALTH_ADDRESSES=true
REACT_APP_ENABLE_CACHING=true
EOF
        print_success "Updated .env.local file for local testing"
    else
        print_success ".env.local is properly configured for local testing"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install UI dependencies
    if [ -f package.json ]; then
        echo "Installing UI dependencies..."
        npm install
        print_success "UI dependencies installed"
    fi
    
    # Install relayer dependencies
    if [ -d "../cipherpay-relayer-solana" ]; then
        cd ../cipherpay-relayer-solana
        npm install
        cd ../cipherpay-ui
        print_success "Relayer dependencies installed"
    else
        print_warning "Relayer directory not found. Please install dependencies manually."
    fi
}

# Start services
start_services() {
    print_status "Starting services..."
    
    echo ""
    echo "📋 Manual Steps Required:"
    echo "========================"
    echo ""
    echo "1. Start Solana Test Validator (Terminal 1):"
    echo "   solana-test-validator"
    echo ""
    echo "2. Start Relayer Service (Terminal 2):"
    echo "   cd ../cipherpay-relayer-solana"
    echo "   npm run dev"
    echo ""
    echo "3. Start UI Application (Terminal 3):"
    echo "   npm start"
    echo ""
    echo "4. Verify Services:"
    echo "   - Solana: http://127.0.0.1:8899"
    echo "   - Relayer: http://localhost:3000/health"
    echo "   - UI: http://localhost:3001"
    echo ""
}

# Main execution
main() {
    echo "Starting CipherPay Local Testing Setup..."
    echo ""
    
    check_prerequisites
    check_ports
    create_env_file
    install_dependencies
    start_services
    
    echo ""
    print_success "Setup complete! Follow the manual steps above to start the services."
    echo ""
    echo "📚 For more information, see: COMMUNICATION_CONFIG.md"
    echo ""
}

# Run main function
main "$@" 