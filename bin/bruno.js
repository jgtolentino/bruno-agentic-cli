#!/usr/bin/env node
import { startRepl } from '../shell/repl-local.js';
import { parseArgs } from '../core/argParser.js';
import { UniversalRouter } from '../core/universalRouter.js';
import { KnowledgeBase } from '../core/knowledgeBase.js';
import { SessionManager } from '../core/sessionManager.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    offline_mode: true
  };

  if (fs.existsSync(configPath)) {
    const yaml = await import('js-yaml');
    config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  }

  // Initialize session manager
  const sessionManager = new SessionManager(config);

  if (args.version) {
    console.log(chalk.cyan.bold('Bruno v3.0.0') + chalk.gray(' - Advanced Local-First AI CLI'));
    console.log(chalk.blue('✨ Enhanced UI/UX • 📝 Session Management • 🔄 Hybrid Routing'));
    console.log(chalk.gray('Featuring patterns from Cursor, Windsurf, Bolt, and Manus'));
    console.log(chalk.green('🎯 Claude Code CLI Compatible • 100% Local • 100% Private'));
    process.exit(0);
  }

  if (args.help) {
    console.log(`
${chalk.bold.cyan('Bruno 3.0')} - Advanced Local-First AI CLI

${chalk.green('✓ 100% Private')} - No data leaves your machine
${chalk.green('✓ 100% Offline')} - Works without internet  
${chalk.green('✓ 100% Open')} - No API keys required
${chalk.blue('🤖 Advanced')} - Patterns from Cursor, Windsurf, Bolt & Manus

${chalk.bold('Interaction Modes:')}
  bruno                    Start interactive REPL
  bruno -p "prompt"        Print response and exit
  bruno -c                 Continue last conversation
  bruno -r [sessionId]     Resume specific session
  
${chalk.bold('Universal Commands:')}
  bruno "<request>"        Process any request with AI routing
  bruno plan "<task>"      Generate comprehensive task plan
  
${chalk.bold('Session Management:')}
  bruno -c                 Continue most recent conversation
  bruno -r                 Resume interactively selected session
  bruno -r session_123     Resume specific session by ID
  
${chalk.bold('Output Formats:')}
  bruno -p "query" --output-format text      # Default text output
  bruno -p "query" --output-format json      # JSON response
  bruno -p "query" --output-format stream-json # Streaming JSON

${chalk.bold('Code Intelligence:')}
  bruno fix <file>         Fix code issues (Cursor-style)
  bruno explain <file>     Explain code semantically
  bruno search "<query>"   Semantic code search
  bruno refactor <file>    Holistic refactoring

${chalk.bold('Options:')}
  -h, --help              Show help
  -v, --version           Show version
  -p, --print             Print response and exit
  -c, --continue          Continue last conversation
  -r, --resume [id]       Resume conversation
  -d, --debug             Enable debug mode
  --model <model>         Set local model
  --output-format <fmt>   Output format (text, json, stream-json)
  --patterns <p1,p2>      Use specific patterns
  --verbose               Show detailed execution

${chalk.bold('Claude Code CLI Compatible:')}
  bruno -p "how to setup react"             # One-shot mode
  bruno -c                                  # Continue conversation
  bruno -r session_abc123                   # Resume specific session
  cat file.log | bruno -p "analyze this"   # Piped input (coming soon)

${chalk.gray('Prerequisites:')}
  1. Install Ollama: https://ollama.ai
  2. Pull model: ollama pull deepseek-coder:6.7b
  3. Start server: ollama serve
    `);
    process.exit(0);
  }

  // Handle different modes based on Claude Code CLI patterns
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
      
    case 'command':
      await handleCommandMode(config, args);
      break;
      
    default:
      await handleInteractiveMode(sessionManager, config, args);
  }
}

async function handleContinueMode(sessionManager, config, args) {
  console.log(chalk.cyan('🔄 Continuing last conversation...'));
  
  const sessionId = await sessionManager.continueLastSession();
  if (!sessionId) {
    console.log(chalk.yellow('📝 No previous session found, starting new session'));
    await handleInteractiveMode(sessionManager, config, args);
    return;
  }
  
  // Start REPL with continued session
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
  
  // Start REPL with resumed session
  await startRepl({ ...args, sessionManager, sessionId });
}

async function handlePrintMode(config, args) {
  if (!args.prompt) {
    console.error(chalk.red('❌ No prompt provided for print mode'));
    console.log(chalk.gray('Usage: bruno -p "your prompt here"'));
    process.exit(1);
  }
  
  if (args.debug) {
    console.log(chalk.gray(`✓ Mode: print`));
    console.log(chalk.gray(`✓ Output format: ${args.outputFormat}`));
    console.log(chalk.gray(`✓ Model: ${args.model}`));
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
        // For now, just output as regular JSON (streaming would require different architecture)
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

async function handleCommandMode(config, args) {
  console.log(chalk.cyan('🤖 Starting Bruno 3.0 with advanced patterns...'));
  console.log(chalk.gray('✓ Local-first mode active'));
  console.log(chalk.gray(`  Provider: ${config.llm_provider}`));
  console.log(chalk.gray(`  Model: ${config.model}`));
  
  try {
    const router = new UniversalRouter(config);
    const kb = new KnowledgeBase();
    const command = args._.join(' ');
    
    if (args.plan || command.startsWith('plan ')) {
      const taskToPlay = command.replace('plan ', '');
      console.log(chalk.blue('📄 Generating task plan...'));
      
      const plan = await router.generateTaskPlan(taskToPlay);
      console.log(chalk.bold('\n🎯 Task Plan:'));
      console.log(chalk.gray('Approach:'), plan.approach);
      console.log(chalk.gray('Patterns:'), plan.patterns.join(', '));
      console.log(chalk.gray('\nSteps:'));
      plan.steps.forEach(step => console.log(chalk.green(step)));
      
      if (plan.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        plan.warnings.forEach(w => console.log(chalk.yellow(`- ${w}`)));
      }
      
      console.log(chalk.gray('\nTools:'), plan.tools.join(', '));
      return;
    }
    
    const result = await router.route(command);
    console.log(chalk.bold('\n🎯 Result:'));
    
    if (typeof result === 'object' && result.explanation) {
      console.log(result.explanation);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
    
    // Show relevant knowledge
    const knowledge = kb.getRelevantKnowledge(result.type, command);
    if (knowledge.length > 0) {
      console.log(chalk.blue('\n💡 Best Practices:'));
      knowledge.forEach(k => {
        console.log(chalk.gray(`From ${k.source}:`));
        k.tips?.forEach(tip => console.log(chalk.green(`- ${tip}`)));
      });
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    if (args.verbose || args.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function handleInteractiveMode(sessionManager, config, args) {
  // Check if we should start a new session or use existing
  let sessionId = null;
  
  if (!args.continue && !args.resume) {
    sessionId = await sessionManager.createSession({
      model: args.model,
      patterns: args.patterns,
      startTime: new Date().toISOString()
    });
  }
  
  console.log(chalk.cyan('🤖 Starting Bruno 3.0 with advanced patterns...'));
  // Start interactive REPL
  await startRepl({ ...args, sessionManager, sessionId });
}

// Start the application
main().catch(error => {
  console.error(chalk.red('❌ Fatal error:'), error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});