import readline from 'readline';
import chalk from 'chalk';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { OllamaClient } from '../core/ollamaClient.js';
import { LocalOnlyGuard } from '../core/localOnlyGuard.js';
import { loadPrompt, loadToolSchema } from '../core/promptLoader.js';
import { handleTool, parseToolCall } from '../core/toolRouter.js';
import { MemoryManager } from '../core/memoryManager.js';
import { ShellSandbox } from '../core/shellSandbox.js';
import { FileSystemHandler } from '../core/fsHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const memory = new MemoryManager();

export async function startRepl(args) {
  // Load config
  const configPath = path.join(__dirname, '../config/brunorc.yaml');
  const config = yaml.load(await fs.readFile(configPath, 'utf8'));
  
  // Enforce local-first
  const guard = new LocalOnlyGuard(config);
  guard.enforceLocalFirst();
  
  // Initialize Ollama client
  const ollama = new OllamaClient(config);
  const isHealthy = await ollama.checkHealth();
  
  if (!isHealthy) {
    console.log(chalk.red('\n❌ Cannot start Bruno without Ollama'));
    process.exit(1);
  }

  const systemPrompt = loadPrompt();
  const toolSchema = loadToolSchema();
  const shellSandbox = new ShellSandbox(config.shell);
  const fsHandler = new FileSystemHandler({
    sandbox_root: process.cwd(),
    backup_enabled: true
  });

  console.log(chalk.cyan.bold('\n🤖 Bruno v2.0 - Local-First CLI'));
  console.log(chalk.gray('100% private, 100% offline'));
  console.log(chalk.gray('Type "help" for commands, "exit" to quit\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('bruno> ')
  });

  // Handle direct command execution
  if (args.command && args.file) {
    await executeCommand(args.command, args.file, ollama, systemPrompt);
    process.exit(0);
  }

  rl.prompt();

  rl.on('line', async (input) => {
    input = input.trim();

    if (input === 'exit' || input === 'quit') {
      console.log(chalk.yellow('Goodbye! 👋'));
      process.exit(0);
    }

    if (input === 'help') {
      showHelp();
      rl.prompt();
      return;
    }

    if (input === 'clear') {
      console.clear();
      rl.prompt();
      return;
    }

    if (input === 'memory') {
      console.log(chalk.blue('Memory Summary:'));
      console.log(memory.getSummary());
      rl.prompt();
      return;
    }

    if (input.startsWith('shell ') || input.startsWith('run ')) {
      const command = input.replace(/^(shell|run) /, '');
      await executeShellCommand(command, shellSandbox);
      rl.prompt();
      return;
    }

    // File system commands
    if (input.startsWith('read ')) {
      const filePath = input.replace('read ', '').trim();
      await executeFileRead(filePath, fsHandler);
      rl.prompt();
      return;
    }

    if (input.startsWith('write ')) {
      const parts = input.split(' ');
      const filePath = parts[1];
      const content = parts.slice(2).join(' ').replace(/^["']|["']$/g, '');
      await executeFileWrite(filePath, content, fsHandler);
      rl.prompt();
      return;
    }

    if (input.startsWith('list ') || input.startsWith('ls ')) {
      const dirPath = input.replace(/^(list|ls) /, '').trim() || '.';
      await executeDirectoryList(dirPath, fsHandler);
      rl.prompt();
      return;
    }

    if (input.startsWith('tree ')) {
      const dirPath = input.replace('tree ', '').trim() || '.';
      await executeTree(dirPath, fsHandler);
      rl.prompt();
      return;
    }

    if (input.startsWith('find ')) {
      const pattern = input.replace('find ', '').trim();
      await executeFindFiles(pattern, fsHandler);
      rl.prompt();
      return;
    }

    if (input.startsWith('analyze ') || input.startsWith('project ')) {
      const projectPath = input.replace(/^(analyze|project) /, '').trim() || '.';
      await executeProjectAnalysis(projectPath, fsHandler);
      rl.prompt();
      return;
    }

    // Process with local LLM
    try {
      console.log(chalk.gray('\nThinking locally...'));
      
      await processWithOllama(input, ollama, systemPrompt, async (chunk) => {
        process.stdout.write(chunk);
      });
      
      console.log('\n');

      // Add to memory
      memory.addToMemory({
        type: 'interaction',
        input: input,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
    }

    rl.prompt();
  });
}

async function processWithOllama(input, ollama, systemPrompt, onChunk) {
  const recentContext = memory.getRecentContext(3);
  const contextString = recentContext.map(m => 
    `User: ${m.input}\nAssistant: ${m.response || 'Processing...'}`
  ).join('\n\n');

  const fullPrompt = `${systemPrompt}\n\n${contextString ? contextString + '\n\n' : ''}User: ${input}\n\nAssistant:`;

  const response = await ollama.generateStream(fullPrompt, onChunk);
  
  // Check for tool calls
  const toolCalls = parseToolCall(response);
  for (const call of toolCalls) {
    console.log(chalk.yellow(`\nExecuting tool: ${call.tool}`));
    const result = await handleTool(call.tool, call.args);
    console.log(result);
  }
  
  return response;
}

async function executeCommand(command, file, ollama, systemPrompt) {
  console.log(chalk.yellow(`Executing: ${command} on ${file}`));
  
  const input = `Please ${command} the following file: ${file}`;
  await processWithOllama(input, ollama, systemPrompt, (chunk) => {
    process.stdout.write(chunk);
  });
  console.log('\n');
}

async function executeShellCommand(command, sandbox) {
  const result = await sandbox.execute(command);
  if (result.blocked) {
    console.log(chalk.red(`❌ Command blocked: ${command}`));
    console.log(chalk.yellow('Reason: Potentially dangerous command'));
  } else if (result.warning) {
    console.log(chalk.yellow(`⚠️  Warning: ${result.warning}`));
    console.log(chalk.gray('Executing with caution...'));
    console.log(result.output);
  } else {
    console.log(result.output);
  }
}

async function executeFileRead(filePath, fsHandler) {
  const result = await fsHandler.readFile(filePath);
  if (result.success) {
    console.log(chalk.cyan(`\n📄 ${filePath}`));
    console.log(chalk.gray(`Size: ${result.size} bytes | Modified: ${result.modified.toLocaleString()}`));
    console.log('\n' + result.content);
  } else {
    console.log(chalk.red(`❌ ${result.error}`));
  }
}

async function executeFileWrite(filePath, content, fsHandler) {
  const result = await fsHandler.writeFile(filePath, content);
  if (result.success) {
    console.log(chalk.green(`✅ File ${result.action}: ${filePath}`));
    if (result.backup) {
      console.log(chalk.gray(`Backup created: ${result.backup}`));
    }
  } else {
    console.log(chalk.red(`❌ ${result.error}`));
  }
}

async function executeDirectoryList(dirPath, fsHandler) {
  const result = await fsHandler.listDirectory(dirPath);
  if (result.success) {
    console.log(chalk.cyan(`\n📁 ${result.path}`));
    console.table(result.items.map(item => ({
      Name: item.name,
      Type: item.type,
      Size: item.type === 'file' ? `${item.size} bytes` : '-',
      Extension: item.extension || '-'
    })));
  } else {
    console.log(chalk.red(`❌ ${result.error}`));
  }
}

async function executeTree(dirPath, fsHandler) {
  const tree = await fsHandler.generateTree(dirPath);
  const output = fsHandler.formatTree(tree);
  console.log(chalk.cyan(`\n🌳 Project Tree: ${dirPath}`));
  console.log(output);
}

async function executeFindFiles(pattern, fsHandler) {
  const result = await fsHandler.findFiles(pattern);
  if (result.success) {
    console.log(chalk.cyan(`\n🔍 Found ${result.results.length} files matching "${pattern}"`));
    result.results.forEach(file => {
      console.log(chalk.gray(`  ${file.relativePath}`));
    });
  } else {
    console.log(chalk.red(`❌ ${result.error}`));
  }
}

async function executeProjectAnalysis(projectPath, fsHandler) {
  console.log(chalk.cyan(`\n📊 Analyzing project: ${projectPath}`));
  
  // Get directory listing
  const dirResult = await fsHandler.listDirectory(projectPath);
  if (!dirResult.success) {
    console.log(chalk.red(`❌ ${dirResult.error}`));
    return;
  }

  // Get project tree
  const tree = await fsHandler.generateTree(projectPath, 2);
  
  // Count files by type
  const fileTypes = {};
  const countFiles = (items) => {
    items.forEach(item => {
      if (item.type === 'file' && item.extension) {
        fileTypes[item.extension] = (fileTypes[item.extension] || 0) + 1;
      }
      if (item.children) countFiles(item.children);
    });
  };
  
  countFiles(tree);
  
  console.log(chalk.yellow('📈 Project Statistics:'));
  console.log(`  Total items: ${dirResult.items.length}`);
  console.log(`  Directories: ${dirResult.items.filter(i => i.type === 'directory').length}`);
  console.log(`  Files: ${dirResult.items.filter(i => i.type === 'file').length}`);
  
  console.log(chalk.yellow('\n📊 File Types:'));
  Object.entries(fileTypes).forEach(([ext, count]) => {
    console.log(`  ${ext}: ${count} files`);
  });
  
  console.log(chalk.yellow('\n🌳 Project Structure:'));
  console.log(fsHandler.formatTree(tree.slice(0, 10))); // Show first 10 items
}

function showHelp() {
  console.log(`
${chalk.bold('Commands:')}
  help          - Show this help message
  clear         - Clear the screen
  memory        - Show memory summary
  exit          - Exit the REPL

${chalk.bold('File System:')}
  read <file>   - Read file contents
  write <file> <content> - Write to file
  list <dir>    - List directory contents
  ls <dir>      - Alias for list
  tree <dir>    - Show directory tree
  find <pattern> - Find files by name
  analyze <dir> - Analyze project structure
  project <dir> - Alias for analyze

${chalk.bold('Shell Commands:')}
  shell <cmd>   - Execute shell command (sandboxed)
  run <cmd>     - Alias for shell

${chalk.bold('AI Tools:')}
  fix <file>    - Fix code issues
  explain <file> - Explain code
  test <file>   - Generate tests

${chalk.bold('Privacy Features:')}
  ✓ 100% local processing
  ✓ No telemetry or tracking
  ✓ No cloud dependencies
  ✓ File system sandboxing
  ✓ Automatic backups

${chalk.bold('Examples:')}
  bruno> read src/utils.js
  bruno> write src/new.js "export const hello = 'world'"
  bruno> analyze /path/to/project
  bruno> explain src/auth.js
  bruno> shell npm test
  `);
}