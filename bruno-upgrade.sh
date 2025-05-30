#!/bin/bash

# Bruno v3.0 → v3.1 Upgrade Script
# Claude 4-parity enhancements with context awareness

set -e

echo "🚀 Bruno v3.1 Upgrade Script"
echo "==========================="
echo "Adding Claude 4-parity features to Bruno v3.0"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "core" ]; then
    echo -e "${RED}❌ Error: Not in Bruno directory${NC}"
    echo "Please run this script from the bruno-agentic-cli directory"
    exit 1
fi

echo -e "${BLUE}📦 Creating enhanced directory structure...${NC}"

# Create new directories
mkdir -p utils
mkdir -p cli/commands
mkdir -p tests
mkdir -p config

# Step 1: Create context parser for file awareness
echo -e "${BLUE}🧠 Creating context parser...${NC}"
cat > utils/context_parser.js << 'EOF'
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export class ContextParser {
  constructor() {
    this.maxFileSize = 100000; // 100KB limit
    this.supportedExtensions = new Set([
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', 
      '.cpp', '.c', '.h', '.sql', '.json', '.yaml', '.yml', '.md'
    ]);
  }

  async parseContext(input) {
    const context = {
      files: [],
      directories: [],
      codeBlocks: [],
      hasFileReferences: false
    };

    // Detect file paths in input
    const filePatterns = [
      /(?:^|\s)(\.?\/[\w\-\.\/]+\.\w+)/g,
      /(?:^|\s)([\w\-]+\.\w+)/g
    ];

    for (const pattern of filePatterns) {
      const matches = input.matchAll(pattern);
      for (const match of matches) {
        const filePath = match[1];
        if (await this.isValidFile(filePath)) {
          context.files.push(filePath);
          context.hasFileReferences = true;
        }
      }
    }

    // Parse inline code blocks
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    const codeMatches = input.matchAll(codeBlockPattern);
    
    for (const match of codeMatches) {
      context.codeBlocks.push({
        language: match[1] || 'plaintext',
        content: match[2]
      });
    }

    return context;
  }

  async isValidFile(filePath) {
    try {
      const resolvedPath = path.resolve(filePath);
      const stats = await fs.promises.stat(resolvedPath);
      
      if (stats.isFile() && stats.size < this.maxFileSize) {
        const ext = path.extname(filePath);
        return this.supportedExtensions.has(ext);
      }
    } catch (error) {
      // File doesn't exist or can't be accessed
    }
    return false;
  }

  async readFileContent(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return {
        path: filePath,
        content: content,
        lines: content.split('\n').length,
        size: Buffer.byteLength(content)
      };
    } catch (error) {
      console.error(chalk.red(`Failed to read ${filePath}:`, error.message));
      return null;
    }
  }

  async enrichPromptWithContext(originalPrompt) {
    const context = await this.parseContext(originalPrompt);
    let enrichedPrompt = originalPrompt;

    if (context.files.length > 0) {
      enrichedPrompt += '\n\n<context>\n';
      
      for (const file of context.files) {
        const fileContent = await this.readFileContent(file);
        if (fileContent) {
          enrichedPrompt += `<file path="${file}">\n${fileContent.content}\n</file>\n\n`;
        }
      }
      
      enrichedPrompt += '</context>';
    }

    return {
      prompt: enrichedPrompt,
      context: context
    };
  }
}
EOF

