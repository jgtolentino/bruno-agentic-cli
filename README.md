# 🧠 Bruno CLI – Claude Code-Compatible Local AI CLI

> Minimal, offline Claude-style command line interface using local LLMs like DeepSeek via Ollama.

---

## ✨ Features

* ✅ Claude Code CLI parity (clean output, print-first UX)
* 🧼 No banners, no REPL distractions
* 💻 Local-first LLM completions (via `OllamaClient`)
* 📦 Full print mode (`-p` / `--print`) + auto mode when prompt is passed
* 🔁 Works with piping, scripting, and automation
* 🔗 Optional: Middleware Bridge for Google Docs + FS I/O

---

## 🚀 Usage

```bash
# Claude-style prompt
bruno "explain transformers in NLP"

# With explicit print mode
bruno -p "explain multi-agent reinforcement learning"
```

### Example Output:

```
Transformers are a type of deep learning model introduced in "Attention Is All You Need"...
```

---

## 📦 Install

```bash
git clone https://github.com/YOUR_ORG/bruno-agentic-cli.git
cd bruno-agentic-cli
npm install
npm link   # Optional: use `bruno` globally
```

---

## 🛠 Dev & Test Scripts

```bash
npm run test:claude-parity   # Assert Claude-style output parity
npm run test:main            # Clean interface test
npm run dev                  # Watch and run bruno-clean.js
```

---

## ⚙️ GitHub Actions: Auto-Publish/Test

Place this under `.github/workflows/cli-test.yml`:

```yaml
name: Bruno CLI Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node
      uses: actions/setup-node@v3
      with:
        node-version: 20
    - run: npm install
    - run: npm run test:claude-parity
```

To auto-publish to npm:

```yaml
    - run: npm publish
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 🔌 Claude Middleware Bridge (Submodule)

Included under `claude-mcp-bridge/`:

* Watches Claude output
* Executes `:write`, `:read`, `:edit google`, etc.
* Google Docs + file system I/O

To use:

```bash
cd claude-mcp-bridge
npm install
node index.js
```

Service runs at: `http://localhost:3141`

---

## 🧪 Model Compatibility

Works with any local LLM (Ollama):

```bash
ollama pull deepseek-coder:6.7b
ollama serve
```

---

## 🧾 License

MIT © InsightPulseAI

---

**Maintained by [@jgtolentino](https://github.com/jgtolentino)**

# MCP Google WebSocket Middleware

Real-time Google Drive/Docs sync with WebSocket support for Claude Code, Pulser, and Cursor integration.

## 🚀 Quick Start

```bash
# 1. Quick setup
./setup.sh

# 2. Start daemon services
npm run start:daemon

# 3. Test connection
npm run test:connection
```

## 📋 Overview

This middleware enables real-time synchronization between Google Drive/Docs and your AI tools (Claude Code, Pulser, Cursor). It provides:

- Real-time document updates via WebSocket
- Automatic context injection for AI tools
- Persistent memory across sessions
- Secure OAuth2 authentication
- Task extraction and execution

## 🏗 Architecture

### Core Components

- **WebSocket Server** (`server.js`)
  - Handles real-time Google Drive/Docs sync
  - Manages WebSocket connections
  - Implements OAuth2 authentication

- **Claude Hook** (`claude-hook.js`)
  - Injects Google Docs context into Claude Code
  - Maintains conversation history
  - Handles document updates

- **Pulser Hook** (`pulser-hook.js`)
  - Extracts tasks from Google Docs
  - Manages task execution
  - Updates document status

- **Session Sync** (`session-sync.js`)
  - Maintains persistent memory
  - Syncs state across AI tools
  - Handles session recovery

### Data Flow

```
[Google Docs] → [WebSocket] → [Claude/Pulser/Cursor]
                    ↕
           [Persistent Memory]
```

## 🔧 Installation

### Prerequisites

- Node.js 18+
- npm 9+
- Google Cloud Project with Drive API enabled
- OAuth2 credentials

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/mcp-google-websocket.git
cd mcp-google-websocket
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Run setup script:
```bash
./setup.sh
```

## 🛠 Configuration

### Environment Variables

```env
# Google OAuth2
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# WebSocket
WS_PORT=8080
WS_HOST=localhost

# Session
SESSION_SECRET=your_session_secret
SESSION_DURATION=24h
```

### Integration Points

#### Claude Code CLI
```javascript
// Auto-loads Google Docs context
const { loadContext } = require('./claude-hook');
await loadContext(docId);
```

#### Pulser Agents
```javascript
// Extract tasks from documents
const { extractTasks } = require('./pulser-hook');
const tasks = await extractTasks(docId);
```

#### Cursor AI
```javascript
// Session-aware context loading
const { loadSession } = require('./session-sync');
await loadSession(sessionId);
```

## 📡 Usage

### Starting Services

```bash
# Start all services
npm run start:daemon

# Start individual services
npm run start:websocket
npm run start:claude
npm run start:pulser
```

### Testing

```bash
# Test WebSocket connection
npm run test:connection

# Test Google API integration
npm run test:google

# Run all tests
npm test
```

## 🔒 Security

- OAuth2 authentication for Google API access
- WebSocket connection encryption
- Session token validation
- Rate limiting and request validation
- Secure credential storage

## 📈 Monitoring

```bash
# View logs
npm run logs

# Monitor WebSocket connections
npm run monitor:ws

# Check service health
npm run health
```

## 🔄 Updates

The middleware automatically:
- Syncs document changes in real-time
- Maintains conversation context
- Updates task status
- Recovers from disconnections

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Google Drive API
- WebSocket protocol
- Claude Code team
- Pulser framework
- Cursor AI

## 📞 Support

For issues and feature requests, please create an issue in the repository.

---

Built with ❤️ by the MCP team