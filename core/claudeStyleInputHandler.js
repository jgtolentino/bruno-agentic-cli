import chalk from 'chalk';
import { spawn } from 'child_process';

/**
 * Claude Code CLI Style Input Handler
 * Handles multi-line input seamlessly without special modes or commands
 */
export class ClaudeStyleInputHandler {
  constructor() {
    this.inputBuffer = [];
    this.isCollecting = false;
    this.quietMode = false;
    this.contextAnalyzer = new ContextAnalyzer();
    this.executionStreamer = new ExecutionStreamer();
    this.nlProcessor = new NaturalLanguageProcessor();
    this.mixedContentHandler = new MixedContentHandler();
  }

  /**
   * Handle input line by line, automatically detecting when to continue or process
   */
  async handleInput(line) {
    // Claude Code doesn't require special modes - it just understands
    const analysis = this.contextAnalyzer.analyze(line, this.inputBuffer);
    
    if (analysis.isComplete) {
      const fullInput = this.inputBuffer.concat(line).join('\n');
      this.inputBuffer = [];
      return await this.processComplete(fullInput);
    } else {
      this.inputBuffer.push(line);
      return { 
        action: 'continue', 
        silent: true  // Don't show prompts, just accept input
      };
    }
  }

  /**
   * Reset the input handler
   */
  reset() {
    this.inputBuffer = [];
    this.isCollecting = false;
  }

  /**
   * Process completed input
   */
  async processComplete(fullInput) {
    // Claude Code automatically detects what you're trying to do
    const intent = this.detectIntent(fullInput);
    
    switch (intent.type) {
      case 'shell_script':
        return await this.executionStreamer.streamShellExecution(fullInput);
        
      case 'code_creation':
        return await this.createCode(intent);
        
      case 'natural_language':
        return await this.nlProcessor.processNaturalLanguage(fullInput);
        
      case 'mixed_content':
        return await this.mixedContentHandler.processMixedContent(fullInput);
        
      default:
        return { type: 'default', content: fullInput };
    }
  }

  /**
   * Detect the intent of the input
   */
  detectIntent(input) {
    const lines = input.split('\n').filter(l => l.trim());
    
    // Check if it's a shell script (multiple shell commands)
    if (this.looksLikeShellScript(lines)) {
      return { type: 'shell_script', content: input };
    }
    
    // Check if it's code creation (heredoc, file writing patterns)
    if (this.looksLikeCodeCreation(input)) {
      return { type: 'code_creation', content: input, files: this.extractFiles(input) };
    }
    
    // Check if it's mixed content (explanations + code/commands)
    if (this.looksLikeMixedContent(lines)) {
      return { type: 'mixed_content', content: input };
    }
    
    // Default to natural language processing
    return { type: 'natural_language', content: input };
  }

  /**
   * Check if input looks like a shell script
   */
  looksLikeShellScript(lines) {
    const shellPatterns = [
      /^(echo|cat|mkdir|cd|ls|npm|yarn|git|curl|wget|grep|sed|awk)\s/,
      /^(python|node|ruby|go|cargo|make|docker|kubectl)\s/,
      /\s*&&\s*$/,
      /\s*\|\s*$/,
      /\s*\\\s*$/
    ];
    
    let shellCommandCount = 0;
    for (const line of lines) {
      if (shellPatterns.some(pattern => pattern.test(line))) {
        shellCommandCount++;
      }
    }
    
    // If more than half the lines look like shell commands, it's probably a script
    return shellCommandCount > lines.length / 2;
  }

