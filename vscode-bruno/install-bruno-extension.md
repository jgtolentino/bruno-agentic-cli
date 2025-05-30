# 🚀 Bruno VS Code Extension Installation

## ✅ Extension Successfully Built!

The Bruno VS Code extension (`bruno-vscode-3.1.0.vsix`) is ready to install.

## 📦 Installation Methods:

### Method 1: Command Palette (Recommended)
1. In VS Code, press `Cmd+Shift+P`
2. Type: "Extensions: Install from VSIX..."
3. Navigate to: `/Users/tbwa/Documents/GitHub/bruno-agentic-cli/vscode-bruno/`
4. Select `bruno-vscode-3.1.0.vsix`
5. Click "Install"

### Method 2: Drag & Drop
1. Open Finder to the vscode-bruno folder
2. Drag `bruno-vscode-3.1.0.vsix` directly into any VS Code window
3. VS Code will prompt to install

### Method 3: Extensions View
1. Open Extensions sidebar (`Cmd+Shift+X`)
2. Click the "..." menu at top
3. Select "Install from VSIX..."
4. Choose the `.vsix` file

## 🧪 Verify Installation:

1. **Check Commands**: Press `Cmd+Shift+P` and type "Bruno" - you should see:
   - 🧠 Bruno: Explain Current File
   - 🛠 Bruno: Fix Current File
   - 🧪 Bruno: Generate Tests
   - ♻️ Bruno: Refactor Selection
   - 💬 Bruno: Ask Custom Prompt

2. **Check Sidebar**: Look for the Bruno icon in the activity bar (left sidebar)

3. **Test It**: Open any code file, right-click → "🧠 Bruno: Explain Current File"

## ⚠️ Prerequisites:

1. **Start Ollama**:
   ```bash
   ollama serve
   ```

2. **Pull DeepSeek model** (if not already installed):
   ```bash
   ollama pull deepseek-coder:6.7b
   ```

## 🎯 Quick Test:
- Press `Cmd+Shift+B` to open quick prompt
- Right-click any code file for Bruno options
- Click Bruno icon in sidebar for chat

## 📍 Extension Location:
```
/Users/tbwa/Documents/GitHub/bruno-agentic-cli/vscode-bruno/bruno-vscode-3.1.0.vsix
```

Size: 12.43 KB
Version: 3.1.0
Publisher: InsightPulse AI