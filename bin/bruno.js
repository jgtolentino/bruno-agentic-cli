#!/usr/bin/env node
import { startRepl } from '../shell/repl.js';
import { parseArgs } from '../core/argParser.js';
import chalk from 'chalk';

const args = parseArgs(process.argv.slice(2));

if (args.version) {
  console.log('Bruno v2.0.0 - Claude-powered CLI');
  process.exit(0);
}

if (args.help) {
  console.log(`
${chalk.bold.cyan('Bruno 2.0')} - Agentic CLI with Claude integration

Usage:
  bruno [options] [command]

Commands:
  bruno                 Start interactive REPL
  bruno fix <file>      Fix code issues
  bruno explain <file>  Explain code
  bruno test <file>     Generate tests

Options:
  --help, -h           Show help
  --version, -v        Show version
  --model <model>      Set Claude model (default: claude-3-sonnet)
  `);
  process.exit(0);
}

// Start REPL or execute command
startRepl(args);