#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Bruno Orchestration Architecture
 * Runs all test suites and generates comprehensive reports
 */

const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

// Import all test suites
const MCPBridgeTestSuite = require('./test-mcp-bridge');
const BrunoExecutorTestSuite = require('./test-bruno-executor');
const GoogleDocsTestSuite = require('./test-google-docs-integration');
const AsanaTestSuite = require('./test-asana-integration');

class OrchestrationTestRunner {
  constructor() {
    this.results = {
      startTime: null,
      endTime: null,
      duration: null,
      suites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        suites: 0,
        suitesSuccessful: 0
      }
    };
  }

  async runAllTests() {
    console.log('🎯 Bruno Orchestration Architecture - Comprehensive Test Suite');
    console.log('================================================================\n');
    
    this.results.startTime = new Date();
    const startTime = performance.now();

    // Define test suites
    const testSuites = [
      {
        name: 'MCP Bridge Integration',
        class: MCPBridgeTestSuite,
        description: 'Tests Claude Model Context Protocol bridge functionality'
      },
      {
        name: 'Bruno Executor',
        class: BrunoExecutorTestSuite,
        description: 'Tests Bruno task execution and delegation capabilities'
      },
      {
        name: 'Google Docs Integration',
        class: GoogleDocsTestSuite,
        description: 'Tests Google Docs integration across all components'
      },
      {
        name: 'Asana Integration',
        class: AsanaTestSuite,
        description: 'Tests Asana task management integration'
      }
    ];

    // Run each test suite
    for (const suite of testSuites) {
      console.log(`\n🔄 Starting ${suite.name} test suite...`);
      console.log(`   ${suite.description}`);
      console.log('─'.repeat(60));

      const suiteStartTime = performance.now();
      let suiteResult;

      try {
        const testInstance = new suite.class();
        
        // Capture console output
        const originalLog = console.log;
        const logs = [];
        console.log = (...args) => {
          logs.push(args.join(' '));
          originalLog(...args);
        };

        await testInstance.runAllTests();
        
        // Restore console
        console.log = originalLog;

        const suiteEndTime = performance.now();
        const suiteDuration = suiteEndTime - suiteStartTime;

        suiteResult = {
          name: suite.name,
          status: 'COMPLETED',
          duration: suiteDuration,
          tests: testInstance.testResults || [],
          logs: logs
        };

        // Calculate suite statistics
        const passed = suiteResult.tests.filter(t => t.status === 'PASS').length;
        const failed = suiteResult.tests.filter(t => t.status === 'FAIL').length;
        const skipped = suiteResult.tests.filter(t => t.status === 'SKIP').length;

        suiteResult.summary = {
          total: suiteResult.tests.length,
          passed,
          failed,
          skipped,
          success: failed === 0
        };

        console.log(`\n✅ ${suite.name} completed in ${(suiteDuration / 1000).toFixed(2)}s`);
        console.log(`   ${passed} passed, ${failed} failed, ${skipped} skipped`);

      } catch (error) {
        const suiteEndTime = performance.now();
        const suiteDuration = suiteEndTime - suiteStartTime;

        suiteResult = {
          name: suite.name,
          status: 'ERROR',
          duration: suiteDuration,
          error: error.message,
          tests: [],
          summary: {
            total: 0,
            passed: 0,
            failed: 1,
            skipped: 0,
            success: false
          }
        };

        console.error(`\n❌ ${suite.name} failed with error: ${error.message}`);
      }

      this.results.suites.push(suiteResult);
    }

    const endTime = performance.now();
    this.results.endTime = new Date();
    this.results.duration = endTime - startTime;

    // Calculate overall summary
    this.calculateSummary();
    
    // Generate reports
    await this.generateReports();
    
    // Print final summary
    this.printFinalSummary();

    // Exit with appropriate code
    const hasFailures = this.results.summary.failed > 0;
    process.exit(hasFailures ? 1 : 0);
  }

  calculateSummary() {
    this.results.summary.suites = this.results.suites.length;
    this.results.summary.suitesSuccessful = this.results.suites.filter(s => s.summary.success).length;

    for (const suite of this.results.suites) {
      this.results.summary.total += suite.summary.total;
      this.results.summary.passed += suite.summary.passed;
      this.results.summary.failed += suite.summary.failed;
      this.results.summary.skipped += suite.summary.skipped;
    }
  }

  async generateReports() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = path.join(__dirname, 'reports');
    
    // Ensure reports directory exists
    try {
      await fs.mkdir(reportDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate JSON report
    const jsonReport = {
      ...this.results,
      metadata: {
        version: '1.0.0',
        platform: process.platform,
        nodeVersion: process.version,
        timestamp: this.results.startTime.toISOString()
      }
    };

    await fs.writeFile(
      path.join(reportDir, `test-report-${timestamp}.json`),
      JSON.stringify(jsonReport, null, 2)
    );

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(jsonReport);
    await fs.writeFile(
      path.join(reportDir, `test-report-${timestamp}.html`),
      htmlReport
    );

    // Generate latest symlinks
    try {
      await fs.unlink(path.join(reportDir, 'latest.json'));
      await fs.unlink(path.join(reportDir, 'latest.html'));
    } catch (error) {
      // Files might not exist
    }

    await fs.symlink(
      `test-report-${timestamp}.json`,
      path.join(reportDir, 'latest.json')
    );
    
    await fs.symlink(
      `test-report-${timestamp}.html`,
      path.join(reportDir, 'latest.html')
    );

    console.log(`\n📊 Reports generated:`);
    console.log(`   JSON: ${reportDir}/test-report-${timestamp}.json`);
    console.log(`   HTML: ${reportDir}/test-report-${timestamp}.html`);
    console.log(`   Latest: ${reportDir}/latest.html`);
  }

  generateHTMLReport(data) {
    const statusIcon = (status) => {
      switch (status) {
        case 'PASS': return '✅';
        case 'FAIL': return '❌';
        case 'SKIP': return '⏭️';
        default: return '❓';
      }
    };

    const suiteRows = data.suites.map(suite => `
      <tr class="${suite.summary.success ? 'success' : 'failure'}">
        <td>${suite.name}</td>
        <td>${(suite.duration / 1000).toFixed(2)}s</td>
        <td>${suite.summary.total}</td>
        <td class="pass">${suite.summary.passed}</td>
        <td class="fail">${suite.summary.failed}</td>
        <td class="skip">${suite.summary.skipped}</td>
        <td>${suite.summary.success ? '✅' : '❌'}</td>
      </tr>
    `).join('');

    const testDetails = data.suites.map(suite => `
      <div class="suite">
        <h3>${suite.name}</h3>
        <div class="test-grid">
          ${suite.tests.map(test => `
            <div class="test-item ${test.status.toLowerCase()}">
              ${statusIcon(test.status)} ${test.name}
              ${test.error ? `<div class="error">${test.error}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Bruno Orchestration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .metric-label { color: #666; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
        .success { background: #f0fff0; }
        .failure { background: #fff0f0; }
        .pass { color: #008000; font-weight: bold; }
        .fail { color: #ff0000; font-weight: bold; }
        .skip { color: #ffa500; font-weight: bold; }
        .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; margin: 10px 0; }
        .test-item { padding: 8px; border-radius: 3px; font-size: 14px; }
        .test-item.pass { background: #e8f5e8; }
        .test-item.fail { background: #ffeaea; }
        .test-item.skip { background: #fff8e1; }
        .error { font-size: 12px; color: #cc0000; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Bruno Orchestration Architecture Test Report</h1>
        <p><strong>Generated:</strong> ${data.startTime}</p>
        <p><strong>Duration:</strong> ${(data.duration / 1000).toFixed(2)} seconds</p>
        <p><strong>Platform:</strong> ${data.metadata.platform} (Node ${data.metadata.nodeVersion})</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value">${data.summary.total}</div>
            <div class="metric-label">Total Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value pass">${data.summary.passed}</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value fail">${data.summary.failed}</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value skip">${data.summary.skipped}</div>
            <div class="metric-label">Skipped</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.summary.suitesSuccessful}/${data.summary.suites}</div>
            <div class="metric-label">Suites Passed</div>
        </div>
    </div>

    <h2>📋 Test Suites Summary</h2>
    <table>
        <thead>
            <tr>
                <th>Suite</th>
                <th>Duration</th>
                <th>Total</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Skipped</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${suiteRows}
        </tbody>
    </table>

    <h2>🔍 Detailed Test Results</h2>
    ${testDetails}

</body>
</html>`;
  }

  printFinalSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 FINAL TEST SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`⏱️  Total Duration: ${(this.results.duration / 1000).toFixed(2)} seconds`);
    console.log(`📦 Test Suites: ${this.results.summary.suitesSuccessful}/${this.results.summary.suites} successful`);
    console.log(`🧪 Individual Tests: ${this.results.summary.total} total`);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⏭️  Skipped: ${this.results.summary.skipped}`);
    
    const successRate = this.results.summary.total > 0 ? 
      (this.results.summary.passed / this.results.summary.total * 100).toFixed(1) : 0;
    console.log(`📊 Success Rate: ${successRate}%`);

    if (this.results.summary.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! The Bruno orchestration architecture is working correctly.');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED. Please review the detailed reports for more information.');
      
      // Show failed tests
      console.log('\nFailed Tests:');
      for (const suite of this.results.suites) {
        const failedTests = suite.tests.filter(t => t.status === 'FAIL');
        if (failedTests.length > 0) {
          console.log(`  ${suite.name}:`);
          failedTests.forEach(test => {
            console.log(`    - ${test.name}: ${test.error}`);
          });
        }
      }
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new OrchestrationTestRunner();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node run-all-tests.js [options]

Options:
  --help, -h     Show this help message
  --version, -v  Show version information

Environment Variables:
  ASANA_ACCESS_TOKEN       Asana API token for integration tests
  GOOGLE_CREDENTIALS_PATH  Path to Google service account credentials
  DEBUG                    Enable debug logging (e.g., DEBUG=bruno:*)

Examples:
  node run-all-tests.js                    # Run all tests
  DEBUG=bruno:* node run-all-tests.js      # Run with debug logging
  ASANA_ACCESS_TOKEN=xxx node run-all-tests.js  # Run with Asana integration
`);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('Bruno Orchestration Test Suite v1.0.0');
    process.exit(0);
  }

  try {
    await runner.runAllTests();
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = OrchestrationTestRunner;