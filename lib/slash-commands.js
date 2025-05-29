const explainAgent = require('../agents/explain.js');
const fixAgent = require('../agents/fix.js');
const testAgent = require('../agents/test.js');

class SlashCommandParser {
  constructor() {
    this.commands = {
      '/explain': this.handleExplain.bind(this),
      '/fix': this.handleFix.bind(this),
      '/test': this.handleTest.bind(this),
      '/help': this.handleHelp.bind(this),
      '/context': this.handleContext.bind(this),
      '/model': this.handleModel.bind(this)
    };
  }

  parse(input) {
    const trimmed = input.trim();
    
    // Check if it's a slash command
    if (!trimmed.startsWith('/')) {
      return { type: 'freeform', content: input };
    }

    // Extract command and arguments
    const parts = trimmed.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    if (this.commands[command]) {
      return this.commands[command](args);
    } else {
      return { 
        type: 'error', 
        message: `Unknown command: ${command}. Type /help for available commands.` 
      };
    }
  }

  handleExplain(args) {
    const filePath = args[0];
    if (!filePath) {
      return { 
        type: 'error', 
        message: 'Usage: /explain <file_path>' 
      };
    }
    return {
      type: 'agent',
      agent: 'explain',
      filePath: filePath
    };
  }

  handleFix(args) {
    const filePath = args[0];
    if (!filePath) {
      return { 
        type: 'error', 
        message: 'Usage: /fix <file_path>' 
      };
    }
    return {
      type: 'agent',
      agent: 'fix',
      filePath: filePath
    };
  }

  handleTest(args) {
    const filePath = args[0];
    if (!filePath) {
      return { 
        type: 'error', 
        message: 'Usage: /test <file_path>' 
      };
    }
    return {
      type: 'agent',
      agent: 'test',
      filePath: filePath
    };
  }

  handleHelp(args) {
    return {
      type: 'help',
      content: `
Bruno CLI Commands:
/explain <file>   - Explain code in detail
/fix <file>       - Find and fix bugs
/test <file>      - Generate comprehensive tests
/context          - Show current workspace context
/model [name]     - Show or change AI model
/help             - Show this help message

Examples:
/explain src/utils.js
/fix components/Button.tsx
/test lib/parser.js
      `.trim()
    };
  }

  handleContext(args) {
    return {
      type: 'context',
      content: 'Workspace context will be displayed here'
    };
  }

  handleModel(args) {
    if (args.length === 0) {
      return {
        type: 'info',
        content: 'Current model: deepseek-coder:6.7b-instruct-q4_K_M'
      };
    }
    return {
      type: 'model_change',
      model: args[0]
    };
  }
}

module.exports = SlashCommandParser;