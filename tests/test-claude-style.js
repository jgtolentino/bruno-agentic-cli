#!/usr/bin/env node
import { ClaudeStyleInputHandler } from '../core/claudeStyleInputHandler.js';
import chalk from 'chalk';

console.log(chalk.cyan.bold('\n🧪 Testing Claude Code CLI Style Multi-Line Input\n'));

// Test cases for multi-line input
const testCases = [
  {
    name: 'Multi-line Shell Script',
    lines: [
      'echo "Setting up project..."',
      'mkdir -p src/components',
      'npm init -y',
      'npm install express cors',
      ''  // Empty line to complete
    ],
    expectedType: 'shell_script'
  },
  {
    name: 'Code Creation with Heredoc',
    lines: [
      'cat > server.js << \'EOF\'',
      'const express = require(\'express\');',
      'const app = express();',
      'app.get(\'/\', (req, res) => res.send(\'Hello World!\'));',
      'app.listen(3000);',
      'EOF',
      ''
    ],
    expectedType: 'code_creation'
  },
  {
    name: 'Natural Language Request',
    lines: [
      'Create a React component for a login form with email and password fields',
      ''
    ],
    expectedType: 'natural_language'
  },
  {
    name: 'Mixed Content',
    lines: [
      'I need to check if my server is running',
      'ps aux | grep node',
      'If not, restart it with pm2',
      ''
    ],
    expectedType: 'mixed_content'
  },
  {
    name: 'Incomplete Code Block',
    lines: [
      'function hello() {',
      '  console.log("Hello");'
      // No closing brace - should continue
    ],
    shouldContinue: true
  },
  {
    name: 'Shell Command with Continuation',
    lines: [
      'docker run \\',
      '  --name myapp \\',
      '  -p 3000:3000 \\',
      '  -e NODE_ENV=production \\',
      '  myapp:latest',
      ''
    ],
    expectedType: 'shell_script'
  }
];

async function runTests() {
  const handler = new ClaudeStyleInputHandler();
  
  for (const testCase of testCases) {
    console.log(chalk.yellow(`\n📝 Test: ${testCase.name}`));
    console.log(chalk.gray('Input lines:'));
    testCase.lines.forEach(line => console.log(chalk.gray(`  > ${line}`));
    
    handler.reset();
    let lastResult = null;
    
    for (let i = 0; i < testCase.lines.length; i++) {
      const line = testCase.lines[i];
      const result = await handler.handleInput(line);
      
      if (result.action === 'continue') {
        if (i === testCase.lines.length - 1 && testCase.shouldContinue) {
          console.log(chalk.green('✅ Correctly waiting for more input'));
        } else if (i < testCase.lines.length - 1) {
          // Expected to continue for intermediate lines
        } else {
          console.log(chalk.red('❌ Unexpected continuation'));
        }
      } else {
        lastResult = result;
        console.log(chalk.green(`✅ Input complete - Type: ${result.type}`));
        
        if (testCase.expectedType && result.type !== testCase.expectedType) {
          console.log(chalk.red(`❌ Expected type: ${testCase.expectedType}, got: ${result.type}`));
        }
      }
    }
    
    if (testCase.shouldContinue && lastResult) {
      console.log(chalk.red('❌ Should have continued but completed'));
    }
  }
}

// Test the context analyzer directly
async function testContextAnalyzer() {
  console.log(chalk.yellow('\n\n🔬 Testing Context Analyzer'));
  
  const analyzer = new handler.contextAnalyzer;
  
  const contextTests = [
    {
      name: 'Empty line after content',
      buffer: ['echo "hello"'],
      currentLine: '',
      expected: { isComplete: true }
    },
    {
      name: 'Line ending with backslash',
      buffer: ['docker run \\'],
      currentLine: '  --name test \\',
      expected: { isComplete: false }
    },
    {
      name: 'Unclosed heredoc',
      buffer: ['cat > file << EOF', 'content'],
      currentLine: 'more content',
      expected: { isComplete: false }
    },
    {
      name: 'Closed heredoc',
      buffer: ['cat > file << EOF', 'content'],
      currentLine: 'EOF',
      expected: { isComplete: false }  // Need empty line after
    },
    {
      name: 'Natural end point',
      buffer: ['Create a login form'],
      currentLine: 'please',
      expected: { isComplete: true }
    }
  ];
  
  for (const test of contextTests) {
    console.log(chalk.blue(`\n  Testing: ${test.name}`));
    const result = analyzer.analyze(test.currentLine, test.buffer);
    
    if (result.isComplete === test.expected.isComplete) {
      console.log(chalk.green(`  ✅ Completion detection correct: ${result.isComplete}`));
    } else {
      console.log(chalk.red(`  ❌ Expected isComplete: ${test.expected.isComplete}, got: ${result.isComplete}`));
    }
  }
}

// Run all tests
async function main() {
  await runTests();
  await testContextAnalyzer();
  
  console.log(chalk.cyan.bold('\n\n✨ Claude Code CLI Style Testing Complete!\n'));
}

main().catch(console.error);