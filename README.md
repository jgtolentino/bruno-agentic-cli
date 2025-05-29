# Bruno Agentic CLI v2.0

Bruno is a Claude-powered agentic CLI that brings advanced AI assistance directly to your terminal. Built on Claude's powerful language model, Bruno helps you understand, fix, and test code with unprecedented accuracy.

## 🚀 Features

- **🤖 Claude Integration**: Powered by Claude 3 Sonnet for superior code understanding
- **💬 Interactive REPL**: Natural conversation interface with memory
- **🔧 Smart Tools**: Automatic tool selection for explain, fix, and test operations
- **📝 Context Awareness**: Maintains conversation history and project context
- **🎨 Beautiful Output**: Color-coded responses with clear formatting
- **⚡ Fast & Efficient**: Direct API integration for quick responses

## 📦 Installation

```bash
npm install -g bruno-agentic-cli
```

## 🔑 Setup

Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
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

## 🔌 Tool System

Bruno uses a Claude-style tool system:

```
[Tool: explain(file="src/utils.js", focus="parseJSON function")]
```

Tools automatically execute and return results inline.

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