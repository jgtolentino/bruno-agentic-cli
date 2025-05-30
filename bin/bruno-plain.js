#!/usr/bin/env node

// Bruno Plain Text Wrapper - Removes Markdown formatting from responses

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get command line arguments
const args = process.argv.slice(2);

// Add instruction to avoid markdown
const modifiedArgs = [...args];
if (args.includes('-p') || args.includes('--print')) {
  const promptIndex = args.indexOf('-p') !== -1 ? args.indexOf('-p') + 1 : args.indexOf('--print') + 1;
  if (promptIndex < args.length) {
    modifiedArgs[promptIndex] = args[promptIndex] + '\n\nIMPORTANT: Respond in plain text only. Do not use any Markdown formatting, asterisks, backticks, or special symbols.';
  }
}

// Run regular Bruno
const brunoPath = path.join(__dirname, 'bruno.js');
const bruno = spawn('node', [brunoPath, ...modifiedArgs], {
  stdio: 'pipe',
  env: process.env
});

// Function to strip Markdown from text
function stripMarkdown(text) {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, (match) => {
      const lines = match.split('\n');
      const code = lines.slice(1, -1).join('\n');
      return '\nCODE:\n' + code + '\n';
    })
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove bold
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove headers
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '---')
    // Remove blockquotes
    .replace(/^>\s+(.+)$/gm, '$1')
    // Clean up extra newlines
    .replace(/\n{3,}/g, '\n\n');
}

// Process stdout
bruno.stdout.on('data', (data) => {
  const output = stripMarkdown(data.toString());
  process.stdout.write(output);
});

// Pass through stderr
bruno.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Pass through exit code
bruno.on('close', (code) => {
  process.exit(code);
});