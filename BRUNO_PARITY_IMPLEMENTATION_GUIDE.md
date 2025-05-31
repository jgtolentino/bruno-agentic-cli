# Bruno CLI Parity Implementation Guide

## Quick Wins: Immediate High-Impact Changes

### 1. Enable Piped Input Support (2 days)

**Current Gap**: No stdin support
**Impact**: High - Enables workflow integration

```javascript
// core/argParser.js - Add pipe detection
export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    isPiped: !process.stdin.isTTY,  // Add this
    pipeContent: null,
    // ... existing args
  };
  
  // Handle piped input
  if (args.isPiped) {
    args.mode = 'pipe';
    // Will be populated by stdin reader
  }
  
  return args;
}

// bin/bruno.js - Add stdin handler
async function handlePipedInput() {
  return new Promise((resolve) => {
    let inputBuffer = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      inputBuffer += chunk;
    });
    
    process.stdin.on('end', () => {
      resolve(inputBuffer);
    });
  });
}

// In main()
if (args.isPiped) {
  args.pipeContent = await handlePipedInput();
  if (args.print) {
    args.prompt = args.prompt 
      ? `${args.pipeContent}\n${args.prompt}`
      : args.pipeContent;
    await handlePrintMode(config, args);
  }
}
```

### 2. Add Streaming Output (3 days)

**Current Gap**: No real-time streaming
**Impact**: High - Better user feedback

```javascript
// core/streamingOutput.js
import { Transform } from 'stream';
import chalk from 'chalk';

export class StreamingFormatter extends Transform {
  constructor(options = {}) {
    super();
    this.format = options.format || 'text';
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    if (this.format === 'json') {
      this.push(JSON.stringify({
        type: 'stream',
        data: chunk.toString(),
        timestamp: new Date().toISOString()
      }) + '\n');
    } else {
      // Smart formatting for text
      const text = chunk.toString();
      
      // Detect and format different content types
      if (text.includes('$')) {
        // Command line
        this.push(chalk.dim(text));
      } else if (text.includes('Error:')) {
        // Error output
        this.push(chalk.red(text));
      } else {
        // Regular output
        this.push(text);
      }
    }
    callback();
  }
}

// Usage in execution
const formatter = new StreamingFormatter({ 
  format: args.outputFormat 
});

child.stdout.pipe(formatter).pipe(process.stdout);
child.stderr.pipe(formatter).pipe(process.stderr);
```

### 3. Rich Progress Indicators (3 days)

**Current Gap**: Basic spinners only
**Impact**: High - Professional UI feel

```javascript
// core/progressUI.js
import blessed from 'blessed';
import contrib from 'blessed-contrib';

export class ProgressManager {
  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true
    });
    
    this.tasks = new Map();
    this.layout = null;
  }

  createLayout() {
    this.layout = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: '30%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'cyan'
        }
      }
    });
    
    this.screen.append(this.layout);
  }

  addTask(id, name) {
    const gauge = contrib.gauge({
      label: name,
      width: '80%',
      height: '20%',
      top: this.tasks.size * 25 + '%',
      left: '10%',
      stroke: 'green',
      fill: 'white'
    });
    
    this.layout.append(gauge);
    this.tasks.set(id, { name, gauge, progress: 0 });
    this.screen.render();
  }

  updateProgress(id, percent, status) {
    const task = this.tasks.get(id);
    if (task) {
      task.gauge.setPercent(percent);
      task.gauge.setLabel(`${task.name} - ${status}`);
      this.screen.render();
    }
  }

  complete() {
    setTimeout(() => {
      this.screen.destroy();
    }, 1000);
  }
}

// Usage
const progress = new ProgressManager();
progress.createLayout();

progress.addTask('install', 'Installing dependencies');
progress.updateProgress('install', 25, 'Resolving packages...');
// ... updates
progress.updateProgress('install', 100, 'Complete');
```

### 4. Syntax Highlighting (2 days)

