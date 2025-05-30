import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export class ContextParser {
  constructor() {
    this.maxFileSize = 100000; // 100KB limit
    this.supportedExtensions = new Set([
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', 
      '.cpp', '.c', '.h', '.sql', '.json', '.yaml', '.yml', '.md'
    ]);
  }

  async parseContext(input) {
    const context = {
      files: [],
      directories: [],
      codeBlocks: [],
      hasFileReferences: false
    };

    // Detect file paths in input
    const filePatterns = [
      /(?:^|\s)(\.?\/[\w\-\.\/]+\.\w+)/g,
      /(?:^|\s)([\w\-]+\.\w+)/g
    ];

    for (const pattern of filePatterns) {
      const matches = input.matchAll(pattern);
      for (const match of matches) {
        const filePath = match[1];
        if (await this.isValidFile(filePath)) {
          context.files.push(filePath);
          context.hasFileReferences = true;
        }
      }
    }

    // Parse inline code blocks
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    const codeMatches = input.matchAll(codeBlockPattern);
    
    for (const match of codeMatches) {
      context.codeBlocks.push({
        language: match[1] || 'plaintext',
        content: match[2]
      });
    }

    return context;
  }

  async isValidFile(filePath) {
    try {
      const resolvedPath = path.resolve(filePath);
      const stats = await fs.promises.stat(resolvedPath);
      
      if (stats.isFile() && stats.size < this.maxFileSize) {
        const ext = path.extname(filePath);
        return this.supportedExtensions.has(ext);
      }
    } catch (error) {
      // File doesn't exist or can't be accessed
    }
    return false;
  }

  async readFileContent(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return {
        path: filePath,
        content: content,
        lines: content.split('\n').length,
        size: Buffer.byteLength(content)
      };
    } catch (error) {
      console.error(chalk.red(`Failed to read ${filePath}:`, error.message));
      return null;
    }
  }

  async enrichPromptWithContext(originalPrompt) {
    const context = await this.parseContext(originalPrompt);
    let enrichedPrompt = originalPrompt;

    if (context.files.length > 0) {
      enrichedPrompt += '\n\n<context>\n';
      
      for (const file of context.files) {
        const fileContent = await this.readFileContent(file);
        if (fileContent) {
          enrichedPrompt += `<file path="${file}">\n${fileContent.content}\n</file>\n\n`;
        }
      }
      
      enrichedPrompt += '</context>';
    }

    return {
      prompt: enrichedPrompt,
      context: context
    };
  }
}
