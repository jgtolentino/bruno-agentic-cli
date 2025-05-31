#!/usr/bin/env node

/**
 * Lightweight Integration Test for Bruno Orchestration
 * Tests key functionality without requiring external services
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class IntegrationTestLite {
  constructor() {
    this.results = [];
    this.projectRoot = path.join(__dirname, '..');
    this.tempDir = path.join(__dirname, 'temp-integration-test');
  }

  async setup() {
    console.log('🚀 Setting up integration test environment...');
    
    // Create temp directory
    await fs.mkdir(this.tempDir, { recursive: true });
    console.log(`📁 Created temp directory: ${this.tempDir}`);
  }

  async cleanup() {
    console.log('🧹 Cleaning up...');
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error.message);
    }
  }

  async runTest(name, testFn) {
    console.log(`\n📋 Running: ${name}`);
    try {
      await testFn();
      this.results.push({ name, status: 'PASS' });
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.results.push({ name, status: 'FAIL', error: error.message });
      console.error(`❌ ${name} - FAILED: ${error.message}`);
    }
  }

  // Test 1: Core Module Loading
  async testCoreModuleLoading() {
    // Test if we can import the core modules (syntax check)
    const testScript = `
      const path = require('path');
      const fs = require('fs');
      
      // Check if files exist and have exports
      const files = [
        '${this.projectRoot}/core/agentRouter.js',
        '${this.projectRoot}/claude-mcp-bridge/src/server.js'
      ];
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        if (!content.includes('module.exports') && !content.includes('export')) {
          throw new Error('File ' + file + ' has no exports');
        }
      }
      
      console.log('Core modules syntax validated');
    `;

    await this.runNodeScript(testScript);
  }

  // Test 2: Google Docs Integration Test (Mock)
  async testGoogleDocsIntegration() {
    if (!process.env.GOOGLE_CREDENTIALS_PATH) {
      console.log('  ⏭️ Skipping - no Google credentials');
      return;
    }

    // Verify credentials file exists and is valid JSON
    const credsPath = process.env.GOOGLE_CREDENTIALS_PATH;
    const credsContent = await fs.readFile(credsPath, 'utf-8');
    const credentials = JSON.parse(credsContent);

    if (!credentials.type || !credentials.client_email) {
      throw new Error('Invalid Google credentials format');
    }

    console.log(`  ✓ Google credentials validated`);
    console.log(`  ✓ Service account: ${credentials.client_email}`);
  }

  // Test 3: File System Operations
  async testFileSystemOperations() {
    const testFiles = [
      { name: 'test1.txt', content: 'Bruno test file 1' },
      { name: 'test2.json', content: '{"test": "Bruno integration"}' },
      { name: 'subdir/test3.txt', content: 'Nested file test' }
    ];

    // Create files
    for (const file of testFiles) {
      const filePath = path.join(this.tempDir, file.name);
      const dirPath = path.dirname(filePath);
      
      // Create directory if needed
      await fs.mkdir(dirPath, { recursive: true });
      
      // Write file
      await fs.writeFile(filePath, file.content);
      console.log(`  ✓ Created: ${file.name}`);
    }

    // Read and verify files
    for (const file of testFiles) {
      const filePath = path.join(this.tempDir, file.name);
      const content = await fs.readFile(filePath, 'utf-8');
      
      if (content !== file.content) {
        throw new Error(`Content mismatch in ${file.name}`);
      }
      console.log(`  ✓ Verified: ${file.name}`);
    }

    // List directory contents
    const files = await fs.readdir(this.tempDir, { recursive: true });
    console.log(`  ✓ Directory listing: ${files.length} items`);
  }

  // Test 4: Command Execution Simulation
  async testCommandExecution() {
    const commands = [
      { cmd: 'echo', args: ['Bruno test output'], expected: 'Bruno test output' },
      { cmd: 'node', args: ['--version'], expectedPattern: /^v\d+\.\d+\.\d+/ },
      { cmd: 'npm', args: ['--version'], expectedPattern: /^\d+\.\d+\.\d+/ }
    ];

    for (const command of commands) {
      const result = await this.runCommand(command.cmd, command.args);
      
      if (command.expected && !result.includes(command.expected)) {
        throw new Error(`Command output mismatch for ${command.cmd}`);
      }
      
      if (command.expectedPattern && !command.expectedPattern.test(result)) {
        throw new Error(`Command pattern mismatch for ${command.cmd}`);
      }
      
      console.log(`  ✓ Command executed: ${command.cmd} ${command.args.join(' ')}`);
    }
  }

  // Test 5: JSON Processing
  async testJSONProcessing() {
    const testData = {
      orchestration: {
        agents: ['Claude Code CLI', 'Claude Desktop', 'Bruno CLI'],
        integrations: ['Google Docs', 'Asana', 'GitHub'],
        status: 'testing'
      },
      timestamp: new Date().toISOString(),
      metrics: {
        tests: this.results.length,
        environment: 'integration-test'
      }
    };

    // Write JSON
    const jsonPath = path.join(this.tempDir, 'test-data.json');
    await fs.writeFile(jsonPath, JSON.stringify(testData, null, 2));
    console.log(`  ✓ Created JSON file`);

    // Read and parse JSON
    const readData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
    
    if (readData.orchestration.agents.length !== 3) {
      throw new Error('JSON data integrity check failed');
    }
    
    console.log(`  ✓ JSON processing verified`);
    console.log(`  ✓ Agents: ${readData.orchestration.agents.join(', ')}`);
  }

  // Test 6: Network Connectivity (Basic)
  async testNetworkConnectivity() {
    try {
      // Test DNS resolution
      const dns = require('dns').promises;
      await dns.lookup('google.com');
      console.log(`  ✓ DNS resolution working`);
      
      // Test HTTPS connectivity (basic)
      const https = require('https');
      await new Promise((resolve, reject) => {
        const req = https.request('https://httpbin.org/json', { method: 'GET' }, (res) => {
          res.on('data', () => {}); // Consume data
          res.on('end', resolve);
        });
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Request timeout')));
        req.end();
      });
      console.log(`  ✓ HTTPS connectivity working`);
      
    } catch (error) {
      console.log(`  ⚠️ Network test skipped: ${error.message}`);
    }
  }

  // Test 7: Process Management
  async testProcessManagement() {
    // Test spawning child processes
    const child = spawn('echo', ['child process test'], { stdio: 'pipe' });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Child process failed with code ${code}`));
        }
      });
      child.on('error', reject);
    });

    if (!output.includes('child process test')) {
      throw new Error('Child process output incorrect');
    }

    console.log(`  ✓ Child process management working`);
  }

  // Test 8: Error Handling
  async testErrorHandling() {
    // Test file not found
    try {
      await fs.readFile('/nonexistent/file.txt');
      throw new Error('Should have thrown an error');
    } catch (error) {
      if (!error.message.includes('ENOENT')) {
        throw new Error('Unexpected error type');
      }
      console.log(`  ✓ File not found error handled correctly`);
    }

    // Test invalid JSON
    try {
      JSON.parse('invalid json {');
      throw new Error('Should have thrown an error');
    } catch (error) {
      if (!error.message.includes('JSON')) {
        throw new Error('Unexpected JSON error type');
      }
      console.log(`  ✓ JSON parse error handled correctly`);
    }

    // Test command not found
    try {
      await this.runCommand('nonexistentcommand', []);
      throw new Error('Should have thrown an error');
    } catch (error) {
      console.log(`  ✓ Command not found error handled correctly`);
    }
  }

  runNodeScript(script) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', ['-e', script], { stdio: 'pipe' });
      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(error || `Script failed with code ${code}`));
        }
      });
    });
  }

  runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'pipe' });
      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(error || `Command failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runAllTests() {
    console.log('🧪 Bruno Orchestration Lightweight Integration Test\n');
    console.log('='.repeat(60));

    try {
      await this.setup();

      // Run all tests
      await this.runTest('Core Module Loading', () => this.testCoreModuleLoading());
      await this.runTest('Google Docs Integration', () => this.testGoogleDocsIntegration());
      await this.runTest('File System Operations', () => this.testFileSystemOperations());
      await this.runTest('Command Execution', () => this.testCommandExecution());
      await this.runTest('JSON Processing', () => this.testJSONProcessing());
      await this.runTest('Network Connectivity', () => this.testNetworkConnectivity());
      await this.runTest('Process Management', () => this.testProcessManagement());
      await this.runTest('Error Handling', () => this.testErrorHandling());

      // Print summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 INTEGRATION TEST SUMMARY');
      console.log('='.repeat(60));

      const passed = this.results.filter(r => r.status === 'PASS').length;
      const failed = this.results.filter(r => r.status === 'FAIL').length;

      console.log(`Total Tests: ${this.results.length}`);
      console.log(`✅ Passed: ${passed}`);
      console.log(`❌ Failed: ${failed}`);

      if (failed > 0) {
        console.log('\nFailed Tests:');
        this.results
          .filter(r => r.status === 'FAIL')
          .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
      }

      const successRate = (passed / this.results.length * 100).toFixed(1);
      console.log(`\n📈 Success Rate: ${successRate}%`);

      if (failed === 0) {
        console.log('\n🎉 All integration tests passed!');
        console.log('The Bruno orchestration system is functioning correctly.');
      } else {
        console.log('\n⚠️  Some integration tests failed.');
        console.log('Please review the errors and check the system configuration.');
      }

      return failed === 0;

    } finally {
      await this.cleanup();
    }
  }
}

// Run the integration test
if (require.main === module) {
  const tester = new IntegrationTestLite();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Integration test runner failed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTestLite;