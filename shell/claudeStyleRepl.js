import readline from 'readline';
import chalk from 'chalk';
import { ClaudeStyleInputHandler } from '../core/claudeStyleInputHandler.js';

/**
 * Claude Code CLI Style REPL
 * No visible mode indicators, no special commands - it just works
 */
export class ClaudeStyleRepl {
  constructor(options = {}) {
    this.handler = new ClaudeStyleInputHandler();
    this.ollama = options.ollama;
    this.sessionManager = options.sessionManager;
    this.sessionId = options.sessionId;
    this.config = options.config;
    this.continuationMode = false;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ',
      completer: this.completer.bind(this),
      terminal: true
    });
    
    this.setupHandlers();
  }

  /**
   * Setup event handlers
   */
  setupHandlers() {
    this.rl.on('line', async (line) => {
      try {
        const result = await this.handler.handleInput(line);
        
        if (result.action === 'continue') {
          // Don't show special prompts, just accept more input
          this.continuationMode = true;
          // Use empty prompt for continuation (like Claude Code)
          this.rl.setPrompt('');
          this.rl.prompt();
        } else {
          this.continuationMode = false;
          await this.processResult(result);
          // Reset to normal prompt
          this.rl.setPrompt('> ');
          this.rl.prompt();
        }
      } catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error.message}`));
        this.continuationMode = false;
        this.handler.reset();
        this.rl.setPrompt('> ');
        this.rl.prompt();
      }
    });

    // Handle Ctrl+C gracefully
    this.rl.on('SIGINT', () => {
      if (this.continuationMode) {
        console.log(chalk.yellow('\n↳ Input cancelled\n'));
        this.handler.reset();
        this.continuationMode = false;
        this.rl.setPrompt('> ');
        this.rl.prompt();
      } else {
        // Simple exit without confirmation (like Claude Code)
        console.log(chalk.yellow('\nGoodbye! 👋'));
        process.exit(0);
      }
    });

    // Handle Ctrl+D
    this.rl.on('close', () => {
      console.log(chalk.yellow('\nGoodbye! 👋'));
      process.exit(0);
    });
  }

  /**
   * Process the result from the handler
   */
  async processResult(result) {
    // Handle different result types without exposing complexity
    switch (result.type) {
      case 'shell_execution':
        // Already handled by streamer
        break;
        
      case 'code_creation':
        await this.handleCodeCreation(result);
        break;
        
      case 'natural_language':
        await this.handleNaturalLanguage(result);
        break;
        
      case 'mixed_content':
        await this.handleMixedContent(result);
        break;
        
      case 'default':
        await this.handleDefault(result);
        break;
        
      default:
        console.log(result.content || JSON.stringify(result));
    }
  }

  /**
   * Handle code creation results
   */
  async handleCodeCreation(result) {
    if (result.files && result.files.length > 0) {
      console.log(chalk.green(`\n✅ Created ${result.files.length} file(s)`));
      
      for (const file of result.files) {
        console.log(chalk.gray(`  • ${file.path}`));
      }
    }
  }

  /**
   * Handle natural language processing
   */
  async handleNaturalLanguage(result) {
    if (result.needsProcessing && this.ollama) {
      // Process with Ollama
      const thinking = new ThinkingAnimation();
      thinking.start();
      
      try {
        await this.processWithOllama(result.content);
      } finally {
        thinking.stop();
      }
    } else {
      console.log(result.content);
    }
  }

  /**
   * Handle mixed content results
   */
  async handleMixedContent(result) {
    // Mixed content is already processed and displayed by the handler
    if (result.summary) {
      console.log(chalk.gray(`\n${result.summary}`));
    }
  }

  /**
   * Handle default/unknown content
   */
  async handleDefault(result) {
    if (this.ollama) {
      await this.processWithOllama(result.content);
    } else {
      console.log(chalk.yellow('⚠️  No LLM available for processing'));
      console.log(result.content);
    }
  }

  /**
   * Process content with Ollama
   */
  async processWithOllama(content) {
    if (!this.ollama) return;
    
    try {
      const systemPrompt = `You are Bruno, a helpful AI assistant. Process this request concisely and effectively.`;
      const fullPrompt = `${systemPrompt}\n\nUser: ${content}\n\nAssistant:`;
      
      await this.ollama.generateStream(fullPrompt, (chunk) => {
        process.stdout.write(chunk);
      });
      
      console.log(''); // New line after response
    } catch (error) {
      console.error(chalk.red(`\n❌ LLM Error: ${error.message}`));
    }
  }

  /**
   * Tab completion
   */
  completer(line) {
    const completions = [
      'exit', 'quit', 'help', 'clear',
      'echo ', 'cat ', 'mkdir ', 'cd ', 'ls ',
      'npm ', 'yarn ', 'git ', 'curl ', 'wget ',
      'create ', 'build ', 'fix ', 'explain ',
      'analyze ', 'deploy ', 'test '
    ];
    
    const hits = completions.filter((c) => c.startsWith(line));
    return [hits.length ? hits : completions, line];
  }

  /**
   * Start the REPL
   */
  start() {
    console.log(chalk.cyan.bold('\n🤖 Bruno CLI - Claude Code Style'));
    console.log(chalk.gray('Paste anything - code, scripts, or natural language\n'));
    
    this.rl.prompt();
  }
}

/**
 * Simple thinking animation
 */
class ThinkingAnimation {
  constructor() {
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.currentFrame = 0;
    this.interval = null;
  }

  start(message = 'Thinking') {
    this.interval = setInterval(() => {
      process.stdout.write(`\r${chalk.blue(this.frames[this.currentFrame])} ${chalk.gray(message)}...`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear the line
    }
  }
}