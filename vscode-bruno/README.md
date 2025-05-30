# Bruno VS Code Extension

**Claude-style AI assistant that runs 100% locally in VS Code**

## 🚀 Features

- **🧠 Context-Aware AI** - Automatically analyzes your current file and provides relevant suggestions
- **🛠 Smart Commands** - Explain code, fix bugs, generate tests, and refactor with one click
- **💬 Interactive Sidebar** - Chat with Bruno directly in VS Code
- **📚 Session Memory** - Continue conversations across coding sessions
- **🔒 100% Private** - All processing happens locally with Ollama
- **⚡ Fast & Efficient** - Optimized for developer workflows

## 📦 Installation

### Prerequisites

1. **Ollama** must be installed and running:
   ```bash
   # macOS
   brew install ollama
   ollama serve
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   ollama serve
   ```

2. **DeepSeek Coder model** (recommended):
   ```bash
   ollama pull deepseek-coder:6.7b
   ```

### Install Extension

1. **From VSIX file** (recommended):
   ```bash
   code --install-extension bruno-vscode-3.1.0.vsix
   ```

2. **From source**:
   ```bash
   cd vscode-bruno
   npm install
   npm run package
   code --install-extension bruno-vscode-3.1.0.vsix
   ```

## 🎯 Usage

### Context Menu Commands

Right-click any file or selection:
- **🧠 Bruno: Explain Current File** - Get detailed explanation
- **🛠 Bruno: Fix Current File** - Find and fix issues
- **🧪 Bruno: Generate Tests** - Create unit tests
- **♻️ Bruno: Refactor Selection** - Improve selected code

### Command Palette

Press `Cmd+Shift+P` (or `Ctrl+Shift+P`):
- `Bruno: Ask Custom Prompt` - Ask anything
- `Bruno: Show Sessions` - View conversation history
- `Bruno: Continue Last Session` - Resume previous chat

### Keyboard Shortcuts

- `Cmd+Shift+B` (Mac) / `Ctrl+Shift+B` (Windows/Linux) - Quick prompt

### Interactive Sidebar

Click the Bruno icon in the activity bar to open the chat sidebar:
- Type questions directly
- View conversation history
- Access slash commands
- Manage sessions

## ⚙️ Configuration

Configure Bruno in VS Code settings (`Cmd+,`):

```json
{
  "bruno.model": "deepseek-coder:6.7b",
  "bruno.ollamaUrl": "http://127.0.0.1:11434",
  "bruno.contextDepth": 3,
  "bruno.showNotifications": true,
  "bruno.autoSaveSession": true
}
```

### Available Settings

- **`bruno.model`** - Ollama model to use (default: `deepseek-coder:6.7b`)
- **`bruno.ollamaUrl`** - Ollama API endpoint (default: `http://127.0.0.1:11434`)
- **`bruno.contextDepth`** - Number of conversation turns to remember (default: 3)
- **`bruno.showNotifications`** - Show popup notifications (default: true)
- **`bruno.autoSaveSession`** - Auto-save conversations (default: true)

## 💡 Examples

### Explain Code
```
Right-click on any file → "🧠 Bruno: Explain Current File"
```

### Fix Bugs
```
Right-click → "🛠 Bruno: Fix Current File"
Bruno will analyze and offer to apply fixes
```

### Generate Tests
```
Right-click → "🧪 Bruno: Generate Tests"
Bruno creates comprehensive unit tests
```

### Refactor Code
```
Select code → Right-click → "♻️ Bruno: Refactor Selection"
```

### Custom Prompts
```
Cmd+Shift+B → "How do I optimize this React component?"
```

## 🔧 Troubleshooting

### Bruno not responding?

1. Check Ollama is running:
   ```bash
   curl http://127.0.0.1:11434/api/tags
   ```

2. Verify model is installed:
   ```bash
   ollama list
   ```

3. Check VS Code Developer Tools:
   ```
   Help → Toggle Developer Tools → Console
   ```

### Performance issues?

- Try a smaller model: `ollama pull llama2:7b`
- Reduce context depth in settings
- Close other Ollama sessions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file

## 🙏 Credits

Built on top of Bruno CLI v3.1 with patterns from:
- Cursor IDE
- Windsurf Cascade
- Bolt.new
- Manus

---

Made with ❤️ by InsightPulse AI