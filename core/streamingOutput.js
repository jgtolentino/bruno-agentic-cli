import { Transform, PassThrough } from 'stream';
import chalk from 'chalk';
import { EventEmitter } from 'events';

export class StreamingOutputManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.format = options.format || 'text';
    this.enableColors = options.colors !== false;
    this.showTimestamps = options.timestamps || false;
    this.bufferMode = options.bufferMode || false;
    this.streams = new Map();
  }

  createFormatter(streamId = 'default') {
    const formatter = new StreamingFormatter({
      format: this.format,
      enableColors: this.enableColors,
      showTimestamps: this.showTimestamps,
      streamId
    });

    this.streams.set(streamId, formatter);
    
    formatter.on('data', (data) => {
      this.emit('stream', { streamId, data });
    });

    return formatter;
  }

  getStream(streamId) {
    return this.streams.get(streamId);
  }

  setFormat(format) {
    this.format = format;
    this.streams.forEach(stream => {
      stream.setFormat(format);
    });
  }

  closeAll() {
    this.streams.forEach(stream => {
      stream.end();
    });
    this.streams.clear();
  }
}

export class StreamingFormatter extends Transform {
  constructor(options = {}) {
    super({ objectMode: false });
    this.format = options.format || 'text';
    this.enableColors = options.enableColors !== false;
    this.showTimestamps = options.showTimestamps || false;
    this.streamId = options.streamId || 'default';
    this.buffer = '';
    this.lineNumber = 0;
    this.startTime = Date.now();
  }

  _transform(chunk, encoding, callback) {
    try {
      const text = chunk.toString();
      const lines = text.split('\n');
      
      // Handle partial lines
      if (this.buffer) {
        lines[0] = this.buffer + lines[0];
        this.buffer = '';
      }
      
      // Keep last line if it doesn't end with newline
      if (!text.endsWith('\n')) {
        this.buffer = lines.pop();
      }
      
      // Process complete lines
      for (const line of lines) {
        if (line.length > 0) {
          const formatted = this.formatLine(line);
          this.push(formatted);
        }
      }
      
      callback();
    } catch (error) {
      callback(error);
    }
  }

  _flush(callback) {
    if (this.buffer) {
      const formatted = this.formatLine(this.buffer);
      this.push(formatted);
    }
    callback();
  }

  formatLine(line) {
    this.lineNumber++;
    
    switch (this.format) {
      case 'json':
        return this.formatAsJSON(line);
      case 'stream-json':
        return this.formatAsStreamingJSON(line);
      case 'structured':
        return this.formatAsStructured(line);
      default:
        return this.formatAsText(line);
    }
  }

  formatAsText(line) {
    let formatted = line;
    
    if (this.enableColors) {
      formatted = this.colorizeText(line);
    }
    
    if (this.showTimestamps) {
      const elapsed = Date.now() - this.startTime;
      const timestamp = chalk.gray(`[${elapsed}ms]`);
      formatted = `${timestamp} ${formatted}`;
    }
    
    return formatted + '\n';
  }

  formatAsJSON(line) {
    const data = {
      stream: this.streamId,
      line: this.lineNumber,
      timestamp: new Date().toISOString(),
      elapsed: Date.now() - this.startTime,
      content: line,
      type: this.detectLineType(line)
    };
    
    return JSON.stringify(data) + '\n';
  }

  formatAsStreamingJSON(line) {
    const data = {
      type: 'stream',
      data: line,
      timestamp: Date.now(),
      stream: this.streamId
    };
    
    return JSON.stringify(data) + '\n';
  }

  formatAsStructured(line) {
    const type = this.detectLineType(line);
    const icon = this.getTypeIcon(type);
    
    let formatted = `${icon} ${line}`;
    
    if (this.enableColors) {
      formatted = this.colorizeByType(formatted, type);
    }
    
    return formatted + '\n';
  }

  colorizeText(text) {
    // Command detection
    if (text.startsWith('$ ')) {
      return chalk.dim(text);
    }
    
    // Error detection
    if (text.toLowerCase().includes('error') || text.toLowerCase().includes('failed')) {
      return chalk.red(text);
    }
    
    // Warning detection
    if (text.toLowerCase().includes('warn') || text.toLowerCase().includes('warning')) {
      return chalk.yellow(text);
    }
    
    // Success detection
    if (text.toLowerCase().includes('success') || text.toLowerCase().includes('complete') || text.includes('✓')) {
      return chalk.green(text);
    }
    
    // URL detection
    text = text.replace(/(https?:\/\/[^\s]+)/g, chalk.blue.underline('$1'));
    
    // File path detection
    text = text.replace(/([.\/][\w\/.-]+\.(js|ts|json|md|txt|py|css|html))/g, chalk.cyan('$1'));
    
    return text;
  }