**Current Gap**: No code highlighting
**Impact**: Medium - Better code readability

```javascript
// core/syntaxHighlighter.js
import { highlight, languages } from 'prismjs';
import loadLanguages from 'prismjs/components/';
import chalk from 'chalk';

// Load common languages
loadLanguages(['javascript', 'typescript', 'jsx', 'tsx', 'css', 'python', 'bash']);

export class SyntaxHighlighter {
  constructor() {
    this.themeMap = {
      'keyword': chalk.blue,
      'string': chalk.green,
      'number': chalk.yellow,
      'comment': chalk.gray,
      'function': chalk.magenta,
      'class-name': chalk.cyan,
      'operator': chalk.white,
      'punctuation': chalk.gray
    };
  }

  highlight(code, language = 'javascript') {
    try {
      const grammar = languages[language] || languages.plaintext;
      const tokens = highlight(code, grammar, language);
      
      return this.colorizeTokens(tokens);
    } catch (error) {
      // Fallback to plain text
      return code;
    }
  }

  colorizeTokens(html) {
    // Convert Prism HTML output to terminal colors
    return html
      .replace(/<span class="token ([^"]+)">([^<]+)<\/span>/g, (match, type, content) => {
        const colorFn = this.themeMap[type] || chalk.white;
        return colorFn(content);
      })
      .replace(/<[^>]+>/g, ''); // Remove any remaining HTML
  }

  detectLanguage(filename) {
    const ext = filename.split('.').pop();
    const langMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'py': 'python',
      'sh': 'bash',
      'css': 'css'
    };
    
    return langMap[ext] || 'plaintext';
  }
}

// Usage in file display
const highlighter = new SyntaxHighlighter();
const language = highlighter.detectLanguage(filename);
const highlighted = highlighter.highlight(fileContent, language);
console.log(highlighted);
```

### 5. Interactive Prompts (2 days)

**Current Gap**: No interactive selections
**Impact**: Medium - Better user interaction

```javascript
// core/interactivePrompts.js
import inquirer from 'inquirer';
import fuzzy from 'fuzzy';

export class InteractivePrompts {
  async selectOption(message, choices, options = {}) {
    const { multiSelect = false, fuzzySearch = true } = options;
    
    if (fuzzySearch) {
      inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
      
      return inquirer.prompt([{
        type: 'autocomplete',
        name: 'selection',
        message,
        source: (answersSoFar, input) => {
          input = input || '';
          return new Promise((resolve) => {
            const fuzzyResult = fuzzy.filter(input, choices);
            resolve(fuzzyResult.map(el => el.original));
          });
        }
      }]);
    }
    
    return inquirer.prompt([{
      type: multiSelect ? 'checkbox' : 'list',
      name: 'selection',
      message,
      choices
    }]);
  }

  async confirm(message, defaultValue = true) {
    const { confirmed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }]);
    
    return confirmed;
  }

  async input(message, options = {}) {
    const { defaultValue, validate, transform } = options;
    
    const { value } = await inquirer.prompt([{
      type: 'input',
      name: 'value',
      message,
      default: defaultValue,
      validate,
      transformer: transform
    }]);
    
    return value;
  }

  async password(message) {
    const { password } = await inquirer.prompt([{
      type: 'password',
      name: 'password',
      message,
      mask: '*'
    }]);
    
    return password;
  }
}

// Usage
const prompts = new InteractivePrompts();

// Fuzzy searchable selection
const file = await prompts.selectOption(
  'Select a file to edit:',
  fileList,
  { fuzzySearch: true }
);

// Confirmation
if (await prompts.confirm('Deploy to production?')) {
  // Deploy
}
```

### 6. Error Recovery System (4 days)

**Current Gap**: No automatic error recovery
**Impact**: High - Major UX improvement

