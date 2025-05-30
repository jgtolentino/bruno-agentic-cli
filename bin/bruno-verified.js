#!/usr/bin/env node
/**
 * Bruno Verified - Enhanced Bruno with Validation-First Execution
 * Integrates BrunoVerifier to prevent false success claims
 */

import { startRepl } from '../shell/repl-local.js';
import { parseArgs } from '../core/argParser.js';
import { UniversalRouter } from '../core/universalRouter.js';
import { KnowledgeBase } from '../core/knowledgeBase.js';
import { SessionManager } from '../core/sessionManager.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import verifier with dynamic import to handle CommonJS/ESM
const { default: BrunoVerifier } = await import('../core/brunoVerifier.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Global verifier instance for validation-first execution
let globalVerifier = null;

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
    verification: {
      enabled: true,
      strict_mode: true,
      timeout: 30000
    }
  };

  if (fs.existsSync(configPath)) {
    const yaml = await import('js-yaml');
    config = { ...config, ...yaml.load(fs.readFileSync(configPath, 'utf8')) };
  }

  // Initialize verifier with config
  globalVerifier = new BrunoVerifier({
    verbose: args.verbose || args.debug,
    strictMode: config.verification?.strict_mode !== false,
    timeout: config.verification?.timeout || 30000,
    workspaceDir: path.join(process.cwd(), '.bruno-workspace')
  });

  // Initialize session manager
  const sessionManager = new SessionManager(config);

  if (args.version) {
    console.log(chalk.cyan.bold('Bruno v3.1.0') + chalk.gray(' - Verified Execution AI CLI'));
    console.log(chalk.blue('✨ Enhanced UI/UX • 📝 Session Management • 🔄 Hybrid Routing'));
    console.log(chalk.red('🛡️ VERIFICATION-FIRST EXECUTION • NO FALSE SUCCESS CLAIMS'));
    console.log(chalk.gray('Featuring patterns from Cursor, Windsurf, Bolt, and Manus'));
    console.log(chalk.green('🎯 Claude Code CLI Compatible • 100% Local • 100% Private'));
    process.exit(0);
  }

  if (args.help) {
    console.log(`
${chalk.bold.cyan('Bruno 3.1')} - Verified Execution AI CLI

${chalk.red.bold('🛡️ VERIFICATION-FIRST:')} Bruno will NEVER claim success without proof
${chalk.green('✓ 100% Private')} - No data leaves your machine
${chalk.green('✓ 100% Offline')} - Works without internet  
${chalk.green('✓ 100% Open')} - No API keys required
${chalk.blue('🤖 Advanced')} - Patterns from Cursor, Windsurf, Bolt & Manus

${chalk.bold('Verification Modes:')}
  bruno verify <task.yaml>     Execute tasks with mandatory verification
  bruno --verify-task "<cmd>"  Execute command with verification
  bruno --strict               Enable strict verification mode
  bruno --no-verify           Disable verification (dangerous)

${chalk.bold('Interaction Modes:')}
  bruno                        Start interactive REPL
  bruno -p "prompt"           Print response and exit
  bruno -c                    Continue last conversation
  bruno -r [sessionId]        Resume specific session
  
${chalk.bold('Universal Commands:')}
  bruno "<request>"           Process any request with AI routing
  bruno plan "<task>"         Generate comprehensive task plan
  
${chalk.bold('Verified Execution:')}
  bruno verify sample-tasks.yaml        # Execute verified tasks
  bruno --verify-task "npm run build"   # Single verified command
  bruno --init-verify                   # Create sample verification files

${chalk.bold('Session Management:')}
  bruno -c                    Continue most recent conversation
  bruno -r                    Resume interactively selected session
  bruno -r session_123        Resume specific session by ID
  
${chalk.bold('Output Formats:')}
  bruno -p "query" --output-format text      # Default text output
  bruno -p "query" --output-format json      # JSON response
  bruno -p "query" --output-format stream-json # Streaming JSON

${chalk.bold('Code Intelligence:')}
  bruno fix <file>            Fix code issues (Cursor-style)
  bruno explain <file>        Explain code semantically
  bruno search "<query>"      Semantic code search
  bruno refactor <file>       Holistic refactoring

${chalk.bold('Options:')}
  -h, --help                  Show help
  -v, --version               Show version
  -p, --print                 Print response and exit
  -c, --continue              Continue last conversation
  -r, --resume [id]           Resume conversation
  -d, --debug                 Enable debug mode
  --model <model>             Set local model
  --output-format <fmt>       Output format (text, json, stream-json)
  --patterns <p1,p2>          Use specific patterns
  --verbose                   Show detailed execution
  --verify-task <cmd>         Execute single command with verification
  --strict                    Enable strict verification mode
  --no-verify                 Disable verification (dangerous)
  --init-verify               Create sample verification files

${chalk.bold('Verification Examples:')}
  bruno verify deploy-tasks.yaml                    # Run deployment with verification
  bruno --verify-task "npm run build && npm test"   # Verify build and test
  bruno --strict --verify-task "git push origin"    # Strict git push verification

${chalk.gray('Prerequisites:')}
  1. Install Ollama: https://ollama.ai
  2. Pull model: ollama pull deepseek-coder:6.7b
  3. Start server: ollama serve

${chalk.red.bold('🛡️ SECURITY NOTE:')} Bruno will NEVER print success messages unless verification passes
    `);
    process.exit(0);
  }

  // Handle verification-specific commands first
  if (args.initVerify) {
    await handleInitVerify();
    return;
  }

  if (args.verify) {
    await handleVerifyMode(args);
    return;
  }

  if (args.verifyTask) {
    await handleVerifyTaskMode(args);
    return;
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

/**
 * Handle verification mode - execute YAML task file with verification
 */
async function handleVerifyMode(args) {
  const taskFile = args.verify;
  
  if (!taskFile) {
    console.error(chalk.red('❌ No task file specified for verification mode'));
    console.log(chalk.gray('Usage: bruno verify <task-file.yaml>'));
    process.exit(1);
  }

  if (!fs.existsSync(taskFile)) {
    console.error(chalk.red(`❌ Task file not found: ${taskFile}`));
    process.exit(1);
  }

  console.log(chalk.cyan.bold('🛡️ Bruno Verification Mode'));
  console.log(chalk.gray(`📋 Loading tasks from: ${taskFile}`));
  
  try {
    const tasks = await globalVerifier.loadTasksFromFile(taskFile);
    console.log(chalk.blue(`🎯 Found ${tasks.length} tasks to execute with verification`));
    
    const result = await globalVerifier.executeTasks(tasks);
    
    // Report results
    console.log(chalk.bold('\n📊 Verification Results:'));
    console.log(`Total tasks: ${result.totalTasks}`);
    console.log(`Completed: ${result.completedTasks}`);
    console.log(`${result.successfulTasks > 0 ? chalk.green('✅') : chalk.red('❌')} Successful: ${result.successfulTasks}`);
    console.log(`Success rate: ${Math.round((result.successfulTasks / result.totalTasks) * 100)}%`);

    // Save execution report
    const reportPath = `${taskFile}.report.yaml`;
    await globalVerifier.saveExecutionReport(reportPath);
    console.log(chalk.gray(`📄 Detailed report saved to: ${reportPath}`));

    if (!result.success) {
      console.log(chalk.red('\n❌ Some tasks failed verification - see report for details'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n✅ All tasks completed with verified success'));
    }

  } catch (error) {
    console.error(chalk.red('❌ Verification failed:'), error.message);
    if (args.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Handle single task verification mode
 */
async function handleVerifyTaskMode(args) {
  const command = args.verifyTask;
  
  if (!command) {
    console.error(chalk.red('❌ No command specified for verification'));
    console.log(chalk.gray('Usage: bruno --verify-task "command to execute"'));
    process.exit(1);
  }

  console.log(chalk.cyan.bold('🛡️ Bruno Single Task Verification'));
  console.log(chalk.gray(`🔧 Command: ${command}`));
  
  // Create a temporary task for single command execution
  const task = {
    task: `Execute: ${command}`,
    command: command,
    // For single tasks, we can only verify exit code unless user provides more
    verify: command, // Re-run command to verify it still works
    success_condition: '0', // Expect exit code 0
    comparison_type: 'numeric',
    fail_message: `❌ Command failed verification: ${command}`
  };

  try {
    const result = await globalVerifier.executeTask(task);
    
    if (result.success) {
      console.log(chalk.green('\n✅ VERIFIED SUCCESS - Command executed and verified'));
    } else {
      console.log(chalk.red('\n❌ VERIFICATION FAILED'));
      console.log(result.message);
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('❌ Task verification failed:'), error.message);
    if (args.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Initialize sample verification files
 */
async function handleInitVerify() {
  console.log(chalk.cyan.bold('📝 Initializing Bruno Verification Files'));
  
  const sampleTasks = [
    {
      task: "Test echo command",
      command: "echo 'Hello Bruno'",
      verify: "echo 'Hello Bruno'",
      success_condition: "Hello Bruno",
      fail_message: "❌ Echo test failed"
    },
    {
      task: "Check Node.js version",
      command: "node --version",
      verify_type: "output_match",
      command: "node --version",
      expect: "v",
      comparison_type: "contains",
      fail_message: "❌ Node.js not found or invalid version"
    },
    {
      task: "Build project (example)",
      command: "npm run build",
      verify_type: "log_contains",
      log_file: "build.log",
      expect: "BUILD COMPLETE",
      fail_message: "❌ Build did not complete successfully",
      stop_on_failure: true
    },
    {
      task: "Deploy to staging (example)",
      command: "npm run deploy:staging",
      verify_type: "http_status",
      url: "https://staging.yourapp.com",
      expect: "200",
      fail_message: "❌ Staging deployment failed - site not responding"
    },
    {
      task: "Check git status",
      command: "git status",
      verify_type: "git_status",
      expect: "clean",
      fail_message: "❌ Git working directory is not clean"
    }
  ];

  // Create sample files
  const files = [
    {
      name: 'sample-verification-tasks.yaml',
      content: sampleTasks
    },
    {
      name: 'simple-test.yaml',
      content: [sampleTasks[0]] // Just the echo test
    },
    {
      name: 'deployment-tasks.yaml',
      content: sampleTasks.slice(2) // Build and deploy tasks
    }
  ];

  for (const file of files) {
    const yaml = await import('js-yaml');
    await fs.promises.writeFile(file.name, yaml.dump(file.content), 'utf8');
    console.log(chalk.green(`✅ Created: ${file.name}`));
  }

  // Create documentation
  const docs = `# Bruno Verification Examples

## Quick Start
\`\`\`bash
# Test the verifier with a simple task
bruno verify simple-test.yaml --verbose

# Run all sample tasks
bruno verify sample-verification-tasks.yaml

# Execute a single command with verification
bruno --verify-task "echo 'test'"
\`\`\`

## Task Structure
\`\`\`yaml
task: "Description of what this does"
command: "command to execute"
verify: "command to verify success"
success_condition: "expected output"
fail_message: "❌ Custom failure message"
\`\`\`

## Verification Types
- \`verify\`: Simple command-based verification
- \`verify_type: "log_contains"\`: Check log file contains text
- \`verify_type: "http_status"\`: Check HTTP endpoint status
- \`verify_type: "git_status"\`: Check git working directory
- \`verify_type: "file_exists"\`: Verify file exists

## Security Features
- Bruno will NEVER print success without verification
- Strict mode requires verification for all tasks
- All executions are logged and auditable
- Exit codes reflect real success/failure status
`;

  await fs.promises.writeFile('VERIFICATION_GUIDE.md', docs, 'utf8');
  console.log(chalk.green('✅ Created: VERIFICATION_GUIDE.md'));

  console.log(chalk.cyan.bold('\n🎯 Quick Start:'));
  console.log(chalk.gray('bruno verify simple-test.yaml --verbose'));
  console.log(chalk.gray('bruno --verify-task "echo test"'));
}

// Enhanced print mode with verification option
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
    console.log(chalk.gray(`✓ Verification: ${config.verification?.enabled ? 'enabled' : 'disabled'}`));
  }
  
  try {
    // Create enhanced router that can generate verification tasks
    const router = new VerifiedUniversalRouter(config, globalVerifier);
    const result = await router.route(args.prompt);
    
    // Format output based on requested format
    switch (args.outputFormat) {
      case 'json':
        console.log(JSON.stringify({ 
          result, 
          timestamp: new Date().toISOString(),
          verified: result.verified || false 
        }, null, 2));
        break;
        
      case 'stream-json':
        console.log(JSON.stringify({ 
          result, 
          timestamp: new Date().toISOString(),
          verified: result.verified || false 
        }, null, 2));
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

/**
 * Enhanced Universal Router with verification capabilities
 */
class VerifiedUniversalRouter extends UniversalRouter {
  constructor(config, verifier) {
    super(config);
    this.verifier = verifier;
  }

  async route(input) {
    // Check if input requests command execution
    if (this.isCommandExecutionRequest(input)) {
      return await this.handleVerifiedExecution(input);
    }

    // For non-execution requests, use normal routing
    return await super.route(input);
  }

  isCommandExecutionRequest(input) {
    const executionKeywords = [
      'run ', 'execute ', 'deploy ', 'build ', 'install ', 'start ', 'stop ',
      'npm ', 'git ', 'docker ', 'kubectl ', 'curl ', 'wget '
    ];
    
    return executionKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    );
  }

  async handleVerifiedExecution(input) {
    // Extract command from input (this is simplified - could be enhanced)
    const commands = this.extractCommands(input);
    
    if (commands.length === 0) {
      return await super.route(input); // Fallback to normal routing
    }

    console.log(chalk.yellow('🛡️ Detected command execution - switching to verification mode'));
    
    const results = [];
    for (const command of commands) {
      const task = {
        task: `Execute: ${command}`,
        command: command,
        verify: command, // Simple re-execution for verification
        success_condition: '0',
        comparison_type: 'numeric',
        fail_message: `❌ Command failed: ${command}`
      };

      const result = await this.verifier.executeTask(task);
      results.push(result);
    }

    return {
      type: 'verified_execution',
      commands: commands,
      results: results,
      verified: results.every(r => r.success),
      explanation: this.buildExecutionExplanation(commands, results)
    };
  }

  extractCommands(input) {
    // Simple command extraction - could be enhanced with better parsing
    const lines = input.split('\n');
    const commands = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('npm ') || 
          trimmed.startsWith('git ') || 
          trimmed.startsWith('docker ') ||
          trimmed.startsWith('node ') ||
          trimmed.startsWith('python ')) {
        commands.push(trimmed);
      }
    }
    
    return commands;
  }

  buildExecutionExplanation(commands, results) {
    let explanation = `Executed ${commands.length} command(s) with verification:\n\n`;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const result = results[i];
      
      explanation += `${i + 1}. ${command}\n`;
      explanation += `   Status: ${result.success ? chalk.green('✅ VERIFIED SUCCESS') : chalk.red('❌ FAILED')}\n`;
      if (!result.success) {
        explanation += `   Error: ${result.message}\n`;
      }
      explanation += '\n';
    }
    
    const successCount = results.filter(r => r.success).length;
    explanation += `Summary: ${successCount}/${commands.length} commands verified successfully`;
    
    return explanation;
  }
}

// Import other handler functions from original bruno.js
async function handleContinueMode(sessionManager, config, args) {
  console.log(chalk.cyan('🔄 Continuing last conversation...'));
  
  const sessionId = await sessionManager.continueLastSession();
  if (!sessionId) {
    console.log(chalk.yellow('📝 No previous session found, starting new session'));
    await handleInteractiveMode(sessionManager, config, args);
    return;
  }
  
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
  
  await startRepl({ ...args, sessionManager, sessionId });
}

async function handleCommandMode(config, args) {
  console.log(chalk.cyan('🤖 Starting Bruno 3.1 with verified execution...'));
  console.log(chalk.gray('✓ Local-first mode active'));
  console.log(chalk.gray(`  Provider: ${config.llm_provider}`));
  console.log(chalk.gray(`  Model: ${config.model}`));
  console.log(chalk.red('🛡️ Verification-first execution enabled'));
  
  try {
    const router = new VerifiedUniversalRouter(config, globalVerifier);
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
    
    // Show verification status
    if (result.verified !== undefined) {
      console.log(chalk.gray('\n🛡️ Verification Status:'), 
        result.verified ? chalk.green('✅ VERIFIED') : chalk.red('❌ NOT VERIFIED'));
    }
    
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
  let sessionId = null;
  
  if (!args.continue && !args.resume) {
    sessionId = await sessionManager.createSession({
      model: args.model,
      patterns: args.patterns,
      startTime: new Date().toISOString(),
      verification: config.verification
    });
  }
  
  console.log(chalk.cyan('🤖 Starting Bruno 3.1 with verified execution...'));
  console.log(chalk.red('🛡️ Verification-first mode: Bruno will NEVER claim success without proof'));
  
  await startRepl({ ...args, sessionManager, sessionId, verifier: globalVerifier });
}

// Start the application
main().catch(error => {
  console.error(chalk.red('❌ Fatal error:'), error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});