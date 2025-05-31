#!/bin/bash

# Claude Middleware Bridge Setup Script
# Sets up the custom middleware for Claude ↔ Google Docs + File System integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_PORT=3141

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

setup_environment() {
  log_info "Setting up Claude Middleware Bridge..."
  
  cd "$SCRIPT_DIR"
  
  # Create directories
  mkdir -p data
  mkdir -p "$HOME/claude/sync"
  mkdir -p "/tmp/claude"
  
  # Create sync files
  touch "$HOME/claude/sync/claude-output.txt"
  touch "$HOME/claude/sync/claude-input.md"
  echo '[]' > "$HOME/claude/sync/claude-commands.json"
  
  # Create environment file
  cat > .env << EOF
# Claude Middleware Bridge Configuration
NODE_ENV=development
PORT=$SERVICE_PORT
LOG_LEVEL=info
GOOGLE_CREDENTIALS_PATH=${GOOGLE_CREDENTIALS_PATH:-./google-credentials.json}
MOUNT_DIR=/tmp/claude
EOF

  # Copy Google credentials if available
  if [[ -n "$GOOGLE_CREDENTIALS_PATH" && -f "$GOOGLE_CREDENTIALS_PATH" ]]; then
    cp "$GOOGLE_CREDENTIALS_PATH" ./google-credentials.json
    log_success "Google credentials copied"
  else
    log_warning "GOOGLE_CREDENTIALS_PATH not set - Google Docs integration will be disabled"
  fi
  
  log_success "Environment setup complete"
}

install_dependencies() {
  log_info "Installing dependencies..."
  cd "$SCRIPT_DIR"
  npm install
  log_success "Dependencies installed"
}

create_test_files() {
  log_info "Creating test files..."
  
  # Create test command script
  cat > test-claude-commands.sh << 'EOF'
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
EOF
  
  chmod +x test-claude-commands.sh
  
  # Create Claude output tokenizer
  cat > claude-tokenizer.js << 'EOF'
#!/usr/bin/env node

/**
 * Claude Output Tokenizer
 * Parses Claude Desktop output and extracts commands
 */

const fs = require('fs');
const path = require('path');

class ClaudeTokenizer {
  constructor() {
    this.commandPatterns = {
      write: /^:write\s+(google|file)\s+"([^"]+)"\s*(?:→\s*(.+))?$/,
      read: /^:read\s+(google|file)\s+"([^"]+)"$/,
      edit: /^:edit\s+(google|file)\s+"([^"]+)"\s*(?:with\s+(.+))?$/,
      list: /^:list\s+(files|gdocs)(?:\s+in\s+"([^"]+)")?$/
    };
  }

  parseOutput(content) {
    const lines = content.split('\n');
    const commands = [];
    let currentContent = '';
    
    for (const line of lines) {
      // Check for command patterns
      for (const [intent, pattern] of Object.entries(this.commandPatterns)) {
        const match = line.match(pattern);
        if (match) {
          commands.push(this.buildCommand(intent, match));
          continue;
        }
      }
      
      // Accumulate regular content
      currentContent += line + '\n';
    }
    
    return {
      content: currentContent.trim(),
      commands: commands,
      hasCommands: commands.length > 0
    };
  }
  
  buildCommand(intent, match) {
    const [full, target, identifier, extra] = match;
    
    return {
      intent: intent,
      target: target === 'google' ? 'google_docs' : 'file',
      payload: this.buildPayload(intent, target, identifier, extra)
    };
  }
  
  buildPayload(intent, target, identifier, extra) {
    if (target === 'google') {
      return {
        docTitle: identifier,
        docId: identifier.match(/^[a-zA-Z0-9_-]{20,}$/) ? identifier : null,
        content: extra || '',
        operation: intent === 'edit' ? 'append' : intent
      };
    } else {
      return {
        path: identifier,
        filePath: identifier,
        content: extra || ''
      };
    }
  }
}

// CLI usage
if (require.main === module) {
  const tokenizer = new ClaudeTokenizer();
  
  if (process.argv[2]) {
    // Parse file
    const content = fs.readFileSync(process.argv[2], 'utf8');
    const result = tokenizer.parseOutput(content);
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Parse stdin
    let input = '';
    process.stdin.on('data', (chunk) => input += chunk);
    process.stdin.on('end', () => {
      const result = tokenizer.parseOutput(input);
      console.log(JSON.stringify(result, null, 2));
    });
  }
}

module.exports = ClaudeTokenizer;
EOF

  chmod +x claude-tokenizer.js
  
  log_success "Test files created"
}

start_service() {
  log_info "Starting Claude Middleware Bridge..."
  
  cd "$SCRIPT_DIR"
  
  # Check if port is available
  if lsof -i :"$SERVICE_PORT" &>/dev/null; then
    log_warning "Port $SERVICE_PORT is already in use"
    log_info "Stopping existing service..."
    pkill -f "claude-middleware" || true
    sleep 2
  fi
  
  # Start the service
  npm start &
  
  # Wait for service to be ready
  log_info "Waiting for service to be ready..."
  for i in {1..15}; do
    if curl -s "http://localhost:$SERVICE_PORT/health" &>/dev/null; then
      log_success "Service is ready!"
      break
    fi
    sleep 1
  done
  
  echo
  echo "🚀 Claude Middleware Bridge is running!"
  echo "🔗 API Endpoint: http://localhost:$SERVICE_PORT"
  echo "📡 WebSocket: ws://localhost:$SERVICE_PORT"
  echo "📁 Mount Directory: /tmp/claude"
  echo "🔄 Claude Sync: $HOME/claude/sync"
  
  if [[ -f "./google-credentials.json" ]]; then
    echo "✅ Google Docs integration enabled"
  else
    echo "⚠️  Google Docs integration disabled (no credentials)"
  fi
  
  echo
  echo "📋 Quick Test Commands:"
  echo "  ./test-claude-commands.sh"
  echo "  echo 'test content' > $HOME/claude/sync/claude-output.txt"
  echo "  node claude-tokenizer.js $HOME/claude/sync/claude-output.txt"
}

stop_service() {
  log_info "Stopping Claude Middleware Bridge..."
  pkill -f "claude-middleware" || true
  log_success "Service stopped"
}

main() {
  echo "🤖 Claude Middleware Bridge Setup"
  echo "================================="
  
  case "${1:-setup}" in
    setup)
      setup_environment
      install_dependencies
      create_test_files
      start_service
      ;;
    start)
      start_service
      ;;
    stop)
      stop_service
      ;;
    restart)
      stop_service
      sleep 2
      start_service
      ;;
    test)
      ./test-claude-commands.sh
      ;;
    status)
      if curl -s "http://localhost:$SERVICE_PORT/health" &>/dev/null; then
        log_success "Service is running on port $SERVICE_PORT"
        curl -s "http://localhost:$SERVICE_PORT/status" | jq '.'
      else
        log_error "Service is not running"
      fi
      ;;
    *)
      echo "Usage: $0 {setup|start|stop|restart|test|status}"
      echo
      echo "Commands:"
      echo "  setup    - Full setup and start"
      echo "  start    - Start the service"
      echo "  stop     - Stop the service"
      echo "  restart  - Restart the service"
      echo "  test     - Run test commands"
      echo "  status   - Check service status"
      exit 1
      ;;
  esac
}

main "$@"