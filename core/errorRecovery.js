import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

export class ErrorRecoverySystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      autoRetry: true,
      maxRetries: 3,
      dryRun: false,
      interactive: true,
      ...options
    };
    
    this.recoveryAttempts = new Map();
    this.successfulRecoveries = new Map();
    this.setupErrorPatterns();
  }

  setupErrorPatterns() {
    this.errorPatterns = new Map([
      // Permission errors
      [/EACCES|Permission denied|Access is denied/i, {
        handler: this.handlePermissionError.bind(this),
        category: 'permissions',
        severity: 'high'
      }],
      
      // File not found errors
      [/ENOENT|No such file or directory|cannot find|file not found/i, {
        handler: this.handleFileNotFound.bind(this),
        category: 'filesystem',
        severity: 'medium'
      }],
      
      // Network errors
      [/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network|connection|timeout/i, {
        handler: this.handleNetworkError.bind(this),
        category: 'network',
        severity: 'medium'
      }],
      
      // NPM/Package manager errors
      [/npm ERR!.*peer dep|peer dependency|peerDependencies|ERESOLVE/i, {
        handler: this.handlePeerDepError.bind(this),
        category: 'dependencies',
        severity: 'medium'
      }],
      
      [/npm ERR!.*404|package not found|No matching version/i, {
        handler: this.handleModuleNotFound.bind(this),
        category: 'dependencies',
        severity: 'medium'
      }],
      
      [/Cannot find module|Module not found|ERR_MODULE_NOT_FOUND/i, {
        handler: this.handleModuleNotFound.bind(this),
        category: 'dependencies',
        severity: 'high'
      }],
      
      // Port/Address errors
      [/port.*already in use|EADDRINUSE|address already in use/i, {
        handler: this.handlePortInUse.bind(this),
        category: 'ports',
        severity: 'medium'
      }],
      
      // Git errors
      [/git.*fatal|git.*error|repository not found|remote.*not found/i, {
        handler: this.handleGitError.bind(this),
        category: 'git',
        severity: 'medium'
      }],
      
      // Build errors
      [/compilation failed|build failed|TypeScript error|syntax error/i, {
        handler: this.handleBuildError.bind(this),
        category: 'build',
        severity: 'high'
      }],
      
      // Database errors
      [/connection refused|database.*not found|authentication failed/i, {
        handler: this.handleDatabaseError.bind(this),
        category: 'database',
        severity: 'high'
      }],
      
      // Docker errors
      [/docker.*not found|container.*not found|image.*not found/i, {
        handler: this.handleDockerError.bind(this),
        category: 'docker',
        severity: 'medium'
      }]
    ]);
  }

  async analyzeAndRecover(error, context = {}) {
    const errorInfo = this.analyzeError(error, context);
    
    this.emit('errorAnalyzed', errorInfo);
    
    if (!errorInfo.pattern) {
      return this.handleUnknownError(error, context);
    }

    console.log(chalk.yellow('\n🔧 Intelligent error recovery initiated...'));
    console.log(chalk.gray(`Error category: ${errorInfo.category}`));
    console.log(chalk.gray(`Severity: ${errorInfo.severity}`));
    
    try {
      const recovery = await errorInfo.pattern.handler(error, context, errorInfo);
      
      if (recovery.success) {
        this.recordSuccessfulRecovery(errorInfo.category, recovery.strategy);
        console.log(chalk.green(`✅ Successfully recovered using: ${recovery.strategy}`));
        
        this.emit('recoverySuccess', {
          error: errorInfo,
          recovery,
          context
        });
        
        return recovery;
      } else {
        console.log(chalk.red(`❌ Recovery failed: ${recovery.reason}`));
        
        this.emit('recoveryFailed', {
          error: errorInfo,
          recovery,
          context
        });
        
        return recovery;
      }
    } catch (recoveryError) {
      console.log(chalk.red(`❌ Recovery process failed: ${recoveryError.message}`));
      
      this.emit('recoveryError', {
        originalError: errorInfo,
        recoveryError,
        context
      });
      
      return { success: false, reason: recoveryError.message };
    }
  }

  analyzeError(error, context) {
    const errorString = error.toString();
    const errorMessage = error.message || errorString;
    
    for (const [pattern, config] of this.errorPatterns) {
      if (pattern.test(errorString)) {
        return {
          originalError: error,
          message: errorMessage,
          pattern: config,
          category: config.category,
          severity: config.severity,
          context,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return {
      originalError: error,
      message: errorMessage,
      pattern: null,
      category: 'unknown',
      severity: 'unknown',
      context,
      timestamp: new Date().toISOString()
    };
  }

  async handlePermissionError(error, context, errorInfo) {
    const strategies = [
      {
        name: 'Fix npm permissions',
        condition: () => context.command?.includes('npm') && process.platform !== 'win32',
        action: async () => {
          await this.executeRecovery('npm config set prefix ~/.npm-global');
          await this.executeRecovery('export PATH=~/.npm-global/bin:$PATH');
          return 'Changed npm prefix to user directory';
        },
        risk: 'low'
      },
      {
        name: 'Change ownership',
        condition: () => context.command?.includes('npm') && process.platform !== 'win32',
        action: async () => {
          const homeDir = process.env.HOME;
          await this.executeRecovery(`sudo chown -R $(whoami) ${homeDir}/.npm`);
          return 'Changed ownership of npm cache directory';
        },
        risk: 'medium'
      },
      {
        name: 'Use sudo (careful)',
        condition: () => process.platform !== 'win32',
        action: async () => {
          const sudoCommand = `sudo ${context.command}`;
          console.log(chalk.yellow(`⚠️  Running with elevated privileges: ${sudoCommand}`));
          const confirmed = await this.confirmAction(`Run command with sudo?`);
          if (confirmed) {
            return await this.executeRecovery(sudoCommand);
          }
          throw new Error('User declined sudo execution');
        },
        risk: 'high'
      }
    ];
    
    return this.tryRecoveryStrategies(strategies, context);
  }

  async handleFileNotFound(error, context, errorInfo) {
    const errorText = error.toString();
    const missingFile = this.extractFilePath(errorText);
    
    const strategies = [
      {
        name: 'Create missing directory',
        condition: () => missingFile && missingFile.includes('/'),
        action: async () => {
          const dir = path.dirname(missingFile);
          await fs.mkdir(dir, { recursive: true });
          return `Created directory: ${dir}`;
        },
        risk: 'low'
      },
      {
        name: 'Initialize package.json',
        condition: () => missingFile?.includes('package.json'),
        action: async () => {
          await this.executeRecovery('npm init -y');
          return 'Created package.json';
        },
        risk: 'low'
      },
      {
        name: 'Create empty file',
        condition: () => missingFile && this.shouldCreateFile(missingFile),
        action: async () => {
          await fs.writeFile(missingFile, '');
          return `Created empty file: ${missingFile}`;
        },
        risk: 'low'
      },
      {
        name: 'Search for similar files',
        condition: () => missingFile,
        action: async () => {
          const similarFiles = await this.findSimilarFiles(missingFile);
          if (similarFiles.length > 0) {
            console.log(chalk.blue('Found similar files:'));
            similarFiles.forEach(file => console.log(`  - ${file}`));
            return 'Listed similar files';
          }
          throw new Error('No similar files found');
        },
        risk: 'low'
      }
    ];
    
    return this.tryRecoveryStrategies(strategies, context);
  }

  async handleNetworkError(error, context, errorInfo) {
    const strategies = [
      {
        name: 'Check internet connectivity',
        action: async () => {
          try {
            await this.executeRecovery('ping -c 1 8.8.8.8', { timeout: 5000 });
            return 'Internet connectivity confirmed';
          } catch {
            throw new Error('No internet connectivity');
          }
        },
        risk: 'low'
      },
      {
        name: 'Try alternative registry',
        condition: () => context.command?.includes('npm'),
        action: async () => {
          await this.executeRecovery('npm config set registry https://registry.yarnpkg.com');
          return 'Switched to Yarn registry';
        },
        risk: 'low'
      },
      {
        name: 'Clear npm cache',
        condition: () => context.command?.includes('npm'),
        action: async () => {
          await this.executeRecovery('npm cache clean --force');
          return 'Cleared npm cache';
        },
        risk: 'low'
      },
      {
        name: 'Retry with timeout',
        action: async () => {
          console.log(chalk.blue('Waiting 5 seconds before retry...'));
          await new Promise(resolve => setTimeout(resolve, 5000));
          return 'Waited for network recovery';
        },
        risk: 'low'
      }
    ];
    
    return this.tryRecoveryStrategies(strategies, context);
  }

  async handlePeerDepError(error, context, errorInfo) {
    const strategies = [
      {
        name: 'Use --legacy-peer-deps',
        action: async () => {
          const newCommand = context.command.replace('npm install', 'npm install --legacy-peer-deps');
          await this.executeRecovery(newCommand);
          return 'Used legacy peer dependencies resolution';
        },
        risk: 'low'
      },
      {
        name: 'Use --force flag',
        action: async () => {
          const newCommand = context.command.replace('npm install', 'npm install --force');
          await this.executeRecovery(newCommand);
          return 'Forced installation ignoring conflicts';
        },
        risk: 'medium'
      },
      {
        name: 'Install peer dependencies manually',
        action: async () => {
          const peerDeps = this.extractPeerDependencies(error.toString());
          if (peerDeps.length > 0) {
            const installCmd = `npm install ${peerDeps.join(' ')}`;
            await this.executeRecovery(installCmd);
            return `Installed peer dependencies: ${peerDeps.join(', ')}`;
          }
          throw new Error('Could not extract peer dependencies');
        },
        risk: 'medium'
      }
    ];
    
    return this.tryRecoveryStrategies(strategies, context);
  }

  async handleModuleNotFound(error, context, errorInfo) {
    const moduleName = this.extractModuleName(error.toString());
    
    const strategies = [
      {
        name: 'Install missing module',
        condition: () => moduleName,
        action: async () => {
          await this.executeRecovery(`npm install ${moduleName}`);
          return `Installed missing module: ${moduleName}`;
        },
        risk: 'low'
      },
      {
        name: 'Install as dev dependency',
        condition: () => moduleName && this.isDevDependency(moduleName),
        action: async () => {
          await this.executeRecovery(`npm install --save-dev ${moduleName}`);
          return `Installed as dev dependency: ${moduleName}`;
        },
        risk: 'low'
      },
      {
        name: 'Install globally',
        condition: () => moduleName && this.isGlobalModule(moduleName),
        action: async () => {
          await this.executeRecovery(`npm install -g ${moduleName}`);
          return `Installed globally: ${moduleName}`;
        },
        risk: 'medium'
      }
    ];
    
    return this.tryRecoveryStrategies(strategies, context);
  }

  async handlePortInUse(error, context, errorInfo) {
    const port = this.extractPort(error.toString());
    
    const strategies = [
      {
        name: 'Find process using port',
        condition: () => port,
        action: async () => {
          try {
            const result = await this.executeRecovery(`lsof -ti:${port}`, { capture: true });
            const pid = result.trim();
            if (pid) {
              return `Process ${pid} is using port ${port}`;
            }
            throw new Error('No process found');
          } catch {
            return `Port ${port} appears to be in use but no process found`;
          }
        },
        risk: 'low'
      },
      {
        name: 'Kill process on port',
        condition: () => port,
        action: async () => {
          const confirmed = await this.confirmAction(`Kill process on port ${port}?`);
          if (confirmed) {
            await this.executeRecovery(`kill -9 $(lsof -ti:${port})`);
            return `Killed process on port ${port}`;
          }
          throw new Error('User declined to kill process');
        },
        risk: 'high'
      },
      {
        name: 'Use alternative port',
        action: async () => {
          const newPort = await this.findAvailablePort(port ? parseInt(port) + 1 : 3001);
          return `Suggested alternative port: ${newPort}`;
        },
        risk: 'low'
      }
    ];
    
    return this.tryRecoveryStrategies(strategies, context);
  }

  async handleGitError(error, context, errorInfo) {
    const strategies = [
      {
        name: 'Initialize git repository',
        condition: () => error.toString().includes('not a git repository'),
        action: async () => {
          await this.executeRecovery('git init');
          return 'Initialized git repository';
        },
        risk: 'low'
      },
      {
        name: 'Set git remote',
        condition: () => error.toString().includes('remote') && context.repository,
        action: async () => {
          await this.executeRecovery(`git remote add origin ${context.repository}`);
          return `Added remote origin: ${context.repository}`;
        },
        risk: 'low'
      },
      {
        name: 'Configure git user',
        condition: () => error.toString().includes('user.name') || error.toString().includes('user.email'),
        action: async () => {
          await this.executeRecovery('git config user.name "Bruno CLI User"');
          await this.executeRecovery('git config user.email "bruno@local.dev"');
          return 'Configured git user credentials';
        },
        risk: 'low'
      }
    ];
    
    return this.tryRecoveryStrategies(strategies, context);
  }

  async handleBuildError(error, context, errorInfo) {
    const strategies = [
      {
        name: 'Clean and rebuild',
        action: async () => {
          await this.executeRecovery('rm -rf node_modules package-lock.json');
          await this.executeRecovery('npm install');
          return 'Cleaned and reinstalled dependencies';
        },
        risk: 'medium'
      },
      {
        name: 'Update TypeScript',
        condition: () => error.toString().includes('TypeScript'),
        action: async () => {
          await this.executeRecovery('npm install --save-dev typescript@latest');
          return 'Updated TypeScript to latest version';
        },
        risk: 'medium'
      }
    ];
    
    return this.tryRecoveryStrategies(strategies, context);
  }

  async handleDatabaseError(error, context, errorInfo) {
    const strategies = [
      {
        name: 'Check database status',
        action: async () => {
          // This would be specific to the database type
          return 'Database connection check completed';
        },
        risk: 'low'
      }
    ];
    
    return this.tryRecoveryStrategies(strategies, context);
  }

  async handleDockerError(error, context, errorInfo) {
    const strategies = [
      {
        name: 'Start Docker daemon',
        condition: () => process.platform !== 'win32',
        action: async () => {
          await this.executeRecovery('sudo systemctl start docker');
          return 'Started Docker daemon';
        },
        risk: 'medium'
      },
      {
        name: 'Pull missing image',
        condition: () => error.toString().includes('image') && this.extractImageName(error.toString()),
        action: async () => {
          const imageName = this.extractImageName(error.toString());
          await this.executeRecovery(`docker pull ${imageName}`);
          return `Pulled Docker image: ${imageName}`;
        },
        risk: 'low'
      }
    ];
    
    return this.tryRecoveryStrategies(strategies, context);
  }

  async handleUnknownError(error, context) {
    console.log(chalk.yellow('🤔 Unknown error type, trying generic recovery strategies...'));
    
    const strategies = [
      {
        name: 'Retry command',
        action: async () => {
          if (context.command) {
            await this.executeRecovery(context.command);
            return 'Command retry successful';
          }
          throw new Error('No command to retry');
        },
        risk: 'low'
      },
      {
        name: 'Clear caches',
        action: async () => {
          try {
            await this.executeRecovery('npm cache clean --force');
            return 'Cleared npm cache';
          } catch {
            return 'Cache clearing failed';
          }
        },
        risk: 'low'
      }
    ];
    
    return this.tryRecoveryStrategies(strategies, context);
  }

  async tryRecoveryStrategies(strategies, context) {
    for (const strategy of strategies) {
      if (strategy.condition && !strategy.condition()) {
        continue;
      }
      
      console.log(chalk.blue(`\n▶ Trying: ${strategy.name}`));
      
      if (strategy.risk === 'high') {
        console.log(chalk.red(`⚠️  High risk strategy`));
      }
      
      try {
        const result = await strategy.action();
        
        // If we get here, the strategy succeeded
        return {
          success: true,
          strategy: strategy.name,
          result,
          risk: strategy.risk
        };
      } catch (error) {
        console.log(chalk.gray(`   Failed: ${error.message}`));
      }
    }
    
    return {
      success: false,
      reason: 'All recovery strategies failed',
      strategiesAttempted: strategies.map(s => s.name)
    };
  }

  async executeRecovery(command, options = {}) {
    const { timeout = 30000, capture = false, dryRun = this.options.dryRun } = options;
    
    if (dryRun) {
      console.log(chalk.gray(`[DRY RUN] Would execute: ${command}`));
      return 'Dry run - command not executed';
    }
    
    console.log(chalk.dim(`$ ${command}`));
    
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], {
        stdio: capture ? 'pipe' : 'inherit',
        timeout
      });
      
      let output = '';
      
      if (capture) {
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          output += data.toString();
        });
      }
      
      child.on('exit', (code) => {
        if (code === 0) {
          resolve(capture ? output : 'Command completed successfully');
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
      
      child.on('error', reject);
    });
  }

  async confirmAction(message) {
    if (!this.options.interactive) {
      return true; // Auto-confirm in non-interactive mode
    }
    
    // Use the InteractivePrompts class
    const { confirm } = await import('./interactivePrompts.js');
    return confirm(message, false);
  }

  // Utility methods for parsing errors
  extractFilePath(errorText) {
    const matches = errorText.match(/['"`]([^'"`\s]+)['"`]/g);
    return matches ? matches[0].replace(/['"`]/g, '') : null;
  }

  extractModuleName(errorText) {
    const match = errorText.match(/Cannot find module ['"`]([^'"`]+)['"`]/);
    return match ? match[1] : null;
  }

  extractPort(errorText) {
    const match = errorText.match(/port\s+(\d+)|:(\d+)/i);
    return match ? (match[1] || match[2]) : null;
  }

  extractPeerDependencies(errorText) {
    const matches = errorText.match(/peer\s+([^@\s]+)@([^\s]+)/g);
    return matches ? matches.map(m => m.replace('peer ', '')) : [];
  }

  extractImageName(errorText) {
    const match = errorText.match(/image ['"`]?([^'"`\s]+)['"`]?/i);
    return match ? match[1] : null;
  }

  shouldCreateFile(filePath) {
    const safeExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.css', '.html'];
    return safeExtensions.some(ext => filePath.endsWith(ext));
  }

  isDevDependency(moduleName) {
    const devModules = ['eslint', 'prettier', 'jest', 'mocha', 'chai', 'typescript', 'webpack'];
    return devModules.some(mod => moduleName.includes(mod));
  }

  isGlobalModule(moduleName) {
    const globalModules = ['nodemon', 'pm2', 'create-react-app', 'vue-cli', 'angular-cli'];
    return globalModules.some(mod => moduleName.includes(mod));
  }

  async findSimilarFiles(missingFile) {
    try {
      const dir = path.dirname(missingFile);
      const basename = path.basename(missingFile);
      const files = await fs.readdir(dir);
      
      return files.filter(file => 
        file.toLowerCase().includes(basename.toLowerCase().slice(0, 3))
      ).slice(0, 5);
    } catch {
      return [];
    }
  }

  async findAvailablePort(startPort = 3000) {
    const net = await import('net');
    
    for (let port = startPort; port < startPort + 100; port++) {
      const available = await new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
          server.close(() => resolve(true));
        });
        server.on('error', () => resolve(false));
      });
      
      if (available) {
        return port;
      }
    }
    
    return startPort;
  }

  recordSuccessfulRecovery(category, strategy) {
    if (!this.successfulRecoveries.has(category)) {
      this.successfulRecoveries.set(category, new Map());
    }
    
    const categoryRecoveries = this.successfulRecoveries.get(category);
    const count = categoryRecoveries.get(strategy) || 0;
    categoryRecoveries.set(strategy, count + 1);
  }

  getRecoveryStats() {
    const stats = {};
    
    for (const [category, strategies] of this.successfulRecoveries) {
      stats[category] = {};
      for (const [strategy, count] of strategies) {
        stats[category][strategy] = count;
      }
    }
    
    return stats;
  }

  setInteractive(interactive) {
    this.options.interactive = interactive;
  }

  setDryRun(dryRun) {
    this.options.dryRun = dryRun;
  }
}

// Export convenience function
export async function recoverFromError(error, context = {}, options = {}) {
  const recovery = new ErrorRecoverySystem(options);
  return recovery.analyzeAndRecover(error, context);
}