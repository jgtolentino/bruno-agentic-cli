#!/usr/bin/env node

/**
 * Quick Validation Test for Bruno Orchestration
 * Tests the available components without requiring complex setup
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class QuickValidationTest {
  constructor() {
    this.results = [];
    this.projectRoot = path.join(__dirname, '..');
  }

  async runTest(name, testFn) {
    console.log(`\n📋 Testing: ${name}`);
    try {
      await testFn();
      this.results.push({ name, status: 'PASS' });
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.results.push({ name, status: 'FAIL', error: error.message });
      console.error(`❌ ${name} - FAILED: ${error.message}`);
    }
  }

  // Test 1: Check Core Components Exist
  async testCoreComponentsExist() {
    const requiredFiles = [
      'core/brunoTaskRunner.js',
      'core/brunoDelegator.js',
      'core/agentRouter.js',
      'core/gdocsIntegrator.js',
      'claude-mcp-bridge/src/server.js',
      'claude-mcp-bridge/src/cli.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.projectRoot, file);
      try {
        await fs.access(filePath);
        console.log(`  ✓ Found: ${file}`);
      } catch (error) {
        throw new Error(`Missing required file: ${file}`);
      }
    }
  }

  // Test 2: Check MCP Bridge Connectors
  async testMCPConnectors() {
    const connectorDir = path.join(this.projectRoot, 'claude-mcp-bridge/src/connectors');
    const connectors = await fs.readdir(connectorDir);
    
    const expectedConnectors = ['asana.js', 'google-docs.js', 'github.js', 'supabase.js'];
    
    for (const connector of expectedConnectors) {
      if (!connectors.includes(connector)) {
        throw new Error(`Missing connector: ${connector}`);
      }
      console.log(`  ✓ Found connector: ${connector}`);
    }
  }

  // Test 3: Validate JavaScript Syntax
  async testJavaScriptSyntax() {
    const testFiles = [
      'core/agentRouter.js',
      'claude-mcp-bridge/src/server.js'
    ];

    for (const file of testFiles) {
      const filePath = path.join(this.projectRoot, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Basic syntax validation
      if (!content.includes('module.exports') && !content.includes('export')) {
        throw new Error(`File ${file} doesn't appear to export anything`);
      }
      
      console.log(`  ✓ ${file} syntax looks valid`);
    }
  }

  // Test 4: Test Package Dependencies
  async testPackageDependencies() {
    const packageFiles = [
      'claude-mcp-bridge/package.json',
      'tests/package.json'
    ];

    for (const packageFile of packageFiles) {
      const packagePath = path.join(this.projectRoot, packageFile);
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageData = JSON.parse(packageContent);
      
      if (!packageData.dependencies && !packageData.devDependencies) {
        throw new Error(`${packageFile} has no dependencies defined`);
      }
      
      console.log(`  ✓ ${packageFile} dependencies look valid`);
    }
  }

  // Test 5: Test Directory Structure
  async testDirectoryStructure() {
    const requiredDirs = [
      'core',
      'claude-mcp-bridge',
      'claude-mcp-bridge/src',
      'claude-mcp-bridge/src/connectors',
      'claude-mcp-bridge/src/processors',
      'tests'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      try {
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory()) {
          throw new Error(`${dir} is not a directory`);
        }
        console.log(`  ✓ Directory exists: ${dir}`);
      } catch (error) {
        throw new Error(`Missing directory: ${dir}`);
      }
    }
  }

  // Test 6: Test Environment Setup
  async testEnvironmentSetup() {
    // Check for Google credentials
    const googleCredsPath = process.env.GOOGLE_CREDENTIALS_PATH;
    if (googleCredsPath) {
      try {
        await fs.access(googleCredsPath);
        console.log(`  ✓ Google credentials found at: ${googleCredsPath}`);
      } catch (error) {
        console.log(`  ⚠ Google credentials path set but file not accessible`);
      }
    } else {
      console.log(`  ⚠ GOOGLE_CREDENTIALS_PATH not set`);
    }

    // Check for Asana token
    if (process.env.ASANA_ACCESS_TOKEN) {
      console.log(`  ✓ Asana access token is set`);
    } else {
      console.log(`  ⚠ ASANA_ACCESS_TOKEN not set`);
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion >= 14) {
      console.log(`  ✓ Node.js version: ${nodeVersion}`);
    } else {
      throw new Error(`Node.js version too old: ${nodeVersion} (need >= 14)`);
    }
  }

  // Test 7: Test Basic File Operations
  async testBasicFileOperations() {
    const testDir = path.join(__dirname, 'temp-test');
    const testFile = path.join(testDir, 'test.txt');
    
    try {
      // Create test directory
      await fs.mkdir(testDir, { recursive: true });
      console.log(`  ✓ Created test directory`);
      
      // Write test file
      await fs.writeFile(testFile, 'Bruno orchestration test');
      console.log(`  ✓ Created test file`);
      
      // Read test file
      const content = await fs.readFile(testFile, 'utf-8');
      if (content !== 'Bruno orchestration test') {
        throw new Error('File content mismatch');
      }
      console.log(`  ✓ Read test file successfully`);
      
      // Clean up
      await fs.unlink(testFile);
      await fs.rmdir(testDir);
      console.log(`  ✓ Cleaned up test files`);
      
    } catch (error) {
      // Try to clean up even if test failed
      try {
        await fs.unlink(testFile).catch(() => {});
        await fs.rmdir(testDir).catch(() => {});
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  // Test 8: Test Command Line Tools
  async testCommandLineTools() {
    const tools = [
      { command: 'node', args: ['--version'], name: 'Node.js' },
      { command: 'npm', args: ['--version'], name: 'npm' }
    ];

    for (const tool of tools) {
      try {
        const result = await this.runCommand(tool.command, tool.args);
        console.log(`  ✓ ${tool.name} available: ${result.trim()}`);
      } catch (error) {
        throw new Error(`${tool.name} not available: ${error.message}`);
      }
    }
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
          resolve(output);
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
    console.log('🧪 Bruno Orchestration Quick Validation Test\n');
    console.log('='.repeat(50));

    await this.runTest('Core Components Exist', () => this.testCoreComponentsExist());
    await this.runTest('MCP Connectors', () => this.testMCPConnectors());
    await this.runTest('JavaScript Syntax', () => this.testJavaScriptSyntax());
    await this.runTest('Package Dependencies', () => this.testPackageDependencies());
    await this.runTest('Directory Structure', () => this.testDirectoryStructure());
    await this.runTest('Environment Setup', () => this.testEnvironmentSetup());
    await this.runTest('Basic File Operations', () => this.testBasicFileOperations());
    await this.runTest('Command Line Tools', () => this.testCommandLineTools());

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(50));

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
      console.log('\n🎉 All validation tests passed!');
      console.log('The Bruno orchestration architecture appears to be properly set up.');
    } else {
      console.log('\n⚠️  Some validation tests failed.');
      console.log('Please review the errors and fix any issues before running full tests.');
    }

    return failed === 0;
  }
}

// Run the quick validation test
if (require.main === module) {
  const validator = new QuickValidationTest();
  validator.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Validation test runner failed:', error);
    process.exit(1);
  });
}

module.exports = QuickValidationTest;