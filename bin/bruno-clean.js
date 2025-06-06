#!/usr/bin/env node
import { parseArgs } from '../core/argParser.js';
import { handlePipedInput } from '../core/pipedInputHandler.js';
import { ErrorRecoverySystem } from '../core/errorRecovery.js';
import { ProgressVisualization } from '../core/progressVisualization.js';
import { MultiModalInputProcessor } from '../core/multiModalInput.js';
import { UniversalRouterClean } from '../core/universalRouterClean.js';
import { SessionManager } from '../core/sessionManager.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = parseArgs();

  // Auto-enable print mode for single prompt (Claude-style)
  if (args._ && args._.length === 1 && !args.print && !args.continue && !args.resume && !args.help && !args.version) {
    args.print = true;
    args.mode = 'print';
    args.prompt = args._[0];
  }

  // Handle version and help with Claude Code CLI style (minimal)
  if (args.version) {
    console.log('Bruno v3.1.0');
    process.exit(0);
  }

  if (args.help) {
    console.log(`Bruno
Local AI assistant

Usage: bruno [options] [prompt]

Options:
  -h, --help     Show help
  -v, --version  Show version
  -c, --continue Continue conversation
  -p, --print    Print response and exit
  -r, --resume   Resume conversation`);
    process.exit(0);
  }

  // Silent initialization (no startup messages)
  try {
    // Load configuration silently
    const configPath = path.join(__dirname, '..', 'config', 'brunorc.yaml');
    let config = {
      llm_provider: 'local',
      model: 'deepseek-coder:6.7b-instruct-q4_K_M',
      ollama_url: 'http://127.0.0.1:11434',
      allow_cloud: false,
      offline_mode: true
    };

    if (fs.existsSync(configPath)) {
      const yaml = await import('js-yaml');
      config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    }

    // Initialize systems silently
    const errorRecovery = new ErrorRecoverySystem({
      autoRetry: true,
      interactive: !args.debug, // Only interactive in non-debug mode
      dryRun: false
    });

    const sessionManager = new SessionManager(config);
    const multiModal = new MultiModalInputProcessor({
      cacheEnabled: true,
      maxFileSize: 50 * 1024 * 1024
    });

    // Handle piped input silently
    let pipedInput = null;
    if (!process.stdin.isTTY) {
      try {
        pipedInput = await handlePipedInput();
      } catch (error) {
        // Silent failure, fallback to normal mode
        if (args.debug) {
          console.error('Piped input failed:', error.message);
        }
      }
    }

    // Route to appropriate handler
    if (args.mode === 'print' || args.print) {
      await handlePrintMode(config, args, pipedInput, { errorRecovery, multiModal });
    } else if (args.mode === 'continue' || args.continue) {
      await handleContinueMode(sessionManager, config, args);
    } else if (args.mode === 'resume' || args.resume) {
      await handleResumeMode(sessionManager, config, args);
    } else {
      await handleInteractiveMode(sessionManager, config, args, { errorRecovery, multiModal });
    }

    // Silent cleanup
    await multiModal.cleanup();

  } catch (error) {
    // Clean error handling
    if (args.debug) {
      console.error('Error:', error.message);
      console.error(error.stack);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

async function handlePrintMode(config, args, pipedInput, services) {
  const { errorRecovery, multiModal } = services;
  
  if (!args.prompt && !pipedInput) {
    console.error('No prompt provided');
    process.exit(1);
  }

  try {
    const router = new UniversalRouterClean(config);
    
    // Prepare prompt
    let finalPrompt = args.prompt || '';
    if (pipedInput) {
      if (args.prompt) {
        finalPrompt = `${args.prompt}\n\n${pipedInput.content || pipedInput.display}`;
      } else {
        finalPrompt = pipedInput.content || pipedInput.display;
      }
    }

    // Get response (no progress indicators)
    const result = await router.route(finalPrompt);
    
    // Output result cleanly
    if (args.outputFormat === 'json') {
      console.log(JSON.stringify({ result, timestamp: new Date().toISOString() }, null, 2));
    } else {
      if (typeof result === 'object' && result.explanation) {
        console.log(result.explanation);
      } else {
        console.log(result);
      }
    }
    
  } catch (error) {
    // Try error recovery silently
    try {
      const recoveryResult = await errorRecovery.analyzeAndRecover(error, {
        command: args.prompt,
        mode: 'print'
      });
      
      if (!recoveryResult.success) {
        throw error;
      }
    } catch (recoveryError) {
      if (args.debug) {
        console.error('Error:', error.message);
      } else {
        console.error(error.message);
      }
      process.exit(1);
    }
  }
}

async function handleContinueMode(sessionManager, config, args) {
  const sessionId = await sessionManager.continueLastSession();
  if (!sessionId) {
    // No message, just start new session
    await handleInteractiveMode(sessionManager, config, args);
    return;
  }
  
  // Continue with existing session silently
  await startRepl({ ...args, sessionManager, sessionId });
}

async function handleResumeMode(sessionManager, config, args) {
  const sessionId = await sessionManager.resumeSession(args.sessionId);
  if (!sessionId) {
    // No message, just start new session
    await handleInteractiveMode(sessionManager, config, args);
    return;
  }
  
  // Resume session silently
  await startRepl({ ...args, sessionManager, sessionId });
}

async function handleInteractiveMode(sessionManager, config, args, services) {
  // Create session silently
  const sessionId = await sessionManager.createSession({
    model: args.model,
    startTime: new Date().toISOString()
  });
  
  // Start clean REPL
  const { startRepl } = await import('../shell/repl-clean.js');
  await startRepl({ 
    ...args, 
    sessionManager, 
    sessionId,
    ...services
  });
}

// Clean startup with no fanfare
main().catch(error => {
  console.error(error.message);
  process.exit(1);
});