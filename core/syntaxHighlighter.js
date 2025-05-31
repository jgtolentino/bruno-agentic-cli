import { highlight, languages } from 'prismjs';
import loadLanguages from 'prismjs/components/index.js';
import chalk from 'chalk';
import { readFile } from 'fs/promises';
import path from 'path';

// Load common languages
loadLanguages([
  'javascript', 'typescript', 'jsx', 'tsx', 'css', 'scss', 'html',
  'python', 'bash', 'shell', 'json', 'yaml', 'markdown', 'sql',
  'dockerfile', 'nginx', 'apache', 'php', 'ruby', 'go', 'rust',
  'java', 'kotlin', 'swift', 'csharp', 'cpp', 'c'
]);

export class SyntaxHighlighter {
  constructor(options = {}) {
    this.theme = options.theme || 'default';
    this.showLineNumbers = options.showLineNumbers !== false;
    this.tabSize = options.tabSize || 2;
    this.maxLines = options.maxLines || 1000;
    
    this.setupTheme();
  }

  setupTheme() {
    // Define color themes for terminal output
    this.themes = {
      default: {
        keyword: chalk.blue.bold,
        string: chalk.green,
        number: chalk.yellow,
        comment: chalk.gray,
        function: chalk.magenta,
        'class-name': chalk.cyan.bold,
        operator: chalk.white,
        punctuation: chalk.gray,
        property: chalk.blue,
        boolean: chalk.yellow.bold,
        null: chalk.gray.bold,
        undefined: chalk.gray.bold,
        regex: chalk.red,
        'template-string': chalk.green,
        variable: chalk.white,
        constant: chalk.yellow.bold,
        'attr-name': chalk.cyan,
        'attr-value': chalk.green,
        tag: chalk.red.bold,
        selector: chalk.magenta,
        'url': chalk.blue.underline,
        important: chalk.red.bold,
        builtin: chalk.cyan,
        decorator: chalk.yellow,
        annotation: chalk.yellow
      },
      
      dark: {
        keyword: chalk.hex('#569CD6'),
        string: chalk.hex('#CE9178'),
        number: chalk.hex('#B5CEA8'),
        comment: chalk.hex('#6A9955'),
        function: chalk.hex('#DCDCAA'),
        'class-name': chalk.hex('#4EC9B0'),
        operator: chalk.hex('#D4D4D4'),
        punctuation: chalk.hex('#808080'),
        property: chalk.hex('#9CDCFE'),
        boolean: chalk.hex('#569CD6'),
        null: chalk.hex('#569CD6'),
        undefined: chalk.hex('#569CD6'),
        regex: chalk.hex('#D16969'),
        'template-string': chalk.hex('#CE9178'),
        variable: chalk.hex('#9CDCFE'),
        constant: chalk.hex('#4FC1FF'),
        'attr-name': chalk.hex('#92C5F8'),
        'attr-value': chalk.hex('#CE9178'),
        tag: chalk.hex('#569CD6'),
        selector: chalk.hex('#D7BA7D'),
        'url': chalk.hex('#3794FF'),
        important: chalk.hex('#C586C0'),
        builtin: chalk.hex('#4EC9B0'),
        decorator: chalk.hex('#DCDCAA'),
        annotation: chalk.hex('#DCDCAA')
      }
    };
    
    this.colorMap = this.themes[this.theme] || this.themes.default;
  }

  highlight(code, language = null, filename = null) {
    try {
      // Auto-detect language if not provided
      if (!language && filename) {
        language = this.detectLanguage(filename);
      }
      
      // Default to plaintext if no language detected
      if (!language || !languages[language]) {
        return this.formatPlainText(code);
      }

      const grammar = languages[language];
      const highlighted = highlight(code, grammar, language);
      
      return this.processHighlightedCode(highlighted, code, language);
    } catch (error) {
      console.warn(`Syntax highlighting failed for ${language}:`, error.message);
      return this.formatPlainText(code);
    }
  }