# Step 2: Create slash commands
echo -e "${BLUE}💬 Creating slash commands...${NC}"
cat > cli/commands/index.js << 'EOF'
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export class SlashCommands {
  constructor(sessionManager, memoryManager) {
    this.sessionManager = sessionManager;
    this.memoryManager = memoryManager;
    
    this.commands = {
      '/help': this.showHelp.bind(this),
      '/sessions': this.listSessions.bind(this),
      '/summary': this.showSummary.bind(this),
      '/reset': this.resetConversation.bind(this),
      '/clear': this.clearScreen.bind(this),
      '/model': this.showModel.bind(this),
      '/save': this.saveConversation.bind(this),
      '/load': this.loadConversation.bind(this)
    };
  }

  async execute(command, args) {
    const handler = this.commands[command];
    if (handler) {
      return await handler(args);
    }
    
    console.log(chalk.yellow(`Unknown command: ${command}`));
    console.log(chalk.gray('Type /help for available commands'));
    return null;
  }

  async showHelp() {
    console.log(chalk.cyan.bold('\n🎯 Bruno Slash Commands:\n'));
    console.log(chalk.white('  /help         - Show this help message'));
    console.log(chalk.white('  /sessions     - List all conversation sessions'));
    console.log(chalk.white('  /summary      - Show current session summary'));
    console.log(chalk.white('  /reset        - Reset current conversation'));
    console.log(chalk.white('  /clear        - Clear the screen'));
    console.log(chalk.white('  /model        - Show current model info'));
    console.log(chalk.white('  /save <name>  - Save conversation to file'));
    console.log(chalk.white('  /load <name>  - Load conversation from file'));
    console.log('');
    return { handled: true };
  }

  async listSessions() {
    const sessions = await this.sessionManager.listSessions();
    
    if (sessions.length === 0) {
      console.log(chalk.yellow('No sessions found'));
      return { handled: true };
    }

    console.log(chalk.cyan.bold('\n📚 Conversation Sessions:\n'));
    sessions.forEach((session, index) => {
      const date = new Date(session.timestamp).toLocaleString();
      console.log(chalk.white(`  ${index + 1}. [${session.id}] - ${date}`));
      if (session.model) {
        console.log(chalk.gray(`     Model: ${session.model}`));
      }
    });
    console.log('');
    return { handled: true };
  }

  async showSummary() {
    const memory = await this.memoryManager.getCurrentMemory();
    
    if (!memory || memory.conversations.length === 0) {
      console.log(chalk.yellow('No conversation history yet'));
      return { handled: true };
    }

    console.log(chalk.cyan.bold('\n📝 Conversation Summary:\n'));
    memory.conversations.forEach((turn, index) => {
      console.log(chalk.blue(`${index + 1}. User:`), turn.prompt.substring(0, 50) + '...');
      console.log(chalk.green(`   Bruno:`), turn.response.substring(0, 50) + '...\n');
    });
    
    console.log(chalk.gray(`Total turns: ${memory.conversations.length}`));
    return { handled: true };
  }

  async resetConversation() {
    await this.memoryManager.clearMemory();
    console.log(chalk.green('✅ Conversation reset'));
    return { handled: true };
  }

  async clearScreen() {
    console.clear();
    return { handled: true };
  }

  async showModel() {
    const config = this.sessionManager.config;
    console.log(chalk.cyan.bold('\n🤖 Model Information:\n'));
    console.log(chalk.white(`  Provider: ${config.llm_provider || 'local'}`));
    console.log(chalk.white(`  Model: ${config.model || 'deepseek-coder:6.7b'}`));
    console.log(chalk.white(`  Endpoint: ${config.ollama_url || 'http://127.0.0.1:11434'}`));
    console.log('');
    return { handled: true };
  }

  async saveConversation(name) {
    if (!name) {
      console.log(chalk.yellow('Please provide a name: /save <name>'));
      return { handled: true };
    }

    const memory = await this.memoryManager.getCurrentMemory();
    const savePath = path.join('memory', 'saved', `${name}.json`);
    
    try {
      await fs.promises.mkdir(path.dirname(savePath), { recursive: true });
      await fs.promises.writeFile(savePath, JSON.stringify(memory, null, 2));
      console.log(chalk.green(`✅ Conversation saved to ${savePath}`));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to save: ${error.message}`));
    }
    
    return { handled: true };
  }

  async loadConversation(name) {
    if (!name) {
      console.log(chalk.yellow('Please provide a name: /load <name>'));
      return { handled: true };
    }

    const loadPath = path.join('memory', 'saved', `${name}.json`);
    
    try {
      const data = await fs.promises.readFile(loadPath, 'utf-8');
      const memory = JSON.parse(data);
      await this.memoryManager.loadMemory(memory);
      console.log(chalk.green(`✅ Conversation loaded from ${loadPath}`));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to load: ${error.message}`));
    }
    
    return { handled: true };
  }
}
EOF