```javascript
// core/errorRecovery.js
export class ErrorRecoverySystem {
  constructor() {
    this.errorPatterns = new Map([
      [/EACCES|Permission denied/, this.handlePermissionError],
      [/ENOENT|No such file/, this.handleFileNotFound],
      [/npm ERR!.*peer dep/, this.handlePeerDepError],
      [/Cannot find module/, this.handleModuleNotFound],
      [/port.*already in use/, this.handlePortInUse],
      [/git.*fatal/, this.handleGitError]
    ]);
    
    this.recoveryStrategies = new Map();
  }

  async analyzeError(error, context) {
    const errorStr = error.toString();
    
    for (const [pattern, handler] of this.errorPatterns) {
      if (pattern.test(errorStr)) {
        return handler.call(this, error, context);
      }
    }
    
    // Generic recovery
    return this.genericRecovery(error, context);
  }

  async handlePermissionError(error, context) {
    const strategies = [
      {
        name: 'Use sudo',
        condition: () => process.platform !== 'win32',
        action: async (cmd) => `sudo ${cmd}`,
        risk: 'high'
      },
      {
        name: 'Change ownership',
        condition: (cmd) => cmd.includes('npm'),
        action: async (cmd) => {
          await this.execute('sudo chown -R $(whoami) ~/.npm');
          return cmd;
        },
        risk: 'medium'
      }
    ];
    
    return this.tryStrategies(strategies, context);
  }

  async handlePeerDepError(error, context) {
    const strategies = [
      {
        name: 'Use --legacy-peer-deps',
        action: async (cmd) => cmd.replace('npm install', 'npm install --legacy-peer-deps'),
        risk: 'low'
      },
      {
        name: 'Use --force',
        action: async (cmd) => cmd.replace('npm install', 'npm install --force'),
        risk: 'medium'
      },
      {
        name: 'Update dependencies',
        action: async (cmd) => {
          console.log(chalk.yellow('Analyzing dependency conflicts...'));
          // Analyze package.json and suggest updates
          return cmd;
        },
        risk: 'low'
      }
    ];
    
    return this.tryStrategies(strategies, context);
  }

  async tryStrategies(strategies, context) {
    console.log(chalk.yellow('\n🔧 Attempting automatic recovery...\n'));
    
    for (const strategy of strategies) {
      if (strategy.condition && !strategy.condition(context.command)) {
        continue;
      }
      
      console.log(chalk.blue(`Trying: ${strategy.name}`));
      
      try {
        const modifiedCmd = await strategy.action(context.command);
        const result = await this.execute(modifiedCmd);
        
        if (result.success) {
          console.log(chalk.green(`✅ Recovery successful with: ${strategy.name}`));
          return { recovered: true, command: modifiedCmd, result };
        }
      } catch (err) {
        console.log(chalk.gray(`   Strategy failed: ${err.message}`));
      }
    }
    
    return { recovered: false };
  }

  async execute(command) {
    // Implementation of command execution
    const { execSync } = require('child_process');
    try {
      const output = execSync(command, { encoding: 'utf8' });
      return { success: true, output };
    } catch (error) {
      return { success: false, error };
    }
  }
}

// Integration with main execution
const recovery = new ErrorRecoverySystem();

try {
  await executeCommand(cmd);
} catch (error) {
  const result = await recovery.analyzeError(error, {
    command: cmd,
    cwd: process.cwd()
  });
  
  if (result.recovered) {
    console.log(chalk.green('✅ Recovered from error and continued'));
  } else {
    console.log(chalk.red('❌ Could not automatically recover'));
    // Show manual suggestions
  }
}
```

### 7. Context-Aware UI (5 days)

**Current Gap**: Static UI
**Impact**: High - Adaptive experience

