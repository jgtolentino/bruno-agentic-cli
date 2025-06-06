const { Command } = require('commander');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const program = new Command();

program
  .name('test')
  .description('Run Pulser CLI tests with coverage reporting')
  .option('-r, --report <types>', 'Coverage report types (summary,detailed,html)', 'summary')
  .option('-t, --threshold <number>', 'Coverage threshold percentage', '90')
  .option('-w, --watch', 'Run tests in watch mode')
  .option('-p, --pattern <pattern>', 'Test file pattern to run')
  .action(async (options) => {
    const { report, threshold, watch, pattern } = options;
    
    // Configure test command
    let testCommand = 'vitest run';
    if (watch) {
      testCommand = 'vitest';
    }
    
    if (pattern) {
      testCommand += ` ${pattern}`;
    }

    // Configure coverage
    const coverageConfig = {
      reporter: report.split(','),
      threshold: {
        lines: parseInt(threshold),
        statements: parseInt(threshold),
        branches: parseInt(threshold),
        functions: parseInt(threshold)
      }
    };

    // Write coverage config
    const configPath = path.join(process.cwd(), 'vitest.config.js');
    const configContent = `
      import { defineConfig } from 'vitest/config';
      
      export default defineConfig({
        test: {
          coverage: ${JSON.stringify(coverageConfig, null, 2)}
        }
      });
    `;
    fs.writeFileSync(configPath, configContent);

    try {
      // Run tests
      console.log('Running tests with coverage...');
      execSync(testCommand, { stdio: 'inherit' });
      
      // Generate coverage report
      if (report.includes('html')) {
        execSync('vitest coverage --reporter=html', { stdio: 'inherit' });
      }
      
      console.log('✅ Test coverage report generated successfully');
    } catch (error) {
      console.error('❌ Test coverage failed:', error.message);
      process.exit(1);
    }
  });

module.exports = program; 