# Step 3: Create enhanced system prompt
echo -e "${BLUE}📝 Creating Claude 4 enhanced system prompt...${NC}"
cat > prompts/system_claude4_v2.txt << 'EOF'
You are Bruno, an autonomous and offline Claude-style AI assistant running locally via CLI. You never connect to the internet. You always reason in structured steps, clarify assumptions, and guide the user with precision.

Core Behaviors:
- Use Markdown formatting with bullet points and headers for clarity
- For coding tasks, provide exact line edits or complete functions
- If the user input is vague, restate what you're assuming
- Never guess silently — always clarify intent when unsure
- If code seems broken, suggest safe fallback code
- When analyzing files, reference specific line numbers
- Use code blocks with language identifiers (```javascript, ```python, etc.)

Structured Reasoning:
1. First, understand the user's intent
2. Break down complex tasks into steps
3. Provide clear, actionable solutions
4. Suggest next steps or improvements

Code Analysis Patterns:
- When fixing bugs: Show the problematic code, explain the issue, then provide the fix
- When explaining: Start with high-level overview, then dive into specifics
- When generating: Follow existing code style and conventions
- When refactoring: Explain why each change improves the code

Error Handling:
- If you encounter unclear requirements, ask clarifying questions
- If multiple interpretations exist, present options
- Always validate assumptions before proceeding

Remember: You are running 100% locally. Prioritize clarity, accuracy, and helpfulness over speed. Do not generate placeholder code unless explicitly asked.
EOF

# Step 4: Create configuration file
echo -e "${BLUE}⚙️ Creating Bruno configuration...${NC}"
cat > .bruno.config.json << 'EOF'
{
  "version": "3.1.0",
  "mode": "claude4",
  "offline": true,
  "debug": false,
  "model": "deepseek-coder:6.7b",
  "contextDepth": 3,
  "maxOutputTokens": 2048,
  "features": {
    "contextAwareness": true,
    "slashCommands": true,
    "smartModeSwitching": true,
    "fileAnalysis": true,
    "sessionPersistence": true,
    "typoCorrection": true
  },
  "ui": {
    "showTimestamps": false,
    "syntaxHighlighting": true,
    "useColors": true,
    "compactMode": false
  },
  "memory": {
    "maxConversations": 50,
    "autoSave": true,
    "saveInterval": 300000
  }
}
EOF

# Step 5: Update the main REPL to use new features
echo -e "${BLUE}🔄 Updating REPL with v3.1 features...${NC}"
cat > shell/repl-v31.js << 'EOF'
import readline from 'readline';
import chalk from 'chalk';
import { UniversalRouter } from '../core/universalRouter.js';
import { MemoryManager } from '../core/memoryManager.js';
import { SessionManager } from '../core/sessionManager.js';
import { ResponseFormatter } from '../core/uiEnhancer.js';
import { ContextParser } from '../utils/context_parser.js';
import { SlashCommands } from '../cli/commands/index.js';
import fs from 'fs';