  async highlightFile(filePath) {
    try {
      const code = await readFile(filePath, 'utf8');
      const language = this.detectLanguage(filePath);
      
      return {
        content: this.highlight(code, language, filePath),
        language,
        lines: code.split('\n').length,
        size: code.length
      };
    } catch (error) {
      throw new Error(`Failed to highlight file ${filePath}: ${error.message}`);
    }
  }

  detectLanguage(filename) {
    const ext = path.extname(filename).toLowerCase().slice(1);
    
    const languageMap = {
      // JavaScript family
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'mjs': 'javascript',
      'cjs': 'javascript',
      
      // Web technologies
      'html': 'html',
      'htm': 'html',
      'xml': 'xml',
      'css': 'css',
      'scss': 'scss',
      'sass': 'scss',
      'less': 'less',
      
      // Data formats
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'xml': 'xml',
      
      // Documentation
      'md': 'markdown',
      'markdown': 'markdown',
      'rst': 'rest',
      
      // Programming languages
      'py': 'python',
      'rb': 'ruby',
      'php': 'php',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'kt': 'kotlin',
      'swift': 'swift',
      'cs': 'csharp',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      
      // Shell and config
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'fish': 'bash',
      'ps1': 'powershell',
      'bat': 'batch',
      'cmd': 'batch',
      
      // Database
      'sql': 'sql',
      
      // DevOps
      'dockerfile': 'dockerfile',
      'dockerignore': 'ignore',
      'gitignore': 'ignore',
      'nginx': 'nginx',
      
      // Others
      'r': 'r',
      'lua': 'lua',
      'perl': 'perl',
      'pl': 'perl'
    };
    
    // Check for special filenames
    const basename = path.basename(filename).toLowerCase();
    if (basename === 'dockerfile') return 'dockerfile';
    if (basename === 'makefile') return 'makefile';
    if (basename.includes('nginx')) return 'nginx';
    if (basename.includes('apache')) return 'apache';
    
    return languageMap[ext] || 'plaintext';
  }

