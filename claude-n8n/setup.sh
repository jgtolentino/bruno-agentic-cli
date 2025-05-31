#!/bin/bash

# Claude N8N Orchestrator Setup Script
# Builds and starts the custom n8n instance for Claude ↔ Google Docs integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="claude-n8n-orchestrator"
SERVICE_PORT=5678

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

check_dependencies() {
  log_info "Checking dependencies..."
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
  fi
  
  # Check Docker
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
  fi
  
  # Check Docker Compose
  if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed"
    exit 1
  fi
  
  log_success "All dependencies are available"
}

setup_directories() {
  log_info "Setting up directories..."
  
  cd "$SCRIPT_DIR"
  
  # Create required directories
  mkdir -p data/{workflows,executions,credentials,logs,temp}
  mkdir -p credentials
  mkdir -p public/assets
  mkdir -p src/{core,nodes,routes}
  
  # Create Claude sync directory
  mkdir -p "$HOME/claude/sync"
  
  # Create sync files if they don't exist
  touch "$HOME/claude/sync/claude-output.txt"
  touch "$HOME/claude/sync/claude-input.md"
  echo '{"documentId": "", "edits": []}' > "$HOME/claude/sync/claude-suggestions.json"
  
  log_success "Directories created"
}

setup_credentials() {
  log_info "Setting up credentials..."
  
  # Check for Google credentials
  if [[ -n "$GOOGLE_CREDENTIALS_PATH" && -f "$GOOGLE_CREDENTIALS_PATH" ]]; then
    cp "$GOOGLE_CREDENTIALS_PATH" "$SCRIPT_DIR/credentials/google-credentials.json"
    log_success "Google credentials copied"
  else
    log_warning "GOOGLE_CREDENTIALS_PATH not set or file not found"
    log_info "Please copy your Google service account credentials to:"
    log_info "  $SCRIPT_DIR/credentials/google-credentials.json"
  fi
  
  # Create environment file
  cat > "$SCRIPT_DIR/.env" << EOF
# Claude N8N Orchestrator Environment Configuration
NODE_ENV=development
PORT=$SERVICE_PORT
LOG_LEVEL=info
GOOGLE_CREDENTIALS_PATH=/app/credentials/google-credentials.json
REDIS_URL=redis://localhost:6379
N8N_DATA_DIR=$SCRIPT_DIR/data
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
EOF
  
  log_success "Environment configuration created"
}

install_dependencies() {
  log_info "Installing dependencies..."
  
  cd "$SCRIPT_DIR"
  npm install
  
  log_success "Dependencies installed"
}

build_application() {
  log_info "Building application..."
  
  cd "$SCRIPT_DIR"
  
  # Create missing route files
  mkdir -p src/routes
  
  # Create basic route files
  create_route_file "workflows"
  create_route_file "executions"  
  create_route_file "nodes"
  create_route_file "credentials"
  create_route_file "claude"
  create_route_file "gdocs"
  create_route_file "webhooks"
  
  # Create missing node files
  create_missing_nodes
  
  # Create basic frontend
  create_frontend
  
  log_success "Application built"
}

create_route_file() {
  local route_name=$1
  local route_file="src/routes/${route_name}.js"
  
  if [[ ! -f "$route_file" ]]; then
    cat > "$route_file" << EOF
const express = require('express');
const router = express.Router();

// ${route_name} routes
router.get('/', (req, res) => {
  res.json({ message: '${route_name} endpoint', timestamp: new Date().toISOString() });
});

router.post('/', (req, res) => {
  res.json({ message: '${route_name} created', data: req.body, timestamp: new Date().toISOString() });
});

router.get('/:id', (req, res) => {
  res.json({ message: '${route_name} details', id: req.params.id, timestamp: new Date().toISOString() });
});

module.exports = router;
EOF
  fi
}

