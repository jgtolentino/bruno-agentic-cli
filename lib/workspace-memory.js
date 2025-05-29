const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class WorkspaceMemory {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath;
    this.context = {
      files: new Map(),
      gitInfo: null,
      readme: null,
      structure: null,
      lastUpdated: null
    };
  }

  async loadWorkspaceContext() {
    console.log('🧠 Loading workspace context...');
    
    try {
      // Load git information
      await this.loadGitContext();
      
      // Load README
      await this.loadReadme();
      
      // Load project structure
      await this.loadProjectStructure();
      
      // Load recent files
      await this.loadRecentFiles();
      
      this.context.lastUpdated = new Date();
      console.log('✅ Workspace context loaded');
      
    } catch (error) {
      console.warn('⚠️ Could not load full workspace context:', error.message);
    }
  }

  async loadGitContext() {
    try {
      const gitStatus = execSync('git status --porcelain', { 
        cwd: this.rootPath, 
        encoding: 'utf8' 
      });
      
      const gitBranch = execSync('git branch --show-current', { 
        cwd: this.rootPath, 
        encoding: 'utf8' 
      }).trim();
      
      const gitLog = execSync('git log --oneline -5', { 
        cwd: this.rootPath, 
        encoding: 'utf8' 
      });

      this.context.gitInfo = {
        branch: gitBranch,
        status: gitStatus,
        recentCommits: gitLog
      };
    } catch (error) {
      // Not a git repository or git not available
      this.context.gitInfo = null;
    }
  }

  async loadReadme() {
    const readmeFiles = ['README.md', 'readme.md', 'README.txt', 'readme.txt'];
    
    for (const filename of readmeFiles) {
      const readmePath = path.join(this.rootPath, filename);
      if (await fs.pathExists(readmePath)) {
        this.context.readme = await fs.readFile(readmePath, 'utf8');
        break;
      }
    }
  }

  async loadProjectStructure() {
    try {
      const structure = execSync('find . -type f -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" | head -20', {
        cwd: this.rootPath,
        encoding: 'utf8'
      });
      
      this.context.structure = structure.split('\n').filter(line => line.trim());
    } catch (error) {
      // Fallback to basic directory listing
      this.context.structure = await this.getBasicStructure();
    }
  }

  async getBasicStructure() {
    const items = await fs.readdir(this.rootPath);
    return items.filter(item => !item.startsWith('.'));
  }

  async loadRecentFiles() {
    // Load files that were recently modified
    try {
      const recentFiles = execSync('find . -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | xargs ls -lt | head -10', {
        cwd: this.rootPath,
        encoding: 'utf8'
      });
      
      // Parse and store file information
      const lines = recentFiles.split('\n').filter(line => line.trim());
      for (const line of lines) {
        const parts = line.split(/\s+/);
        const filePath = parts[parts.length - 1];
        if (filePath && filePath !== '.' && !filePath.startsWith('.')) {
          this.context.files.set(filePath, {
            lastModified: new Date(),
            size: parts[4] || 0
          });
        }
      }
    } catch (error) {
      // Fallback - just note that we tried
      console.log('Note: Could not load recent files information');
    }
  }

  getContextSummary() {
    let summary = '';
    
    if (this.context.gitInfo) {
      summary += `Git Branch: ${this.context.gitInfo.branch}\n`;
      if (this.context.gitInfo.status) {
        summary += `Git Status: ${this.context.gitInfo.status.split('\n').length - 1} modified files\n`;
      }
    }
    
    if (this.context.readme) {
      summary += `README: ${this.context.readme.substring(0, 200)}...\n`;
    }
    
    if (this.context.structure) {
      summary += `Project Structure: ${this.context.structure.length} relevant files\n`;
    }
    
    return summary;
  }

  getFullContext() {
    return {
      summary: this.getContextSummary(),
      git: this.context.gitInfo,
      readme: this.context.readme,
      structure: this.context.structure,
      files: Array.from(this.context.files.entries())
    };
  }
}

module.exports = WorkspaceMemory;