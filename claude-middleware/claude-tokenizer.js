#!/usr/bin/env node

/**
 * Claude Output Tokenizer
 * Parses Claude Desktop output and extracts commands
 */

const fs = require('fs');
const path = require('path');

class ClaudeTokenizer {
  constructor() {
    this.commandPatterns = {
      write: /^:write\s+(google|file)\s+"([^"]+)"\s*(?:→\s*(.+))?$/,
      read: /^:read\s+(google|file)\s+"([^"]+)"$/,
      edit: /^:edit\s+(google|file)\s+"([^"]+)"\s*(?:with\s+(.+))?$/,
      list: /^:list\s+(files|gdocs)(?:\s+in\s+"([^"]+)")?$/
    };
  }

  parseOutput(content) {
    const lines = content.split('\n');
    const commands = [];
    let currentContent = '';
    
    for (const line of lines) {
      // Check for command patterns
      for (const [intent, pattern] of Object.entries(this.commandPatterns)) {
        const match = line.match(pattern);
        if (match) {
          commands.push(this.buildCommand(intent, match));
          continue;
        }
      }
      
      // Accumulate regular content
      currentContent += line + '\n';
    }
    
    return {
      content: currentContent.trim(),
      commands: commands,
      hasCommands: commands.length > 0
    };
  }
  
  buildCommand(intent, match) {
    const [full, target, identifier, extra] = match;
    
    return {
      intent: intent,
      target: target === 'google' ? 'google_docs' : 'file',
      payload: this.buildPayload(intent, target, identifier, extra)
    };
  }
  
  buildPayload(intent, target, identifier, extra) {
    if (target === 'google') {
      return {
        docTitle: identifier,
        docId: identifier.match(/^[a-zA-Z0-9_-]{20,}$/) ? identifier : null,
        content: extra || '',
        operation: intent === 'edit' ? 'append' : intent
      };
    } else {
      return {
        path: identifier,
        filePath: identifier,
        content: extra || ''
      };
    }
  }
}

// CLI usage
if (require.main === module) {
  const tokenizer = new ClaudeTokenizer();
  
  if (process.argv[2]) {
    // Parse file
    const content = fs.readFileSync(process.argv[2], 'utf8');
    const result = tokenizer.parseOutput(content);
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Parse stdin
    let input = '';
    process.stdin.on('data', (chunk) => input += chunk);
    process.stdin.on('end', () => {
      const result = tokenizer.parseOutput(input);
      console.log(JSON.stringify(result, null, 2));
    });
  }
}

module.exports = ClaudeTokenizer;