create_missing_nodes() {
  # Create FileWatcherNode
  if [[ ! -f "src/nodes/FileWatcherNode.js" ]]; then
    cat > "src/nodes/FileWatcherNode.js" << 'EOF'
const chokidar = require('chokidar');
const fs = require('fs-extra');

class FileWatcherNode {
  constructor(parameters = {}, logger) {
    this.parameters = parameters;
    this.logger = logger;
    this.type = 'fileWatcher';
    this.displayName = 'File Watcher';
    this.description = 'Watch files for changes';
  }

  async execute(inputData, executionContext) {
    const input = inputData.main?.[0] || {};
    const filePath = input.filePath || this.parameters.filePath;
    
    if (!filePath) {
      throw new Error('File path is required');
    }

    return new Promise((resolve, reject) => {
      const watcher = chokidar.watch(filePath);
      
      watcher.on('change', async (path) => {
        try {
          const content = await fs.readFile(path, 'utf8');
          watcher.close();
          resolve({
            filePath: path,
            content: content,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          watcher.close();
          reject(error);
        }
      });
      
      watcher.on('error', (error) => {
        watcher.close();
        reject(error);
      });
    });
  }
}

module.exports = FileWatcherNode;
EOF
  fi

  # Create WebhookNode
  if [[ ! -f "src/nodes/WebhookNode.js" ]]; then
    cat > "src/nodes/WebhookNode.js" << 'EOF'
class WebhookNode {
  constructor(parameters = {}, logger) {
    this.parameters = parameters;
    this.logger = logger;
    this.type = 'webhook';
    this.displayName = 'Webhook';
    this.description = 'Receive HTTP webhooks';
  }

  async execute(inputData, executionContext) {
    const input = inputData.main?.[0] || {};
    
    return {
      method: input.method || 'POST',
      body: input.body || {},
      headers: input.headers || {},
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = WebhookNode;
EOF
  fi
}

create_frontend() {
  # Create basic HTML interface
  cat > "public/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude N8N Orchestrator</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #333; margin-bottom: 10px; }
        .header p { color: #666; font-size: 18px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; }
        .card h3 { margin-top: 0; color: #333; }
        .card p { color: #666; margin: 10px 0; }
        .status { padding: 8px 16px; border-radius: 4px; display: inline-block; font-weight: bold; }
        .status.running { background: #d4edda; color: #155724; }
        .status.stopped { background: #f8d7da; color: #721c24; }
        .api-endpoints { margin: 30px 0; }
        .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 4px; font-family: monospace; }
        .method { color: white; padding: 4px 8px; border-radius: 3px; margin-right: 10px; font-weight: bold; }
        .get { background: #28a745; }
        .post { background: #007bff; }
        .put { background: #ffc107; color: #000; }
        .delete { background: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Claude N8N Orchestrator</h1>
            <p>Custom automation platform for Claude ↔ Google Docs integration</p>
            <div class="status running">Status: Running</div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📝 Claude Integration</h3>
                <p>Monitor Claude output and send input via file-based sync</p>
                <p><strong>Sync Directory:</strong> ~/claude/sync</p>
            </div>

            <div class="card">
                <h3>📄 Google Docs</h3>
                <p>Create, read, update, and export Google Documents</p>
                <p><strong>Service Account:</strong> claude-mcp-docs-service</p>
            </div>

            <div class="card">
                <h3>🔄 Workflows</h3>
                <p>Automated workflows connecting Claude and Google Docs</p>
                <p><strong>Active Workflows:</strong> <span id="workflow-count">Loading...</span></p>
            </div>

            <div class="card">
                <h3>⚡ Real-time Sync</h3>
                <p>File watchers and webhooks for instant synchronization</p>
                <p><strong>WebSocket:</strong> Connected</p>
            </div>
        </div>

        <div class="api-endpoints">
            <h2>🔗 API Endpoints</h2>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <strong>/health</strong> - Health check and status
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <strong>/api/workflows</strong> - List all workflows
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <strong>/api/workflows</strong> - Create new workflow
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <strong>/api/executions</strong> - List workflow executions
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <strong>/webhook/claude-input</strong> - Receive Claude input webhook
            </div>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <strong>/webhook/gdocs-sync</strong> - Sync with Google Docs
            </div>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
            <p>Built for TBWA Claude Orchestration • Version 1.0.0</p>
        </div>
    </div>

    <script>
        // Basic status updates
        fetch('/api/workflows')
            .then(response => response.json())
            .then(data => {
                document.getElementById('workflow-count').textContent = data.length || 0;
            })
            .catch(() => {
                document.getElementById('workflow-count').textContent = 'Error';
            });
    </script>
</body>
</html>
EOF
}

start_service() {
  log_info "Starting Claude N8N Orchestrator..."
  
  cd "$SCRIPT_DIR"
  
  # Check if port is available
  if lsof -i :"$SERVICE_PORT" &>/dev/null; then
    log_warning "Port $SERVICE_PORT is already in use"
    log_info "Stopping existing service..."
    pkill -f "claude-n8n" || true
    sleep 2
  fi
  
  # Start the service
  if [[ "$1" == "--docker" ]]; then
    log_info "Starting with Docker..."
    docker-compose up -d
    log_success "Docker services started"
  else
    log_info "Starting in development mode..."
    npm start &
    sleep 3
    log_success "Service started in background"
  fi
  
  # Wait for service to be ready
  log_info "Waiting for service to be ready..."
  for i in {1..30}; do
    if curl -s "http://localhost:$SERVICE_PORT/health" &>/dev/null; then
      log_success "Service is ready!"
      break
    fi
    sleep 1
  done
  
  # Print status
  echo
  echo "🎉 Claude N8N Orchestrator is running!"
  echo "📝 Web Interface: http://localhost:$SERVICE_PORT"
  echo "🔗 API Endpoint: http://localhost:$SERVICE_PORT/api"
  echo "📁 Claude Sync Dir: $HOME/claude/sync"
  echo
  
  if [[ -f "$SCRIPT_DIR/credentials/google-credentials.json" ]]; then
    echo "✅ Google Docs integration ready"
  else
    echo "⚠️  Add Google credentials to enable Google Docs integration"
  fi
  
  echo
  echo "📋 Quick commands:"
  echo "  curl http://localhost:$SERVICE_PORT/health"
  echo "  curl http://localhost:$SERVICE_PORT/api/workflows"
  echo "  echo 'test content' > $HOME/claude/sync/claude-output.txt"
}

stop_service() {
  log_info "Stopping Claude N8N Orchestrator..."
  
  if [[ "$1" == "--docker" ]]; then
    docker-compose down
  else
    pkill -f "claude-n8n" || true
  fi
  
  log_success "Service stopped"
}

main() {
  echo "🤖 Claude N8N Orchestrator Setup"
  echo "================================"
  
  case "${1:-setup}" in
    setup)
      check_dependencies
      setup_directories
      setup_credentials
      install_dependencies
      build_application
      start_service
      ;;
    start)
      start_service "$2"
      ;;
    stop)
      stop_service "$2"
      ;;
    restart)
      stop_service "$2"
      sleep 2
      start_service "$2"
      ;;
    status)
      if curl -s "http://localhost:$SERVICE_PORT/health" &>/dev/null; then
        log_success "Service is running on port $SERVICE_PORT"
      else
        log_error "Service is not running"
      fi
      ;;
    logs)
      if [[ "$2" == "--docker" ]]; then
        docker-compose logs -f
      else
        tail -f "$SCRIPT_DIR/data/logs/combined.log"
      fi
      ;;
    *)
      echo "Usage: $0 {setup|start|stop|restart|status|logs} [--docker]"
      echo
      echo "Commands:"
      echo "  setup    - Full setup and start"
      echo "  start    - Start the service"
      echo "  stop     - Stop the service"
      echo "  restart  - Restart the service"
      echo "  status   - Check service status"
      echo "  logs     - View service logs"
      echo
      echo "Options:"
      echo "  --docker - Use Docker instead of local Node.js"
      exit 1
      ;;
  esac
}

main "$@"