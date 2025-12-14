#!/usr/bin/env bash

# Complete setup and build script for Obsidian Publisher with Web UI
# Supports: Linux, macOS, Windows (Git Bash)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    fi
    print_success "$1 found"
}

# Main setup
main() {
    print_header "Obsidian Publisher - Setup & Build"

    # Check prerequisites
    print_header "Checking Prerequisites"
    
    if ! check_command node; then
        echo -e "${RED}Please install Node.js from https://nodejs.org${NC}"
        exit 1
    fi

    if ! check_command pnpm; then
        print_warning "pnpm not found, installing..."
        npm install -g pnpm
    fi

    if ! check_command cargo; then
        print_warning "Rust not found. Install from https://rustup.rs/"
        echo "Continuing with frontend setup only..."
        SKIP_RUST=true
    fi

    # Frontend setup
    print_header "Setting up Frontend"
    
    cd server/webui
    print_success "Changed to webui directory"

    print_warning "Installing dependencies..."
    pnpm install
    print_success "Dependencies installed"

    print_warning "Building frontend..."
    pnpm build
    print_success "Frontend built successfully"

    cd ../..
    print_success "Changed back to project root"

    # Rust setup (optional)
    if [ "$SKIP_RUST" != "true" ]; then
        print_header "Building Rust Backend"
        
        cd server
        print_warning "Building Rust server..."
        cargo build --release
        print_success "Rust backend built successfully"
        
        cd ..
    fi

    # Success message
    print_header "✨ Setup Complete!"

    echo "🚀 Ready to use! Next steps:"
    echo ""
    
    if [ "$SKIP_RUST" != "true" ]; then
        echo "  Option 1 - Full Stack:"
        echo "    $ cd server"
        echo "    $ ./target/release/obsidian-publisher-server"
        echo "    $ open http://localhost:8080/webui/"
        echo ""
    fi
    
    echo "  Option 2 - Frontend Development (with mock API):"
    echo "    Terminal 1:"
    echo "    $ cd server/webui"
    echo "    $ node build/mock-api-server.mjs"
    echo ""
    echo "    Terminal 2:"
    echo "    $ cd server/webui"
    echo "    $ pnpm dev"
    echo "    $ open http://localhost:3000/"
    echo ""
    
    echo "📝 Test Credentials (mock API):"
    echo "    Username: admin"
    echo "    Password: password123"
    echo ""
    
    echo "📚 Documentation:"
    echo "    - Frontend: server/webui/README.md"
    echo "    - Integration: server/FRONTEND_INTEGRATION.md"
    echo "    - Summary: FRONTEND_SUMMARY.md"
    echo "    - Troubleshooting: FRONTEND_TROUBLESHOOTING.md"
    echo ""
}

# Run main
main
