import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import chalk from 'chalk';

export class FileSystemHandler {
  constructor(config = {}) {
    this.allowedExtensions = config.allowed_extensions || [
      '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.css', '.scss', 
      '.html', '.vue', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h'
    ];
    this.sandboxRoot = config.sandbox_root || process.cwd();
    this.backupEnabled = config.backup_enabled !== false;
  }

  // Validate file path is within sandbox and has allowed extension
  validatePath(filePath) {
    const resolvedPath = path.resolve(filePath);
    const relativePath = path.relative(this.sandboxRoot, resolvedPath);
    
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`❌ Path outside sandbox: ${filePath}`);
    }

    const ext = path.extname(filePath);
    if (!this.allowedExtensions.includes(ext)) {
      throw new Error(`❌ File type not allowed: ${ext}`);
    }

    return resolvedPath;
  }

  // Read file contents
  async readFile(filePath) {
    try {
      const validPath = this.validatePath(filePath);
      const content = await fs.readFile(validPath, 'utf-8');
      const stats = await fs.stat(validPath);
      
      return {
        success: true,
        content,
        size: stats.size,
        modified: stats.mtime,
        path: validPath
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Write file with backup
  async writeFile(filePath, content, options = {}) {
    try {
      const validPath = this.validatePath(filePath);
      const exists = fsSync.existsSync(validPath);
      
      // Create backup if file exists
      if (exists && this.backupEnabled) {
        const backupPath = `${validPath}.bak.${Date.now()}`;
        await fs.copyFile(validPath, backupPath);
      }

      // Ensure directory exists
      const dirPath = path.dirname(validPath);
      await fs.mkdir(dirPath, { recursive: true });

      // Write file
      await fs.writeFile(validPath, content, 'utf-8');
      
      return {
        success: true,
        action: exists ? 'overwritten' : 'created',
        path: validPath,
        backup: exists && this.backupEnabled ? `${validPath}.bak.${Date.now()}` : null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // List directory contents
  async listDirectory(dirPath = '.', options = {}) {
    try {
      const validPath = path.resolve(dirPath);
      const entries = await fs.readdir(validPath, { withFileTypes: true });
      
      const items = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(validPath, entry.name);
        const stats = await fs.stat(fullPath);
        
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime,
          extension: entry.isFile() ? path.extname(entry.name) : null
        };
      }));

      return {
        success: true,
        path: validPath,
        items: items.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate project tree
  async generateTree(dirPath = '.', maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) return [];
    
    try {
      const validPath = path.resolve(dirPath);
      const entries = await fs.readdir(validPath, { withFileTypes: true });
      
      const tree = [];
      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.env') continue;
        
        const item = {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          depth: currentDepth
        };
        
        if (entry.isDirectory()) {
          const subPath = path.join(validPath, entry.name);
          item.children = await this.generateTree(subPath, maxDepth, currentDepth + 1);
        }
        
        tree.push(item);
      }
      
      return tree;
    } catch (error) {
      return [];
    }
  }

  // Format tree output
  formatTree(tree, prefix = '') {
    let output = '';
    
    tree.forEach((item, index) => {
      const isLast = index === tree.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const icon = item.type === 'directory' ? '📁' : '📄';
      
      output += `${prefix}${connector}${icon} ${item.name}\n`;
      
      if (item.children && item.children.length > 0) {
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        output += this.formatTree(item.children, childPrefix);
      }
    });
    
    return output;
  }

  // Edit file with LLM-style patches
  async editFile(filePath, editInstructions) {
    try {
      const readResult = await this.readFile(filePath);
      if (!readResult.success) return readResult;
      
      // This would integrate with the LLM to generate edits
      // For now, return the current content with instructions
      return {
        success: true,
        originalContent: readResult.content,
        instructions: editInstructions,
        path: filePath,
        message: 'Edit instructions received. Integration with LLM needed.'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Find files by pattern
  async findFiles(pattern, searchPath = '.') {
    try {
      const results = [];
      
      const searchRecursive = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await searchRecursive(fullPath);
          } else if (entry.isFile() && entry.name.includes(pattern)) {
            results.push({
              name: entry.name,
              path: fullPath,
              relativePath: path.relative(searchPath, fullPath)
            });
          }
        }
      };
      
      await searchRecursive(path.resolve(searchPath));
      
      return {
        success: true,
        pattern,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}