#!/bin/bash

# Bruno v3.1 Validation Suite

echo "🧪 Bruno v3.1 Validation Suite"
echo "=============================="

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

failed=0

# Test 1: Version check
echo -n "Testing version... "
if node bin/bruno.js --version | grep -q "3.0.0"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    ((failed++))
fi

# Test 2: Basic response
echo -n "Testing basic response... "
if node bin/bruno.js "hello" | grep -q "Bruno"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    ((failed++))
fi

# Test 3: Code analysis
echo -n "Testing code analysis... "
if node bin/bruno.js "explain function add(a,b){return a+b}" | grep -q "function"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    ((failed++))
fi

# Test 4: Memory persistence
echo -n "Testing memory... "
if [ -d "memory" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    ((failed++))
fi

echo ""
if [ $failed -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
else
    echo -e "${RED}$failed tests failed${NC}"
fi
