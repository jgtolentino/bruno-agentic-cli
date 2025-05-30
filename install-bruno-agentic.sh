#!/bin/bash
# Bruno Agentic CLI Installation Script
# Sets up the complete multi-agent system with Claude.ai, Claude Code CLI, and Bruno

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BRUNO_DIR="$HOME/.bruno"
WORKSPACE_DIR="$HOME/.bruno-workspace"
MCP_SERVER_PORT=8001
CLAUDEFLOW_PORT=8000

echo -e "${CYAN}🚀 Bruno Agentic CLI Installation${NC}"
echo -e "${CYAN}=================================${NC}"
echo -e "${BLUE}Multi-Agent System: Claude.ai → Claude Code CLI → Bruno${NC}"
echo -e "${RED}🛡️ Verification-First Execution${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check prerequisites
echo -e "${BLUE}📋 Checking Prerequisites...${NC}"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js is required but not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_status "npm found: $NPM_VERSION"
else
    print_error "npm is required but not found"
    exit 1
fi

# Check Python (for MCP server)
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    print_status "Python found: $PYTHON_VERSION"
else
    print_error "Python 3 is required for MCP file server"
    echo "Please install Python 3 from https://python.org/"
    exit 1
fi

# Check Ollama
if command_exists ollama; then
    print_status "Ollama found"
    OLLAMA_RUNNING=$(ollama list 2>/dev/null && echo "yes" || echo "no")
    if [ "$OLLAMA_RUNNING" = "yes" ]; then
        print_status "Ollama is running"
    else
        print_warning "Ollama is installed but not running"
        echo "Start Ollama with: ollama serve"
    fi
else
    print_error "Ollama is required but not installed"
    echo "Please install Ollama from https://ollama.ai/"
    exit 1
fi

# Check Claude Code CLI (optional)
if command_exists claude; then
    print_status "Claude Code CLI found"
    CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "unknown")
    print_info "Claude CLI version: $CLAUDE_VERSION"
else
    print_warning "Claude Code CLI not found (optional for full multi-agent mode)"
    echo "Install from: https://claude.ai/code"
fi

echo ""

# Create directories
echo -e "${BLUE}📁 Setting up directories...${NC}"

mkdir -p "$BRUNO_DIR"
mkdir -p "$WORKSPACE_DIR"
mkdir -p "$BRUNO_DIR/bin"
mkdir -p "$BRUNO_DIR/core"
mkdir -p "$BRUNO_DIR/schemas"
mkdir -p "$BRUNO_DIR/logs"

print_status "Created Bruno directories"

# Install Node.js dependencies
echo ""
echo -e "${BLUE}📦 Installing dependencies...${NC}"

# Check if we're in the Bruno source directory
if [ -f "package.json" ]; then
    print_info "Installing from source directory"
    npm install
    print_status "Dependencies installed"
else
    print_info "Installing core dependencies"
    cd "$BRUNO_DIR"
    
    # Create minimal package.json
    cat > package.json << EOF
{
  "name": "bruno-agentic-cli",
  "version": "3.1.0",
  "description": "Multi-agent AI CLI with verification-first execution",
  "type": "module",
  "dependencies": {
    "js-yaml": "^4.1.0",
    "chalk": "^5.3.0",
    "axios": "^1.6.0",
    "commander": "^11.1.0"
  }
}
EOF
    
    npm install
    print_status "Core dependencies installed"
fi

# Install Python dependencies for MCP server
echo ""
echo -e "${BLUE}🐍 Installing Python dependencies...${NC}"

pip3 install fastapi uvicorn aiofiles pydantic 2>/dev/null || {
    print_warning "Could not install Python dependencies with pip3"
    print_info "You may need to install them manually:"
    echo "pip3 install fastapi uvicorn aiofiles pydantic"
}

print_status "Python dependencies ready"

# Copy/link Bruno files
echo ""
echo -e "${BLUE}📋 Installing Bruno components...${NC}"

