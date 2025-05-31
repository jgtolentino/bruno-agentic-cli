/**
 * Bruno Executor Integration Tests
 * Tests Bruno's task execution and delegation capabilities
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Import Bruno components
const BrunoTaskRunner = require('../core/brunoTaskRunner');
const BrunoDelegator = require('../core/brunoDelegator');
const AgentRouter = require('../core/agentRouter');

class BrunoExecutorTestSuite {
  constructor() {
    this.testResults = [];
    this.tempDir = path.join(os.tmpdir(), 'bruno-test-' + Date.now());
    this.taskRunner = new BrunoTaskRunner();
    this.delegator = new BrunoDelegator();
    this.router = new AgentRouter();
  }

  async setup() {
    console.log('🚀 Setting up Bruno Executor tests...');
    
    // Create temp directory for test files
    await fs.mkdir(this.tempDir, { recursive: true });
    console.log(`📁 Created temp directory: ${this.tempDir}`);
    
    // Initialize Bruno components
    await this.taskRunner.initialize();
    await this.delegator.initialize();
    await this.router.initialize();
    
    console.log('✅ Bruno Executor test setup complete');
  }

  async teardown() {
    console.log('🧹 Cleaning up...');
    
    // Remove temp directory
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean temp directory:', error.message);
    }
  }

  async runTest(name, testFn) {
    console.log(`\n📋 Running test: ${name}`);
    try {
      await testFn();
      this.testResults.push({ name, status: 'PASS' });
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.testResults.push({ name, status: 'FAIL', error: error.message });
      console.error(`❌ ${name} - FAILED: ${error.message}`);
    }
  }

  // Test 1: Local File Operations
  async testLocalFileOperations() {
    const testFile = path.join(this.tempDir, 'test-file.txt');
    const testContent = 'Bruno executor test content';

    // Create file
    const createTask = {
      type: 'file-operation',
      action: 'create',
      path: testFile,
      content: testContent
    };

    const createResult = await this.taskRunner.execute(createTask);
    if (!createResult.success) {
      throw new Error(`File creation failed: ${createResult.error}`);
    }

    // Verify file exists
    const stats = await fs.stat(testFile);
    if (!stats.isFile()) {
      throw new Error('Created file not found');
    }

    // Read file
    const readTask = {
      type: 'file-operation',
      action: 'read',
      path: testFile
    };

    const readResult = await this.taskRunner.execute(readTask);
    if (readResult.content !== testContent) {
      throw new Error('File content mismatch');
    }

    // Delete file
    const deleteTask = {
      type: 'file-operation',
      action: 'delete',
      path: testFile
    };

    const deleteResult = await this.taskRunner.execute(deleteTask);
    if (!deleteResult.success) {
      throw new Error('File deletion failed');
    }
  }

  // Test 2: Shell Command Execution
  async testShellExecution() {
    // Simple echo command
    const echoTask = {
      type: 'shell-command',
      command: 'echo "Bruno test output"',
      options: { cwd: this.tempDir }
    };

    const echoResult = await this.taskRunner.execute(echoTask);
    if (!echoResult.output.includes('Bruno test output')) {
      throw new Error('Echo command failed');
    }

    // Command with pipes
    const pipeTask = {
      type: 'shell-command',
      command: 'echo "line1\nline2\nline3" | grep line2',
      options: { shell: true }
    };

    const pipeResult = await this.taskRunner.execute(pipeTask);
    if (!pipeResult.output.includes('line2')) {
      throw new Error('Pipe command failed');
    }

    // Command with error
    const errorTask = {
      type: 'shell-command',
      command: 'exit 1'
    };

    const errorResult = await this.taskRunner.execute(errorTask);
    if (errorResult.success !== false) {
      throw new Error('Expected command to fail');
    }
  }

  // Test 3: Delegation Logic
  async testDelegationDecisions() {
    const testCases = [
      // Should NOT delegate (local operations)
      {
        task: { type: 'file-operation', action: 'read', path: './local.txt' },
        shouldDelegate: false,
        reason: 'Local file operation'
      },
      {
        task: { type: 'shell-command', command: 'ls -la' },
        shouldDelegate: false,
        reason: 'Local shell command'
      },
      {
        task: { type: 'analysis', data: 'Analyze this text locally' },
        shouldDelegate: false,
        reason: 'Local analysis task'
      },

      // SHOULD delegate (external/complex operations)
      {
        task: { type: 'api-call', service: 'openai', endpoint: '/completions' },
        shouldDelegate: true,
        reason: 'External API call'
      },
      {
        task: { type: 'oauth', provider: 'google', action: 'authenticate' },
        shouldDelegate: true,
        reason: 'OAuth flow'
      },
      {
        task: { type: 'dynamic-payload', service: 'stripe', action: 'create-payment' },
        shouldDelegate: true,
        reason: 'Dynamic payload generation'
      }
    ];

    for (const testCase of testCases) {
      const decision = await this.delegator.shouldDelegate(testCase.task);
      
      if (decision.delegate !== testCase.shouldDelegate) {
        throw new Error(
          `Delegation decision mismatch for ${testCase.reason}. ` +
          `Expected: ${testCase.shouldDelegate}, Got: ${decision.delegate}`
        );
      }
    }
  }

  // Test 4: Task Routing
  async testTaskRouting() {
    // Test routing to Bruno
    const localTask = {
      id: 'local-1',
      type: 'file-operation',
      target: 'bruno'
    };

    const localRoute = await this.router.route(localTask);
    if (localRoute.handler !== 'bruno') {
      throw new Error(`Expected bruno handler, got ${localRoute.handler}`);
    }

    // Test routing to Claude
    const complexTask = {
      id: 'complex-1',
      type: 'api-integration',
      target: 'auto'
    };

    const complexRoute = await this.router.route(complexTask);
    if (complexRoute.handler !== 'claude') {
      throw new Error(`Expected claude handler, got ${complexRoute.handler}`);
    }
  }

  // Test 5: Streaming Output
  async testStreamingOutput() {
    const streamTask = {
      type: 'shell-command',
      command: 'for i in 1 2 3; do echo "Line $i"; sleep 0.1; done',
      stream: true,
      options: { shell: true }
    };

    const chunks = [];
    const result = await this.taskRunner.execute(streamTask, {
      onData: (chunk) => chunks.push(chunk)
    });

    if (chunks.length < 3) {
      throw new Error('Expected at least 3 output chunks');
    }

    if (!chunks.some(chunk => chunk.includes('Line 2'))) {
      throw new Error('Missing expected output in stream');
    }
  }

  // Test 6: Environment Variable Handling
  async testEnvironmentVariables() {
    // Set test environment variable
    process.env.BRUNO_TEST_VAR = 'test-value-123';

    const envTask = {
      type: 'shell-command',
      command: 'echo $BRUNO_TEST_VAR',
      options: { 
        env: { ...process.env, CUSTOM_VAR: 'custom-value' }
      }
    };

    const result = await this.taskRunner.execute(envTask);
    
    if (!result.output.includes('test-value-123')) {
      throw new Error('Environment variable not passed');
    }

    // Test custom env var
    const customEnvTask = {
      type: 'shell-command',
      command: 'echo $CUSTOM_VAR',
      options: { 
        env: { ...process.env, CUSTOM_VAR: 'custom-value' }
      }
    };

    const customResult = await this.taskRunner.execute(customEnvTask);
    if (!customResult.output.includes('custom-value')) {
      throw new Error('Custom environment variable not set');
    }

    // Clean up
    delete process.env.BRUNO_TEST_VAR;
  }

  // Test 7: Error Handling and Recovery
  async testErrorHandling() {
    // Test timeout
    const timeoutTask = {
      type: 'shell-command',
      command: 'sleep 10',
      timeout: 100 // 100ms timeout
    };

    const timeoutResult = await this.taskRunner.execute(timeoutTask);
    if (timeoutResult.success !== false || !timeoutResult.error.includes('timeout')) {
      throw new Error('Timeout not handled properly');
    }

    // Test invalid task
    const invalidTask = {
      type: 'unknown-type',
      action: 'invalid'
    };

    const invalidResult = await this.taskRunner.execute(invalidTask);
    if (invalidResult.success !== false) {
      throw new Error('Invalid task should fail');
    }

    // Test recovery
    const recoveryTask = {
      type: 'shell-command',
      command: 'false || echo "Recovered"',
      options: { shell: true }
    };

    const recoveryResult = await this.taskRunner.execute(recoveryTask);
    if (!recoveryResult.output.includes('Recovered')) {
      throw new Error('Recovery mechanism failed');
    }
  }

  // Test 8: Batch Execution
  async testBatchExecution() {
    const batchTasks = [
      {
        id: 'batch-1',
        type: 'file-operation',
        action: 'create',
        path: path.join(this.tempDir, 'batch-1.txt'),
        content: 'Batch file 1'
      },
      {
        id: 'batch-2',
        type: 'shell-command',
        command: 'echo "Batch command 2"'
      },
      {
        id: 'batch-3',
        type: 'file-operation',
        action: 'create',
        path: path.join(this.tempDir, 'batch-3.txt'),
        content: 'Batch file 3'
      }
    ];

    const results = await this.taskRunner.executeBatch(batchTasks);
    
    if (results.length !== 3) {
      throw new Error(`Expected 3 results, got ${results.length}`);
    }

    const successCount = results.filter(r => r.success).length;
    if (successCount !== 3) {
      throw new Error(`Expected all tasks to succeed, ${successCount}/3 succeeded`);
    }
  }

  // Test 9: Security Sandboxing
  async testSecuritySandboxing() {
    // Test restricted command
    const restrictedTask = {
      type: 'shell-command',
      command: 'rm -rf /',
      options: { dryRun: true }
    };

    const result = await this.taskRunner.execute(restrictedTask);
    if (result.success && !result.dryRun) {
      throw new Error('Dangerous command should be blocked or dry-run only');
    }

    // Test path traversal prevention
    const traversalTask = {
      type: 'file-operation',
      action: 'read',
      path: '../../../etc/passwd'
    };

    const traversalResult = await this.taskRunner.execute(traversalTask);
    if (traversalResult.success) {
      throw new Error('Path traversal should be prevented');
    }
  }

  // Test 10: Integration with Claude
  async testClaudeIntegration() {
    // Mock Claude response
    const mockClaudeResponse = {
      analysis: 'This task requires external API access',
      recommendation: 'delegate'
    };

    const complexTask = {
      type: 'complex-analysis',
      data: 'Analyze market trends and generate report',
      requiresExternal: true
    };

    // Check if task is delegated correctly
    const delegationDecision = await this.delegator.analyzeTask(complexTask);
    
    if (!delegationDecision.shouldDelegate) {
      throw new Error('Complex task should be delegated to Claude');
    }

    // Simulate delegation
    const delegationResult = await this.router.delegateToClaude(complexTask);
    
    if (!delegationResult.delegated) {
      throw new Error('Delegation to Claude failed');
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Bruno Executor Integration Test Suite\n');
    
    try {
      await this.setup();

      // Run all tests
      await this.runTest('Local File Operations', () => this.testLocalFileOperations());
      await this.runTest('Shell Command Execution', () => this.testShellExecution());
      await this.runTest('Delegation Decisions', () => this.testDelegationDecisions());
      await this.runTest('Task Routing', () => this.testTaskRouting());
      await this.runTest('Streaming Output', () => this.testStreamingOutput());
      await this.runTest('Environment Variables', () => this.testEnvironmentVariables());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      await this.runTest('Batch Execution', () => this.testBatchExecution());
      await this.runTest('Security Sandboxing', () => this.testSecuritySandboxing());
      await this.runTest('Claude Integration', () => this.testClaudeIntegration());

      // Print summary
      this.printSummary();

    } finally {
      await this.teardown();
    }
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total: ${this.testResults.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    
    if (failed > 0) {
      console.log('\nFailed tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }
    
    console.log('\n' + (failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed'));
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new BrunoExecutorTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = BrunoExecutorTestSuite;