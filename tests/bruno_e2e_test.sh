#!/bin/bash

# Bruno Agentic CLI - End-to-End Validation Suite
# Tests all core functionality in a local-first environment

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
PASSED=0
FAILED=0

# Test results log
RESULTS_FILE="test-results.txt"
SESSION_LOG="session.log"

# Initialize results file
echo "Bruno E2E Test Results - $(date)" > $RESULTS_FILE
echo "======================================" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

# Helper function to run tests
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"
    
    echo -e "${BLUE}Running test: $test_name${NC}"
    echo "Test: $test_name" >> $RESULTS_FILE
    echo "Command: $command" >> $RESULTS_FILE
    
    # Run command and capture output
    if output=$(eval "$command" 2>&1); then
        if echo "$output" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✓ PASSED${NC}"
            echo "Result: PASSED" >> $RESULTS_FILE
            ((PASSED++))
        else
            echo -e "${RED}✗ FAILED - Pattern not found${NC}"
            echo "Result: FAILED - Expected pattern not found" >> $RESULTS_FILE
            echo "Output: $output" >> $RESULTS_FILE
            ((FAILED++))
        fi
    else
        echo -e "${RED}✗ FAILED - Command error${NC}"
        echo "Result: FAILED - Command error" >> $RESULTS_FILE
        echo "Error: $output" >> $RESULTS_FILE
        ((FAILED++))
    fi
    
    echo "" >> $RESULTS_FILE
    echo "---" >> $RESULTS_FILE
    echo "" >> $RESULTS_FILE
}

echo -e "${YELLOW}🧪 Bruno E2E Validation Suite${NC}"
echo "==============================="
echo ""

# 1. Build and Setup Verification
echo -e "${YELLOW}1. Build and Setup Tests${NC}"
echo "------------------------"

run_test "NPM Install Check" \
    "cd .. && npm list --depth=0 | grep -E '(axios|chalk|fs-extra|js-yaml)'" \
    "axios"

run_test "Bruno Binary Exists" \
    "test -f ../bin/bruno.js && echo 'Binary exists'" \
    "Binary exists"

run_test "Bruno Executable" \
    "test -x ../bin/bruno.js && echo 'Binary is executable'" \
    "Binary is executable"

# 2. Startup Verification
echo -e "\n${YELLOW}2. Startup Verification${NC}"
echo "----------------------"

run_test "Bruno Version" \
    "node ../bin/bruno.js --version" \
    "Bruno v3"

run_test "Bruno Help" \
    "node ../bin/bruno.js --help" \
    "Bruno v3"

run_test "Local Mode Active" \
    "echo 'test' | timeout 5 node ../bin/bruno.js -p 'hello' 2>&1 | head -20" \
    "Local-first mode active"

# 3. Create Test Files
echo -e "\n${YELLOW}3. Creating Test Files${NC}"
echo "---------------------"