  /**
   * Check if input looks like code creation
   */
  looksLikeCodeCreation(input) {
    const codePatterns = [
      /cat\s*>\s*\S+\s*<<\s*['"]?EOF['"]?/,
      /echo\s*['"].*['"]?\s*>\s*\S+/,
      /write\s+\S+/,
      /create\s+(file|component|function|class)/i
    ];
    
    return codePatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check if input contains mixed content
   */
  looksLikeMixedContent(lines) {
    let hasNaturalLanguage = false;
    let hasCode = false;
    
    for (const line of lines) {
      // Check for natural language patterns
      if (/^(I need|Can you|Please|Create|Build|Fix|Update|Show me)/i.test(line)) {
        hasNaturalLanguage = true;
      }
      
      // Check for code patterns
      if (/^(```|    |function|class|const|let|var|import|export|def|if|for|while)/.test(line)) {
        hasCode = true;
      }
    }
    
    return hasNaturalLanguage && hasCode;
  }

  /**
   * Extract file creation patterns from input
   */
  extractFiles(input) {
    const files = [];
    const heredocPattern = /cat\s*>\s*(\S+)\s*<<\s*['"]?(\w+)['"]?\n([\s\S]*?)\n\2/g;
    const echoPattern = /echo\s*['"]([^'"]+)['"]?\s*>\s*(\S+)/g;
    
    let match;
    while ((match = heredocPattern.exec(input)) !== null) {
      files.push({
        path: match[1],
        content: match[3]
      });
    }
    
    while ((match = echoPattern.exec(input)) !== null) {
      files.push({
        path: match[2],
        content: match[1]
      });
    }
    
    return files;
  }

  /**
   * Create code files
   */
  async createCode(intent) {
    const results = [];
    
    for (const file of intent.files) {
      console.log(chalk.blue(`\n📝 Creating ${file.path}`));
      // In real implementation, would use fsHandler to write file
      results.push({
        action: 'create_file',
        path: file.path,
        content: file.content
      });
    }
    
    return {
      type: 'code_creation',
      files: results
    };
  }
}

/**
 * Context analyzer to determine when input is complete
 */
export class ContextAnalyzer {
  analyze(currentLine, buffer) {
    const fullContext = [...buffer, currentLine].join('\n');
    
    return {
      isComplete: this.isInputComplete(fullContext, currentLine, buffer),
      hasMoreContent: this.expectsMoreContent(currentLine),
      inputType: this.classifyInput(fullContext)
    };
  }

  isInputComplete(fullContext, lastLine, buffer) {
    // Empty line after content usually means done
    if (lastLine.trim() === '' && buffer.length > 0) {
      // But not if we're in the middle of a code block or heredoc
      if (!this.isInsideCodeBlock(fullContext) && !this.isInsideHeredoc(fullContext)) {
        return true;
      }
    }

    // Check for natural completion points
    if (this.isNaturalEndPoint(lastLine)) {
      return true;
    }

    // Multi-line constructs need their closing pairs
    if (this.hasUnmatchedPairs(fullContext)) {
      return false;
    }

    // Shell commands with \ continuation
    if (lastLine.endsWith('\\')) {
      return false;
    }

    // Pipes and logical operators expect more
    if (/[|&]\s*$/.test(lastLine)) {
      return false;
    }

    // Heredoc detection
    if (this.isInsideHeredoc(fullContext)) {
      return false;
    }

    return true;
  }

  isNaturalEndPoint(line) {
    // Questions typically end input
    if (/\?$/.test(line.trim())) return true;
    
    // Common ending phrases
    const endings = [
      /^(please|thanks|thank you|go ahead|execute|run this)/i,
      /^(that'?s it|that'?s all|done)$/i
    ];
    
    return endings.some(pattern => pattern.test(line.trim()));
  }

  isInsideCodeBlock(text) {
    const codeBlockStarts = (text.match(/```/g) || []).length;
    return codeBlockStarts % 2 !== 0;
  }

  isInsideHeredoc(text) {
    // Check for unclosed heredoc
    const heredocPattern = /<<\s*['"]?(\w+)['"]?$/m;
    const match = text.match(heredocPattern);
    
    if (match) {
      const delimiter = match[1];
      const endPattern = new RegExp(`^${delimiter}$`, 'm');
      const afterMatch = text.substring(text.indexOf(match[0]) + match[0].length);
      return !endPattern.test(afterMatch);
    }
    
    return false;
  }

  hasUnmatchedPairs(text) {
    const pairs = [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' }
    ];

    for (const pair of pairs) {
      const openCount = (text.match(new RegExp('\\' + pair.open, 'g')) || []).length;
      const closeCount = (text.match(new RegExp('\\' + pair.close, 'g')) || []).length;
      
      if (openCount !== closeCount) {
        return true;
      }
    }

    return false;
  }

  expectsMoreContent(line) {
    return /[\\|&]\s*$/.test(line) || /<<\s*['"]?\w+['"]?$/.test(line);
  }

  classifyInput(text) {
    if (/^(echo|cat|mkdir|cd|ls|npm|yarn|git)\s/.test(text)) {
      return 'shell';
    }
    if (/^(create|build|make|generate|setup)\s/i.test(text)) {
      return 'creation';
    }
    if (/\?$/.test(text.trim())) {
      return 'question';
    }
    return 'general';
  }
}

/**
 * Real-time execution streamer
 */
export class ExecutionStreamer {
  async streamShellExecution(script) {
    const lines = script.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        continue;
      }
      
      // Show the command being executed (like Claude Code)
      console.log(chalk.dim(`$ ${line}`));
      
      // Execute and stream output in real-time
      await this.executeWithStreaming(line);
    }
    
    return { type: 'shell_execution', completed: true };
  }

  async executeWithStreaming(command) {
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Real-time stdout streaming
      child.stdout.on('data', (data) => {
        process.stdout.write(data);
      });

      // Real-time stderr streaming (in red)
      child.stderr.on('data', (data) => {
        process.stdout.write(chalk.red(data));
      });

      child.on('exit', (code) => {
        if (code !== 0) {
          console.log(chalk.yellow(`\n↳ Command exited with code ${code}`));
        }
        resolve(code);
      });

      child.on('error', (error) => {
        console.log(chalk.red(`\n❌ Error: ${error.message}`));
        reject(error);
      });
    });
  }
}

/**
 * Natural language processor
 */
export class NaturalLanguageProcessor {
  async processNaturalLanguage(input) {
    // Claude Code understands complex requests
    console.log(chalk.blue('\n🤔 Understanding your request...\n'));
    
    // In real implementation, would use LLM to understand intent
    // For now, return a placeholder
    return {
      type: 'natural_language',
      content: input,
      needsProcessing: true
    };
  }
}

/**
 * Mixed content handler
 */
export class MixedContentHandler {
  async processMixedContent(input) {
    const segments = this.segmentContent(input);
    const results = [];
    
    for (const segment of segments) {
      switch (segment.type) {
        case 'explanation':
          console.log(chalk.gray(`\n💭 ${segment.content}\n`));
          break;
          
        case 'code':
          console.log(chalk.blue('\n📝 Code segment:\n'));
          console.log(segment.content);
          break;
          
        case 'command':
          console.log(chalk.dim(`\n$ ${segment.content}`));
          // Would execute command here
          break;
          
        case 'question':
          console.log(chalk.cyan(`\n❓ ${segment.content}\n`));
          break;
      }
      
      results.push(segment);
    }
    
    return {
      type: 'mixed_content',
      segments: results
    };
  }

  segmentContent(input) {
    const lines = input.split('\n');
    const segments = [];
    let currentSegment = { type: null, lines: [] };
    
    for (const line of lines) {
      const lineType = this.classifyLine(line);
      
      if (lineType !== currentSegment.type && currentSegment.lines.length > 0) {
        segments.push({
          type: currentSegment.type,
          content: currentSegment.lines.join('\n')
        });
        currentSegment = { type: lineType, lines: [line] };
      } else {
        currentSegment.type = lineType || currentSegment.type;
        currentSegment.lines.push(line);
      }
    }
    
    if (currentSegment.lines.length > 0) {
      segments.push({
        type: currentSegment.type,
        content: currentSegment.lines.join('\n')
      });
    }
    
    return segments;
  }

  classifyLine(line) {
    if (/^(echo|cat|mkdir|cd|ls|npm|yarn|git|curl|wget)\s/.test(line)) {
      return 'command';
    }
    if (/^```|^    /.test(line)) {
      return 'code';
    }
    if (/\?$/.test(line.trim())) {
      return 'question';
    }
    if (line.trim()) {
      return 'explanation';
    }
    return null;
  }
}