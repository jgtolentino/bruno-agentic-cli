import chalk from 'chalk';

export class ThinkingIndicator {
  constructor() {
    this.interval = null;
    this.dots = 0;
  }

  start(message = 'Processing') {
    this.stop(); // Clear any existing indicator
    this.dots = 0;
    
    process.stdout.write(chalk.cyan(`\n${message}`));
    
    this.interval = setInterval(() => {
      const dotCount = (this.dots % 4);
      const dots = '.'.repeat(dotCount);
      const spaces = ' '.repeat(3 - dotCount);
      process.stdout.write(`\r${chalk.cyan(message)}${chalk.yellow(dots)}${spaces}`);
      this.dots++;
    }, 400);
  }

  update(newMessage) {
    if (this.interval) {
      this.stop();
      this.start(newMessage);
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear line
    }
  }
}

export class ProgressTracker {
  constructor(total, label = 'Progress') {
    this.total = total;
    this.current = 0;
    this.label = label;
    this.startTime = Date.now();
  }

  update(current, status = '') {
    this.current = current;
    const percent = Math.round((current / this.total) * 100);
    const filled = Math.round((current / this.total) * 20);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    
    const elapsed = Date.now() - this.startTime;
    const eta = current > 0 ? ((this.total - current) * elapsed / current) / 1000 : 0;
    
    const statusText = status ? ` - ${status}` : '';
    const timeText = eta > 0 ? ` (${eta.toFixed(1)}s remaining)` : '';
    
    process.stdout.write(`\r${chalk.cyan(this.label)} [${chalk.green(bar)}] ${chalk.yellow(percent + '%')}${statusText}${chalk.gray(timeText)}`);
    
    if (current >= this.total) {
      console.log(chalk.green('\n✓ Complete!'));
    }
  }
}

export class StreamingRenderer {
  constructor() {
    this.buffer = '';
    this.lastUpdate = Date.now();
    this.cursor = '▋';
    this.cursorVisible = true;
    this.cursorInterval = null;
  }

  start() {
    // Animated cursor for streaming effect
    this.cursorInterval = setInterval(() => {
      this.cursorVisible = !this.cursorVisible;
      this.render();
    }, 500);
  }

  addChunk(chunk) {
    this.buffer += chunk;
    if (Date.now() - this.lastUpdate > 50) { // Throttle updates
      this.render();
      this.lastUpdate = Date.now();
    }
  }

  render() {
    const cursor = this.cursorVisible ? chalk.cyan(this.cursor) : ' ';
    process.stdout.write(`\r${this.buffer}${cursor}`);
  }

  complete() {
    if (this.cursorInterval) {
      clearInterval(this.cursorInterval);
      this.cursorInterval = null;
    }
    process.stdout.write(`\r${this.buffer}\n`);
  }
}

export class ResponseFormatter {
  static formatConversational(response) {
    if (typeof response === 'string') {
      console.log(chalk.white(response));
      return;
    }

    if (!response || typeof response !== 'object') {
      console.log(chalk.gray('No response available'));
      return;
    }

    // Main explanation
    if (response.explanation) {
      console.log(chalk.white(response.explanation));
    }

    // Code blocks
    if (response.code) {
      this.showCodeBlock(response.code, response.language || 'javascript');
    }

    // Commands
    if (response.command || response.commands) {
      this.showCommands(response.command || response.commands);
    }

    // Next steps
    if (response.followUp && response.followUp.length > 0) {
      this.showNextSteps(response.followUp);
    }

    // Additional info based on type
    if (response.type) {
      this.showTypeSpecificInfo(response);
    }
  }

  static showCodeBlock(code, language = 'bash') {
    console.log(chalk.yellow('\n📝 Code:'));
    console.log(chalk.gray('```' + language));
    console.log(chalk.white(code));
    console.log(chalk.gray('```'));
  }

  static showCommands(commands) {
    if (typeof commands === 'string') {
      console.log(chalk.yellow('\n💻 Command:'));
      console.log(chalk.green('$ ') + chalk.white(commands));
    } else if (Array.isArray(commands)) {
      console.log(chalk.yellow('\n💻 Commands:'));
      commands.forEach(cmd => {
        console.log(chalk.green('$ ') + chalk.white(cmd));
      });
    }
  }

  static showNextSteps(steps) {
    console.log(chalk.yellow('\n💡 Next steps:'));
    steps.forEach((step, i) => {
      console.log(chalk.gray(`  ${i + 1}. `) + chalk.white(step));
    });
  }

