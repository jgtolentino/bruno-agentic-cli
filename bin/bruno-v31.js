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
