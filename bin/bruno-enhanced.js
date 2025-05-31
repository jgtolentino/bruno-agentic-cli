#!/usr/bin/env node
import { startRepl } from '../shell/repl-local.js';
import { ClaudeStyleRepl } from '../shell/claudeStyleRepl.js';
import { parseArgs } from '../core/argParser.js';
import { UniversalRouter } from '../core/universalRouter.js';
import { KnowledgeBase } from '../core/knowledgeBase.js';
import { SessionManager } from '../core/sessionManager.js';
import { OllamaClient } from '../core/ollamaClient.js';
import { handlePipedInput } from '../core/pipedInputHandler.js';
import { createStreamingPipeline } from '../core/streamingOutput.js';
import { RichTerminalUI } from '../core/richTerminalUI.js';
import { InteractivePrompts } from '../core/interactivePrompts.js';
import { ErrorRecoverySystem } from '../core/errorRecovery.js';
import { ProgressVisualization } from '../core/progressVisualization.js';
import { MultiModalInputProcessor } from '../core/multiModalInput.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = parseArgs();

  // Initialize error recovery system early
  const errorRecovery = new ErrorRecoverySystem({
    autoRetry: true,
    interactive: !args.nonInteractive,
    dryRun: args.dryRun
  });

  // Initialize progress visualization
  const progress = new ProgressVisualization({
    style: args.progressStyle || 'modern',
    colors: !args.noColor
  });

  try {
    // Check for piped input first (only if not TTY)
    let pipedInput = null;
    if (!process.stdin.isTTY) {
      pipedInput = await handlePipedInput();
    }
    
    // Load configuration
    const configPath = path.join(__dirname, '..', 'config', 'brunorc.yaml');
    let config = {
      llm_provider: 'local',
      model: 'deepseek-coder:6.7b',
      ollama_url: 'http://127.0.0.1:11434',
      allow_cloud: false,
      offline_mode: true,
      richUI: args.richUI || false,
      streamingOutput: args.streaming !== false
    };

    if (fs.existsSync(configPath)) {
      const yaml = await import('js-yaml');
      config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    }

    // Initialize session manager
    const sessionManager = new SessionManager(config);
    
    // Initialize multi-modal processor
    const multiModal = new MultiModalInputProcessor({
      cacheEnabled: config.cacheEnabled !== false,
      maxFileSize: config.maxFileSize || 50 * 1024 * 1024
    });

    // If we have piped input, process it immediately
    if (pipedInput) {
      return await handlePipedInputMode(pipedInput, config, args, {
        errorRecovery,
        progress,
        multiModal,
        sessionManager
      });
    }

    if (args.version) {
      console.log(chalk.cyan.bold('Bruno v3.1.0') + chalk.gray(' - Advanced Local-First AI CLI'));
      console.log(chalk.blue('✨ Enhanced UI/UX • 📝 Session Management • 🔄 Hybrid Routing'));
      console.log(chalk.gray('Featuring patterns from Cursor, Windsurf, Bolt, and Manus'));
      console.log(chalk.green('🎯 Claude Code CLI Compatible • 📋 Multi-line Input • 100% Local'));
      process.exit(0);
    }

    if (args.help) {
      console.log(`
${chalk.bold.cyan('Bruno 3.1')} - Advanced Local-First AI CLI with Claude Code CLI Compatibility

${chalk.green('✓ 100% Private')} - No data leaves your machine
${chalk.green('✓ 100% Offline')} - Works without internet  
${chalk.green('✓ 100% Open')} - No API keys required
${chalk.blue('🤖 Advanced')} - Patterns from Cursor, Windsurf, Bolt & Manus

${chalk.bold('Interaction Modes:')}
  bruno                    Start interactive REPL
  bruno --claude          Start with Claude Code CLI style
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
  --claude                Enable Claude Code CLI style
  --model <model>         Set local model
  --output-format <fmt>   Output format (text, json, stream-json)
  --patterns <p1,p2>      Use specific patterns
  --verbose               Show detailed execution
  --rich-ui               Enable rich terminal UI
  --streaming             Enable streaming output (default: true)

${chalk.bold('Claude Code CLI Compatible:')}
  bruno -p "how to setup react"             # One-shot mode
  bruno -c                                  # Continue conversation
  bruno -r session_abc123                   # Resume specific session
  cat file.log | bruno -p "analyze this"   # Piped input

${chalk.bold('Claude-Style Multi-Line Input:')}
  ${chalk.gray('# Just paste and go - no special modes needed')}
  echo "Setting up project..."
  mkdir -p src/components
  npm init -y
  
  ${chalk.gray('# Code creation with heredocs')}
  cat > server.js << 'EOF'
  const express = require('express');
  app.listen(3000);
  EOF
  
  ${chalk.gray('# Natural language + code mixed')}
  Create a login form component
  Then test it with: npm test

${chalk.gray('Prerequisites:')}
  1. Install Ollama: https://ollama.ai
  2. Pull model: ollama pull deepseek-coder:6.7b
  3. Start server: ollama serve
    `);
      process.exit(0);
    }

    // Handle different modes based on Claude Code CLI patterns
    switch (args.mode) {
      case 'claude':
        // Force Claude-style for explicit mode
        args.claude = true;
        await handleInteractiveMode(sessionManager, config, args, {
          errorRecovery, progress, multiModal
        });
        break;
        
      case 'continue':
        await handleContinueMode(sessionManager, config, args, {
          errorRecovery, progress, multiModal
        });
        break;
        
      case 'resume':
        await handleResumeMode(sessionManager, config, args, {
          errorRecovery, progress, multiModal
        });
        break;
        
      case 'print':
        await handlePrintMode(config, args, {
          errorRecovery, progress, multiModal
        });
        break;
        
      case 'command':
        await handleCommandMode(config, args, {
          errorRecovery, progress, multiModal
        });
        break;
        
      default:
        await handleInteractiveMode(sessionManager, config, args, {
          errorRecovery, progress, multiModal
        });
    }
  } catch (error) {
    // Use error recovery system for main function errors
    console.log(chalk.red('\n❌ Error in main execution:'), error.message);
    
    const recoveryResult = await errorRecovery.analyzeAndRecover(error, {
      command: process.argv.join(' '),
      args,
      context: 'main_execution'
    });
    
    if (!recoveryResult.success) {
      console.error(chalk.red('\n💥 Recovery failed. Original error:'), error.message);
      if (args.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  } finally {
    // Cleanup resources
    await progress.cleanup();
  }
}

async function handlePipedInputMode(pipedInput, config, args, services) {
  const { errorRecovery, progress, multiModal, sessionManager } = services;
  
  console.log(chalk.cyan('📥 Processing piped input...'));
  
  const task = progress.createTask('pipedInput', {
    title: 'Processing piped input',
    type: 'spinner'
  });
  progress.startTask('pipedInput');
  
  try {
    // Process the piped input through multi-modal processor
    const processedInput = await multiModal.processInput(pipedInput.content);
    
    // Update progress
    progress.updateTask('pipedInput', 50, 'Input processed, generating response...');
    
    // If we have a prompt from args, combine it with the piped input
    let finalPrompt = '';
    if (args.prompt) {
      finalPrompt = `${args.prompt}\n\nInput data:\n${processedInput.content || pipedInput.content}`;
    } else {
      // Default behavior: analyze the input
      finalPrompt = `Please analyze this input:\n\n${processedInput.content || pipedInput.content}`;
    }
    
    // Create a temporary session for piped input processing
    const sessionId = await sessionManager.createSession({
      type: 'piped_input',
      inputType: processedInput.type,
      timestamp: new Date().toISOString()
    });
    
    // Process through universal router with streaming output
    const router = new UniversalRouter(config);
    
    if (config.streamingOutput && args.outputFormat !== 'json') {
      // Set up streaming output
      const streamingPipeline = createStreamingPipeline({
        format: args.outputFormat || 'text',
        colors: !args.noColor
      });
      
      streamingPipeline.on('data', (chunk) => {
        process.stdout.write(chunk);
      });
      
      await router.routeWithStreaming(finalPrompt, streamingPipeline);
    } else {
      // Non-streaming response
      const result = await router.route(finalPrompt);
      
      // Format output based on requested format
      switch (args.outputFormat) {
        case 'json':
          console.log(JSON.stringify({
            result,
            inputMetadata: processedInput.metadata,
            timestamp: new Date().toISOString()
          }, null, 2));
          break;
          
        default:
          if (typeof result === 'object' && result.explanation) {
            console.log(result.explanation);
          } else {
            console.log(result);
          }
      }
    }
    
    progress.completeTask('pipedInput', 'Piped input processed successfully');
    
  } catch (error) {
    progress.failTask('pipedInput', error.message);
    
    // Try error recovery
    const recoveryResult = await errorRecovery.analyzeAndRecover(error, {
      command: 'piped_input_processing',
      inputType: pipedInput.type,
      args
    });
    
    if (!recoveryResult.success) {
      console.error(chalk.red('❌ Failed to process piped input:'), error.message);
      if (args.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  } finally {
    await multiModal.cleanup();
  }
}

async function handleContinueMode(sessionManager, config, args, services = {}) {
  const { errorRecovery } = services;
  
  console.log(chalk.cyan('🔄 Continuing last conversation...'));
  
  const sessionId = await sessionManager.continueLastSession();
  if (!sessionId) {
    console.log(chalk.yellow('📝 No previous session found, starting new session'));
    await handleInteractiveMode(sessionManager, config, args, services);
    return;
  }
  
  // Check if Claude-style mode is requested
  if (args.claude || config.claude_mode) {
    const ollama = new OllamaClient(config);
    const isHealthy = await ollama.checkHealth();
    
    if (!isHealthy) {
      console.log(chalk.red('\n❌ Cannot start Bruno without Ollama'));
      console.log(chalk.yellow('Please ensure Ollama is running: ollama serve'));
      process.exit(1);
    }
    
    const claudeRepl = new ClaudeStyleRepl({
      ollama,
      sessionManager,
      sessionId,
      config,
      ...services
    });
    
    claudeRepl.start();
  } else {
    // Start REPL with continued session
    await startRepl({ ...args, sessionManager, sessionId, ...services });
  }
}

async function handleResumeMode(sessionManager, config, args, services = {}) {
  const { errorRecovery } = services;
  
  console.log(chalk.cyan('🔄 Resuming conversation...'));
  
  const sessionId = await sessionManager.resumeSession(args.sessionId);
  if (!sessionId) {
    console.log(chalk.yellow('📝 Starting new session instead'));
    await handleInteractiveMode(sessionManager, config, args, services);
    return;
  }
  
  // Check if Claude-style mode is requested
  if (args.claude || config.claude_mode) {
    const ollama = new OllamaClient(config);
    const isHealthy = await ollama.checkHealth();
    
    if (!isHealthy) {
      console.log(chalk.red('\n❌ Cannot start Bruno without Ollama'));
      console.log(chalk.yellow('Please ensure Ollama is running: ollama serve'));
      process.exit(1);
    }
    
    const claudeRepl = new ClaudeStyleRepl({
      ollama,
      sessionManager,
      sessionId,
      config,
      ...services
    });
    
    claudeRepl.start();
  } else {
    // Start REPL with resumed session
    await startRepl({ ...args, sessionManager, sessionId, ...services });
  }
}

async function handlePrintMode(config, args, services = {}) {
  const { errorRecovery, progress, multiModal } = services;
  
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
    
    // Set up progress tracking for print mode
    if (progress) {
      const task = progress.createTask('print', {
        title: 'Processing request',
        type: 'spinner'
      });
      progress.startTask('print');
    }
    
    let result;
    
    // Check if streaming output is enabled and format allows it
    if (config.streamingOutput && args.outputFormat !== 'json') {
      const streamingPipeline = createStreamingPipeline({
        format: args.outputFormat || 'text',
        colors: !args.noColor
      });
      
      streamingPipeline.on('data', (chunk) => {
        process.stdout.write(chunk);
      });
      
      result = await router.routeWithStreaming(args.prompt, streamingPipeline);
    } else {
      result = await router.route(args.prompt);
    
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
    }
    
    if (progress) {
      progress.completeTask('print', 'Request completed');
    }
    
  } catch (error) {
    if (progress) {
      progress.failTask('print', error.message);
    }
    
    // Try error recovery first
    if (errorRecovery) {
      const recoveryResult = await errorRecovery.analyzeAndRecover(error, {
        command: args.prompt,
        mode: 'print',
        args
      });
      
      if (recoveryResult.success) {
        return; // Recovery succeeded, exit gracefully
      }
    }
    
    // Recovery failed or not available, show error
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

async function handleCommandMode(config, args, services = {}) {
  const { errorRecovery, progress } = services;
  
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

async function handleInteractiveMode(sessionManager, config, args, services = {}) {
  const { errorRecovery, progress, multiModal } = services;
  
  // Check if we should start a new session or use existing
  let sessionId = null;
  
  if (!args.continue && !args.resume) {
    sessionId = await sessionManager.createSession({
      model: args.model,
      patterns: args.patterns,
      startTime: new Date().toISOString()
    });
  }
  
  // Check if Claude-style mode is requested
  if (args.claude || config.claude_mode) {
    // Initialize Ollama client for Claude-style REPL
    const ollama = new OllamaClient(config);
    const isHealthy = await ollama.checkHealth();
    
    if (!isHealthy) {
      console.log(chalk.red('\n❌ Cannot start Bruno without Ollama'));
      console.log(chalk.yellow('Please ensure Ollama is running: ollama serve'));
      process.exit(1);
    }
    
    // Initialize rich UI if requested
    let richUI = null;
    if (config.richUI || args.richUI) {
      richUI = new RichTerminalUI({
        layout: 'default',
        theme: args.theme || 'dark'
      });
      richUI.initialize();
    }
    
    // Create and start Claude-style REPL with enhanced features
    const claudeRepl = new ClaudeStyleRepl({
      ollama,
      sessionManager,
      sessionId,
      config,
      errorRecovery,
      progress,
      multiModal,
      richUI
    });
    
    claudeRepl.start();
  } else {
    console.log(chalk.cyan('🤖 Starting Bruno 3.0 with advanced patterns...'));
    
    // Start standard interactive REPL with enhanced services
    await startRepl({ 
      ...args, 
      sessionManager, 
      sessionId,
      errorRecovery,
      progress,
      multiModal
    });
  }
}

// Start the application with enhanced error handling
main().catch(async error => {
  console.error(chalk.red('❌ Fatal error:'), error.message);
  
  // Try to use error recovery even for fatal errors
  try {
    const errorRecovery = new ErrorRecoverySystem({ interactive: false });
    const recoveryResult = await errorRecovery.analyzeAndRecover(error, {
      command: process.argv.join(' '),
      context: 'fatal_startup_error'
    });
    
    if (recoveryResult.success) {
      console.log(chalk.green('✅ Recovered from fatal error, retrying...'));
      // Retry main function once
      return main();
    }
  } catch (recoveryError) {
    console.error(chalk.red('💥 Error recovery also failed:'), recoveryError.message);
  }
  
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});