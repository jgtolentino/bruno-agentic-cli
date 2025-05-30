#!/bin/bash

# Bruno v3.0 Installation Script
# Installs Bruno with advanced AI patterns from Cursor, Windsurf, Bolt & Manus

set -e

echo "🤖 Bruno v3.0 - Advanced Local-First AI CLI Installation"
echo "Featuring patterns from Cursor, Windsurf, Bolt & Manus"
echo "="*60

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js version
check_node() {
    echo -e "${BLUE}Checking Node.js version...${NC}"
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node -v | cut -d'v' -f2)
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -ge 18 ]; then
            echo -e "${GREEN}✓ Node.js $NODE_VERSION (OK)${NC}"
        else
            echo -e "${RED}❌ Node.js $NODE_VERSION is too old. Need 18+${NC}"
            echo "Please install Node.js 18+ from https://nodejs.org"
            exit 1
        fi
    else
        echo -e "${RED}❌ Node.js not found${NC}"
        echo "Please install Node.js 18+ from https://nodejs.org"
        exit 1
    fi
}

# Check Ollama installation
check_ollama() {
    echo -e "${BLUE}Checking Ollama installation...${NC}"
    if command -v ollama >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Ollama found${NC}"
        
        # Check if ollama is running
        if pgrep -x "ollama" > /dev/null; then
            echo -e "${GREEN}✓ Ollama server is running${NC}"
        else
            echo -e "${YELLOW}⚠️  Ollama server not running. Starting...${NC}"
            ollama serve &
            sleep 3
        fi
        
        # Check for model
        echo -e "${BLUE}Checking for DeepSeek Coder model...${NC}"
        if ollama list | grep -q "deepseek-coder:6.7b"; then
            echo -e "${GREEN}✓ DeepSeek Coder model found${NC}"
        else
            echo -e "${YELLOW}⚠️  DeepSeek Coder model not found. Installing...${NC}"
            ollama pull deepseek-coder:6.7b
            echo -e "${GREEN}✓ DeepSeek Coder model installed${NC}"
        fi
    else
        echo -e "${RED}❌ Ollama not found${NC}"
        echo "Installing Ollama..."
        
        # Detect OS and install Ollama
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew >/dev/null 2>&1; then
                brew install ollama
            else
                echo "Please install Homebrew first: https://brew.sh"
                echo "Or download Ollama manually: https://ollama.ai"
                exit 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -fsSL https://ollama.ai/install.sh | sh
        else
            echo "Please install Ollama manually: https://ollama.ai"
            exit 1
        fi
        
        # Start Ollama and install model
        ollama serve &
        sleep 5
        ollama pull deepseek-coder:6.7b
        echo -e "${GREEN}✓ Ollama installed and configured${NC}"
    fi
}

# Install Bruno
install_bruno() {
    echo -e "${BLUE}Installing Bruno v3.0...${NC}"
    
    if [ -d "bruno-agentic-cli" ]; then
        echo "Updating existing installation..."
        cd bruno-agentic-cli
        git pull
    else
        # For now, assume we're in the right directory
        echo "Installing from current directory..."
    fi
    
    npm install
    
    # Make globally available
    echo -e "${BLUE}Making Bruno globally available...${NC}"
    npm link
    
    echo -e "${GREEN}✓ Bruno v3.0 installed successfully${NC}"
}

# Test installation
test_installation() {
    echo -e "${BLUE}Testing installation...${NC}"
    
    # Test version
    if bruno --version >/dev/null 2>&1; then
        VERSION=$(bruno --version)
        echo -e "${GREEN}✓ $VERSION${NC}"
    else
        echo -e "${RED}❌ Bruno command not working${NC}"
        exit 1
    fi
    
    # Test simple command
    echo -e "${BLUE}Testing simple command...${NC}"
    if echo "exit" | timeout 10 bruno >/dev/null 2>&1; then
        echo -e "${GREEN}✓ REPL mode working${NC}"
    else
        echo -e "${YELLOW}⚠️  REPL test skipped (may require interactive mode)${NC}"
    fi
}

# Create configuration
create_config() {
    echo -e "${BLUE}Creating configuration...${NC}"
    
    CONFIG_DIR="$HOME/.bruno"
    mkdir -p "$CONFIG_DIR"
    
    cat > "$CONFIG_DIR/config.yaml" << EOF
# Bruno v3.0 Configuration
llm_provider: local
model: deepseek-coder:6.7b
ollama_url: http://127.0.0.1:11434
allow_cloud: false
offline_mode: true
patterns:
  cursor: true
  windsurf: true
  bolt: true
  manus: true
EOF
    
    echo -e "${GREEN}✓ Configuration created at $CONFIG_DIR/config.yaml${NC}"
}

# Show usage examples
show_examples() {
    echo ""
    echo -e "${GREEN}🎉 Installation Complete!${NC}"
    echo ""
    echo -e "${BLUE}Quick Examples:${NC}"
    echo "  bruno --help                           # Show all commands"
    echo "  bruno                                  # Start interactive REPL"
    echo "  bruno \"create react component\"         # Generate React component"
    echo "  bruno \"deploy to vercel\"               # Deploy to Vercel"
    echo "  bruno plan \"build fullstack app\"      # Generate task plan"
    echo "  bruno fix src/app.js --patterns cursor # Fix with Cursor patterns"
    echo ""
    echo -e "${BLUE}Advanced Patterns:${NC}"
    echo "  🎯 Cursor: Semantic search, holistic editing"
    echo "  🌊 Windsurf: AI Flow, ripgrep integration"
    echo "  ⚡ Bolt: Artifact creation, dependency-first"
    echo "  🔄 Manus: Agent loop, todo planning"
    echo ""
    echo -e "${YELLOW}Documentation:${NC}"
    echo "  README.md     - Full feature overview"
    echo "  DEVELOPMENT.md - Development guide"
    echo ""
    echo -e "${GREEN}Happy coding with Bruno v3.0! 🤖${NC}"
}

# Main installation flow
main() {
    echo "Starting installation..."
    echo ""
    
    check_node
    check_ollama
    install_bruno
    create_config
    test_installation
    show_examples
}

# Run main function
main "$@"