import readline from 'readline';
import chalk from 'chalk';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { OllamaClient } from '../core/ollamaClient.js';
import { LocalOnlyGuard } from '../core/localOnlyGuard.js';
import { loadPrompt, loadToolSchema } from '../core/promptLoader.js';
import { handleTool, parseToolCall } from '../core/toolRouter.js';
import { MemoryManager } from '../core/memoryManager.js';
import { ShellSandbox } from '../core/shellSandbox.js';
import { FileSystemHandler } from '../core/fsHandler.js';
import { UniversalRouter } from '../core/universalRouter.js';
import { KnowledgeBase } from '../core/knowledgeBase.js';
import { AdvancedPatternsEngine } from '../core/advancedPatternsEngine.js';
import { 
  ThinkingIndicator, 
  ProgressTracker, 
  ResponseFormatter, 
  StatusDashboard, 
  InteractiveHelp,
  ContextualUI,
  EnhancedPrompt 
} from '../core/uiEnhancer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const memory = new MemoryManager();

export async function startRepl(args) {
  // Load config
  const configPath = path.join(__dirname, '../config/brunorc.yaml');
  const config = yaml.load(await fs.readFile(configPath, 'utf8'));
  
  // Enforce local-first
  const guard = new LocalOnlyGuard(config);
  guard.enforceLocalFirst();
  
  // Initialize Ollama client
  const ollama = new OllamaClient(config);
  const isHealthy = await ollama.checkHealth();
  
  if (!isHealthy) {
    console.log(chalk.red('\n❌ Cannot start Bruno without Ollama'));
    process.exit(1);
  }

  const systemPrompt = loadPrompt();
  const toolSchema = loadToolSchema();
  const shellSandbox = new ShellSandbox(config.shell);
  const fsHandler = new FileSystemHandler({
    sandbox_root: process.cwd(),
    backup_enabled: true
  });

  // Session management
  const sessionManager = args.sessionManager;
  const sessionId = args.sessionId;
  
  console.log(chalk.cyan.bold('\n🤖 Bruno v3.0 - Advanced Local-First CLI'));
  console.log(chalk.gray('100% private, 100% offline, 100% powerful'));
  console.log(chalk.blue('Enhanced with patterns from Cursor, Windsurf, Bolt & Manus'));
  
  // Show status dashboard
  const sessionContext = sessionId ? await sessionManager.getSessionContext(sessionId) : null;
  StatusDashboard.show(
    sessionContext ? { 
      id: sessionId, 
      messageCount: sessionContext.recentMessages.length 
    } : null,
    { model: config.model || 'deepseek-coder:6.7b-instruct-q4_K_M' },
    'ready'
  );
  
  // Show helpful suggestions
  InteractiveHelp.suggestCommands({
    hasFiles: true, // Could check if in project directory
    inProject: true
  });
  
  // Initialize advanced components
  const router = new UniversalRouter(config);
  const kb = new KnowledgeBase();
  const advancedPatterns = new AdvancedPatternsEngine(config);

  // Enhanced prompt with status
  const enhancedPrompt = new EnhancedPrompt();
  if (sessionId) {
    enhancedPrompt.updateSession(sessionId);
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: enhancedPrompt.getPrompt()
  });

  // Handle direct command execution
  if (args.command && args.file) {
    await executeCommand(args.command, args.file, ollama, systemPrompt);
    process.exit(0);
  }

  rl.prompt();

  rl.on('line', async (input) => {
    input = input.trim();

    if (input === 'exit' || input === 'quit') {
      console.log(chalk.yellow('Goodbye! 👋'));
      process.exit(0);
    }

    if (input === 'help') {
      showHelp();
      rl.prompt();
      return;
    }

    if (input === 'clear') {
      console.clear();
      rl.prompt();
      return;
    }

    if (input === 'memory') {
      console.log(chalk.blue('Memory Summary:'));
      console.log(memory.getSummary());
      
      if (sessionManager && sessionId) {
        const sessionHistory = await sessionManager.getSessionHistory(sessionId, 5);
        if (sessionHistory.length > 0) {
          console.log(chalk.cyan('\n📝 Recent Session History:'));
          sessionHistory.forEach((msg, index) => {
            const time = new Date(msg.timestamp).toLocaleTimeString();
            console.log(chalk.gray(`${index + 1}. [${time}] ${msg.input.substring(0, 50)}...`));
          });
        }
      }
      
      rl.prompt();
      return;
    }
    
    if (input.startsWith('/')) {
      await handleSlashCommand(input, sessionManager, sessionId, rl);
      return;
    }

    if (input.startsWith('shell ') || input.startsWith('run ')) {
      const command = input.replace(/^(shell|run) /, '');
      await executeShellCommand(command, shellSandbox);
      rl.prompt();
      return;
    }

    // File system commands
    if (input.startsWith('read ')) {
      const filePath = input.replace('read ', '').trim();
      await executeFileRead(filePath, fsHandler);
      rl.prompt();
      return;
    }

    if (input.startsWith('write ')) {
      const parts = input.split(' ');
      const filePath = parts[1];
      const content = parts.slice(2).join(' ').replace(/^["']|["']$/g, '');
      await executeFileWrite(filePath, content, fsHandler);
      rl.prompt();
      return;
    }

    if (input.startsWith('list ') || input.startsWith('ls ')) {
      const dirPath = input.replace(/^(list|ls) /, '').trim() || '.';
      await executeDirectoryList(dirPath, fsHandler);
      rl.prompt();
      return;
    }

    if (input.startsWith('tree ')) {
      const dirPath = input.replace('tree ', '').trim() || '.';
      await executeTree(dirPath, fsHandler);
      rl.prompt();
      return;
    }

    if (input.startsWith('find ')) {
      const pattern = input.replace('find ', '').trim();
      await executeFindFiles(pattern, fsHandler);
      rl.prompt();
      return;
    }

    if (input.startsWith('analyze ') || input.startsWith('project ')) {
      const projectPath = input.replace(/^(analyze|project) /, '').trim() || '.';
      await executeProjectAnalysis(projectPath, fsHandler);
      rl.prompt();
      return;
    }

    // Route through Universal Router for advanced pattern processing
    try {
      // Enhanced UI feedback
      enhancedPrompt.updateStatus('thinking');
      const thinkingIndicator = new ThinkingIndicator();
      thinkingIndicator.start('Analyzing request');
      
      // Try Universal Router first for intelligent routing
      const routingResult = await router.route(input);
      
      thinkingIndicator.stop();
      enhancedPrompt.updateStatus('ready');
      
      // Enhanced response formatting
      if (routingResult && typeof routingResult === 'object' && routingResult.type) {
        // Use enhanced response formatter instead of formatStructuredResponse
        ResponseFormatter.formatConversational(routingResult);
      } else if (routingResult && routingResult !== input) {
        // Router returned a string response
        ResponseFormatter.formatConversational(routingResult);
      } else {
        // Fallback to direct Ollama processing with better UI
        thinkingIndicator.start('Processing with local LLM');
        
        await processWithOllama(input, ollama, systemPrompt, async (chunk) => {
          process.stdout.write(chunk);
        });
        
        thinkingIndicator.stop();
      }
      
      console.log('');

      // Add to memory
      memory.addToMemory({
        type: 'interaction',
        input: input,
        timestamp: new Date().toISOString()
      });
      
      // Save to session if available
      if (sessionManager && sessionId) {
        await sessionManager.addMessage(sessionId, input, typeof routingResult === 'object' ? routingResult.explanation || JSON.stringify(routingResult) : routingResult);
      }

    } catch (error) {
      enhancedPrompt.updateStatus('error');
      
      // Enhanced error handling with suggestions
      ResponseFormatter.showError(error, {
        suggestions: [
          'Try rephrasing your request',
          'Use more specific commands like "create react app"',
          'Check that Ollama is running with "ollama list"',
          'Try basic commands like "help" or "memory"'
        ],
        debug: args.debug || args.verbose
      });
      
      // Fallback to basic processing on error
      const thinkingIndicator = new ThinkingIndicator();
      thinkingIndicator.start('Trying alternative approach');
      
      try {
        await processWithOllama(input, ollama, systemPrompt, async (chunk) => {
          process.stdout.write(chunk);
        });
        enhancedPrompt.updateStatus('ready');
      } catch (fallbackError) {
        ResponseFormatter.showError(fallbackError, {
          suggestions: [
            'Check Ollama connection: ollama serve',
            'Verify model is available: ollama list',
            'Restart Bruno and try again'
          ],
          debug: args.debug || args.verbose
        });
      } finally {
        thinkingIndicator.stop();
        enhancedPrompt.updateStatus('ready');
      }
    }

    rl.prompt();
  });
}

async function processWithOllama(input, ollama, systemPrompt, onChunk) {
  const recentContext = memory.getRecentContext(3);
  const contextString = recentContext.map(m => 
    `User: ${m.input}\nAssistant: ${m.response || 'Processing...'}`
  ).join('\n\n');

  const fullPrompt = `${systemPrompt}\n\n${contextString ? contextString + '\n\n' : ''}User: ${input}\n\nAssistant:`;

  const response = await ollama.generateStream(fullPrompt, onChunk);
  
  // Check for tool calls
  const toolCalls = parseToolCall(response);
  for (const call of toolCalls) {
    console.log(chalk.yellow(`\nExecuting tool: ${call.tool}`));
    const result = await handleTool(call.tool, call.args);
    console.log(result);
  }
  
  return response;
}

async function executeCommand(command, file, ollama, systemPrompt) {
  console.log(chalk.yellow(`Executing: ${command} on ${file}`));
  
  const input = `Please ${command} the following file: ${file}`;
  await processWithOllama(input, ollama, systemPrompt, (chunk) => {
    process.stdout.write(chunk);
  });
  console.log('\n');
}

async function executeShellCommand(command, sandbox) {
  const result = await sandbox.execute(command);
  if (result.blocked) {
    console.log(chalk.red(`❌ Command blocked: ${command}`));
    console.log(chalk.yellow('Reason: Potentially dangerous command'));
  } else if (result.warning) {
    console.log(chalk.yellow(`⚠️  Warning: ${result.warning}`));
    console.log(chalk.gray('Executing with caution...'));
    console.log(result.output);
  } else {
    console.log(result.output);
  }
}

async function executeFileRead(filePath, fsHandler) {
  const result = await fsHandler.readFile(filePath);
  if (result.success) {
    console.log(chalk.cyan(`\n📄 ${filePath}`));
    console.log(chalk.gray(`Size: ${result.size} bytes | Modified: ${result.modified.toLocaleString()}`));
    console.log('\n' + result.content);
  } else {
    console.log(chalk.red(`❌ ${result.error}`));
  }
}

async function executeFileWrite(filePath, content, fsHandler) {
  const result = await fsHandler.writeFile(filePath, content);
  if (result.success) {
    console.log(chalk.green(`✅ File ${result.action}: ${filePath}`));
    if (result.backup) {
      console.log(chalk.gray(`Backup created: ${result.backup}`));
    }
  } else {
    console.log(chalk.red(`❌ ${result.error}`));
  }
}

async function executeDirectoryList(dirPath, fsHandler) {
  const result = await fsHandler.listDirectory(dirPath);
  if (result.success) {
    console.log(chalk.cyan(`\n📁 ${result.path}`));
    console.table(result.items.map(item => ({
      Name: item.name,
      Type: item.type,
      Size: item.type === 'file' ? `${item.size} bytes` : '-',
      Extension: item.extension || '-'
    })));
  } else {
    console.log(chalk.red(`❌ ${result.error}`));
  }
}

async function executeTree(dirPath, fsHandler) {
  const tree = await fsHandler.generateTree(dirPath);
  const output = fsHandler.formatTree(tree);
  console.log(chalk.cyan(`\n🌳 Project Tree: ${dirPath}`));
  console.log(output);
}

async function executeFindFiles(pattern, fsHandler) {
  const result = await fsHandler.findFiles(pattern);
  if (result.success) {
    console.log(chalk.cyan(`\n🔍 Found ${result.results.length} files matching "${pattern}"`));
    result.results.forEach(file => {
      console.log(chalk.gray(`  ${file.relativePath}`));
    });
  } else {
    console.log(chalk.red(`❌ ${result.error}`));
  }
}

function formatStructuredResponse(result) {
  switch (result.type) {
    case 'cloud':
      console.log(chalk.cyan(`\n☁️  Supabase CLI Guide:`));
      console.log(chalk.white(result.explanation));
      console.log(chalk.yellow('\n📋 Commands:'));
      console.log(chalk.gray(result.command));
      if (result.followUp && result.followUp.length > 0) {
        console.log(chalk.yellow('\n💡 Next steps:'));
        result.followUp.forEach(cmd => console.log(chalk.gray(`  ${cmd}`)));
      }
      break;
      
    case 'frontend':
      console.log(chalk.green(`\n⚛️  Frontend Solution:`));
      console.log(chalk.white(result.explanation));
      if (result.code) {
        console.log(chalk.yellow('\n📝 Generated code:'));
        console.log(chalk.gray(result.code));
      }
      break;
      
    case 'database':
      console.log(chalk.blue(`\n🗄️  Database Solution:`));
      console.log(chalk.white(result.explanation));
      if (result.query) {
        console.log(chalk.yellow('\n📝 SQL Query:'));
        console.log(chalk.gray(result.query));
      }
      break;
      
    case 'iot':
      console.log(chalk.blue(`\n🔌 IoT Pipeline Solution:`));
      console.log(chalk.white(result.explanation));
      break;
      
    case 'artist':
      console.log(chalk.magenta(`\n🎨 Artist Platform Solution:`));
      console.log(chalk.white(result.explanation));
      break;
      
    case 'system':
      console.log(chalk.yellow(`\n⚙️  System Configuration:`));
      console.log(chalk.white(result.explanation));
      break;
      
    case 'meta':
      console.log(chalk.cyan(`\n🤖 About Bruno:`));
      console.log(chalk.white(result.explanation));
      break;
      
    case 'enhanced':
      console.log(chalk.green(`\n🔄 Enhanced Response:`));
      console.log(chalk.white(result.explanation));
      if (result.fallback_pattern) {
        console.log(chalk.gray(`\n📍 Enhanced from: ${result.fallback_pattern}`));
      }
      break;
      
    case 'deep_analysis':
      console.log(chalk.cyan(`\n🧠 Deep Analysis:`));
      console.log(chalk.white(result.explanation));
      if (result.confidence_boost) {
        console.log(chalk.gray(`\n💡 Analyzed locally with enhanced reasoning`));
      }
      break;
      
    case 'fallback':
      console.log(chalk.yellow(`\n🤔 Bruno's Best Guess:`));
      console.log(chalk.white(result.explanation));
      if (result.suggestions && result.suggestions.length > 0) {
        console.log(chalk.gray(`\n💭 Suggestions:`));
        result.suggestions.forEach(suggestion => {
          console.log(chalk.gray(`  • ${suggestion}`));
        });
      }
      break;
      
    default:
      console.log(chalk.cyan(`\n🤖 Bruno's Response:`));
      console.log(chalk.white(result.explanation || JSON.stringify(result, null, 2)));
      if (result.enhanced) {
        console.log(chalk.gray(`\n🔄 Enhanced with local LLM`));
      }
  }
}

async function executeProjectAnalysis(projectPath, fsHandler) {
  console.log(chalk.cyan(`\n📊 Analyzing project: ${projectPath}`));
  
  // Get directory listing
  const dirResult = await fsHandler.listDirectory(projectPath);
  if (!dirResult.success) {
    console.log(chalk.red(`❌ ${dirResult.error}`));
    return;
  }

  // Get project tree
  const tree = await fsHandler.generateTree(projectPath, 2);
  
  // Count files by type
  const fileTypes = {};
  const countFiles = (items) => {
    items.forEach(item => {
      if (item.type === 'file' && item.extension) {
        fileTypes[item.extension] = (fileTypes[item.extension] || 0) + 1;
      }
      if (item.children) countFiles(item.children);
    });
  };
  
  countFiles(tree);
  
  console.log(chalk.yellow('📈 Project Statistics:'));
  console.log(`  Total items: ${dirResult.items.length}`);
  console.log(`  Directories: ${dirResult.items.filter(i => i.type === 'directory').length}`);
  console.log(`  Files: ${dirResult.items.filter(i => i.type === 'file').length}`);
  
  console.log(chalk.yellow('\n📊 File Types:'));
  Object.entries(fileTypes).forEach(([ext, count]) => {
    console.log(`  ${ext}: ${count} files`);
  });
  
  console.log(chalk.yellow('\n🌳 Project Structure:'));
  console.log(fsHandler.formatTree(tree.slice(0, 10))); // Show first 10 items
}

async function handleSlashCommand(input, sessionManager, sessionId, rl) {
  const command = input.slice(1).toLowerCase();
  const parts = command.split(' ');
  const cmd = parts[0];
  const args = parts.slice(1);
  
  switch (cmd) {
    case 'help':
      showHelp();
      break;
      
    case 'memory':
      if (sessionManager && sessionId) {
        const history = await sessionManager.getSessionHistory(sessionId, 10);
        console.log(chalk.cyan('\n📝 Session History:'));
        history.forEach((msg, index) => {
          const time = new Date(msg.timestamp).toLocaleTimeString();
          console.log(chalk.gray(`${index + 1}. [${time}] ${msg.input}`));
          if (msg.output) {
            console.log(chalk.gray(`   → ${msg.output.substring(0, 100)}...`));
          }
        });
      } else {
        console.log(chalk.yellow('⚠️  No active session'));
      }
      break;
      
    case 'sessions':
      if (sessionManager) {
        await sessionManager.listSessions(10);
      } else {
        console.log(chalk.yellow('⚠️  Session manager not available'));
      }
      break;
      
    case 'stats':
      if (sessionManager) {
        const stats = await sessionManager.getStats();
        console.log(chalk.cyan('\n📊 Session Statistics:'));
        console.log(chalk.gray(`Total sessions: ${stats.totalSessions}`));
        console.log(chalk.gray(`Total messages: ${stats.totalMessages}`));
        console.log(chalk.gray(`Current session: ${stats.currentSession || 'None'}`));
      }
      break;
      
    case 'clear':
      console.clear();
      break;
      
    default:
      console.log(chalk.red(`❌ Unknown slash command: /${cmd}`));
      console.log(chalk.gray('Available: /help, /memory, /sessions, /stats, /clear'));
  }
  
  rl.prompt();
}

function showHelp() {
  console.log(`
${chalk.bold.cyan('📋 Bruno 3.0 Commands:')}

${chalk.bold('Basic:')}
  help              - Show this help
  clear             - Clear screen
  memory            - Show conversation history
  exit              - Exit REPL

${chalk.bold('Slash Commands (Claude Code CLI style):')}
  /help             - Show this help
  /memory           - Show session history
  /sessions         - List all sessions
  /stats            - Show session statistics
  /clear            - Clear screen

${chalk.bold('🧠 Code Intelligence (Cursor-style):')}
  explain <file>    - Semantic code explanation
  fix <file>        - Fix with grouped edits
  search <query>    - Semantic code search
  refactor <file>   - Holistic refactoring
  test <file>       - Generate comprehensive tests

${chalk.bold('📝 File Operations:')}
  read <file>       - Read with full context
  write <file> <content> - Write complete content
  list <dir>        - List directory contents
  ls <dir>          - Alias for list
  tree <dir>        - Show directory tree
  find <pattern>    - Find files (ripgrep-style)

${chalk.bold('🎯 Advanced Features:')}
  analyze <path>    - Project analysis with patterns
  plan <task>       - Generate task plan (Manus-style)
  deploy <service>  - Deploy to cloud services
  create <type>     - Create with best practices

${chalk.bold('🔧 Shell Commands:')}
  shell <cmd>       - Execute shell command (sandboxed)
  run <cmd>         - Alias for shell

${chalk.bold('🌟 Universal Commands:')}
  Just type any request naturally!
  • "create a react dashboard with tailwind"
  • "deploy my app to vercel"
  • "fix all typescript errors"
  • "explain this authentication flow"
  • "generate IoT pipeline for camera data"

${chalk.bold('🔒 Privacy Features:')}
  ✓ 100% local processing with Ollama
  ✓ Advanced patterns from leading AI systems
  ✓ No telemetry or cloud dependencies
  ✓ File system sandboxing
  ✓ Automatic backups
  ✓ Semantic search and holistic editing

${chalk.bold('💡 Pattern Examples:')}
  bruno> explain src/auth.js                  # Cursor-style semantic analysis
  bruno> create react component LoginForm     # Bolt-style artifact creation
  bruno> plan build fullstack app with auth   # Manus-style task planning
  bruno> deploy to vercel with environment    # Windsurf-style AI flow
  `);
}