  detectLineType(line) {
    if (line.startsWith('$ ')) return 'command';
    if (line.toLowerCase().includes('error')) return 'error';
    if (line.toLowerCase().includes('warn')) return 'warning';
    if (line.toLowerCase().includes('success') || line.includes('✓')) return 'success';
    if (line.match(/^\d+\.\s/)) return 'step';
    if (line.includes('http')) return 'info';
    return 'output';
  }

  getTypeIcon(type) {
    const icons = {
      command: '▶',
      error: '❌',
      warning: '⚠️',
      success: '✅',
      step: '📋',
      info: 'ℹ️',
      output: '  '
    };
    
    return icons[type] || '  ';
  }

  colorizeByType(text, type) {
    const colors = {
      command: chalk.dim,
      error: chalk.red,
      warning: chalk.yellow,
      success: chalk.green,
      step: chalk.blue,
      info: chalk.cyan,
      output: chalk.white
    };
    
    const colorFn = colors[type] || chalk.white;
    return colorFn(text);
  }

  setFormat(format) {
    this.format = format;
  }
}

export class RealTimeProgressStream extends Transform {
  constructor(options = {}) {
    super();
    this.showProgress = options.showProgress !== false;
    this.progressPattern = options.progressPattern || /(\d+)%|(\d+)\/(\d+)/;
    this.lastProgress = 0;
  }

  _transform(chunk, encoding, callback) {
    const text = chunk.toString();
    
    if (this.showProgress) {
      const progress = this.extractProgress(text);
      if (progress !== null && progress !== this.lastProgress) {
        this.emit('progress', progress);
        this.lastProgress = progress;
      }
    }
    
    this.push(chunk);
    callback();
  }

  extractProgress(text) {
    const match = text.match(this.progressPattern);
    if (match) {
      if (match[1]) {
        // Percentage format: 75%
        return parseInt(match[1]);
      } else if (match[2] && match[3]) {
        // Fraction format: 15/20
        const current = parseInt(match[2]);
        const total = parseInt(match[3]);
        return Math.round((current / total) * 100);
      }
    }
    return null;
  }
}

export class CommandOutputCapture extends EventEmitter {
  constructor() {
    super();
    this.captured = [];
    this.startTime = null;
  }

  startCapture() {
    this.captured = [];
    this.startTime = Date.now();
  }

  addOutput(streamType, data) {
    this.captured.push({
      type: streamType,
      data: data.toString(),
      timestamp: Date.now() - this.startTime
    });
    
    this.emit('output', {
      type: streamType,
      data,
      elapsed: Date.now() - this.startTime
    });
  }

  getCapture() {
    return {
      output: this.captured,
      duration: Date.now() - this.startTime,
      summary: this.generateSummary()
    };
  }

  generateSummary() {
    const stdoutLines = this.captured.filter(c => c.type === 'stdout').length;
    const stderrLines = this.captured.filter(c => c.type === 'stderr').length;
    const hasErrors = this.captured.some(c => 
      c.data.toLowerCase().includes('error') || 
      c.data.toLowerCase().includes('failed')
    );
    
    return {
      stdoutLines,
      stderrLines,
      hasErrors,
      totalLines: stdoutLines + stderrLines
    };
  }
}

// Utility functions
export function createProgressBar(current, total, width = 20) {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage}%`;
}

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function createStreamingPipeline(command, options = {}) {
  const outputManager = new StreamingOutputManager(options);
  const progressStream = new RealTimeProgressStream(options);
  const capture = new CommandOutputCapture();
  
  // Create formatters for stdout and stderr
  const stdoutFormatter = outputManager.createFormatter('stdout');
  const stderrFormatter = outputManager.createFormatter('stderr');
  
  // Setup pipeline
  const pipeline = {
    stdout: stdoutFormatter,
    stderr: stderrFormatter,
    progress: progressStream,
    capture,
    manager: outputManager
  };
  
  // Wire up events
  stdoutFormatter.on('data', (data) => {
    capture.addOutput('stdout', data);
    if (options.onStdout) options.onStdout(data);
  });
  
  stderrFormatter.on('data', (data) => {
    capture.addOutput('stderr', data);
    if (options.onStderr) options.onStderr(data);
  });
  
  progressStream.on('progress', (progress) => {
    if (options.onProgress) options.onProgress(progress);
  });
  
  return pipeline;
}