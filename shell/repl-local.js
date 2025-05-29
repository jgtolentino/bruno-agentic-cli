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

  console.log(chalk.cyan.bold('\n🤖 Bruno v2.0 - Local-First CLI'));
  console.log(chalk.gray('100% private, 100% offline'));
  console.log(chalk.gray('Type "help" for commands, "exit" to quit\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('bruno> ')
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
      rl.prompt();
      return;
    }

    if (input.startsWith('shell ') || input.startsWith('run ')) {
      const command = input.replace(/^(shell|run) /, '');
      await executeShellCommand(command, shellSandbox);
      rl.prompt();
      return;
    }

    // Process with local LLM
    try {
      console.log(chalk.gray('\nThinking locally...'));
      
      await processWithOllama(input, ollama, systemPrompt, async (chunk) => {
        process.stdout.write(chunk);
      });
      
      console.log('\n');

      // Add to memory
      memory.addToMemory({
        type: 'interaction',
        input: input,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
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

function showHelp() {
  console.log(`
${chalk.bold('Commands:')}
  help     - Show this help message
  clear    - Clear the screen
  memory   - Show memory summary
  shell    - Execute shell command (sandboxed)
  run      - Alias for shell
  exit     - Exit the REPL

${chalk.bold('Tool Usage:')}
  fix <file>      - Fix code issues
  explain <file>  - Explain code
  test <file>     - Generate tests

${chalk.bold('Privacy Features:')}
  ✓ 100% local processing
  ✓ No telemetry or tracking
  ✓ No cloud dependencies
  ✓ Shell command sandboxing

${chalk.bold('Examples:')}
  bruno> explain src/utils.js
  bruno> fix the authentication bug in auth.js
  bruno> shell npm test
  bruno> run git status
  `);
}