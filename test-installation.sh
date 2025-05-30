#!/bin/bash
# Test Bruno Agentic CLI Installation
# Validates all components are properly installed and working

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

BRUNO_DIR="$HOME/.bruno"
WORKSPACE_DIR="$HOME/.bruno-workspace"

echo -e "${CYAN}🧪 Bruno Agentic CLI Installation Test${NC}"
echo -e "${CYAN}====================================${NC}"
echo ""

# Test functions
test_pass() {
    echo -e "${GREEN}✅ PASS${NC} - $1"
}

test_fail() {
    echo -e "${RED}❌ FAIL${NC} - $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

test_warn() {
    echo -e "${YELLOW}⚠️ WARN${NC} - $1"
}

test_info() {
    echo -e "${BLUE}ℹ️ INFO${NC} - $1"
}

FAILED_TESTS=0

# Test 1: Directory structure
echo -e "${BLUE}📁 Testing directory structure...${NC}"

if [ -d "$BRUNO_DIR" ]; then
    test_pass "Bruno directory exists: $BRUNO_DIR"
else
    test_fail "Bruno directory missing: $BRUNO_DIR"
fi

if [ -d "$WORKSPACE_DIR" ]; then
    test_pass "Workspace directory exists: $WORKSPACE_DIR"
else
    test_fail "Workspace directory missing: $WORKSPACE_DIR"
fi

# Test required subdirectories
for dir in "core" "bin" "schemas" "examples" "clodrep" "logs"; do
    if [ -d "$BRUNO_DIR/$dir" ]; then
        test_pass "Directory exists: $dir"
    else
        test_fail "Directory missing: $dir"
    fi
done

echo ""

# Test 2: Core files
echo -e "${BLUE}📋 Testing core files...${NC}"

core_files=(
    "core/agentRouter.js"
    "core/brunoVerifier.js"
    "core/brunoDelegator.js"
    "core/brunoTaskRunner.js"
    "bin/bruno-verified.js"
    "schemas/plan-schema.yaml"
    "mcp_file_server.py"
    "DELEGATION_GUIDE.md"
)

for file in "${core_files[@]}"; do
    if [ -f "$BRUNO_DIR/$file" ]; then
        test_pass "Core file exists: $file"
    else
        test_fail "Core file missing: $file"
    fi
done

echo ""

# Test 3: Secure executor files
echo -e "${BLUE}🔐 Testing secure executor...${NC}"

clodrep_files=(
    "clodrep/secure_executor.js"
    "clodrep/clodrep"
    "clodrep/.clodrep.env.example"
    "clodrep/sample-tasks.yaml"
    "clodrep/test-tasks.yaml"
    "clodrep/README.md"
)

for file in "${clodrep_files[@]}"; do
    if [ -f "$BRUNO_DIR/$file" ]; then
        test_pass "Secure executor file exists: $file"
    else
        test_fail "Secure executor file missing: $file"
    fi
done

echo ""

# Test 4: Executable permissions
echo -e "${BLUE}🔧 Testing executable permissions...${NC}"

executables=(
    "bin/bruno-verified.js"
    "bin/bruno-global"
    "bin/bruno-verify-global"
    "bin/bruno-agent-global"
    "bin/clodrep-global"
    "clodrep/secure_executor.js"
    "clodrep/clodrep"
    "mcp_file_server.py"
    "init-sample-tasks.sh"
    "init-secure-executor.sh"
    "start-mcp-server.sh"
)

for exe in "${executables[@]}"; do
    if [ -x "$BRUNO_DIR/$exe" ]; then
        test_pass "Executable: $exe"
    else
        test_fail "Not executable: $exe"
    fi
done

echo ""

# Test 5: Node.js dependencies
echo -e "${BLUE}📦 Testing Node.js dependencies...${NC}"

cd "$BRUNO_DIR"

required_deps=("js-yaml" "chalk" "axios" "commander")

if [ -f "package.json" ]; then
    test_pass "package.json exists"
    
    if [ -d "node_modules" ]; then
        test_pass "node_modules directory exists"
        
        for dep in "${required_deps[@]}"; do
            if [ -d "node_modules/$dep" ]; then
                test_pass "Dependency installed: $dep"
            else
                test_fail "Dependency missing: $dep"
            fi
        done
    else
        test_fail "node_modules directory missing"
    fi
else
    test_fail "package.json missing"
fi

echo ""

# Test 6: Configuration file
echo -e "${BLUE}⚙️ Testing configuration...${NC}"

if [ -f "$BRUNO_DIR/config.yaml" ]; then
    test_pass "Configuration file exists"
    
    # Check for key configuration sections
    if grep -q "verification:" "$BRUNO_DIR/config.yaml"; then
        test_pass "Verification config found"
    else
        test_fail "Verification config missing"
    fi
    
    if grep -q "agents:" "$BRUNO_DIR/config.yaml"; then
        test_pass "Agents config found"
    else
        test_fail "Agents config missing"
    fi
    
    if grep -q "mcp:" "$BRUNO_DIR/config.yaml"; then
        test_pass "MCP config found"
    else
        test_fail "MCP config missing"
    fi
else
    test_fail "Configuration file missing"
fi

echo ""

# Test 7: PATH integration
echo -e "${BLUE}🔗 Testing PATH integration...${NC}"

if [[ ":$PATH:" == *":$BRUNO_DIR/bin:"* ]]; then
    test_pass "Bruno bin directory in PATH"
else
    test_warn "Bruno bin directory not in PATH (restart shell or source ~/.bashrc)"
fi

# Test global commands
global_commands=("bruno-global" "bruno-verify-global" "bruno-agent-global" "clodrep-global")

for cmd in "${global_commands[@]}"; do
    if [ -x "$BRUNO_DIR/bin/$cmd" ]; then
        test_pass "Global command available: $cmd"
    else
        test_fail "Global command missing: $cmd"
    fi
done

echo ""

# Test 8: Prerequisites
echo -e "${BLUE}🔍 Testing prerequisites...${NC}"

if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    test_pass "Node.js found: $NODE_VERSION"
else
    test_fail "Node.js not found"
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    test_pass "npm found: $NPM_VERSION"
else
    test_fail "npm not found"
fi

if command -v python3 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version)
    test_pass "Python 3 found: $PYTHON_VERSION"