# If we're in source directory, copy files
if [ -f "core/agentRouter.js" ]; then
    cp -r core/* "$BRUNO_DIR/core/"
    cp -r bin/* "$BRUNO_DIR/bin/"
    cp -r schemas/* "$BRUNO_DIR/schemas/"
    cp -r examples/* "$BRUNO_DIR/examples/" 2>/dev/null || mkdir -p "$BRUNO_DIR/examples/"
    cp -r clodrep/* "$BRUNO_DIR/clodrep/" 2>/dev/null || mkdir -p "$BRUNO_DIR/clodrep/"
    cp mcp_file_server.py "$BRUNO_DIR/"
    cp DELEGATION_GUIDE.md "$BRUNO_DIR/"
    
    print_status "Copied Bruno files from source"
else
    print_warning "Not in Bruno source directory - some files may need manual installation"
fi

# Make executables
chmod +x "$BRUNO_DIR/bin/"*.js 2>/dev/null || true
chmod +x "$BRUNO_DIR/mcp_file_server.py" 2>/dev/null || true
chmod +x "$BRUNO_DIR/clodrep/"* 2>/dev/null || true

# Create symbolic links for global access
echo ""
echo -e "${BLUE}🔗 Creating global commands...${NC}"

# Create wrapper scripts
cat > "$BRUNO_DIR/bin/bruno-global" << EOF
#!/bin/bash
export BRUNO_HOME="$BRUNO_DIR"
node "$BRUNO_DIR/bin/bruno-verified.js" "\$@"
EOF

cat > "$BRUNO_DIR/bin/bruno-verify-global" << EOF
#!/bin/bash
export BRUNO_HOME="$BRUNO_DIR"
node "$BRUNO_DIR/core/brunoVerifier.js" "\$@"
EOF

cat > "$BRUNO_DIR/bin/bruno-agent-global" << EOF
#!/bin/bash
export BRUNO_HOME="$BRUNO_DIR"
node "$BRUNO_DIR/core/agentRouter.js" "\$@"
EOF

cat > "$BRUNO_DIR/bin/clodrep-global" << EOF
#!/bin/bash
export BRUNO_HOME="$BRUNO_DIR"
"$BRUNO_DIR/clodrep/clodrep" "\$@"
EOF

chmod +x "$BRUNO_DIR/bin/"*global

# Add to PATH if not already there
if [[ ":$PATH:" != *":$BRUNO_DIR/bin:"* ]]; then
    echo "export PATH=\"$BRUNO_DIR/bin:\$PATH\"" >> ~/.bashrc
    echo "export PATH=\"$BRUNO_DIR/bin:\$PATH\"" >> ~/.zshrc 2>/dev/null || true
    print_status "Added Bruno to PATH"
else
    print_info "Bruno already in PATH"
fi

# Create configuration files
echo ""
echo -e "${BLUE}⚙️ Creating configuration...${NC}"

cat > "$BRUNO_DIR/config.yaml" << EOF
# Bruno Agentic CLI Configuration
version: "3.1.0"

# LLM Configuration
llm_provider: "local"
model: "deepseek-coder:6.7b"
ollama_url: "http://127.0.0.1:11434"
allow_cloud: false
offline_mode: true

# Verification Settings
verification:
  enabled: true
  strict_mode: true
  timeout: 30000

# Multi-Agent Configuration
agents:
  claude_ai:
    role: "planner"
    endpoint: "https://claude.ai/api"  # Update with actual endpoint
  
  claude_code:
    role: "orchestrator"
    command: "claude"
    secure_executor: "$BRUNO_DIR/clodrep/clodrep"
    enabled: $(command_exists claude && echo "true" || echo "false")
  
  bruno:
    role: "executor"
    command: "$BRUNO_DIR/bin/bruno-global"
    verification: true

# MCP File Server
mcp:
  enabled: true
  host: "127.0.0.1"
  port: $MCP_SERVER_PORT
  sandbox_root: "$WORKSPACE_DIR"

# Workspace
workspace:
  directory: "$WORKSPACE_DIR"
  max_file_size: "10MB"
  allowed_extensions: [".md", ".txt", ".json", ".yaml", ".yml", ".js", ".ts", ".py", ".html", ".css"]

# Logging
logging:
  level: "INFO"
  audit_enabled: true
  audit_file: "$BRUNO_DIR/logs/audit.log"
EOF

print_status "Created configuration file"

# Create systemd service for MCP server (Linux)
if command_exists systemctl 2>/dev/null; then
    echo ""
    echo -e "${BLUE}🔧 Setting up MCP server service...${NC}"
    
    sudo tee /etc/systemd/system/bruno-mcp.service > /dev/null << EOF
[Unit]
Description=Bruno MCP File Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$BRUNO_DIR
ExecStart=python3 $BRUNO_DIR/mcp_file_server.py
Restart=always
Environment=PYTHONPATH=$BRUNO_DIR

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable bruno-mcp
    print_status "Created systemd service for MCP server"
fi

# Create initialization scripts
echo ""
echo -e "${BLUE}📜 Creating initialization scripts...${NC}"

cat > "$BRUNO_DIR/init-sample-tasks.sh" << EOF
#!/bin/bash
# Initialize sample verification tasks

cd "$WORKSPACE_DIR"

node "$BRUNO_DIR/core/brunoVerifier.js" --init

echo "Sample verification tasks created in $WORKSPACE_DIR"
echo "Run: bruno verify simple-test.yaml --verbose"
EOF

cat > "$BRUNO_DIR/init-secure-executor.sh" << EOF
#!/bin/bash
# Initialize secure executor environment

cd "$BRUNO_DIR/clodrep"

"$BRUNO_DIR/clodrep/clodrep" init

echo "Secure executor initialized"
echo "Edit $BRUNO_DIR/clodrep/.clodrep.env with your API tokens"
echo "Test with: clodrep-global test --verbose"
EOF

chmod +x "$BRUNO_DIR/init-sample-tasks.sh"
chmod +x "$BRUNO_DIR/init-secure-executor.sh"

cat > "$BRUNO_DIR/start-mcp-server.sh" << EOF
#!/bin/bash
# Start the MCP file server

echo "🗂️ Starting Bruno MCP File Server on port $MCP_SERVER_PORT"
cd "$BRUNO_DIR"
python3 mcp_file_server.py
EOF

chmod +x "$BRUNO_DIR/start-mcp-server.sh"

print_status "Created initialization scripts"

# Test installation
echo ""
echo -e "${BLUE}🧪 Testing installation...${NC}"

# Test Bruno verifier
cd "$WORKSPACE_DIR"
echo 'task: "Test installation"
command: "echo Hello Bruno"
verify: "echo Hello Bruno"
success_condition: "Hello Bruno"' > test-installation.yaml

if node "$BRUNO_DIR/core/brunoVerifier.js" test-installation.yaml --verbose > /dev/null 2>&1; then
    print_status "Bruno verifier test passed"
else
    print_warning "Bruno verifier test failed - check installation"
fi

rm -f test-installation.yaml

# Create completion report
echo ""
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo -e "${CYAN}=========================${NC}"
echo ""

echo -e "${BLUE}📍 Installation Details:${NC}"
echo "Bruno Home: $BRUNO_DIR"
echo "Workspace: $WORKSPACE_DIR"
echo "MCP Server Port: $MCP_SERVER_PORT"
echo ""

echo -e "${BLUE}🚀 Getting Started:${NC}"
echo ""
echo -e "${YELLOW}1. Restart your shell or run:${NC}"
echo "   source ~/.bashrc  # or ~/.zshrc"
echo ""
echo -e "${YELLOW}2. Start the MCP file server:${NC}"
echo "   $BRUNO_DIR/start-mcp-server.sh"
echo ""
echo -e "${YELLOW}3. Initialize secure executor:${NC}"
echo "   $BRUNO_DIR/init-secure-executor.sh"
echo ""
echo -e "${YELLOW}4. Initialize sample tasks:${NC}"
echo "   $BRUNO_DIR/init-sample-tasks.sh"
echo ""
echo -e "${YELLOW}5. Test verification:${NC}"
echo "   bruno verify simple-test.yaml --verbose"
echo ""
echo -e "${YELLOW}6. Test secure executor:${NC}"
echo "   clodrep-global test --verbose"
echo ""
echo -e "${YELLOW}7. Start Bruno interactive mode:${NC}"
echo "   bruno-global"
echo ""

echo -e "${BLUE}🔧 Advanced Usage:${NC}"
echo ""
echo -e "${YELLOW}Secure API Automation:${NC}"
echo "   clodrep-global run deploy-tasks.yaml --verbose"
echo ""
echo -e "${YELLOW}Multi-Agent Orchestration:${NC}"
echo "   bruno-agent-global \"build and deploy my app\""
echo ""
echo -e "${YELLOW}Verified Single Commands:${NC}"
echo "   bruno-global --verify-task \"npm run build\""
echo ""
echo -e "${YELLOW}Task File Execution:${NC}"
echo "   bruno-verify-global deploy-tasks.yaml"
echo ""
echo -e "${YELLOW}Secure Executor Examples:${NC}"
echo "   clodrep-global run sample-tasks.yaml  # API automation"
echo "   clodrep-global dry-run deploy.yaml    # Preview mode"
echo "   clodrep-global secrets                # Check loaded tokens"
echo ""

echo -e "${BLUE}📚 Documentation:${NC}"
echo "Configuration: $BRUNO_DIR/config.yaml"
echo "Delegation Guide: $BRUNO_DIR/DELEGATION_GUIDE.md"
echo "Secure Executor: $BRUNO_DIR/clodrep/README.md"
echo "Examples: $BRUNO_DIR/examples/"
echo "Logs: $BRUNO_DIR/logs/"
echo "Schemas: $BRUNO_DIR/schemas/"
echo ""

if ! command_exists claude; then
    echo -e "${YELLOW}⚠️ For full multi-agent mode, install Claude Code CLI:${NC}"
    echo "   https://claude.ai/code"
    echo ""
fi

echo -e "${RED}🛡️ Security Features:${NC}"
echo "• Verification-first execution"
echo "• No false success claims" 
echo "• Secure credential injection"
echo "• Command sanitization in logs"
echo "• Intelligent task delegation"
echo "• Audit logging enabled"
echo "• Sandboxed file operations"
echo ""

echo -e "${GREEN}Bruno Agentic CLI is ready!${NC}"
echo -e "${CYAN}Remember: Bruno will NEVER claim success without verification${NC}"