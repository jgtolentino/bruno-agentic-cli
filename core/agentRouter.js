#!/usr/bin/env node
/**
 * Agent Router - Multi-Agent System Orchestrator
 * Routes tasks between Claude.ai (planner), Claude Code CLI (orchestrator), and Bruno (executor)
 * Manages communication via shared .plan.yaml files and MCP file server
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios');
const { spawn } = require('child_process');

class AgentRouter {
    constructor(config = {}) {
        this.config = {
            mcpFileServer: config.mcpFileServer || 'http://localhost:8001',
            claudeCodePath: config.claudeCodePath || 'claude',
            brunoPath: config.brunoPath || path.join(__dirname, '..', 'bin', 'bruno'),
            workspaceDir: config.workspaceDir || path.join(process.cwd(), '.bruno-workspace'),
            maxRetries: config.maxRetries || 3,
            timeout: config.timeout || 300000, // 5 minutes
            ...config
        };
        
        this.currentFlow = null;
        this.executionHistory = [];
    }

    /**
     * Main entry point - orchestrate multi-agent workflow
     */
    async orchestrate(userRequest, options = {}) {
        const flowId = this.generateFlowId();
        console.log(`🎯 Starting multi-agent flow: ${flowId}`);
        
        try {
            // Ensure workspace exists
            await this.ensureWorkspace();
            
            // Phase 1: Claude.ai Planning
            console.log('📋 Phase 1: Planning with Claude.ai...');
            const plan = await this.generatePlan(userRequest, options);
            
            if (!plan) {
                throw new Error('Failed to generate plan from Claude.ai');
            }
            
            // Phase 2: Claude Code CLI Orchestration
            console.log('🎼 Phase 2: Orchestrating with Claude Code CLI...');
            const orchestrationResult = await this.orchestrateWithClaudeCode(plan);
            
            // Phase 3: Bruno Execution
            console.log('⚡ Phase 3: Executing with Bruno...');
            const executionResult = await this.executeWithBruno(orchestrationResult);
            
            // Finalize and return results
            const finalResult = {
                flowId,
                status: 'completed',
                phases: {
                    planning: plan,
                    orchestration: orchestrationResult,
                    execution: executionResult
                },
                timestamp: new Date().toISOString()
            };
            
            await this.saveFinalResult(flowId, finalResult);
            console.log(`✅ Multi-agent flow completed: ${flowId}`);
            
            return finalResult;
            
        } catch (error) {
            console.error(`❌ Multi-agent flow failed: ${error.message}`);
            
            const errorResult = {
                flowId,
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
            
            await this.saveFinalResult(flowId, errorResult);
            throw error;
        }
    }

    /**
     * Phase 1: Generate execution plan using Claude.ai
     */
    async generatePlan(userRequest, options) {
        const planPrompt = this.buildPlanningPrompt(userRequest, options);
        
        try {
            // Create plan request file for Claude.ai
            const planRequestPath = path.join(this.config.workspaceDir, 'plan-request.md');
            await this.writeToMCP(planRequestPath, planPrompt);
            
            // For now, return a structured plan template
            // In a full implementation, this would interface with Claude.ai API
            const plan = {
                id: this.generateFlowId(),
                userRequest,
                steps: [
                    {
                        id: 'step-1',
                        type: 'analysis',
                        description: 'Analyze user request and determine requirements',
                        agent: 'claude-code',
                        inputs: ['user-request'],
                        outputs: ['requirements-analysis']
                    },
                    {
                        id: 'step-2',
                        type: 'implementation',
                        description: 'Implement solution based on requirements',
                        agent: 'bruno',
                        inputs: ['requirements-analysis'],
                        outputs: ['implementation-result']
                    }
                ],
                metadata: {
                    estimatedDuration: '5-10 minutes',
                    complexity: 'medium',
                    requiredTools: ['file-system', 'code-analysis']
                }
            };
            
            // Save plan to workspace
            const planPath = path.join(this.config.workspaceDir, 'execution-plan.yaml');
            await this.writeToMCP(planPath, yaml.dump(plan));
            
            return plan;
            
        } catch (error) {
            console.error('Failed to generate plan:', error.message);
            return null;
        }
    }

    /**
     * Phase 2: Orchestrate execution using Claude Code CLI
     */
    async orchestrateWithClaudeCode(plan) {
        try {
            const orchestrationSteps = [];
            
            for (const step of plan.steps) {
                if (step.agent === 'claude-code') {
                    console.log(`🎼 Orchestrating step: ${step.description}`);
                    
                    const stepResult = await this.executeClaudeCodeStep(step);
                    orchestrationSteps.push({
                        stepId: step.id,
                        status: stepResult.success ? 'completed' : 'failed',
                        result: stepResult,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
            const orchestrationResult = {
                planId: plan.id,
                steps: orchestrationSteps,
                status: orchestrationSteps.every(s => s.status === 'completed') ? 'completed' : 'partial',
                timestamp: new Date().toISOString()
            };
            
            // Save orchestration result
            const resultPath = path.join(this.config.workspaceDir, 'orchestration-result.yaml');
            await this.writeToMCP(resultPath, yaml.dump(orchestrationResult));
            
            return orchestrationResult;
            
        } catch (error) {
            console.error('Orchestration failed:', error.message);
            throw error;
        }
    }

    /**
     * Phase 3: Execute tasks using Bruno
     */
    async executeWithBruno(orchestrationResult) {
        try {
            const executionSteps = [];
            
            // Find Bruno-specific steps from the plan
            const planPath = path.join(this.config.workspaceDir, 'execution-plan.yaml');
            const planContent = await this.readFromMCP(planPath);
            const plan = yaml.load(planContent);
            
            for (const step of plan.steps) {
                if (step.agent === 'bruno') {
                    console.log(`⚡ Executing step with Bruno: ${step.description}`);
                    
                    const stepResult = await this.executeBrunoStep(step);
                    executionSteps.push({
                        stepId: step.id,
                        status: stepResult.success ? 'completed' : 'failed',
                        result: stepResult,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
            const executionResult = {
                orchestrationId: orchestrationResult.planId,
                steps: executionSteps,
                status: executionSteps.every(s => s.status === 'completed') ? 'completed' : 'partial',
                timestamp: new Date().toISOString()
            };
            
            // Save execution result
            const resultPath = path.join(this.config.workspaceDir, 'execution-result.yaml');
            await this.writeToMCP(resultPath, yaml.dump(executionResult));
            
            return executionResult;
            
        } catch (error) {
            console.error('Execution failed:', error.message);
            throw error;
        }
    }

    /**
     * Execute a Claude Code CLI step
     */
    async executeClaudeCodeStep(step) {
        return new Promise((resolve) => {
            const command = this.config.claudeCodePath;
            const args = ['--task', step.description];
            
            const childProcess = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: this.config.timeout
            });
            
            let stdout = '';
            let stderr = '';
            
            childProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            childProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            childProcess.on('close', (code) => {
                resolve({
                    success: code === 0,
                    output: stdout,
                    error: stderr,
                    exitCode: code
                });
            });
            
            childProcess.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message
                });
            });
        });
    }

    /**
     * Execute a Bruno step
     */
    async executeBrunoStep(step) {
        return new Promise((resolve) => {
            const command = 'node';
            const args = [this.config.brunoPath, step.description];
            
            const childProcess = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: this.config.timeout
            });
            
            let stdout = '';
            let stderr = '';
            
            childProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            childProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            childProcess.on('close', (code) => {
                resolve({
                    success: code === 0,
                    output: stdout,
                    error: stderr,
                    exitCode: code
                });
            });
            
            childProcess.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message
                });
            });
        });
    }

    /**
     * File operations via MCP server
     */
    async writeToMCP(filePath, content) {
        try {
            const response = await axios.post(`${this.config.mcpFileServer}/file`, {
                path: filePath,
                content: content,
                mode: 'write'
            });
            
            return response.data;
        } catch (error) {
            console.error(`Failed to write to MCP: ${error.message}`);
            // Fallback to local file system
            await fs.writeFile(filePath, content, 'utf8');
        }
    }

    async readFromMCP(filePath) {
        try {
            const response = await axios.post(`${this.config.mcpFileServer}/file`, {
                path: filePath,
                mode: 'read'
            });
            
            return response.data.content;
        } catch (error) {
            console.error(`Failed to read from MCP: ${error.message}`);
            // Fallback to local file system
            return await fs.readFile(filePath, 'utf8');
        }
    }

    /**
     * Utility methods
     */
    generateFlowId() {
        return `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    async ensureWorkspace() {
        try {
            await fs.mkdir(this.config.workspaceDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    }

    buildPlanningPrompt(userRequest, options) {
        return `# Multi-Agent Task Planning Request

## User Request
${userRequest}

## Context
${JSON.stringify(options, null, 2)}

## Required Output
Please provide an execution plan in YAML format with the following structure:

\`\`\`yaml
id: unique-plan-id
userRequest: "${userRequest}"
steps:
  - id: step-1
    type: analysis|implementation|testing|documentation
    description: "What this step accomplishes"
    agent: claude-code|bruno
    inputs: ["input-dependencies"]
    outputs: ["output-artifacts"]
    estimatedDuration: "time-estimate"
metadata:
  estimatedDuration: "total-time"
  complexity: low|medium|high
  requiredTools: ["tool-list"]
\`\`\`

The plan should be optimized for the multi-agent workflow where:
- Claude Code CLI handles analysis, planning, and orchestration
- Bruno handles execution, implementation, and testing
- All agents can access files via the MCP file server
`;
    }

    async saveFinalResult(flowId, result) {
        const resultPath = path.join(this.config.workspaceDir, `${flowId}-final.yaml`);
        await this.writeToMCP(resultPath, yaml.dump(result));
    }
}

module.exports = AgentRouter;

// CLI interface
if (require.main === module) {
    const router = new AgentRouter();
    const userRequest = process.argv[2] || 'Help me understand this codebase';
    
    router.orchestrate(userRequest)
        .then(result => {
            console.log('\n🎉 Multi-agent workflow completed!');
            console.log(`Flow ID: ${result.flowId}`);
            console.log(`Status: ${result.status}`);
        })
        .catch(error => {
            console.error('\n💥 Multi-agent workflow failed:', error.message);
            process.exit(1);
        });
}