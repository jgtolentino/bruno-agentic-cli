import readline from 'readline';
import chalk from 'chalk';
import { Anthropic } from '@anthropic-ai/sdk';
import { loadPrompt, loadToolSchema } from '../core/promptLoader.js';
import { handleTool, parseToolCall } from '../core/toolRouter.js';
import { MemoryManager } from '../core/memoryManager.js';

const memory = new MemoryManager();

export async function startRepl(args) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const systemPrompt = loadPrompt();
  const toolSchema = loadToolSchema();

  console.log(chalk.cyan.bold('\n🤖 Bruno v2.0 - Claude-powered CLI'));
  console.log(chalk.gray('Type "help" for commands, "exit" to quit\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('bruno> ')
  });

  // Handle direct command execution
  if (args.command && args.file) {
    await executeCommand(args.command, args.file, anthropic, systemPrompt);
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

    // Process with Claude
    try {
      const response = await processWithClaude(input, anthropic, systemPrompt);
      
      // Check for tool calls
      const toolCalls = parseToolCall(response);
      for (const call of toolCalls) {
        console.log(chalk.yellow(`\nExecuting tool: ${call.tool}`));
        const result = await handleTool(call.tool, call.args);
        console.log(result);
      }

      // Add to memory
      memory.addToMemory({
        type: 'interaction',
        input: input,
        response: response
      });

    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
    }

    rl.prompt();
  });
}

async function processWithClaude(input, anthropic, systemPrompt) {
  const recentContext = memory.getRecentContext(3);
  const contextString = recentContext.map(m => 
    `User: ${m.input}\nAssistant: ${m.response}`
  ).join('\n\n');

  const messages = [{
    role: 'user',
    content: contextString ? `${contextString}\n\nUser: ${input}` : input
  }];

  console.log(chalk.gray('\nThinking...'));

  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    system: systemPrompt,
    messages: messages,
    max_tokens: 2048
  });

  const content = response.content[0].text;
  console.log('\n' + chalk.white(content));
  
  return content;
}

async function executeCommand(command, file, anthropic, systemPrompt) {
  console.log(chalk.yellow(`Executing: ${command} on ${file}`));
  
  const input = `Please ${command} the following file: ${file}`;
  await processWithClaude(input, anthropic, systemPrompt);
}

function showHelp() {
  console.log(`
${chalk.bold('Commands:')}
  help     - Show this help message
  clear    - Clear the screen
  memory   - Show memory summary
  exit     - Exit the REPL

${chalk.bold('Tool Usage:')}
  fix <file>      - Fix code issues
  explain <file>  - Explain code
  test <file>     - Generate tests

${chalk.bold('Examples:')}
  bruno> explain src/utils.js
  bruno> fix the authentication bug in auth.js
  bruno> generate tests for calculator.js
  `);
}