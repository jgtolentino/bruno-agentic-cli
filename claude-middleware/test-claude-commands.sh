#!/bin/bash

# Test commands for Claude Middleware Bridge
BASE_URL="http://localhost:3141"

echo "🧪 Testing Claude Middleware Bridge"
echo "=================================="

# Test health check
echo "Testing health check..."
curl -s "$BASE_URL/health" | jq '.'

echo -e "\n📝 Testing file operations..."

# Test file write
curl -X POST "$BASE_URL/command" \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "write",
    "target": "file", 
    "payload": {
      "path": "test-output.md",
      "content": "# Claude Middleware Test\n\nThis file was created by the Claude Middleware Bridge.\n\nTimestamp: '$(date)'"
    }
  }' | jq '.'

# Test file read
echo -e "\nTesting file read..."
curl -X POST "$BASE_URL/command" \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "read",
    "target": "file",
    "payload": {
      "path": "test-output.md"
    }
  }' | jq '.'

echo -e "\n🔄 Testing Claude I/O..."

# Test Claude input
curl -X POST "$BASE_URL/claude/input" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Please analyze the middleware bridge functionality and provide feedback.",
    "metadata": {
      "title": "Claude Middleware Analysis",
      "task": "analysis"
    }
  }' | jq '.'

echo -e "\n✅ Tests completed!"
