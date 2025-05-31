#!/usr/bin/env node
import { ClaudeStyleRepl } from '../shell/claudeStyleRepl.js';
import { startRepl } from '../shell/repl-local.js';
import { parseArgs } from '../core/argParser.js';
import { UniversalRouter } from '../core/universalRouter.js';
import { SessionManager } from '../core/sessionManager.js';
import { OllamaClient } from '../core/ollamaClient.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = parseArgs();

  // Load configuration
  const configPath = path.join(__dirname, '..', 'config', 'brunorc.yaml');
  let config = {
    llm_provider: 'local',
    model: 'deepseek-coder:6.7b',
    ollama_url: 'http://127.0.0.1:11434',
    allow_cloud: false,
    offline_mode: true,
    claude_mode: true  // Enable Claude Code CLI style
  };

  if (fs.existsSync(configPath)) {
    config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  }

  // Initialize components
  const sessionManager = new SessionManager(config);
  const ollama = new OllamaClient(config);

  if (args.version) {
    console.log(chalk.cyan.bold('Bruno v3.1.0') + chalk.gray(' - Claude Code CLI Compatible'));
    console.log(chalk.blue('✨ Multi-line Input • 🚀 Real-time Streaming • 🤖 Smart Detection'));
    console.log(chalk.green('100% Local • 100% Private • Claude Code CLI Parity'));
    process.exit(0);
  }

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Check Ollama health
  const isHealthy = await ollama.checkHealth();
  if (!isHealthy) {
    console.log(chalk.red('\n❌ Cannot start Bruno without Ollama'));
    console.log(chalk.yellow('Please ensure Ollama is running: ollama serve'));
    process.exit(1);
  }

  // Handle different modes
  if (args.mode === 'claude' || (!args.mode && config.claude_mode)) {
    // Use Claude-style REPL
    await startClaudeStyleRepl(sessionManager, ollama, config, args);
  } else {
    // Use regular Bruno REPL
    switch (args.mode) {
      case 'continue':
        await handleContinueMode(sessionManager, config, args);
        break;
        
      case 'resume':
        await handleResumeMode(sessionManager, config, args);
        break;
        
      case 'print':
        await handlePrintMode(config, args);
        break;
        
      default:
        await handleInteractiveMode(sessionManager, config, args);
    }
  }
}

async function startClaudeStyleRepl(sessionManager, ollama, config, args) {
  // Handle session continuation/resumption
  let sessionId = null;
  
  if (args.mode === 'continue') {
    sessionId = await sessionManager.continueLastSession();
    if (sessionId) {
      console.log(chalk.cyan('🔄 Continuing last conversation...'));
    }
  } else if (args.mode === 'resume' && args.sessionId) {
    sessionId = await sessionManager.resumeSession(args.sessionId);
    if (sessionId) {
      console.log(chalk.cyan(`🔄 Resuming session ${sessionId}...`));
    }
  }
  
  if (!sessionId) {
    sessionId = await sessionManager.createSession({
      type: 'claude_style',
      startTime: new Date().toISOString()
    });
  }

  // Create and start Claude-style REPL
  const repl = new ClaudeStyleRepl({
    ollama,
    sessionManager,
    sessionId,
    config
  });
  
  repl.start();
}

async function handleContinueMode(sessionManager, config, args) {
  console.log(chalk.cyan('🔄 Continuing last conversation...'));
  
  const sessionId = await sessionManager.continueLastSession();
  if (!sessionId) {
    console.log(chalk.yellow('📝 No previous session found, starting new session'));
    await handleInteractiveMode(sessionManager, config, args);
    return;
  }
  
  // Start regular REPL with continued session
  await startRepl({ ...args, sessionManager, sessionId });
}

async function handleResumeMode(sessionManager, config, args) {
  console.log(chalk.cyan('🔄 Resuming conversation...'));
  
  const sessionId = await sessionManager.resumeSession(args.sessionId);
  if (!sessionId) {
    console.log(chalk.yellow('📝 Starting new session instead'));
    await handleInteractiveMode(sessionManager, config, args);
    return;
  }
  
  // Start regular REPL with resumed session
  await startRepl({ ...args, sessionManager, sessionId });
}

async function handlePrintMode(config, args) {
  if (!args.prompt) {
    console.error(chalk.red('❌ No prompt provided for print mode'));
    console.log(chalk.gray('Usage: bruno -p "your prompt here"'));
    process.exit(1);
  }
  
  try {
    const router = new UniversalRouter(config);
    const result = await router.route(args.prompt);
    
    // Format output based on requested format
    switch (args.outputFormat) {
      case 'json':
        console.log(JSON.stringify({ result, timestamp: new Date().toISOString() }, null, 2));
        break;
        
      case 'stream-json':
        console.log(JSON.stringify({ result, timestamp: new Date().toISOString() }, null, 2));
        break;
        
      default:
        if (typeof result === 'object' && result.explanation) {
          console.log(result.explanation);
        } else {
          console.log(result);
        }
    }
    
  } catch (error) {
    if (args.outputFormat === 'json' || args.outputFormat === 'stream-json') {
      console.error(JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }));
    } else {
      console.error(chalk.red('❌ Error:'), error.message);
    }
    
    if (args.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function handleInteractiveMode(sessionManager, config, args) {
  const sessionId = await sessionManager.createSession({
    type: 'interactive',
    startTime: new Date().toISOString()
  });
  
  await startRepl({ ...args, sessionManager, sessionId });
}

function showHelp() {
  console.log(`
${chalk.bold.cyan('Bruno 3.1')} - Claude Code CLI Compatible

${chalk.green('✨ What\'s New:')}
  • Multi-line input without special commands
  • Real-time command execution streaming
  • Smart context detection
  • Natural language understanding

${chalk.bold('Claude Code CLI Style Usage:')}
  ${chalk.gray('# Just paste and go - no special modes needed')}
  bruno --claude          Start in Claude Code style
  
  ${chalk.gray('# Multi-line shell scripts')}
  echo "Setting up project..."
  mkdir -p src/components
  npm init -y
  npm install express
  
  ${chalk.gray('# Code creation with heredocs')}
  cat > server.js << 'EOF'
  const express = require('express');
  const app = express();
  app.listen(3000);
  EOF
  
  ${chalk.gray('# Natural language requests')}
  Create a React component for a login form
  
  ${chalk.gray('# Mixed content')}
  I need to check if my server is running
  ps aux | grep node
  If not, restart it with pm2

${chalk.bold('Modes:')}
  bruno                    Start interactive REPL
  bruno --claude          Start Claude Code style REPL
  bruno -p "prompt"        Print response and exit
  bruno -c                 Continue last conversation
  bruno -r [sessionId]     Resume specific session

${chalk.bold('Options:')}
  -h, --help              Show help
  -v, --version           Show version
  --claude                Enable Claude Code CLI style
  -p, --print             Print response and exit
  -c, --continue          Continue last conversation
  -r, --resume [id]       Resume conversation
  -d, --debug             Enable debug mode
  --model <model>         Set local model

${chalk.gray('Prerequisites:')}
  1. Install Ollama: https://ollama.ai
  2. Pull model: ollama pull deepseek-coder:6.7b
  3. Start server: ollama serve
  `);
}

// Run main
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});