  static showTypeSpecificInfo(response) {
    switch (response.type) {
      case 'cloud':
        if (response.service) {
          console.log(chalk.gray(`\n🏷️  Service: ${response.service}`));
        }
        break;
      case 'frontend':
        if (response.framework) {
          console.log(chalk.gray(`\n🏷️  Framework: ${response.framework}`));
        }
        break;
      case 'database':
        if (response.query) {
          this.showCodeBlock(response.query, 'sql');
        }
        break;
    }
  }

  static showError(error, context = {}) {
    console.log(chalk.red('\n❌ Error occurred'));
    console.log(chalk.white(error.message));
    
    if (context.suggestions) {
      console.log(chalk.yellow('\n🔧 Possible solutions:'));
      context.suggestions.forEach(suggestion => {
        console.log(chalk.gray('  • ') + chalk.white(suggestion));
      });
    }
    
    if (context.debug && error.stack) {
      console.log(chalk.gray('\n🐛 Debug info:'));
      console.log(chalk.gray(error.stack));
    }
  }
}

export class StatusDashboard {
  static show(sessionInfo, modelInfo, status = 'ready') {
    const sessionText = sessionInfo ? 
      `📝 Session ${sessionInfo.id.slice(-8)}` + 
      (sessionInfo.messageCount ? ` (${sessionInfo.messageCount} msgs)` : '') : 
      '📝 New session';
    
    const modelText = `🧠 ${modelInfo.model || 'Local model'}`;
    const statusIcon = status === 'ready' ? '🟢' : status === 'thinking' ? '🟡' : '🔴';
    const statusText = `${statusIcon} ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    
    console.log(chalk.gray(`\n[${sessionText} • ${modelText} • ${statusText}]\n`));
  }
}

export class InteractiveHelp {
  static suggestCommands(currentContext = {}) {
    const baseCommands = ['help', 'clear', 'memory', 'exit'];
    const slashCommands = ['/help', '/memory', '/sessions', '/stats'];
    const actionCommands = ['explain', 'fix', 'create', 'deploy'];
    
    let suggestions = [];
    
    // Context-aware suggestions
    if (currentContext.hasFiles) {
      suggestions.push('explain <file>', 'fix <file>');
    }
    
    if (currentContext.inProject) {
      suggestions.push('analyze project', 'create component');
    }
    
    if (suggestions.length === 0) {
      suggestions = ['create react app', 'deploy to vercel', 'explain code'];
    }
    
    console.log(chalk.gray('\n💡 Try: ') + 
      suggestions.slice(0, 3).map(s => chalk.cyan(`"${s}"`)).join(', '));
    
    console.log(chalk.gray('Commands: ') + 
      baseCommands.map(s => chalk.yellow(s)).join(' • '));
    
    console.log(chalk.gray('Slash commands: ') + 
      slashCommands.map(s => chalk.cyan(s)).join(' • '));
  }

  static showQuickActions() {
    console.log(chalk.gray('\n⚡ Quick actions:'));
    console.log(chalk.cyan('  /help') + chalk.gray(' - Show help'));
    console.log(chalk.cyan('  /memory') + chalk.gray(' - Session history'));  
    console.log(chalk.cyan('  /sessions') + chalk.gray(' - List sessions'));
    console.log(chalk.cyan('  clear') + chalk.gray(' - Clear screen'));
  }
}

export class ContextualUI {
  static showRouting(input, intent, confidence) {
    // Clean, minimal routing feedback
    if (confidence >= 0.8) {
      console.log(chalk.green(`✓ ${intent.primary}`));
    } else if (confidence >= 0.5) {
      console.log(chalk.yellow(`⚡ ${intent.primary} (enhanced)`));
    } else {
      console.log(chalk.cyan(`🧠 analyzing`));
    }
  }

  static showProcessingStage(stage) {
    const stages = {
      'routing': '🔍 Routing request',
      'patterns': '🧠 Applying patterns', 
      'llm': '💭 Thinking',
      'enhancing': '⚡ Enhancing response',
      'formatting': '✨ Formatting output'
    };
    
    const message = stages[stage] || stage;
    console.log(chalk.gray(`  ${message}...`));
  }
}

export class EnhancedPrompt {
  constructor() {
    this.status = 'ready';
    this.sessionId = null;
  }

  getPrompt() {
    const statusIcon = {
      'ready': '🟢',
      'thinking': '🟡', 
      'error': '🔴',
      'processing': '🟠'
    }[this.status] || '⚪';
    
    const sessionIndicator = this.sessionId ? 
      chalk.gray(`[${this.sessionId.slice(-6)}]`) : '';
    
    return `${statusIcon} ${chalk.cyan('bruno')}${sessionIndicator}${chalk.cyan('>')} `;
  }

  updateStatus(newStatus) {
    this.status = newStatus;
  }

  updateSession(sessionId) {
    this.sessionId = sessionId;
  }
}