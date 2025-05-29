# 🤖 Bruno Agentic CLI

**Enhanced Local Claude Code Replacement** - A powerful AI-powered development assistant that runs entirely on your local machine using Ollama.

## ✨ Features

### 🎯 Multiple Input Modes
- **Interactive Mode** - Guided prompts with smart agent selection
- **Command Mode** - Slash commands for quick actions
- **Free Prompt Mode** - Open-ended AI conversation

### 🧠 Intelligent Agent System
- **Explain Agent** - Detailed code analysis and explanations
- **Fix Agent** - Bug detection and code corrections  
- **Test Agent** - Comprehensive test generation
- **Smart Routing** - AI automatically selects the best agent

### 📁 Workspace Awareness
- **Git Integration** - Automatically loads git status, branch, and recent commits
- **Project Context** - Understands your project structure and README
- **File Memory** - Tracks recently modified files
- **Context Injection** - Adds relevant workspace info to prompts

### ⚡ Advanced Features
- **Streaming Responses** - Real-time AI output with progress indicators
- **Slash Commands** - Quick `/explain`, `/fix`, `/test` commands
- **Configuration System** - Customizable via `.brunorc` file
- **Error Handling** - Graceful fallbacks and helpful error messages

## 🚀 Quick Start

### Prerequisites
```bash
# Install Ollama
brew install ollama

# Pull the code model
ollama pull deepseek-coder:6.7b-instruct-q4_K_M
```

### Installation
```bash
# Clone and setup
cd bruno-agentic-cli
npm install
chmod +x cli.js

# Optional: Link globally
npm link
```

### Usage
```bash
# Start Bruno
./cli.js
# or if linked globally
bruno
```

## 📋 Slash Commands

| Command | Usage | Description |
|---------|-------|-------------|
| `/explain <file>` | `/explain src/utils.js` | Analyze and explain code |
| `/fix <file>` | `/fix components/Button.tsx` | Find and fix bugs |
| `/test <file>` | `/test lib/parser.js` | Generate unit tests |
| `/context` | `/context` | Show workspace context |
| `/model [name]` | `/model codellama:7b` | Show/change AI model |
| `/help` | `/help` | Show available commands |

## ⚙️ Configuration

Create a `.brunorc` file in your project root:

```json
{
  "model": "deepseek-coder:6.7b-instruct-q4_K_M",
  "ollama_host": "http://localhost:11434",
  "context_window": 4096,
  "temperature": 0.1,
  "workspace": {
    "include_git_context": true,
    "include_readme": true,
    "max_files": 50
  },
  "agents": {
    "explain": {
      "temperature": 0.2
    },
    "fix": {
      "temperature": 0.1
    },
    "test": {
      "temperature": 0.3
    }
  }
}
```

## 🎮 Usage Examples

### Interactive Mode
```bash
./cli.js
# Select "Interactive Mode (guided prompts)"
# Choose "Smart Route (AI decides)"
# Enter: "I need help debugging this function"
# Provide file path: src/utils/parser.js
```

### Command Mode
```bash
./cli.js
# Select "Command Mode (slash commands)"
# Enter: "/explain examples/sample.js"
```

### Smart Routing Examples
- **"fix bugs in my code"** → Automatically routes to Fix Agent
- **"explain this function"** → Routes to Explain Agent  
- **"generate tests"** → Routes to Test Agent
- **"help me understand"** → Routes to Explain Agent

## 🏗️ Architecture

```
bruno-agentic-cli/
├── cli.js                 # Main CLI entry point
├── .brunorc              # Configuration file
├── agents/               # AI agent prompt templates
│   ├── explain.js        # Code explanation agent
│   ├── fix.js           # Bug fixing agent
│   └── test.js          # Test generation agent
├── lib/                 # Core Bruno modules
│   ├── slash-commands.js # Slash command parser
│   ├── workspace-memory.js # Workspace context loader
│   ├── router.js        # Intelligent agent routing
│   └── streaming.js     # Streaming response handler
└── examples/            # Sample files for testing
    └── sample.js
```

## 🔧 Troubleshooting

### Ollama Not Running
```bash
# Start Ollama service
ollama serve

# Verify model is available
ollama list
```

### Model Issues
```bash
# Pull required model
ollama pull deepseek-coder:6.7b-instruct-q4_K_M

# Alternative models
ollama pull codellama:7b-code
ollama pull mistral:7b-code
```

### Permission Errors
```bash
# Make CLI executable
chmod +x cli.js

# Fix npm linking issues
sudo npm link
```

## 🆚 vs Claude Code

| Feature | Bruno CLI | Claude Code |
|---------|-----------|-------------|
| **Privacy** | ✅ 100% Local | ❌ Cloud-based |
| **Cost** | ✅ Free | 💰 Paid |
| **Speed** | ✅ No network latency | ⚠️ Depends on connection |
| **Customization** | ✅ Full control | ❌ Limited |
| **Offline** | ✅ Works offline | ❌ Requires internet |
| **Models** | ✅ Any Ollama model | ❌ Fixed models |

## 🛠️ Development

### Adding New Agents
1. Create agent file in `agents/`
2. Implement `generatePrompt(code)` function
3. Add to router in `lib/router.js`
4. Update slash commands in `lib/slash-commands.js`

### Custom Prompts
Edit prompt templates in `agents/` or create new ones following the existing pattern.

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with various code samples
5. Submit a pull request

---

**Bruno CLI** - Your local AI coding assistant, no cloud required! 🚀