else
    test_fail "Python 3 not found"
fi

if command -v ollama >/dev/null 2>&1; then
    test_pass "Ollama found"
else
    test_warn "Ollama not found (required for Bruno AI)"
fi

if command -v claude >/dev/null 2>&1; then
    test_pass "Claude Code CLI found"
else
    test_warn "Claude Code CLI not found (optional for full multi-agent mode)"
fi

echo ""

# Test 9: Functional tests
echo -e "${BLUE}🧪 Running functional tests...${NC}"

# Test Bruno verifier
cd "$WORKSPACE_DIR"

cat > test-verification.yaml << EOF
- id: test-echo
  task: "Test echo command"
  command: "echo 'Hello Bruno'"
  verify: "echo 'Hello Bruno'"
  success_condition: "Hello Bruno"
EOF

if node "$BRUNO_DIR/core/brunoVerifier.js" test-verification.yaml > /dev/null 2>&1; then
    test_pass "Bruno verifier functional test"
else
    test_fail "Bruno verifier functional test"
fi

rm -f test-verification.yaml

# Test secure executor initialization
cd "$BRUNO_DIR/clodrep"

if [ -f ".clodrep.env.example" ]; then
    test_pass "Secure executor can initialize"
else
    test_fail "Secure executor initialization failed"
fi

echo ""

# Test 10: Example files
echo -e "${BLUE}📚 Testing example files...${NC}"

example_files=(
    "examples/delegation-examples.yaml"
    "examples/local-only-examples.yaml"
)

for file in "${example_files[@]}"; do
    if [ -f "$BRUNO_DIR/$file" ]; then
        test_pass "Example file exists: $file"
    else
        test_fail "Example file missing: $file"
    fi
done

echo ""

# Summary
echo -e "${CYAN}📊 Test Summary${NC}"
echo -e "${CYAN}=============${NC}"

TOTAL_TESTS=$(($(grep -c "test_pass\|test_fail" "$0") - 2))  # Approximate

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo -e "${GREEN}Bruno Agentic CLI installation is complete and functional!${NC}"
    echo ""
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo "1. Initialize secure executor: $BRUNO_DIR/init-secure-executor.sh"
    echo "2. Initialize sample tasks: $BRUNO_DIR/init-sample-tasks.sh"
    echo "3. Test verification: bruno-verify-global simple-test.yaml --verbose"
    echo "4. Test secure automation: clodrep-global test --verbose"
    echo ""
    exit 0
else
    echo -e "${RED}❌ $FAILED_TESTS TESTS FAILED${NC}"
    echo -e "${YELLOW}Installation may be incomplete. Please review failed tests above.${NC}"
    echo ""
    echo -e "${BLUE}💡 Common Issues:${NC}"
    echo "• Run the installation script again: ./install-bruno-agentic.sh"
    echo "• Check Node.js and Python 3 are installed"
    echo "• Ensure you're running from the Bruno source directory"
    echo "• Restart your shell after installation"
    echo ""
    exit 1
fi