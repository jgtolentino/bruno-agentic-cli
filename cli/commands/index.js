import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export class SlashCommands {
  constructor(sessionManager, memoryManager) {
    this.sessionManager = sessionManager;
    this.memoryManager = memoryManager;
    
    this.commands = {
      '/help': this.showHelp.bind(this),
      '/sessions': this.listSessions.bind(this),
      '/summary': this.showSummary.bind(this),
      '/reset': this.resetConversation.bind(this),
      '/clear': this.clearScreen.bind(this),
      '/model': this.showModel.bind(this),
      '/save': this.saveConversation.bind(this),
      '/load': this.loadConversation.bind(this)
    };
  }

  async execute(command, args) {
    const handler = this.commands[command];
    if (handler) {
      return await handler(args);
    }
    
    console.log(chalk.yellow(`Unknown command: ${command}`));
    console.log(chalk.gray('Type /help for available commands'));
    return null;
  }

  async showHelp() {
    console.log(chalk.cyan.bold('\n🎯 Bruno Slash Commands:\n'));
    console.log(chalk.white('  /help         - Show this help message'));
    console.log(chalk.white('  /sessions     - List all conversation sessions'));
    console.log(chalk.white('  /summary      - Show current session summary'));
    console.log(chalk.white('  /reset        - Reset current conversation'));
    console.log(chalk.white('  /clear        - Clear the screen'));
    console.log(chalk.white('  /model        - Show current model info'));
    console.log(chalk.white('  /save <name>  - Save conversation to file'));
    console.log(chalk.white('  /load <name>  - Load conversation from file'));
    console.log('');
    return { handled: true };
  }

  async listSessions() {
    const sessions = await this.sessionManager.listSessions();
    
    if (sessions.length === 0) {
      console.log(chalk.yellow('No sessions found'));
      return { handled: true };
    }

    console.log(chalk.cyan.bold('\n📚 Conversation Sessions:\n'));
    sessions.forEach((session, index) => {
      const date = new Date(session.timestamp).toLocaleString();
      console.log(chalk.white(`  ${index + 1}. [${session.id}] - ${date}`));
      if (session.model) {
        console.log(chalk.gray(`     Model: ${session.model}`));
      }
    });
    console.log('');
    return { handled: true };
  }

  async showSummary() {
    const memory = await this.memoryManager.getCurrentMemory();
    
    if (!memory || memory.conversations.length === 0) {
      console.log(chalk.yellow('No conversation history yet'));
      return { handled: true };
    }

    console.log(chalk.cyan.bold('\n📝 Conversation Summary:\n'));
    memory.conversations.forEach((turn, index) => {
      console.log(chalk.blue(`${index + 1}. User:`), turn.prompt.substring(0, 50) + '...');
      console.log(chalk.green(`   Bruno:`), turn.response.substring(0, 50) + '...\n');
    });
    
    console.log(chalk.gray(`Total turns: ${memory.conversations.length}`));
    return { handled: true };
  }

  async resetConversation() {
    await this.memoryManager.clearMemory();
    console.log(chalk.green('✅ Conversation reset'));
    return { handled: true };
  }

  async clearScreen() {
    console.clear();
    return { handled: true };
  }

  async showModel() {
    const config = this.sessionManager.config;
    console.log(chalk.cyan.bold('\n🤖 Model Information:\n'));
    console.log(chalk.white(`  Provider: ${config.llm_provider || 'local'}`));
    console.log(chalk.white(`  Model: ${config.model || 'deepseek-coder:6.7b'}`));
    console.log(chalk.white(`  Endpoint: ${config.ollama_url || 'http://127.0.0.1:11434'}`));
    console.log('');
    return { handled: true };
  }

  async saveConversation(name) {
    if (!name) {
      console.log(chalk.yellow('Please provide a name: /save <name>'));
      return { handled: true };
    }

    const memory = await this.memoryManager.getCurrentMemory();
    const savePath = path.join('memory', 'saved', `${name}.json`);
    
    try {
      await fs.promises.mkdir(path.dirname(savePath), { recursive: true });
      await fs.promises.writeFile(savePath, JSON.stringify(memory, null, 2));
      console.log(chalk.green(`✅ Conversation saved to ${savePath}`));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to save: ${error.message}`));
    }
    
    return { handled: true };
  }

  async loadConversation(name) {
    if (!name) {
      console.log(chalk.yellow('Please provide a name: /load <name>'));
      return { handled: true };
    }

    const loadPath = path.join('memory', 'saved', `${name}.json`);
    
    try {
      const data = await fs.promises.readFile(loadPath, 'utf-8');
      const memory = JSON.parse(data);
      await this.memoryManager.loadMemory(memory);
      console.log(chalk.green(`✅ Conversation loaded from ${loadPath}`));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to load: ${error.message}`));
    }
    
    return { handled: true };
  }
}
