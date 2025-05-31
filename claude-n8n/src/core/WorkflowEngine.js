/**
 * WorkflowEngine - Core workflow execution engine
 * Handles node execution, data flow, and workflow orchestration
 */

const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class WorkflowEngine extends EventEmitter {
  constructor(dataDir, logger, io) {
    super();
    this.dataDir = dataDir;
    this.logger = logger;
    this.io = io;
    this.nodes = new Map();
    this.activeExecutions = new Map();
    this.executionHistory = [];
    this.maxHistorySize = 1000;
  }

  registerNode(type, nodeClass) {
    this.nodes.set(type, nodeClass);
    this.logger.info(`Registered node type: ${type}`);
  }

  async executeWorkflow(workflowId, triggerData = {}, options = {}) {
    const executionId = uuidv4();
    const startTime = Date.now();

    this.logger.info(`Starting workflow execution: ${executionId} for workflow: ${workflowId}`);

    try {
      // Load workflow definition
      const workflowPath = path.join(this.dataDir, 'workflows', `${workflowId}.json`);
      const workflowData = await fs.readJson(workflowPath);

      // Create execution context
      const execution = {
        id: executionId,
        workflowId: workflowId,
        status: 'running',
        startTime: new Date().toISOString(),
        endTime: null,
        triggerData: triggerData,
        nodeResults: new Map(),
        errors: [],
        data: new Map(),
        options: options
      };

      this.activeExecutions.set(executionId, execution);

      // Emit execution started event
      this.emit('execution-started', { executionId, workflowId });
      this.io.emit('workflow-execution-update', {
        executionId,
        status: 'running',
        progress: 0
      });

      // Execute workflow nodes
      const result = await this.executeNodes(workflowData, execution);

      // Complete execution
      execution.status = 'completed';
      execution.endTime = new Date().toISOString();
      execution.duration = Date.now() - startTime;
      execution.result = result;

      // Save execution history
      await this.saveExecution(execution);

      // Cleanup
      this.activeExecutions.delete(executionId);

      this.logger.info(`Workflow execution completed: ${executionId} in ${execution.duration}ms`);

      // Emit completion event
      this.emit('execution-completed', { executionId, result });
      this.io.emit('workflow-execution-update', {
        executionId,
        status: 'completed',
        progress: 100,
        result: result
      });

      return result;

    } catch (error) {
      this.logger.error(`Workflow execution failed: ${executionId}`, error);

      // Update execution with error
      const execution = this.activeExecutions.get(executionId);
      if (execution) {
        execution.status = 'failed';
        execution.endTime = new Date().toISOString();
        execution.duration = Date.now() - startTime;
        execution.error = error.message;
        execution.errors.push({
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });

        await this.saveExecution(execution);
        this.activeExecutions.delete(executionId);
      }

      // Emit error event
      this.emit('execution-failed', { executionId, error });
      this.io.emit('workflow-execution-update', {
        executionId,
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }

  async executeNodes(workflowData, execution) {
    const { nodes, connections } = workflowData;
    const executedNodes = new Set();
    const nodeResults = new Map();

    // Find trigger nodes (nodes with no incoming connections)
    const triggerNodes = nodes.filter(node => {
      return !connections.some(conn => conn.target === node.id);
    });

    if (triggerNodes.length === 0) {
      throw new Error('No trigger nodes found in workflow');
    }

    // Execute nodes in dependency order
    for (const triggerNode of triggerNodes) {
      await this.executeNodeRecursive(
        triggerNode,
        nodes,
        connections,
        execution,
        executedNodes,
        nodeResults
      );
    }

    return {
      executionId: execution.id,
      nodeResults: Object.fromEntries(nodeResults),
      finalResult: this.getFinalResult(nodeResults, nodes)
    };
  }

  async executeNodeRecursive(node, allNodes, connections, execution, executedNodes, nodeResults) {
    // Skip if already executed
    if (executedNodes.has(node.id)) {
      return nodeResults.get(node.id);
    }

    this.logger.info(`Executing node: ${node.id} (${node.type})`);

    try {
      // Get input data from connected nodes
      const inputData = await this.getNodeInputData(
        node,
        connections,
        allNodes,
        execution,
        executedNodes,
        nodeResults
      );

      // Get node class
      const NodeClass = this.nodes.get(node.type);
      if (!NodeClass) {
        throw new Error(`Unknown node type: ${node.type}`);
      }

      // Create and execute node instance
      const nodeInstance = new NodeClass(node.parameters || {}, this.logger);
      const result = await nodeInstance.execute(inputData, execution);

      // Store result
      nodeResults.set(node.id, result);
      execution.nodeResults.set(node.id, result);
      executedNodes.add(node.id);

      // Emit progress update
      const progress = Math.round((executedNodes.size / allNodes.length) * 100);
      this.io.emit('workflow-execution-update', {
        executionId: execution.id,
        progress: progress,
        nodeUpdate: {
          nodeId: node.id,
          status: 'completed',
          result: result
        }
      });

      this.logger.info(`Node executed successfully: ${node.id}`);
      return result;

    } catch (error) {
      this.logger.error(`Node execution failed: ${node.id}`, error);
      
      // Store error
      const errorResult = {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      
      nodeResults.set(node.id, errorResult);
      execution.errors.push({
        nodeId: node.id,
        ...errorResult
      });

      // Emit error update
      this.io.emit('workflow-execution-update', {
        executionId: execution.id,
        nodeUpdate: {
          nodeId: node.id,
          status: 'failed',
          error: error.message
        }
      });

      throw error;
    }
  }

  async getNodeInputData(node, connections, allNodes, execution, executedNodes, nodeResults) {
    const inputConnections = connections.filter(conn => conn.target === node.id);
    const inputData = {};

    for (const connection of inputConnections) {
      // Find source node
      const sourceNode = allNodes.find(n => n.id === connection.source);
      if (!sourceNode) {
        throw new Error(`Source node not found: ${connection.source}`);
      }

      // Execute source node if not already executed
      if (!executedNodes.has(sourceNode.id)) {
        await this.executeNodeRecursive(
          sourceNode,
          allNodes,
          connections,
          execution,
          executedNodes,
          nodeResults
        );
      }

      // Get result from source node
      const sourceResult = nodeResults.get(sourceNode.id);
      
      // Map data based on connection configuration
      const outputKey = connection.sourceOutput || 'main';
      const inputKey = connection.targetInput || 'main';
      
      if (!inputData[inputKey]) {
        inputData[inputKey] = [];
      }
      
      inputData[inputKey].push(sourceResult);
    }

    // If no input connections, use trigger data
    if (inputConnections.length === 0) {
      inputData.main = [execution.triggerData];
    }

    return inputData;
  }

  getFinalResult(nodeResults, nodes) {
    // Find end nodes (nodes with no outgoing connections in original workflow)
    // For now, return the last executed node's result
    const resultEntries = Array.from(nodeResults.entries());
    if (resultEntries.length > 0) {
      return resultEntries[resultEntries.length - 1][1];
    }
    return null;
  }

  async saveExecution(execution) {
    try {
      const executionPath = path.join(
        this.dataDir,
        'executions',
        `${execution.id}.json`
      );

      // Convert Maps to objects for JSON serialization
      const serializable = {
        ...execution,
        nodeResults: Object.fromEntries(execution.nodeResults),
        data: Object.fromEntries(execution.data)
      };

      await fs.writeJson(executionPath, serializable, { spaces: 2 });

      // Add to history (keep only recent executions in memory)
      this.executionHistory.unshift(execution);
      if (this.executionHistory.length > this.maxHistorySize) {
        this.executionHistory = this.executionHistory.slice(0, this.maxHistorySize);
      }

    } catch (error) {
      this.logger.error('Failed to save execution:', error);
    }
  }

  async getExecution(executionId) {
    // Check active executions first
    if (this.activeExecutions.has(executionId)) {
      return this.activeExecutions.get(executionId);
    }

    // Check history
    const historyExecution = this.executionHistory.find(e => e.id === executionId);
    if (historyExecution) {
      return historyExecution;
    }

    // Load from disk
    try {
      const executionPath = path.join(this.dataDir, 'executions', `${executionId}.json`);
      const execution = await fs.readJson(executionPath);
      
      // Convert back to Maps
      execution.nodeResults = new Map(Object.entries(execution.nodeResults));
      execution.data = new Map(Object.entries(execution.data));
      
      return execution;
    } catch (error) {
      this.logger.error(`Failed to load execution ${executionId}:`, error);
      return null;
    }
  }

  async getExecutions(limit = 50, offset = 0) {
    try {
      const executionsDir = path.join(this.dataDir, 'executions');
      const files = await fs.readdir(executionsDir);
      
      const executions = [];
      const sortedFiles = files
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a)) // Sort by filename (newest first)
        .slice(offset, offset + limit);

      for (const file of sortedFiles) {
        try {
          const execution = await fs.readJson(path.join(executionsDir, file));
          executions.push({
            id: execution.id,
            workflowId: execution.workflowId,
            status: execution.status,
            startTime: execution.startTime,
            endTime: execution.endTime,
            duration: execution.duration
          });
        } catch (error) {
          this.logger.warn(`Failed to read execution file ${file}:`, error);
        }
      }

      return executions;
    } catch (error) {
      this.logger.error('Failed to get executions:', error);
      return [];
    }
  }

  getActiveExecutions() {
    return Array.from(this.activeExecutions.values()).map(execution => ({
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      startTime: execution.startTime,
      progress: execution.progress || 0
    }));
  }

  async cancelExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = 'cancelled';
      execution.endTime = new Date().toISOString();
      
      await this.saveExecution(execution);
      this.activeExecutions.delete(executionId);
      
      this.emit('execution-cancelled', { executionId });
      this.io.emit('workflow-execution-update', {
        executionId,
        status: 'cancelled'
      });
      
      return true;
    }
    return false;
  }

  async shutdown() {
    this.logger.info('Shutting down workflow engine...');
    
    // Cancel all active executions
    for (const executionId of this.activeExecutions.keys()) {
      await this.cancelExecution(executionId);
    }
    
    this.logger.info('Workflow engine shutdown complete');
  }
}

module.exports = WorkflowEngine;