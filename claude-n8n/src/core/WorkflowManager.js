/**
 * WorkflowManager - Manages workflow definitions and storage
 * Handles workflow CRUD operations and persistence
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class WorkflowManager {
  constructor(workflowsDir, logger) {
    this.workflowsDir = workflowsDir;
    this.logger = logger;
    this.workflows = new Map();
    this.activeWorkflows = new Set();
  }

  async loadWorkflows() {
    try {
      await fs.ensureDir(this.workflowsDir);
      const files = await fs.readdir(this.workflowsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const workflowPath = path.join(this.workflowsDir, file);
            const workflow = await fs.readJson(workflowPath);
            this.workflows.set(workflow.id, workflow);
            this.logger.info(`Loaded workflow: ${workflow.name} (${workflow.id})`);
          } catch (error) {
            this.logger.warn(`Failed to load workflow ${file}:`, error);
          }
        }
      }

      this.logger.info(`Loaded ${this.workflows.size} workflows`);
      
      // Load default Claude-GDocs workflow if no workflows exist
      if (this.workflows.size === 0) {
        await this.createDefaultWorkflow();
      }
      
    } catch (error) {
      this.logger.error('Failed to load workflows:', error);
    }
  }

  async createWorkflow(workflowData) {
    const workflowId = workflowData.id || uuidv4();
    
    const workflow = {
      id: workflowId,
      name: workflowData.name || 'Untitled Workflow',
      description: workflowData.description || '',
      active: workflowData.active || false,
      nodes: workflowData.nodes || [],
      connections: workflowData.connections || [],
      settings: workflowData.settings || {},
      tags: workflowData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      ...workflowData
    };

    // Save to disk
    await this.saveWorkflow(workflow);
    
    // Store in memory
    this.workflows.set(workflowId, workflow);
    
    this.logger.info(`Created workflow: ${workflow.name} (${workflowId})`);
    return workflow;
  }

  async updateWorkflow(workflowId, updates) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      id: workflowId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
      version: (workflow.version || 1) + 1
    };

    // Save to disk
    await this.saveWorkflow(updatedWorkflow);
    
    // Update in memory
    this.workflows.set(workflowId, updatedWorkflow);
    
    this.logger.info(`Updated workflow: ${updatedWorkflow.name} (${workflowId})`);
    return updatedWorkflow;
  }

  async deleteWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Remove from disk
    const workflowPath = path.join(this.workflowsDir, `${workflowId}.json`);
    await fs.remove(workflowPath);
    
    // Remove from memory
    this.workflows.delete(workflowId);
    this.activeWorkflows.delete(workflowId);
    
    this.logger.info(`Deleted workflow: ${workflow.name} (${workflowId})`);
    return true;
  }

  async saveWorkflow(workflow) {
    const workflowPath = path.join(this.workflowsDir, `${workflow.id}.json`);
    await fs.writeJson(workflowPath, workflow, { spaces: 2 });
  }

  getWorkflow(workflowId) {
    return this.workflows.get(workflowId);
  }

  getAllWorkflows() {
    return Array.from(this.workflows.values());
  }

  getActiveWorkflows() {
    return Array.from(this.workflows.values()).filter(w => w.active);
  }

  async activateWorkflow(workflowId) {
    const workflow = await this.updateWorkflow(workflowId, { active: true });
    this.activeWorkflows.add(workflowId);
    this.logger.info(`Activated workflow: ${workflow.name} (${workflowId})`);
    return workflow;
  }

  async deactivateWorkflow(workflowId) {
    const workflow = await this.updateWorkflow(workflowId, { active: false });
    this.activeWorkflows.delete(workflowId);
    this.logger.info(`Deactivated workflow: ${workflow.name} (${workflowId})`);
    return workflow;
  }

  async duplicateWorkflow(workflowId, newName) {
    const originalWorkflow = this.workflows.get(workflowId);
    if (!originalWorkflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const duplicatedWorkflow = {
      ...originalWorkflow,
      id: uuidv4(),
      name: newName || `${originalWorkflow.name} (Copy)`,
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    return await this.createWorkflow(duplicatedWorkflow);
  }

  async exportWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Remove runtime-specific data for export
    const exportData = {
      ...workflow,
      id: undefined, // Will be regenerated on import
      createdAt: undefined,
      updatedAt: undefined,
      active: false
    };

    return exportData;
  }

  async importWorkflow(workflowData, options = {}) {
    const workflow = {
      ...workflowData,
      id: options.keepId ? workflowData.id : uuidv4(),
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    return await this.createWorkflow(workflow);
  }

  async createDefaultWorkflow() {
    const defaultWorkflow = {
      id: 'claude-gdocs-sync-default',
      name: 'Claude ↔ Google Docs Sync',
      description: 'Default workflow for syncing Claude output with Google Docs',
      active: true,
      nodes: [
        {
          id: 'claude-watcher',
          name: 'Watch Claude Output',
          type: 'claude',
          position: [100, 100],
          parameters: {
            operation: 'watch-output',
            claudeSyncDir: '~/claude/sync',
            timeout: 30000
          }
        },
        {
          id: 'process-content',
          name: 'Process Content',
          type: 'function',
          position: [300, 100],
          parameters: {
            functionCode: `
              // Process Claude output for Google Docs
              const input = $input.first();
              return {
                content: input.content,
                documentId: input.metadata.documentId || process.env.CLAUDE_DEFAULT_DOC_ID,
                operation: input.metadata.operation || 'append',
                title: input.metadata.title || 'Claude Output ' + new Date().toLocaleString()
              };
            `
          }
        },
        {
          id: 'update-gdoc',
          name: 'Update Google Doc',
          type: 'googleDocs',
          position: [500, 100],
          parameters: {
            operation: 'update'
          }
        }
      ],
      connections: [
        {
          source: 'claude-watcher',
          sourceOutput: 'main',
          target: 'process-content',
          targetInput: 'main'
        },
        {
          source: 'process-content',
          sourceOutput: 'main',
          target: 'update-gdoc',
          targetInput: 'main'
        }
      ],
      settings: {
        timezone: 'America/New_York',
        saveDataErrorExecution: 'all',
        saveDataSuccessExecution: 'all',
        saveManualExecutions: true
      },
      tags: ['claude', 'google-docs', 'sync']
    };

    await this.createWorkflow(defaultWorkflow);
    this.logger.info('Created default Claude ↔ Google Docs workflow');
  }

  // Workflow validation
  validateWorkflow(workflow) {
    const errors = [];

    if (!workflow.name || workflow.name.trim() === '') {
      errors.push('Workflow name is required');
    }

    if (!Array.isArray(workflow.nodes)) {
      errors.push('Workflow must have nodes array');
    }

    if (!Array.isArray(workflow.connections)) {
      errors.push('Workflow must have connections array');
    }

    // Validate nodes
    for (const node of workflow.nodes) {
      if (!node.id || !node.type) {
        errors.push(`Node missing id or type: ${JSON.stringify(node)}`);
      }
    }

    // Validate connections
    for (const connection of workflow.connections) {
      if (!connection.source || !connection.target) {
        errors.push(`Connection missing source or target: ${JSON.stringify(connection)}`);
      }

      // Check if referenced nodes exist
      const sourceExists = workflow.nodes.some(n => n.id === connection.source);
      const targetExists = workflow.nodes.some(n => n.id === connection.target);

      if (!sourceExists) {
        errors.push(`Connection references non-existent source node: ${connection.source}`);
      }

      if (!targetExists) {
        errors.push(`Connection references non-existent target node: ${connection.target}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // Workflow statistics
  getWorkflowStats() {
    const workflows = Array.from(this.workflows.values());
    
    return {
      total: workflows.length,
      active: workflows.filter(w => w.active).length,
      inactive: workflows.filter(w => !w.active).length,
      byType: this.getNodeTypeStats(workflows),
      recentlyModified: workflows
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5)
        .map(w => ({ id: w.id, name: w.name, updatedAt: w.updatedAt }))
    };
  }

  getNodeTypeStats(workflows) {
    const nodeTypes = {};
    
    for (const workflow of workflows) {
      for (const node of workflow.nodes) {
        nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
      }
    }
    
    return nodeTypes;
  }
}

module.exports = WorkflowManager;