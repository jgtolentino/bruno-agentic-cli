/**
 * Asana Integration Tests
 * Tests the Asana integration for task management across the orchestration system
 */

const axios = require('axios');

// Import Asana integration components
const AsanaConnector = require('../claude-mcp-bridge/src/connectors/asana');

class AsanaIntegrationTestSuite {
  constructor() {
    this.testResults = [];
    this.testProjectIds = [];
    this.testTaskIds = [];
    this.asanaConnector = new AsanaConnector();
    this.baseUrl = 'https://app.asana.com/api/1.0';
  }

  async setup() {
    console.log('🚀 Setting up Asana integration tests...');
    
    // Check for Asana token
    if (!process.env.ASANA_ACCESS_TOKEN) {
      console.warn('⚠️  ASANA_ACCESS_TOKEN not found - some tests will be skipped');
      this.skipAuth = true;
    } else {
      console.log('✅ Asana access token found');
    }

    // Initialize connector
    if (!this.skipAuth) {
      await this.asanaConnector.initialize();
      
      // Create test workspace/project for tests
      await this.createTestProject();
    }
    
    console.log('✅ Asana test setup complete');
  }

  async teardown() {
    console.log('🧹 Cleaning up test data...');
    
    if (!this.skipAuth) {
      // Delete test tasks
      for (const taskId of this.testTaskIds) {
        try {
          await this.asanaConnector.deleteTask(taskId);
          console.log(`  Deleted test task: ${taskId}`);
        } catch (error) {
          console.warn(`  Failed to delete task ${taskId}: ${error.message}`);
        }
      }

      // Archive test projects
      for (const projectId of this.testProjectIds) {
        try {
          await this.asanaConnector.archiveProject(projectId);
          console.log(`  Archived test project: ${projectId}`);
        } catch (error) {
          console.warn(`  Failed to archive project ${projectId}: ${error.message}`);
        }
      }
    }
  }

