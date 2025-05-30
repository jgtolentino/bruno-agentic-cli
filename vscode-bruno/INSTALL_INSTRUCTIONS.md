# 🚀 Bruno VS Code Extension Installation

## The extension is built and ready! Follow these steps:

### Method 1: Command Palette (Recommended)
1. VS Code should now be open
2. Press `Cmd+Shift+P` to open Command Palette
3. Type "Extensions: Install from VSIX..."
4. Navigate to: `/Users/tbwa/Documents/GitHub/bruno-agentic-cli/vscode-bruno/`
5. Select `bruno-vscode-3.1.0.vsix`
6. Click "Install"

### Method 2: Extensions View
1. Click the Extensions icon in VS Code sidebar (or press `Cmd+Shift+X`)
2. Click the "..." menu at the top of the Extensions view
3. Select "Install from VSIX..."
4. Choose `bruno-vscode-3.1.0.vsix` from the vscode-bruno folder

### Method 3: Drag and Drop
1. Open Finder to `/Users/tbwa/Documents/GitHub/bruno-agentic-cli/vscode-bruno/`
2. Drag `bruno-vscode-3.1.0.vsix` into the VS Code window

## ✅ After Installation:

1. **Check Ollama is running**:
   ```bash
   ollama serve
   ```

2. **Ensure DeepSeek model is installed**:
   ```bash
   ollama pull deepseek-coder:6.7b
   ```

3. **Test the extension**:
   - Right-click any code file → "🧠 Bruno: Explain Current File"
   - Press `Cmd+Shift+B` for quick prompt
   - Look for Bruno icon in the activity bar (left sidebar)

## 🎯 Quick Test:
1. Open any JavaScript/TypeScript file
2. Right-click → "🧠 Bruno: Explain Current File"
3. Check the Output panel for Bruno's response

The extension is now ready to use!