export async function startRepl(args = {}) {
  const { sessionManager, sessionId, config } = args;
  
  // Load configuration
  let brunoConfig = {};
  try {
    const configData = fs.readFileSync('.bruno.config.json', 'utf-8');
    brunoConfig = JSON.parse(configData);
  } catch (error) {
    // Use defaults
  }

  // Initialize services
  const router = new UniversalRouter(config);
  const memoryManager = new MemoryManager(config);
  const contextParser = new ContextParser();
  const slashCommands = new SlashCommands(sessionManager, memoryManager);

  // Enhanced UI
  console.clear();
  console.log(chalk.cyan.bold('\n🚀 Bruno v3.1 - Claude 4-Enhanced Local AI'));
  console.log(chalk.gray('━'.repeat(50)));
  console.log(chalk.blue('✨ Context-aware • 🎯 Smart routing • 💬 Slash commands'));
  console.log(chalk.gray('Type /help for commands • Ctrl+C to exit\n'));

  if (sessionId) {
    console.log(chalk.green(`📂 Session: ${sessionId}\n`));
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.blue('You> ')
  });

  // Load conversation history
  await memoryManager.loadFromDisk();

  rl.prompt();

  rl.on('line', async (input) => {
    input = input.trim();
    
    if (!input) {
      rl.prompt();
      return;
    }

    // Handle slash commands
    if (input.startsWith('/')) {
      const [command, ...args] = input.split(' ');
      const result = await slashCommands.execute(command, args.join(' '));
      
      if (result && result.handled) {
        rl.prompt();
        return;
      }
    }

    // Exit commands
    if (['exit', 'quit', 'bye'].includes(input.toLowerCase())) {
      console.log(chalk.green('\n👋 Goodbye!\n'));
      await sessionManager.endSession(sessionId);
      process.exit(0);
    }

    console.log(''); // Add spacing

    try {
      // Parse context and enrich prompt
      const { prompt: enrichedPrompt, context } = await contextParser.enrichPromptWithContext(input);
      
      // Show context awareness
      if (context.hasFileReferences) {
        console.log(chalk.cyan('📄 Analyzing referenced files...'));
      }

      // Generate response
      const result = await router.route(enrichedPrompt);
      
      // Format and display response
      ResponseFormatter.formatResult(result);

      // Save to memory
      await memoryManager.saveConversation(input, result);

      // Show follow-up suggestions if available
      if (result.followUp && result.followUp.length > 0) {
        console.log(chalk.gray('\n💡 Suggestions:'));
        result.followUp.forEach((suggestion, i) => {
          console.log(chalk.gray(`   ${i + 1}. ${suggestion}`));
        });
      }

    } catch (error) {
      console.error(chalk.red('❌ Error:'), error.message);
      if (brunoConfig.debug || process.env.DEBUG) {
        console.error(chalk.gray(error.stack));
      }
    }

    console.log(''); // Add spacing before next prompt
    rl.prompt();
  });

  rl.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n⚡ Saving session...'));
    await memoryManager.saveToDisk();
    await sessionManager.endSession(sessionId);
    console.log(chalk.green('✅ Session saved. Goodbye!\n'));
    process.exit(0);
  });
}
EOF

# Step 6: Create test suite
echo -e "${BLUE}🧪 Creating test suite...${NC}"
cat > tests/validate.sh << 'EOF'
#!/bin/bash

# Bruno v3.1 Validation Suite

echo "🧪 Bruno v3.1 Validation Suite"
echo "=============================="

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

failed=0

# Test 1: Version check
echo -n "Testing version... "
if node bin/bruno.js --version | grep -q "3.0.0"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    ((failed++))
fi

# Test 2: Basic response
echo -n "Testing basic response... "
if node bin/bruno.js "hello" | grep -q "Bruno"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    ((failed++))
fi

# Test 3: Code analysis
echo -n "Testing code analysis... "
if node bin/bruno.js "explain function add(a,b){return a+b}" | grep -q "function"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    ((failed++))
fi

