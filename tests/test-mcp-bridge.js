/**
 * MCP Bridge Integration Tests
 * Tests the Claude Model Context Protocol bridge functionality
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const MCP_BRIDGE_URL = 'http://localhost:3002';
const STARTUP_DELAY = 3000; // Wait for server to start

class MCPBridgeTestSuite {
  constructor() {
    this.serverProcess = null;
    this.testResults = [];
  }

  async setup() {
    console.log('🚀 Starting MCP Bridge server...');
    
    // Start the MCP Bridge server
    this.serverProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, '../claude-mcp-bridge'),
      env: { ...process.env, PORT: 3002 }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, STARTUP_DELAY));
    
    // Verify server is running
    try {
      await axios.get(`${MCP_BRIDGE_URL}/health`);
      console.log('✅ MCP Bridge server is running');
    } catch (error) {
      console.error('❌ Failed to start MCP Bridge server');
      throw error;
    }
  }

  async teardown() {
    if (this.serverProcess) {
      console.log('🛑 Stopping MCP Bridge server...');
      this.serverProcess.kill();
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

  // Test 1: Health Check
  async testHealthCheck() {
    const response = await axios.get(`${MCP_BRIDGE_URL}/health`);
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    if (!response.data.status === 'healthy') {
      throw new Error('Server not healthy');
    }
  }

  // Test 2: Task Processing
  async testTaskProcessing() {
    const taskPayload = {
      id: 'test-task-1',
      type: 'document',
      action: 'create',
      data: {
        title: 'Test Document',
        content: 'This is a test document created by MCP Bridge tests'
      }
    };

    const response = await axios.post(`${MCP_BRIDGE_URL}/tasks`, taskPayload);
    
    if (!response.data.taskId) {
      throw new Error('No taskId returned');
    }
    
    if (response.data.status !== 'queued' && response.data.status !== 'processing') {
      throw new Error(`Unexpected status: ${response.data.status}`);
    }
  }

  // Test 3: Batch Operations
  async testBatchOperations() {
    const batchPayload = {
      tasks: [
        {
          id: 'batch-1',
          type: 'file',
          action: 'create',
          data: { path: 'test1.txt', content: 'Test 1' }
        },
        {
          id: 'batch-2',
          type: 'file',
          action: 'create',
          data: { path: 'test2.txt', content: 'Test 2' }
        },
        {
          id: 'batch-3',
          type: 'api',
          action: 'call',
          data: { endpoint: '/test', method: 'GET' }
        }
      ]
    };

    const response = await axios.post(`${MCP_BRIDGE_URL}/batch`, batchPayload);
    
    if (!response.data.batchId) {
      throw new Error('No batchId returned');
    }
    
    if (!Array.isArray(response.data.tasks)) {
      throw new Error('Expected tasks array in response');
    }
    
    if (response.data.tasks.length !== 3) {
      throw new Error(`Expected 3 tasks, got ${response.data.tasks.length}`);
    }
  }

  // Test 4: Service Integration
  async testServiceIntegration() {
    const services = ['google-docs', 'asana', 'github', 'supabase'];
    
    for (const service of services) {
      const response = await axios.get(`${MCP_BRIDGE_URL}/services/${service}/status`);
      
      if (!response.data.available !== undefined) {
        throw new Error(`Service ${service} status check failed`);
      }
    }
  }

  // Test 5: Error Handling
  async testErrorHandling() {
    // Test invalid task
    try {
      await axios.post(`${MCP_BRIDGE_URL}/tasks`, { invalid: 'payload' });
      throw new Error('Expected error for invalid payload');
    } catch (error) {
      if (!error.response || error.response.status !== 400) {
        throw new Error('Expected 400 status for invalid payload');
      }
    }

    // Test non-existent endpoint
    try {
      await axios.get(`${MCP_BRIDGE_URL}/nonexistent`);
      throw new Error('Expected 404 error');
    } catch (error) {
      if (!error.response || error.response.status !== 404) {
        throw new Error('Expected 404 status');
      }
    }
  }

  // Test 6: Delegation Flow
  async testDelegationFlow() {
    const delegationTask = {
      id: 'delegation-test',
      type: 'complex',
      requiresDelegation: true,
      action: 'execute',
      data: {
        operation: 'oauth-flow',
        provider: 'google',
        scopes: ['docs.read', 'docs.write']
      }
    };

    const response = await axios.post(`${MCP_BRIDGE_URL}/delegate`, delegationTask);
    
    if (!response.data.delegatedTo) {
      throw new Error('No delegation target specified');
    }
    
    if (response.data.delegatedTo !== 'claude-code-cli') {
      throw new Error(`Expected delegation to claude-code-cli, got ${response.data.delegatedTo}`);
    }
  }

  // Test 7: Real-time Updates (WebSocket)
  async testRealtimeUpdates() {
    const WebSocket = require('ws');
    const ws = new WebSocket(`ws://localhost:3002/ws`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'subscribe', taskId: 'test-123' }));
      });

      ws.on('message', (data) => {
        clearTimeout(timeout);
        const message = JSON.parse(data);
        if (message.type === 'subscribed') {
          ws.close();
          resolve();
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  // Test 8: Authentication & Security
  async testAuthentication() {
    // Test without auth token
    try {
      await axios.post(`${MCP_BRIDGE_URL}/secure/task`, {}, {
        headers: {}
      });
      throw new Error('Expected authentication error');
    } catch (error) {
      if (!error.response || error.response.status !== 401) {
        throw new Error('Expected 401 Unauthorized');
      }
    }

    // Test with valid token
    const response = await axios.post(`${MCP_BRIDGE_URL}/secure/task`, {
      task: 'test'
    }, {
      headers: {
        'Authorization': 'Bearer test-token-123'
      }
    });

    if (response.status !== 200) {
      throw new Error('Authentication with valid token failed');
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 MCP Bridge Integration Test Suite\n');
    
    try {
      await this.setup();

      // Run all tests
      await this.runTest('Health Check', () => this.testHealthCheck());
      await this.runTest('Task Processing', () => this.testTaskProcessing());
      await this.runTest('Batch Operations', () => this.testBatchOperations());
      await this.runTest('Service Integration', () => this.testServiceIntegration());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      await this.runTest('Delegation Flow', () => this.testDelegationFlow());
      await this.runTest('Real-time Updates', () => this.testRealtimeUpdates());
      await this.runTest('Authentication', () => this.testAuthentication());

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
  const testSuite = new MCPBridgeTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = MCPBridgeTestSuite;