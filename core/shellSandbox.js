import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

export class ShellSandbox {
  constructor(config) {
    this.config = config || {};
    this.blockedCommands = config.blocked_commands || [];
    this.warnCommands = config.warn_commands || [];
  }

  isBlocked(command) {
    return this.blockedCommands.some(blocked => 
      command.includes(blocked)
    );
  }

  needsWarning(command) {
    return this.warnCommands.some(warn => 
      command.includes(warn)
    );
  }

  async execute(command) {
    if (!this.config.enabled) {
      return {
        blocked: true,
        output: 'Shell commands disabled in config'
      };
    }

    if (this.isBlocked(command)) {
      return {
        blocked: true,
        command: command
      };
    }

    const warning = this.needsWarning(command) ? 
      `This command modifies the filesystem` : null;

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      return {
        success: true,
        warning: warning,
        output: stdout || stderr,
        command: command
      };
    } catch (error) {
      return {
        success: false,
        warning: warning,
        error: error.message,
        output: error.stdout || error.stderr || error.message,
        command: command
      };
    }
  }

  // Safe wrappers for common operations
  async safeList(directory = '.') {
    return this.execute(`ls -la ${directory}`);
  }

  async safeRead(file) {
    return this.execute(`cat ${file}`);
  }

  async safeFind(pattern) {
    return this.execute(`find . -name "${pattern}" -type f`);
  }

  async safeGrep(pattern, path = '.') {
    return this.execute(`grep -r "${pattern}" ${path}`);
  }
}