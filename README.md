# Bruno Agentic CLI v2.0 - Local-First Edition

Bruno is a **100% private, 100% offline** AI-powered CLI that helps you understand, fix, and test code without any data leaving your machine. Built on local LLMs, Bruno delivers powerful AI assistance while respecting your privacy.

## 🚀 Features

- **🔐 Local-First**: All processing happens on your machine - no cloud, no telemetry
- **🤖 Ollama Integration**: Powered by local models like DeepSeek Coder
- **💬 Interactive REPL**: Natural conversation interface with local memory
- **🔧 Smart Tools**: Automatic tool selection for explain, fix, and test operations
- **🛡️ Shell Sandboxing**: Safe execution of shell commands with protection
- **📝 Context Awareness**: Maintains conversation history locally
- **🎨 Beautiful Output**: Color-coded responses with clear formatting
- **⚡ Fast & Private**: No network latency, complete privacy

## 📦 Installation

```bash
npm install -g bruno-agentic-cli
```

## 🔑 Setup

1. **Install Ollama**:
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Pull the model**:
   ```bash
   ollama pull deepseek-coder:6.7b
   ```

3. **Start Ollama server**:
   ```bash
   ollama serve
   ```

## 🎯 Usage

### Interactive REPL
```bash
bruno
```

### Direct Commands
```bash
bruno explain src/utils.js
bruno fix src/auth.js
bruno test src/calculator.js
```

### REPL Commands
- `help` - Show available commands
- `clear` - Clear the screen
- `memory` - Show conversation memory
- `exit` - Exit the REPL

## 🛠️ Configuration

Create a `config/brunorc.yaml`:

```yaml
agent: bruno
model: claude-3-sonnet-20240229
llm_provider: anthropic
memory: true
default_tool: explain
repl_mode: true
max_tokens: 2048
temperature: 0.7
```

## 📂 Project Structure

```
bruno-agentic-cli/
├── bin/bruno.js          # CLI entry point
├── core/                 # Core modules
│   ├── promptLoader.js   # System prompt management
│   ├── toolRouter.js     # Tool routing logic
│   └── memoryManager.js  # Conversation memory
├── agents/               # Tool implementations
│   ├── explain.js        # Code explanation
│   ├── fix.js           # Bug fixing
│   └── test.js          # Test generation
├── shell/repl.js        # Interactive REPL
└── prompts/             # System prompts
```

## 🤝 Examples

### Explain Code
```bash
bruno> explain src/auth.js
```

### Fix Issues
```bash
bruno> fix the authentication bug in auth.js
```

### Generate Tests
```bash
bruno> generate tests for calculator.js using jest
```

### Run Shell Commands (Sandboxed)
```bash
bruno> shell npm test
bruno> run git status
```

## 🛡️ Privacy & Security

Bruno is designed with privacy as the #1 priority:

- **No Cloud Dependencies**: Everything runs locally
- **No Telemetry**: Zero tracking or analytics
- **No API Keys**: No registration or authentication
- **Shell Sandboxing**: Dangerous commands are blocked
- **Local Sessions**: All data stays on your machine

### Blocked Commands
- `rm -rf`, `sudo`, `curl`, `wget`, `ssh`

### Warning Commands
- `rm`, `mv`, `cp -r`

## 🧠 Memory System

Bruno maintains conversation context:
- Remembers recent interactions
- Maintains project context
- Allows follow-up questions

## 🎨 Customization

Extend Bruno by:
1. Adding new agents in `agents/`
2. Updating tool schema in `prompts/tool_schema.json`
3. Modifying system prompt in `prompts/bruno_prompt.txt`

## 📄 License

MIT

---

Built with ❤️ using Claude's API