# Bruno v3.0 Development Guide

## 🚀 Quick Start

### Prerequisites
1. **Node.js 18+** - https://nodejs.org
2. **Ollama** - https://ollama.ai
3. **DeepSeek Coder model**:
   ```bash
   ollama pull deepseek-coder:6.7b
   ollama serve
   ```

### Development Installation

```bash
# Clone and install
git clone <your-repo>
cd bruno-agentic-cli
npm install

# Test the installation
node bin/bruno.js --version
node bin/bruno.js --help
```

### Testing Commands

```bash
# Test direct commands
node bin/bruno.js "create react component"
node bin/bruno.js "deploy to vercel"
node bin/bruno.js plan "build a dashboard"

# Test REPL mode
node bin/bruno.js
# Then type: help
```

## 🏗️ Architecture Overview

### Core Components

1. **AdvancedPatternsEngine** (`/core/advancedPatternsEngine.js`)
   - Analyzes requests and applies AI patterns
   - Integrates Cursor, Windsurf, Bolt, and Manus patterns

2. **UniversalRouter** (`/core/universalRouter.js`)
   - Routes commands to appropriate engines
   - Handles typo correction and intent detection

3. **KnowledgeBase** (`/core/knowledgeBase.js`)
   - Stores patterns, templates, and best practices
   - Provides contextual suggestions

4. **Specialized Engines**:
   - `CloudMastery.js` - Cloud service deployment
   - `FrontendEngine.js` - React/TypeScript/Tailwind
   - `DatabaseExpert.js` - SQL/NoSQL operations
   - `IoTEdgeEngine.js` - IoT device pipelines
   - `VisualArtistEngine.js` - Artist platform generation

### Pattern Integration

- **Cursor**: Semantic search, holistic editing, context awareness
- **Windsurf**: AI Flow paradigm, ripgrep integration, professional communication
- **Bolt**: Artifact-based creation, dependency-first development
- **Manus**: Agent loop execution, todo.md planning, authoritative data

## 🧪 Testing

### Unit Tests
```bash
# Test individual components
node -e "import('./core/universalRouter.js').then(m => console.log('Router loaded'))"
node -e "import('./core/advancedPatternsEngine.js').then(m => console.log('Patterns loaded'))"
```

### Integration Tests
```bash
# Test different command types
node bin/bruno.js "fix typescript errors" --patterns cursor
node bin/bruno.js "create dashboard" --patterns bolt
node bin/bruno.js "deploy app" --patterns windsurf
node bin/bruno.js plan "complex task" --patterns manus
```

### REPL Testing
```bash
# Start REPL and test commands
node bin/bruno.js
# Try: help, explain <file>, create react app, deploy vercel
```

## 🔧 Development Workflow

### Adding New Patterns
1. Update `AdvancedPatternsEngine.js` with new pattern definition
2. Add pattern detection logic in `analyzeRequest()`
3. Update `KnowledgeBase.js` with new templates
4. Test with `--patterns <name>` flag

### Adding New Engines
1. Create new engine in `/core/`
2. Import in `UniversalRouter.js`
3. Add routing logic in `route()` method
4. Update help text and documentation

### Configuration
Edit `/config/brunorc.yaml`:
```yaml
llm_provider: local
model: deepseek-coder:6.7b
ollama_url: http://127.0.0.1:11434
allow_cloud: false
offline_mode: true
```

## 🐛 Common Issues

### Import Errors
- Ensure all new files export classes/functions properly
- Check for missing methods referenced in constructors
- Verify file paths in import statements

### Ollama Connection
```bash
# Check Ollama status
ollama list
ollama ps

# Restart if needed
killall ollama
ollama serve
```

### Argument Parsing
- `args._` contains positional arguments
- `args.options` contains flag-based options
- Use `args.patterns`, `args.verbose`, `args.plan` for new flags

## 📦 Building for Distribution

```bash
# Update version
npm version patch  # or minor/major

# Test globally
npm link
bruno --version

# Package for npm
npm pack
```

## 🔍 Debugging

### Enable Verbose Mode
```bash
node bin/bruno.js "command" --verbose
```

### Check Pattern Detection
```bash
node bin/bruno.js "command" --plan  # Shows analysis before execution
```

### Debug REPL
```bash
# Add debug logs in repl-local.js
console.log('Debug:', { input, analysis, result });
```

## 🚀 Performance

- **Local Processing**: No network latency
- **Pattern Caching**: Patterns loaded once at startup
- **Streaming**: Ollama responses stream for immediate feedback
- **Memory**: Conversation history stored locally

## 🔐 Security

- **100% Local**: No data sent to external services
- **Sandboxed Shell**: Shell commands run in controlled environment
- **File System**: Automatic backups before modifications
- **No Telemetry**: Zero tracking or analytics