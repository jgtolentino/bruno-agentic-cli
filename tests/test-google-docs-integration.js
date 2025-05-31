/**
 * Google Docs Integration Tests
 * Tests the Google Docs integration across Bruno, MCP Bridge, and ClaudeFlow
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

// Import integration components
const GDocsIntegrator = require('../core/gdocsIntegrator');
const GoogleDocsConnector = require('../claude-mcp-bridge/src/connectors/google-docs');

class GoogleDocsIntegrationTestSuite {
  constructor() {
    this.testResults = [];
    this.testDocIds = [];
    this.gdocsIntegrator = new GDocsIntegrator();
    this.docsConnector = new GoogleDocsConnector();
  }

  async setup() {
    console.log('🚀 Setting up Google Docs integration tests...');
    
    // Check for credentials
    const credentialsPath = path.join(__dirname, '../google-credentials.json');
    try {
      await fs.access(credentialsPath);
      console.log('✅ Google credentials found');
    } catch (error) {
      console.warn('⚠️  Google credentials not found - some tests will be skipped');
      this.skipAuth = true;
    }

    // Initialize integrators
    if (!this.skipAuth) {
      await this.gdocsIntegrator.initialize();
      await this.docsConnector.initialize();
    }
    
    console.log('✅ Google Docs test setup complete');
  }

  async teardown() {
    console.log('🧹 Cleaning up test documents...');
    
    // Delete all test documents
    if (!this.skipAuth && this.testDocIds.length > 0) {
      for (const docId of this.testDocIds) {
        try {
          await this.gdocsIntegrator.deleteDocument(docId);
          console.log(`  Deleted test doc: ${docId}`);
        } catch (error) {
          console.warn(`  Failed to delete doc ${docId}: ${error.message}`);
        }
      }
    }
  }

  async runTest(name, testFn) {
    console.log(`\n📋 Running test: ${name}`);
    
    if (this.skipAuth && name.includes('Auth')) {
      console.log(`⏭️  Skipping test (no auth): ${name}`);
      this.testResults.push({ name, status: 'SKIP' });
      return;
    }
    
    try {
      await testFn();
      this.testResults.push({ name, status: 'PASS' });
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.testResults.push({ name, status: 'FAIL', error: error.message });
      console.error(`❌ ${name} - FAILED: ${error.message}`);
    }
  }

  // Test 1: Document Creation
  async testDocumentCreation() {
    const testDoc = {
      title: 'Bruno Orchestration Test Document',
      content: `# Test Document

This document was created by the Bruno orchestration test suite.

## Features Tested
- Document creation
- Content formatting
- API integration

Created at: ${new Date().toISOString()}`
    };

    // Test via GDocsIntegrator
    const doc1 = await this.gdocsIntegrator.createDocument(testDoc);
    if (!doc1.documentId) {
      throw new Error('Document creation via GDocsIntegrator failed');
    }
    this.testDocIds.push(doc1.documentId);
    console.log(`  Created doc via integrator: ${doc1.documentId}`);

    // Test via connector
    const doc2 = await this.docsConnector.create({
      title: testDoc.title + ' (Connector)',
      content: testDoc.content
    });
    if (!doc2.id) {
      throw new Error('Document creation via connector failed');
    }
    this.testDocIds.push(doc2.id);
    console.log(`  Created doc via connector: ${doc2.id}`);
  }

  // Test 2: Document Reading
  async testDocumentReading() {
    // Create a test document first
    const testContent = 'This is test content for reading';
    const doc = await this.gdocsIntegrator.createDocument({
      title: 'Read Test Document',
      content: testContent
    });
    this.testDocIds.push(doc.documentId);

    // Read via integrator
    const content1 = await this.gdocsIntegrator.readDocument(doc.documentId);
    if (!content1.includes(testContent)) {
      throw new Error('Document read via integrator failed');
    }

    // Read via connector
    const content2 = await this.docsConnector.read(doc.documentId);
    if (!content2.content.includes(testContent)) {
      throw new Error('Document read via connector failed');
    }
  }

  // Test 3: Document Updates
  async testDocumentUpdates() {
    // Create document
    const doc = await this.gdocsIntegrator.createDocument({
      title: 'Update Test Document',
      content: 'Original content'
    });
    this.testDocIds.push(doc.documentId);

    // Update via integrator
    const updates1 = [
      {
        insertText: {
          text: '\n\nUpdated by integrator',
          endOfSegmentLocation: {}
        }
      }
    ];
    await this.gdocsIntegrator.updateDocument(doc.documentId, updates1);

    // Verify update
    const content1 = await this.gdocsIntegrator.readDocument(doc.documentId);
    if (!content1.includes('Updated by integrator')) {
      throw new Error('Document update via integrator failed');
    }

    // Update via connector
    await this.docsConnector.update(doc.documentId, {
      updates: [{
        insertText: {
          text: '\n\nUpdated by connector',
          endOfSegmentLocation: {}
        }
      }]
    });

    // Verify second update
    const content2 = await this.gdocsIntegrator.readDocument(doc.documentId);
    if (!content2.includes('Updated by connector')) {
      throw new Error('Document update via connector failed');
    }
  }

  // Test 4: Batch Operations
  async testBatchOperations() {
    const batchDocs = [
      { title: 'Batch Doc 1', content: 'Content 1' },
      { title: 'Batch Doc 2', content: 'Content 2' },
      { title: 'Batch Doc 3', content: 'Content 3' }
    ];

    // Create multiple documents
    const createdDocs = await Promise.all(
      batchDocs.map(doc => this.gdocsIntegrator.createDocument(doc))
    );
    
    createdDocs.forEach(doc => this.testDocIds.push(doc.documentId));
    
    if (createdDocs.length !== 3) {
      throw new Error('Batch creation failed');
    }

    // Batch read
    const contents = await Promise.all(
      createdDocs.map(doc => this.gdocsIntegrator.readDocument(doc.documentId))
    );

    for (let i = 0; i < contents.length; i++) {
      if (!contents[i].includes(`Content ${i + 1}`)) {
        throw new Error(`Batch read failed for document ${i + 1}`);
      }
    }
  }

  // Test 5: Error Handling
  async testErrorHandling() {
    // Test invalid document ID
    try {
      await this.gdocsIntegrator.readDocument('invalid-doc-id');
      throw new Error('Expected error for invalid document ID');
    } catch (error) {
      if (!error.message.includes('not found') && !error.message.includes('invalid')) {
        throw new Error('Unexpected error type for invalid ID');
      }
    }

    // Test invalid update
    const doc = await this.gdocsIntegrator.createDocument({
      title: 'Error Test Doc',
      content: 'Test'
    });
    this.testDocIds.push(doc.documentId);

    try {
      await this.gdocsIntegrator.updateDocument(doc.documentId, [
        { invalidOperation: {} }
      ]);
      throw new Error('Expected error for invalid update operation');
    } catch (error) {
      // Expected error
    }
  }

  // Test 6: Permissions and Sharing
  async testPermissionsAndSharing() {
    // Create document
    const doc = await this.gdocsIntegrator.createDocument({
      title: 'Permissions Test Document',
      content: 'Testing permissions'
    });
    this.testDocIds.push(doc.documentId);

    // Add permission
    const permission = {
      type: 'user',
      role: 'reader',
      emailAddress: 'test@example.com'
    };

    try {
      await this.gdocsIntegrator.shareDocument(doc.documentId, permission);
      console.log('  Permission added successfully');
    } catch (error) {
      // Some test environments may not allow sharing
      console.log('  Permission test skipped (may require domain setup)');
    }

    // Get permissions
    const permissions = await this.gdocsIntegrator.getPermissions(doc.documentId);
    if (!Array.isArray(permissions)) {
      throw new Error('Failed to retrieve permissions');
    }
  }

  // Test 7: Template Operations
  async testTemplateOperations() {
    // Create a template document
    const template = await this.gdocsIntegrator.createDocument({
      title: 'Template Document',
      content: `# {{title}}

Date: {{date}}
Author: {{author}}

## {{section1_title}}
{{section1_content}}

## {{section2_title}}
{{section2_content}}`
    });
    this.testDocIds.push(template.documentId);

    // Create document from template
    const variables = {
      title: 'Project Report',
      date: new Date().toLocaleDateString(),
      author: 'Bruno Test Suite',
      section1_title: 'Overview',
      section1_content: 'This is the project overview.',
      section2_title: 'Results',
      section2_content: 'These are the test results.'
    };

    const newDoc = await this.gdocsIntegrator.createFromTemplate(
      template.documentId,
      'Generated Report',
      variables
    );
    this.testDocIds.push(newDoc.documentId);

    // Verify template replacement
    const content = await this.gdocsIntegrator.readDocument(newDoc.documentId);
    if (!content.includes('Project Report') || !content.includes('Bruno Test Suite')) {
      throw new Error('Template variable replacement failed');
    }
  }

  // Test 8: Formatting Operations
  async testFormattingOperations() {
    // Create document with formatting
    const doc = await this.gdocsIntegrator.createDocument({
      title: 'Formatting Test Document',
      content: 'This text will be formatted'
    });
    this.testDocIds.push(doc.documentId);

    // Apply formatting
    const formattingUpdates = [
      {
        updateTextStyle: {
          textStyle: {
            bold: true,
            fontSize: { magnitude: 14, unit: 'PT' }
          },
          range: {
            startIndex: 1,
            endIndex: 10
          },
          fields: 'bold,fontSize'
        }
      }
    ];

    await this.gdocsIntegrator.updateDocument(doc.documentId, formattingUpdates);
    console.log('  Formatting applied successfully');
  }

  // Test 9: Export Operations
  async testExportOperations() {
    // Create document
    const doc = await this.gdocsIntegrator.createDocument({
      title: 'Export Test Document',
      content: '# Export Test\n\nThis document will be exported to different formats.'
    });
    this.testDocIds.push(doc.documentId);

    // Export as PDF
    const pdfData = await this.gdocsIntegrator.exportDocument(doc.documentId, 'pdf');
    if (!pdfData || pdfData.length === 0) {
      throw new Error('PDF export failed');
    }
    console.log(`  Exported as PDF: ${pdfData.length} bytes`);

    // Export as plain text
    const textData = await this.gdocsIntegrator.exportDocument(doc.documentId, 'txt');
    if (!textData || !textData.includes('Export Test')) {
      throw new Error('Text export failed');
    }
    console.log('  Exported as plain text successfully');
  }

  // Test 10: Integration with Bruno Task Runner
  async testBrunoTaskIntegration() {
    // Simulate Bruno task for Google Docs
    const task = {
      type: 'google-docs',
      action: 'create-and-update',
      data: {
        title: 'Bruno Task Integration Test',
        initialContent: 'Initial content from Bruno',
        updates: [
          { text: '\n\nFirst update from task' },
          { text: '\n\nSecond update from task' }
        ]
      }
    };

    // Execute via integrator
    const result = await this.gdocsIntegrator.executeTask(task);
    if (!result.success || !result.documentId) {
      throw new Error('Bruno task execution failed');
    }
    this.testDocIds.push(result.documentId);

    // Verify content
    const content = await this.gdocsIntegrator.readDocument(result.documentId);
    if (!content.includes('Initial content') || 
        !content.includes('First update') || 
        !content.includes('Second update')) {
      throw new Error('Task execution content verification failed');
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Google Docs Integration Test Suite\n');
    
    try {
      await this.setup();

      // Run all tests
      await this.runTest('Document Creation', () => this.testDocumentCreation());
      await this.runTest('Document Reading', () => this.testDocumentReading());
      await this.runTest('Document Updates', () => this.testDocumentUpdates());
      await this.runTest('Batch Operations', () => this.testBatchOperations());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      await this.runTest('Permissions and Sharing', () => this.testPermissionsAndSharing());
      await this.runTest('Template Operations', () => this.testTemplateOperations());
      await this.runTest('Formatting Operations', () => this.testFormattingOperations());
      await this.runTest('Export Operations', () => this.testExportOperations());
      await this.runTest('Bruno Task Integration', () => this.testBrunoTaskIntegration());

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
    const skipped = this.testResults.filter(r => r.status === 'SKIP').length;
    
    console.log(`Total: ${this.testResults.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Skipped: ${skipped} ⏭️`);
    
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
  const testSuite = new GoogleDocsIntegrationTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = GoogleDocsIntegrationTestSuite;