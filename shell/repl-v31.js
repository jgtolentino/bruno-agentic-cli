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