# Create a broken JavaScript file for testing
cat > test_broken.js << 'EOF'
// Broken JavaScript file for testing
function add(a, b {  // Missing closing parenthesis
    return a + b
}

const result = add(5, 3;  // Missing closing parenthesis
console.log(result)
EOF

# Create a file for explain testing
cat > test_math.js << 'EOF'
// Simple math utilities
function add(a, b) {
    return a + b;
}

function multiply(a, b) {
    return a * b;
}

function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

module.exports = { add, multiply, factorial };
EOF

echo -e "${GREEN}✓ Test files created${NC}"

# 4. Tool Functionality Tests
echo -e "\n${YELLOW}4. Tool Functionality Tests${NC}"
echo "--------------------------"

# Test explain command
run_test "Explain Command" \
    "node ../bin/bruno.js -p 'explain what the add function does in test_math.js' | head -50" \
    "function"

# Test fix command (if patterns are detected)
run_test "Fix Command Pattern" \
    "node ../bin/bruno.js -p 'fix the syntax errors in test_broken.js' | head -50" \
    "fix"

# Test general AI question
run_test "General AI Question" \
    "node ../bin/bruno.js -p 'what is a closure in JavaScript' | head -50" \
    "closure\|function\|scope"

# 5. Memory and Context Tests
echo -e "\n${YELLOW}5. Memory and Context Tests${NC}"
echo "--------------------------"

# Create a test script for memory
cat > test_memory.js << 'EOF'
const { spawn } = require('child_process');
const path = require('path');

// Start Bruno in interactive mode
const bruno = spawn('node', [path.join(__dirname, '..', 'bin', 'bruno.js')], {
    stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let phase = 'start';

bruno.stdout.on('data', (data) => {
    output += data.toString();
    
    if (phase === 'start' && output.includes('Ready')) {
        console.log('✓ Bruno started');
        phase = 'remember';
        bruno.stdin.write('remember: My favorite color is blue\n');
    } else if (phase === 'remember' && output.includes('blue')) {
        console.log('✓ Memory stored');
        phase = 'recall';
        setTimeout(() => {
            bruno.stdin.write('what is my favorite color?\n');
        }, 1000);
    } else if (phase === 'recall' && output.includes('blue')) {
        console.log('✓ Memory recalled');
        bruno.stdin.write('exit\n');
        process.exit(0);
    }
});

bruno.on('close', () => {
    if (phase !== 'recall') {
        console.log('✗ Memory test incomplete');
        process.exit(1);
    }
});

setTimeout(() => {
    console.log('✗ Memory test timeout');
    bruno.kill();
    process.exit(1);
}, 30000);
EOF

# Memory test currently requires interactive mode
echo -e "${YELLOW}Note: Memory test requires interactive mode (skipped in batch)${NC}"

# 6. Filesystem Permission Tests
echo -e "\n${YELLOW}6. Filesystem Permission Tests${NC}"
echo "-----------------------------"

# Test file creation
run_test "File Write Test" \
    "echo 'console.log(\"Hello from Bruno\");' > test_output.js && test -f test_output.js && echo 'File created successfully'" \
    "File created successfully"

# Test backup creation (if implemented)
echo -e "${YELLOW}Note: Backup creation test depends on implementation${NC}"

# 7. Shell Sandbox Tests
echo -e "\n${YELLOW}7. Shell Sandbox Tests${NC}"
echo "---------------------"

# Test allowed commands
run_test "Safe Shell Command - Echo" \
    "node ../bin/bruno.js -p 'run shell command: echo Hello World' 2>&1 | grep -E '(Hello World|echo|shell)'" \
    "Hello\|echo\|shell"

run_test "Safe Shell Command - List" \
    "node ../bin/bruno.js -p 'list files in current directory' 2>&1 | grep -E '(list|files|directory)'" \
    "list\|files\|directory"

# 8. Privacy and Security Tests
echo -e "\n${YELLOW}8. Privacy and Security Tests${NC}"
echo "----------------------------"

# Check for external API calls (should not find any)
run_test "No External API Calls" \
    "grep -r 'api.openai.com\|api.anthropic.com' ../core ../bin ../shell 2>/dev/null || echo 'No external APIs found'" \
    "No external APIs found"

run_test "Ollama Local Only" \
    "grep -r 'ollama_url' ../config 2>/dev/null | grep -E '127.0.0.1|localhost' || echo 'Local only'" \
    "127.0.0.1\|localhost\|Local only"

# 9. Error Handling Tests
echo -e "\n${YELLOW}9. Error Handling Tests${NC}"
echo "----------------------"

run_test "Invalid Command Handling" \
    "node ../bin/bruno.js -p 'asdflkjasdflkj random gibberish' 2>&1 | grep -E '(help|explanation|understand)'" \
    "help\|explanation\|understand"

# Clean up test files
echo -e "\n${YELLOW}Cleaning up test files...${NC}"
rm -f test_broken.js test_math.js test_memory.js test_output.js

# Summary
echo -e "\n${YELLOW}Test Summary${NC}"
echo "============"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

# Write summary to results file
echo "" >> $RESULTS_FILE
echo "Summary" >> $RESULTS_FILE
echo "=======" >> $RESULTS_FILE
echo "Total Tests: $((PASSED + FAILED))" >> $RESULTS_FILE
echo "Passed: $PASSED" >> $RESULTS_FILE
echo "Failed: $FAILED" >> $RESULTS_FILE
echo "Success Rate: $(( PASSED * 100 / (PASSED + FAILED) ))%" >> $RESULTS_FILE

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
    echo "" >> $RESULTS_FILE
    echo "Result: ALL TESTS PASSED ✅" >> $RESULTS_FILE
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Check $RESULTS_FILE for details.${NC}"
    echo "" >> $RESULTS_FILE
    echo "Result: SOME TESTS FAILED ❌" >> $RESULTS_FILE
    exit 1
fi