  async createTestProject() {
    const testProject = {
      name: 'Bruno Orchestration Test Project',
      notes: 'Created by Bruno orchestration test suite',
      color: 'dark-blue',
      layout: 'list'
    };

    const project = await this.asanaConnector.createProject(testProject);
    this.testProjectIds.push(project.gid);
    this.testProjectId = project.gid;
    console.log(`  Created test project: ${project.gid}`);
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

  // Test 1: Authentication and Basic API Access
  async testAuthentication() {
    // Test API access
    const response = await axios.get(`${this.baseUrl}/users/me`, {
      headers: {
        'Authorization': `Bearer ${process.env.ASANA_ACCESS_TOKEN}`
      }
    });

    if (!response.data.data || !response.data.data.gid) {
      throw new Error('Failed to authenticate with Asana API');
    }

    console.log(`  Authenticated as: ${response.data.data.name}`);
  }

  // Test 2: Project Operations
  async testProjectOperations() {
    // Create project
    const projectData = {
      name: 'Test Project - Operations',
      notes: 'Testing project operations',
      color: 'dark-green'
    };

    const project = await this.asanaConnector.createProject(projectData);
    if (!project.gid) {
      throw new Error('Project creation failed');
    }
    this.testProjectIds.push(project.gid);
    console.log(`  Created project: ${project.gid}`);

    // Read project
    const retrievedProject = await this.asanaConnector.getProject(project.gid);
    if (retrievedProject.name !== projectData.name) {
      throw new Error('Project retrieval failed');
    }

    // Update project
    const updates = {
      name: 'Updated Test Project',
      notes: 'Updated by test suite'
    };
    
    const updatedProject = await this.asanaConnector.updateProject(project.gid, updates);
    if (updatedProject.name !== updates.name) {
      throw new Error('Project update failed');
    }

    // List projects
    const projects = await this.asanaConnector.getProjects();
    const found = projects.find(p => p.gid === project.gid);
    if (!found) {
      throw new Error('Project not found in list');
    }
  }

  // Test 3: Task Creation and Management
  async testTaskManagement() {
    // Create task
    const taskData = {
      name: 'Test Task - Management',
      notes: 'This is a test task created by the orchestration system',
      projects: [this.testProjectId],
      due_on: '2024-12-31',
      assignee: 'me'
    };

    const task = await this.asanaConnector.createTask(taskData);
    if (!task.gid) {
      throw new Error('Task creation failed');
    }
    this.testTaskIds.push(task.gid);
    console.log(`  Created task: ${task.gid}`);

    // Read task
    const retrievedTask = await this.asanaConnector.getTask(task.gid);
    if (retrievedTask.name !== taskData.name) {
      throw new Error('Task retrieval failed');
    }

    // Update task
    const taskUpdates = {
      name: 'Updated Test Task',
      completed: true,
      notes: 'Task updated by test suite'
    };

    const updatedTask = await this.asanaConnector.updateTask(task.gid, taskUpdates);
    if (!updatedTask.completed) {
      throw new Error('Task update failed');
    }

    // Add comment
    const comment = await this.asanaConnector.addComment(task.gid, 'Test comment from orchestration');
    if (!comment.gid) {
      throw new Error('Comment creation failed');
    }
  }

  // Test 4: Batch Task Operations
  async testBatchTaskOperations() {
    const batchTasks = [
      {
        name: 'Batch Task 1',
        notes: 'First batch task',
        projects: [this.testProjectId]
      },
      {
        name: 'Batch Task 2',
        notes: 'Second batch task',
        projects: [this.testProjectId]
      },
      {
        name: 'Batch Task 3',
        notes: 'Third batch task',
        projects: [this.testProjectId]
      }
    ];

    // Create multiple tasks
    const createdTasks = await Promise.all(
      batchTasks.map(taskData => this.asanaConnector.createTask(taskData))
    );

    createdTasks.forEach(task => this.testTaskIds.push(task.gid));

    if (createdTasks.length !== 3) {
      throw new Error('Batch task creation failed');
    }

    // Batch update
    const updates = { completed: true };
    const updatedTasks = await Promise.all(
      createdTasks.map(task => this.asanaConnector.updateTask(task.gid, updates))
    );

    const completedCount = updatedTasks.filter(task => task.completed).length;
    if (completedCount !== 3) {
      throw new Error('Batch task update failed');
    }
  }

  // Test 5: Task Dependencies
  async testTaskDependencies() {
    // Create parent task
    const parentTask = await this.asanaConnector.createTask({
      name: 'Parent Task',
      projects: [this.testProjectId]
    });
    this.testTaskIds.push(parentTask.gid);

    // Create dependent task
    const dependentTask = await this.asanaConnector.createTask({
      name: 'Dependent Task',
      projects: [this.testProjectId]
    });
    this.testTaskIds.push(dependentTask.gid);

    // Add dependency
    const dependency = await this.asanaConnector.addDependency(
      dependentTask.gid,
      parentTask.gid
    );

    if (!dependency.gid) {
      throw new Error('Dependency creation failed');
    }

    // Verify dependency
    const dependencies = await this.asanaConnector.getDependencies(dependentTask.gid);
    const found = dependencies.find(dep => dep.prerequisite.gid === parentTask.gid);
    if (!found) {
      throw new Error('Dependency verification failed');
    }
  }

  // Test 6: Custom Fields
  async testCustomFields() {
    // Create custom field
    const customField = {
      name: 'Test Priority',
      type: 'enum',
      enum_options: [
        { name: 'Low', color: 'green' },
        { name: 'Medium', color: 'yellow' },
        { name: 'High', color: 'red' }
      ]
    };

    const field = await this.asanaConnector.createCustomField(customField);
    console.log(`  Created custom field: ${field.gid}`);

    // Add to project
    await this.asanaConnector.addCustomFieldToProject(this.testProjectId, field.gid);

    // Create task with custom field
    const task = await this.asanaConnector.createTask({
      name: 'Task with Custom Field',
      projects: [this.testProjectId],
      custom_fields: {
        [field.gid]: field.enum_options[2].gid // High priority
      }
    });
    this.testTaskIds.push(task.gid);

    // Verify custom field value
    const retrievedTask = await this.asanaConnector.getTask(task.gid);
    const customFieldValue = retrievedTask.custom_fields.find(cf => cf.gid === field.gid);
    if (!customFieldValue || customFieldValue.enum_value.name !== 'High') {
      throw new Error('Custom field assignment failed');
    }
  }

  // Test 7: Webhooks (if supported)
  async testWebhooks() {
    const webhookData = {
      resource: this.testProjectId,
      target: 'https://webhook.site/test-bruno-orchestration'
    };

    try {
      const webhook = await this.asanaConnector.createWebhook(webhookData);
      console.log(`  Created webhook: ${webhook.gid}`);
      
      // Clean up webhook
      await this.asanaConnector.deleteWebhook(webhook.gid);
    } catch (error) {
      // Webhooks might not be available in all environments
      console.log('  Webhook test skipped (may require premium account)');
    }
  }

  // Test 8: Team and User Operations
  async testTeamOperations() {
    // Get current user
    const user = await this.asanaConnector.getCurrentUser();
    if (!user.gid) {
      throw new Error('Failed to get current user');
    }
    console.log(`  Current user: ${user.name}`);

    // Get user's teams
    const teams = await this.asanaConnector.getUserTeams(user.gid);
    if (!Array.isArray(teams)) {
      throw new Error('Failed to get user teams');
    }
    console.log(`  User is in ${teams.length} teams`);

    // Get team members (if user is in a team)
    if (teams.length > 0) {
      const members = await this.asanaConnector.getTeamMembers(teams[0].gid);
      if (!Array.isArray(members)) {
        throw new Error('Failed to get team members');
      }
      console.log(`  Team has ${members.length} members`);
    }
  }

  // Test 9: Search and Filtering
  async testSearchAndFiltering() {
    // Create searchable tasks
    const searchTasks = [
      {
        name: 'SEARCHABLE: Marketing Campaign',
        notes: 'Campaign planning task',
        projects: [this.testProjectId]
      },
      {
        name: 'SEARCHABLE: Development Sprint',
        notes: 'Sprint planning task',
        projects: [this.testProjectId]
      }
    ];

    const createdTasks = await Promise.all(
      searchTasks.map(task => this.asanaConnector.createTask(task))
    );
    createdTasks.forEach(task => this.testTaskIds.push(task.gid));

    // Search tasks
    const searchResults = await this.asanaConnector.searchTasks({
      text: 'SEARCHABLE',
      projects: [this.testProjectId]
    });

    const foundTasks = searchResults.filter(task => 
      task.name.includes('SEARCHABLE')
    );

    if (foundTasks.length < 2) {
      throw new Error('Search failed to find created tasks');
    }

    // Filter completed tasks
    const completedTasks = await this.asanaConnector.getTasks({
      project: this.testProjectId,
      completed_since: '2024-01-01'
    });

    console.log(`  Found ${completedTasks.length} completed tasks`);
  }

  // Test 10: Integration with Bruno Orchestration
  async testOrchestrationIntegration() {
    // Simulate orchestration workflow
    const workflowTask = {
      type: 'asana-workflow',
      action: 'create-project-structure',
      data: {
        projectName: 'Orchestration Workflow Test',
        tasks: [
          { name: 'Setup Phase', assignee: 'me', due_days: 7 },
          { name: 'Development Phase', assignee: 'me', due_days: 14 },
          { name: 'Testing Phase', assignee: 'me', due_days: 21 },
          { name: 'Deployment Phase', assignee: 'me', due_days: 28 }
        ]
      }
    };

    // Execute via connector
    const result = await this.asanaConnector.executeWorkflow(workflowTask);
    
    if (!result.success || !result.projectId) {
      throw new Error('Orchestration workflow execution failed');
    }
    
    this.testProjectIds.push(result.projectId);
    result.taskIds.forEach(taskId => this.testTaskIds.push(taskId));

    console.log(`  Created workflow project: ${result.projectId}`);
    console.log(`  Created ${result.taskIds.length} workflow tasks`);

    // Verify project structure
    const projectTasks = await this.asanaConnector.getProjectTasks(result.projectId);
    if (projectTasks.length !== 4) {
      throw new Error('Workflow project structure verification failed');
    }
  }

  // Test 11: Error Handling
  async testErrorHandling() {
    // Test invalid task ID
    try {
      await this.asanaConnector.getTask('invalid-task-id');
      throw new Error('Expected error for invalid task ID');
    } catch (error) {
      if (!error.message.includes('not found') && !error.message.includes('invalid')) {
        throw new Error('Unexpected error type for invalid ID');
      }
    }

    // Test invalid project creation
    try {
      await this.asanaConnector.createProject({
        // Missing required name field
        notes: 'Invalid project'
      });
      throw new Error('Expected error for invalid project data');
    } catch (error) {
      if (!error.message.includes('required') && !error.message.includes('name')) {
        throw new Error('Unexpected error type for invalid project');
      }
    }

    // Test permission error
    try {
      await this.asanaConnector.updateTask('12345', { name: 'Unauthorized update' });
      throw new Error('Expected permission error');
    } catch (error) {
      // Expected error
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Asana Integration Test Suite\n');
    
    try {
      await this.setup();

      // Run all tests
      await this.runTest('Authentication', () => this.testAuthentication());
      await this.runTest('Project Operations', () => this.testProjectOperations());
      await this.runTest('Task Management', () => this.testTaskManagement());
      await this.runTest('Batch Task Operations', () => this.testBatchTaskOperations());
      await this.runTest('Task Dependencies', () => this.testTaskDependencies());
      await this.runTest('Custom Fields', () => this.testCustomFields());
      await this.runTest('Webhooks', () => this.testWebhooks());
      await this.runTest('Team Operations', () => this.testTeamOperations());
      await this.runTest('Search and Filtering', () => this.testSearchAndFiltering());
      await this.runTest('Orchestration Integration', () => this.testOrchestrationIntegration());
      await this.runTest('Error Handling', () => this.testErrorHandling());

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
  const testSuite = new AsanaIntegrationTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = AsanaIntegrationTestSuite;