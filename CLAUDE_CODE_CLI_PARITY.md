# Bruno Multi-Line Input - Claude Code CLI Parity

## Overview

Bruno v3.1 now supports Claude Code CLI style multi-line input handling. This means you can paste entire scripts, code blocks, or mixed content without any special commands or modes - just like Claude Code CLI.

## Key Features

### 1. **Automatic Multi-Line Detection**
- No `.editor` or `.paste` commands needed
- Smart context understanding knows when you're done typing
- Empty line after content typically signals completion

### 2. **Real-Time Command Streaming**
```bash
# Shows commands as they execute
$ echo "Setting up project..."
Setting up project...
$ mkdir -p src/components
$ npm init -y
Wrote to /path/to/package.json
```

### 3. **Seamless Code Creation**
```bash
# Heredoc support
cat > server.js << 'EOF'
const express = require('express');
const app = express();
app.listen(3000);
EOF
```

### 4. **Mixed Content Support**
Natural language requests mixed with code and commands are handled intelligently.

## Usage

### Starting Claude-Style Mode

```bash
# Explicit Claude mode
bruno --claude

# Or configure in brunorc.yaml
claude_mode: true
```

### Multi-Line Input Examples

#### Example 1: Shell Script
```bash
echo "Setting up Node.js project..."
mkdir -p my-app/src
cd my-app
npm init -y
npm install express cors
node src/index.js
```

#### Example 2: Creating Files
```bash
cat > package.json << 'EOF'
{
  "name": "my-app",
  "version": "1.0.0",
  "main": "index.js"
}
EOF
```

#### Example 3: Natural Language
```
Create a React component for a user profile card with:
- Avatar image
- Name and email
- Bio section
Make it responsive with Tailwind CSS
```

## Implementation Details

### Core Components

1. **ClaudeStyleInputHandler** (`core/claudeStyleInputHandler.js`)
   - Handles input line by line
   - Detects completion automatically
   - Routes to appropriate processors

2. **ContextAnalyzer**
   - Detects unclosed brackets, quotes, heredocs
   - Identifies natural endpoints
   - Understands shell continuations

3. **ExecutionStreamer**
   - Real-time command output
   - Shows commands being executed
   - Streams stdout/stderr

4. **ClaudeStyleRepl** (`shell/claudeStyleRepl.js`)
   - Clean interface without mode indicators
   - Handles Ctrl+C gracefully
   - Tab completion support

### How It Works

1. **Input Collection**
   - Each line is analyzed for completion signals
   - Buffer accumulates until input is complete
   - No visible mode changes

2. **Intent Detection**
   - Shell scripts: Multiple shell commands
   - Code creation: Heredoc patterns, file writes
   - Natural language: Questions, requests
   - Mixed content: Combination of above

3. **Processing**
   - Shell commands execute with real-time output
   - Files are created as specified
   - Natural language routes to LLM
   - Mixed content is segmented and processed

## Configuration

### Enable Claude Mode by Default

In `config/brunorc.yaml`:
```yaml
claude_mode: true
model: deepseek-coder:6.7b
ollama_url: http://127.0.0.1:11434
```

### Command Line Options

```bash
# Start with Claude mode
bruno --claude

# Continue session in Claude mode
bruno -c --claude

# Resume session in Claude mode
bruno -r session_id --claude
```

## Differences from Standard Bruno REPL

| Feature | Standard REPL | Claude-Style REPL |
|---------|--------------|-------------------|
| Multi-line | Requires special commands | Automatic detection |
| Mode indicators | Shows mode changes | No visible modes |
| Command execution | Batch output | Real-time streaming |
| Input completion | Manual (Enter/Ctrl+D) | Smart detection |
| Mixed content | Not supported | Fully supported |

## Testing

Run the test suite:
```bash
node tests/test-claude-style.js
```

View demos:
```bash
./demo-claude-style.sh
```

## Future Enhancements

- [ ] Piped input support (`cat file | bruno -p "analyze"`)
- [ ] Streaming JSON output format
- [ ] Enhanced natural language understanding
- [ ] Better code syntax highlighting
- [ ] Improved error recovery