```javascript
// core/contextAwareUI.js
import blessed from 'blessed';

export class ContextAwareUI {
  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'Bruno CLI'
    });
    
    this.layouts = new Map();
    this.activeLayout = null;
    this.context = null;
  }

  registerLayout(name, layoutFactory) {
    this.layouts.set(name, layoutFactory);
  }

  detectContext(input, currentState) {
    // Analyze input and state to determine context
    if (input.includes('create') || input.includes('new')) {
      return 'creation';
    } else if (input.includes('debug') || input.includes('error')) {
      return 'debugging';
    } else if (input.includes('deploy') || input.includes('build')) {
      return 'deployment';
    } else if (input.includes('test')) {
      return 'testing';
    }
    
    return 'default';
  }

  switchToContext(contextName) {
    if (this.activeLayout) {
      this.activeLayout.detach();
    }
    
    const layoutFactory = this.layouts.get(contextName) || this.layouts.get('default');
    this.activeLayout = layoutFactory(this.screen);
    this.context = contextName;
    
    this.screen.render();
  }

  // Pre-defined layouts
  createDefaultLayout(screen) {
    const container = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });
    
    const output = blessed.log({
      parent: container,
      top: 0,
      left: 0,
      width: '100%',
      height: '70%',
      border: { type: 'line' },
      scrollable: true,
      mouse: true,
      label: ' Output '
    });
    
    const input = blessed.textbox({
      parent: container,
      bottom: 0,
      left: 0,
      width: '100%',
      height: '30%',
      border: { type: 'line' },
      label: ' Input ',
      inputOnFocus: true
    });
    
    return { container, output, input };
  }

  createDebuggingLayout(screen) {
    const container = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });
    
    // Main output (50%)
    const output = blessed.log({
      parent: container,
      top: 0,
      left: 0,
      width: '50%',
      height: '100%',
      border: { type: 'line' },
      label: ' Output '
    });
    
    // Stack trace (25%)
    const stackTrace = blessed.box({
      parent: container,
      top: 0,
      left: '50%',
      width: '50%',
      height: '50%',
      border: { type: 'line' },
      label: ' Stack Trace '
    });
    
    // Variables (25%)
    const variables = blessed.box({
      parent: container,
      top: '50%',
      left: '50%',
      width: '50%',
      height: '50%',
      border: { type: 'line' },
      label: ' Variables '
    });
    
    return { container, output, stackTrace, variables };
  }

  createCreationLayout(screen) {
    // Layout optimized for file creation
    // Shows file tree, preview, etc.
  }
}

// Usage
const ui = new ContextAwareUI();

ui.registerLayout('default', ui.createDefaultLayout);
ui.registerLayout('debugging', ui.createDebuggingLayout);
ui.registerLayout('creation', ui.createCreationLayout);

// Auto-switch based on context
const context = ui.detectContext(userInput, state);
ui.switchToContext(context);
```

## Implementation Priority Order

### Week 1-2: Core IO
1. ✅ Piped input support
2. ✅ Streaming output
3. ✅ Multi-line improvements

### Week 3-4: Visual Enhancements  
1. ✅ Rich progress indicators
2. ✅ Syntax highlighting
3. ✅ Interactive prompts

### Week 5-6: Intelligence
1. ✅ Error recovery system
2. ✅ Context-aware UI
3. ⏳ Proactive suggestions

### Week 7-8: Advanced Features
1. ⏳ Multi-tool orchestration
2. ⏳ Background monitoring
3. ⏳ External integrations

## Testing Each Enhancement

```bash
# Test piped input
echo "analyze this error" | bruno -p
cat package.json | bruno -p "explain dependencies"

# Test streaming
bruno --output-format stream-json create react app

# Test progress UI
bruno create fullstack app  # Should show multi-progress

# Test error recovery
bruno install nonexistent-package  # Should try recovery

# Test interactive prompts
bruno create component  # Should show fuzzy file selector
```

## Backwards Compatibility

All enhancements maintain backwards compatibility:
- New features are opt-in via flags
- Existing commands work unchanged
- Progressive enhancement approach
- Graceful degradation for unsupported terminals

This implementation guide provides concrete code examples for the highest-impact features that will bring Bruno CLI closer to Claude Code CLI parity.