  processHighlightedCode(html, originalCode, language) {
    // Convert Prism HTML to terminal colors
    let result = html;
    
    // Replace Prism token spans with terminal colors
    result = result.replace(
      /<span class="token ([^"]+)">([^<]*)<\/span>/g,
      (match, tokenClass, content) => {
        const colorFn = this.getColorForToken(tokenClass);
        return colorFn(content);
      }
    );
    
    // Remove any remaining HTML tags
    result = result.replace(/<[^>]+>/g, '');
    
    // Add line numbers if enabled
    if (this.showLineNumbers) {
      result = this.addLineNumbers(result);
    }
    
    return result;
  }

  getColorForToken(tokenClass) {
    // Handle compound token classes (e.g., "keyword control")
    const classes = tokenClass.split(' ');
    
    for (const cls of classes) {
      if (this.colorMap[cls]) {
        return this.colorMap[cls];
      }
    }
    
    // Fallback mapping for common token types
    const fallbackMap = {
      'control': this.colorMap.keyword,
      'storage': this.colorMap.keyword,
      'type': this.colorMap['class-name'],
      'entity': this.colorMap.function,
      'support': this.colorMap.builtin,
      'meta': this.colorMap.annotation,
      'invalid': chalk.red.inverse
    };
    
    for (const cls of classes) {
      if (fallbackMap[cls]) {
        return fallbackMap[cls];
      }
    }
    
    return chalk.white; // Default color
  }

  addLineNumbers(code) {
    const lines = code.split('\n');
    const maxLineNum = lines.length;
    const padding = maxLineNum.toString().length;
    
    return lines.map((line, index) => {
      const lineNum = (index + 1).toString().padStart(padding, ' ');
      return chalk.gray(`${lineNum} │ `) + line;
    }).join('\n');
  }

  formatPlainText(code) {
    if (this.showLineNumbers) {
      return this.addLineNumbers(code);
    }
    return code;
  }

  // Advanced highlighting features
  highlightDiff(diff) {
    const lines = diff.split('\n');
    
    return lines.map(line => {
      if (line.startsWith('+')) {
        return chalk.green(line);
      } else if (line.startsWith('-')) {
        return chalk.red(line);
      } else if (line.startsWith('@@')) {
        return chalk.cyan(line);
      } else if (line.startsWith('+++') || line.startsWith('---')) {
        return chalk.yellow(line);
      }
      return line;
    }).join('\n');
  }

  highlightLogLevel(logLine) {
    const lowerLine = logLine.toLowerCase();
    
    if (lowerLine.includes('error') || lowerLine.includes('fatal')) {
      return chalk.red(logLine);
    } else if (lowerLine.includes('warn') || lowerLine.includes('warning')) {
      return chalk.yellow(logLine);
    } else if (lowerLine.includes('info')) {
      return chalk.blue(logLine);
    } else if (lowerLine.includes('debug') || lowerLine.includes('trace')) {
      return chalk.gray(logLine);
    } else if (lowerLine.includes('success') || lowerLine.includes('ok')) {
      return chalk.green(logLine);
    }
    
    return logLine;
  }

  highlightJSON(jsonString, maxDepth = 5) {
    try {
      const parsed = JSON.parse(jsonString);
      return this.colorizeJSON(parsed, 0, maxDepth);
    } catch (error) {
      return this.highlight(jsonString, 'json');
    }
  }

  colorizeJSON(obj, depth = 0, maxDepth = 5) {
    if (depth > maxDepth) {
      return chalk.gray('...');
    }
    
    const indent = '  '.repeat(depth);
    
    if (obj === null) return chalk.gray('null');
    if (obj === undefined) return chalk.gray('undefined');
    if (typeof obj === 'boolean') return chalk.yellow(obj.toString());
    if (typeof obj === 'number') return chalk.yellow(obj.toString());
    if (typeof obj === 'string') return chalk.green(`"${obj}"`);
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      
      const items = obj.map(item => 
        indent + '  ' + this.colorizeJSON(item, depth + 1, maxDepth)
      ).join(',\n');
      
      return `[\n${items}\n${indent}]`;
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '{}';
      
      const pairs = keys.map(key => {
        const coloredKey = chalk.blue(`"${key}"`);
        const coloredValue = this.colorizeJSON(obj[key], depth + 1, maxDepth);
        return `${indent}  ${coloredKey}: ${coloredValue}`;
      }).join(',\n');
      
      return `{\n${pairs}\n${indent}}`;
    }
    
    return obj.toString();
  }

  // Configuration methods
  setTheme(theme) {
    this.theme = theme;
    this.setupTheme();
  }

  setShowLineNumbers(show) {
    this.showLineNumbers = show;
  }

  setTabSize(size) {
    this.tabSize = size;
  }

  // Utility methods
  stripColors(text) {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  getLanguageInfo(language) {
    return {
      name: language,
      supported: !!languages[language],
      aliases: this.getLanguageAliases(language)
    };
  }

  getLanguageAliases(language) {
    const aliases = {
      'javascript': ['js', 'node'],
      'typescript': ['ts'],
      'python': ['py'],
      'bash': ['shell', 'sh'],
      'markdown': ['md'],
      'yaml': ['yml']
    };
    
    return aliases[language] || [];
  }

  getSupportedLanguages() {
    return Object.keys(languages).sort();
  }
}

// Export convenience functions
export function highlightCode(code, language, options = {}) {
  const highlighter = new SyntaxHighlighter(options);
  return highlighter.highlight(code, language);
}

export function highlightFile(filePath, options = {}) {
  const highlighter = new SyntaxHighlighter(options);
  return highlighter.highlightFile(filePath);
}

export function detectLanguage(filename) {
  const highlighter = new SyntaxHighlighter();
  return highlighter.detectLanguage(filename);
}

export function highlightDiff(diff, options = {}) {
  const highlighter = new SyntaxHighlighter(options);
  return highlighter.highlightDiff(diff);
}

export function highlightJSON(json, options = {}) {
  const highlighter = new SyntaxHighlighter(options);
  return highlighter.highlightJSON(json);
}