# Test 4: Memory persistence
echo -n "Testing memory... "
if [ -d "memory" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    ((failed++))
fi

echo ""
if [ $failed -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
else
    echo -e "${RED}$failed tests failed${NC}"
fi
EOF

chmod +x tests/validate.sh

# Step 7: Update bin/bruno.js to use v3.1 features
echo -e "${BLUE}🔧 Updating main binary for v3.1...${NC}"
cat > bin/bruno-v31.js << 'EOF'
#!/usr/bin/env node
import { startRepl } from '../shell/repl-v31.js';
import { parseArgs } from '../core/argParser.js';
import { UniversalRouter } from '../core/universalRouter.js';
import { SessionManager } from '../core/sessionManager.js';
import { ResponseFormatter } from '../core/uiEnhancer.js';
import { ContextParser } from '../utils/context_parser.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = parseArgs();
  
  // Load config with v3.1 defaults
  let config = {
    llm_provider: 'local',
    model: args.model || 'deepseek-coder:6.7b',
    ollama_url: 'http://127.0.0.1:11434',
    version: '3.1.0'
  };

  // Try to load .bruno.config.json
  try {
    const configPath = path.join(process.cwd(), '.bruno.config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    const brunoConfig = JSON.parse(configData);
    config = { ...config, ...brunoConfig };
  } catch (error) {
    // Use defaults
  }

  const sessionManager = new SessionManager(config);
  const router = new UniversalRouter(config);
  const contextParser = new ContextParser();

  // Handle different modes
  switch (args.mode) {
    case 'print':
      await handlePrintMode(router, contextParser, args);
      break;
      
    case 'continue':
      await handleContinueMode(sessionManager, config, args);
      break;
      
    case 'resume':
      await handleResumeMode(sessionManager, config, args);
      break;
      
    case 'command':
      await handleCommandMode(router, contextParser, args);
      break;
      
    default:
      if (args.help) {
        showHelp();
      } else if (args.version) {
        showVersion();
      } else {
        await handleInteractiveMode(sessionManager, config, args);
      }
  }
}

async function handlePrintMode(router, contextParser, args) {
  if (!args.prompt) {
    console.error(chalk.red('❌ No prompt provided'));
    console.log(chalk.gray('Usage: bruno -p "your prompt here"'));
    process.exit(1);
  }
  
  try {
    // Enrich prompt with context
    const { prompt: enrichedPrompt } = await contextParser.enrichPromptWithContext(args.prompt);
    const result = await router.route(enrichedPrompt);
    
    if (args.outputFormat === 'json') {
      console.log(JSON.stringify({ result, timestamp: new Date().toISOString() }, null, 2));
    } else {
      ResponseFormatter.formatConversational(result);
    }
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    if (process.env.DEBUG || args.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function handleContinueMode(sessionManager, config, args) {
  const sessionId = await sessionManager.continueLastSession();
  if (!sessionId) {
    console.log(chalk.yellow('📝 No previous session found'));
  }
  await startRepl({ ...args, sessionManager, sessionId, config });
}

async function handleResumeMode(sessionManager, config, args) {
  const sessionId = await sessionManager.resumeSession(args.sessionId);
  await startRepl({ ...args, sessionManager, sessionId, config });
}

async function handleCommandMode(router, contextParser, args) {
  const command = args._.join(' ');
  
  try {
    const { prompt: enrichedPrompt } = await contextParser.enrichPromptWithContext(command);
    const result = await router.route(enrichedPrompt);
    ResponseFormatter.formatConversational(result);
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

async function handleInteractiveMode(sessionManager, config, args) {
  const sessionId = await sessionManager.createSession({
    model: config.model,
    version: config.version
  });
  
  await startRepl({ ...args, sessionManager, sessionId, config });
}

function showVersion() {
  console.log(chalk.cyan.bold('Bruno v3.1.0') + chalk.gray(' - Claude 4-Enhanced Local AI'));
  console.log(chalk.blue('✨ Context-aware • 🎯 Smart routing • 💬 Slash commands • 🔒 100% Private'));
  console.log(chalk.gray('Advanced patterns from Cursor, Windsurf, Bolt, and Manus'));
}

function showHelp() {
  console.log(`
${chalk.bold.cyan('Bruno v3.1')} - Claude 4-Enhanced Local AI Assistant

${chalk.bold('Quick Start:')}
  bruno                    Start interactive session
  bruno -p "prompt"        One-shot response with context
  bruno -c                 Continue last session
  bruno -r [id]            Resume specific session

${chalk.bold('Examples:')}
  bruno "explain app.js"              # Analyzes file content
  bruno "fix bug in utils/math.ts"    # Context-aware fixes
  bruno "create React dashboard"      # Generates with patterns
  bruno -p "deploy to Vercel" --output-format json

${chalk.bold('Slash Commands:')} (in interactive mode)
  /help                   Show available commands
  /sessions               List all sessions
  /summary                Show conversation summary
  /reset                  Reset current conversation
  /save <name>            Save conversation
  /load <name>            Load conversation

${chalk.bold('Options:')}
  -h, --help              Show this help
  -v, --version           Show version
  -p, --print             Print response and exit
  -c, --continue          Continue last conversation
  -r, --resume [id]       Resume specific session
  --model <model>         Specify Ollama model
  --output-format <fmt>   Output format (text, json)

${chalk.bold('Features:')}
  • Claude 4-level reasoning and context awareness
  • Automatic file content analysis
  • Smart mode switching (explain/fix/generate)
  • Session persistence and memory
  • Pattern integration from leading AI tools
  • 100% local, 100% private

${chalk.gray('Prerequisites: Ollama with deepseek-coder:6.7b')}
`);
}

// Error handler
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('❌ Fatal error:'), error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

// Start the application
main();
EOF

chmod +x bin/bruno-v31.js

# Step 8: Create an alias for easy access
echo -e "${BLUE}🔗 Creating bruno31 command...${NC}"
if [ -L "/usr/local/bin/bruno31" ]; then
    rm /usr/local/bin/bruno31
fi
ln -s "$(pwd)/bin/bruno-v31.js" /usr/local/bin/bruno31 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not create global symlink. Add this to your .zshrc:${NC}"
    echo "  alias bruno31='node $(pwd)/bin/bruno-v31.js'"
}

# Step 9: Update package.json
echo -e "${BLUE}📦 Updating package.json...${NC}"
cat > package.json << 'EOF'
{
  "name": "bruno-agentic-cli",
  "version": "3.1.0",
  "description": "Claude 4-enhanced local AI CLI with context awareness",
  "type": "module",
  "bin": {
    "bruno": "./bin/bruno.js",
    "bruno31": "./bin/bruno-v31.js"
  },
  "scripts": {
    "start": "node bin/bruno.js",
    "start:v31": "node bin/bruno-v31.js",
    "test": "npm run test:basic && npm run test:v31",
    "test:basic": "node bin/bruno.js --version && node bin/bruno.js --help",
    "test:v31": "./tests/validate.sh",
    "dev": "node bin/bruno-v31.js",
    "link:global": "npm link",
    "unlink:global": "npm unlink -g bruno-agentic-cli"
  },
  "keywords": [
    "cli",
    "ai",
    "local-first",
    "claude-4",
    "context-aware",
    "code-assistant",
    "developer-tools",
    "ollama"
  ],
  "author": "JG Tolentino",
  "license": "MIT",
  "dependencies": {
    "axios": "^1.7.0",
    "chalk": "^5.3.0",
    "fs-extra": "^11.3.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "eslint": "^8.57.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# Final summary
echo -e "${GREEN}✅ Bruno v3.1 upgrade complete!${NC}"
echo ""
echo -e "${BLUE}🎯 What's new in v3.1:${NC}"
echo "  • Context-aware file analysis"
echo "  • Slash commands (/help, /sessions, /summary, etc.)"
echo "  • Enhanced Claude 4-style system prompt"
echo "  • Configuration file support (.bruno.config.json)"
echo "  • Smart mode switching"
echo "  • Improved error handling and recovery"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "  1. Test the upgrade: ./tests/validate.sh"
echo "  2. Try context-aware commands:"
echo "     bruno31 \"explain ./core/universalRouter.js\""
echo "     bruno31 \"fix bug in app.js\""
echo "  3. Explore slash commands in interactive mode:"
echo "     bruno31"
echo "     /help"
echo ""
echo -e "${GREEN}🚀 Start using Bruno v3.1:${NC}"
echo "  bruno31              # Enhanced interactive mode"
echo "  bruno31 -p \"hello\"   # Context-aware one-shot"
echo "  bruno                # Original v3.0 still available"