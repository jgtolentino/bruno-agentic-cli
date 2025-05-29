#!/usr/bin/env node
import { startRepl } from '../shell/repl-local.js';
import { parseArgs } from '../core/argParser.js';
import chalk from 'chalk';

const args = parseArgs(process.argv.slice(2));

if (args.version) {
  console.log('Bruno v2.0.0 - Local-First AI CLI');
  process.exit(0);
}

if (args.help) {
  console.log(`
${chalk.bold.cyan('Bruno 2.0')} - Local-First AI CLI

${chalk.green('✓ 100% Private')} - No data leaves your machine
${chalk.green('✓ 100% Offline')} - Works without internet
${chalk.green('✓ 100% Open')} - No API keys required

Usage:
  bruno [options] [command]

Commands:
  bruno                 Start interactive REPL
  bruno fix <file>      Fix code issues
  bruno explain <file>  Explain code
  bruno test <file>     Generate tests
  bruno shell <cmd>     Run shell command (sandboxed)

Options:
  --help, -h           Show help
  --version, -v        Show version
  --model <model>      Set local model (default: deepseek-coder:6.7b)
  --ollama-url <url>   Ollama server URL (default: http://127.0.0.1:11434)

Prerequisites:
  1. Install Ollama: https://ollama.ai
  2. Pull model: ollama pull deepseek-coder:6.7b
  3. Start server: ollama serve
  `);
  process.exit(0);
}

// Start REPL or execute command
startRepl(args);