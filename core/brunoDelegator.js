#!/usr/bin/env node
/**
 * Bruno Delegator - Smart Task Delegation System
 * Recognizes Bruno's limitations and delegates tasks upward to Claude Code CLI
 * Prevents Bruno from executing tasks it cannot properly handle or verify
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios');
const { spawn } = require('child_process');

class BrunoDelegator {
    constructor(config = {}) {
        this.config = {
            claudeCodeCommand: config.claudeCodeCommand || 'claude',
            workspaceDir: config.workspaceDir || path.join(process.cwd(), '.bruno-workspace'),
            delegationQueueDir: config.delegationQueueDir || path.join(process.cwd(), '.bruno-workspace', 'delegation-queue'),
            mcpFileServer: config.mcpFileServer || 'http://localhost:8001',
            maxRetries: config.maxRetries || 3,
            timeout: config.timeout || 300000,
            verbose: config.verbose || false,
            ...config
        };

        this.delegationPatterns = {
            // External API patterns
            external_api: [
                /https?:\/\/api\./i,
                /https?:\/\/.*\.googleapis\.com/i,
                /https?:\/\/.*\.notion\.com/i,
                /https?:\/\/.*\.slack\.com/i,
                /https?:\/\/.*\.github\.com\/api/i,
                /https?:\/\/.*\.openai\.com/i,
                /Authorization:\s*Bearer/i,
                /X-API-Key:/i,
                /-H.*".*token.*"/i
            ],

            // Complex auth flows
            auth_required: [
                /oauth/i,
                /bearer.*token/i,
                /api.*key/i,
                /authentication/i,
                /login.*flow/i,
                /jwt.*token/i
            ],

            // Dynamic payload generation
            dynamic_payload: [
                /\$\{.*\}/,  // Template variables
                /generate.*json/i,
                /construct.*payload/i,
                /build.*request/i,
                /dynamic.*data/i,
                /llm.*format/i
            ],

            // Network operations requiring complex logic
            complex_network: [
                /retry.*logic/i,
                /exponential.*backoff/i,
                /rate.*limit/i,
                /webhook/i,
                /callback/i,
                /async.*api/i
            ],

            // Third-party integrations
            third_party: [
                /zapier/i,
                /jenkins/i,
                /jira/i,
                /confluence/i,
                /salesforce/i,
                /hubspot/i,
                /mailchimp/i,
                /sendgrid/i
            ]
        };

        this.delegationQueue = [];
    }

    /**
     * Analyze if a task should be delegated
     */
    shouldDelegate(task) {
        const analysis = {
            shouldDelegate: false,
            reasons: [],
            confidence: 0,
            suggestedAgent: 'bruno'
        };

        // Check explicit delegation flag
        if (task.requires_delegation === true) {
            analysis.shouldDelegate = true;
            analysis.reasons.push('Explicit delegation flag set');
            analysis.confidence = 100;
            analysis.suggestedAgent = task.delegate_to || 'claude-code';
            return analysis;
        }

        // Analyze command content
        const commandText = task.command || '';
        const descriptionText = task.description || task.task || '';
        const fullText = `${commandText} ${descriptionText}`.toLowerCase();

        // Check against delegation patterns
        for (const [category, patterns] of Object.entries(this.delegationPatterns)) {
            const matchedPatterns = patterns.filter(pattern => pattern.test(fullText));
            
            if (matchedPatterns.length > 0) {
                analysis.shouldDelegate = true;
                analysis.reasons.push(`${category}: ${matchedPatterns.length} pattern(s) matched`);
                analysis.confidence += matchedPatterns.length * 20;
            }
        }

        // Additional heuristics
        
        // Check for environment variables that suggest secrets
        if (/\$[A-Z_]+(?:TOKEN|KEY|SECRET|AUTH)/i.test(fullText)) {
            analysis.shouldDelegate = true;
            analysis.reasons.push('Potential secrets/tokens detected');
            analysis.confidence += 30;
        }

        // Check for complex JSON construction
        if (fullText.includes('json') && (fullText.includes('dynamic') || fullText.includes('generate'))) {
            analysis.shouldDelegate = true;
            analysis.reasons.push('Dynamic JSON payload construction required');
            analysis.confidence += 25;
        }

        // Check for network-dependent verification
        if (task.verify && (/https?:\/\//.test(task.verify) || /curl.*http/i.test(task.verify))) {
            analysis.shouldDelegate = true;
            analysis.reasons.push('Network-dependent verification required');
            analysis.confidence += 20;
        }

        // Cap confidence at 100
        analysis.confidence = Math.min(analysis.confidence, 100);

        // Determine suggested agent
        if (analysis.shouldDelegate) {
            if (analysis.confidence >= 70) {
                analysis.suggestedAgent = 'claude-code';
            } else if (analysis.confidence >= 40) {
                analysis.suggestedAgent = 'claude-code'; // Still delegate, but with lower confidence
            }
        }

        return analysis;
    }

    /**
     * Delegate a task to Claude Code CLI
     */
    async delegateTask(task, analysis) {
        this.log(`🛑 Delegating task: ${task.task || task.id || 'unnamed'}`);
        this.log(`   Reasons: ${analysis.reasons.join(', ')}`);
        this.log(`   Confidence: ${analysis.confidence}%`);
        this.log(`   Target agent: ${analysis.suggestedAgent}`);

        const delegationId = this.generateDelegationId();
        const delegationTask = {
            id: delegationId,
            originalTask: task,
            analysis: analysis,
            status: 'pending',
            targetAgent: analysis.suggestedAgent,
            createdAt: new Date().toISOString(),
            attempts: 0
        };

        // Save to delegation queue
        await this.saveDelegationTask(delegationTask);

        // Try to execute delegation
        try {
            const result = await this.executeDelegation(delegationTask);
            delegationTask.status = 'completed';
            delegationTask.result = result;
            delegationTask.completedAt = new Date().toISOString();
            
            await this.updateDelegationTask(delegationTask);
            
            this.log(`✅ Delegation completed: ${delegationId}`);
            return {
                success: true,
                delegated: true,
                delegationId: delegationId,
                result: result,
                message: `Task successfully delegated to ${analysis.suggestedAgent}`
            };

        } catch (error) {
            delegationTask.status = 'failed';
            delegationTask.error = error.message;
            delegationTask.failedAt = new Date().toISOString();
            
            await this.updateDelegationTask(delegationTask);
            
            this.log(`❌ Delegation failed: ${error.message}`);
            return {
                success: false,
                delegated: true,
                delegationId: delegationId,
                error: error.message,
                message: `Failed to delegate task to ${analysis.suggestedAgent}: ${error.message}`
            };
        }
    }

    /**
     * Execute delegation to Claude Code CLI
     */
    async executeDelegation(delegationTask) {
        const task = delegationTask.originalTask;
        
        if (delegationTask.targetAgent === 'claude-code') {
            return await this.delegateToClaudeCode(task, delegationTask);
        } else {
            throw new Error(`Unknown target agent: ${delegationTask.targetAgent}`);
        }
    }

    /**
     * Delegate to Claude Code CLI
     */
    async delegateToClaudeCode(task, delegationTask) {
        // Create a delegation prompt for Claude Code CLI
        const delegationPrompt = this.buildClaudeCodePrompt(task, delegationTask);
        
        // Save prompt to workspace for Claude Code CLI to access
        const promptPath = path.join(this.config.delegationQueueDir, `${delegationTask.id}-prompt.md`);
        await this.writeToMCP(promptPath, delegationPrompt);

        // Try to execute with Claude Code CLI
        const result = await this.executeClaudeCodeCommand(delegationPrompt, delegationTask);
        
        return result;
    }

    /**
     * Build delegation prompt for Claude Code CLI
     */
    buildClaudeCodePrompt(task, delegationTask) {
        const analysis = delegationTask.analysis;
        
        return `# Task Delegation from Bruno

## Original Task
**ID**: ${task.id || 'unspecified'}
**Description**: ${task.task || task.description || 'No description provided'}

## Command
\`\`\`bash
${task.command || 'No command specified'}
\`\`\`

## Why Bruno Cannot Execute This
${analysis.reasons.map(reason => `- ${reason}`).join('\n')}

**Delegation Confidence**: ${analysis.confidence}%

## Task Parameters
${task.parameters ? yaml.dump(task.parameters) : 'No parameters specified'}

## Expected Outputs
${task.outputs ? task.outputs.join(', ') : 'Not specified'}

## Verification Requirements
${task.verify ? `**Verify Command**: \`${task.verify}\`` : 'No verification specified'}
${task.success_condition ? `**Success Condition**: ${task.success_condition}` : ''}

## Instructions for Claude Code CLI

Please execute this task using your capabilities for:
1. **External API calls** with proper authentication
2. **Dynamic payload generation** using LLM reasoning
3. **Complex retry logic** and error handling
4. **Token/secret management** (if applicable)

### Requirements:
1. Execute the task as described
2. Provide detailed output of what was accomplished
3. Include any verification results
4. Report any errors or issues encountered

### Response Format:
Please provide your response in this format:

\`\`\`yaml
status: "success" | "failed" | "partial"
output: "Detailed description of what was accomplished"
verification:
  performed: true | false
  result: "Verification results"
  success: true | false
error: "Error message if any"
artifacts:
  - "List of any files or resources created"
  - "URLs or identifiers of created resources"
\`\`\`

**Note**: This task was delegated from Bruno because it requires capabilities beyond local command execution.
`;
    }

    /**
     * Execute command via Claude Code CLI
     */
    async executeClaudeCodeCommand(prompt, delegationTask) {
        return new Promise((resolve, reject) => {
            const command = this.config.claudeCodeCommand;
            const args = ['--task', prompt];
            
            this.log(`🎼 Executing via Claude Code CLI: ${command}`);
            
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
                if (code === 0) {
                    try {
                        // Try to parse YAML response
                        const response = this.parseClaudeCodeResponse(stdout);
                        resolve(response);
                    } catch (parseError) {
                        // If parsing fails, return raw output
                        resolve({
                            status: 'success',
                            output: stdout,
                            verification: { performed: false },
                            raw: true
                        });
                    }
                } else {
                    reject(new Error(`Claude Code CLI exited with code ${code}: ${stderr}`));
                }
            });
            
            childProcess.on('error', (error) => {
                reject(new Error(`Failed to execute Claude Code CLI: ${error.message}`));
            });
        });
    }

    /**
     * Parse Claude Code CLI response
     */
    parseClaudeCodeResponse(output) {
        // Look for YAML code blocks in the response
        const yamlMatch = output.match(/```yaml\n([\s\S]*?)\n```/);
        
        if (yamlMatch) {
            try {
                return yaml.load(yamlMatch[1]);
            } catch (error) {
                throw new Error(`Failed to parse YAML response: ${error.message}`);
            }
        }
        
        // If no YAML found, try to extract key information
        const lines = output.split('\n');
        const result = {
            status: 'unknown',
            output: output,
            verification: { performed: false }
        };
        
        // Simple heuristics to determine success
        if (/success|completed|done/i.test(output) && !/fail|error/i.test(output)) {
            result.status = 'success';
        } else if (/fail|error/i.test(output)) {
            result.status = 'failed';
        }
        
        return result;
    }

    /**
     * Process a task - either execute or delegate
     */
    async processTask(task) {
        this.log(`🎯 Processing task: ${task.task || task.id || 'unnamed'}`);
        
        // Analyze if delegation is needed
        const analysis = this.shouldDelegate(task);
        
        if (analysis.shouldDelegate) {
            // Delegate the task
            return await this.delegateTask(task, analysis);
        } else {
            // Task can be executed locally by Bruno
            this.log(`✅ Task can be executed locally`);
            return {
                success: true,
                delegated: false,
                canExecuteLocally: true,
                message: 'Task approved for local execution'
            };
        }
    }

    /**
     * Get delegation queue status
     */
    async getDelegationQueueStatus() {
        try {
            await this.ensureDelegationQueueDir();
            const files = await fs.readdir(this.config.delegationQueueDir);
            const delegationFiles = files.filter(f => f.endsWith('-delegation.yaml'));
            
            const delegations = [];
            for (const file of delegationFiles) {
                try {
                    const content = await this.readFromMCP(path.join(this.config.delegationQueueDir, file));
                    const delegation = yaml.load(content);
                    delegations.push(delegation);
                } catch (error) {
                    // Skip corrupted files
                }
            }
            
            return {
                total: delegations.length,
                pending: delegations.filter(d => d.status === 'pending').length,
                completed: delegations.filter(d => d.status === 'completed').length,
                failed: delegations.filter(d => d.status === 'failed').length,
                delegations: delegations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            };
        } catch (error) {
            return {
                total: 0,
                pending: 0,
                completed: 0,
                failed: 0,
                delegations: [],
                error: error.message
            };
        }
    }

    /**
     * Utility methods
     */
    generateDelegationId() {
        return `del-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    async ensureDelegationQueueDir() {
        try {
            await fs.mkdir(this.config.delegationQueueDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    }

    async saveDelegationTask(delegationTask) {
        await this.ensureDelegationQueueDir();
        const filePath = path.join(this.config.delegationQueueDir, `${delegationTask.id}-delegation.yaml`);
        await this.writeToMCP(filePath, yaml.dump(delegationTask));
    }

    async updateDelegationTask(delegationTask) {
        const filePath = path.join(this.config.delegationQueueDir, `${delegationTask.id}-delegation.yaml`);
        await this.writeToMCP(filePath, yaml.dump(delegationTask));
    }

    async writeToMCP(filePath, content) {
        try {
            const response = await axios.post(`${this.config.mcpFileServer}/file`, {
                path: filePath,
                content: content,
                mode: 'write'
            });
            return response.data;
        } catch (error) {
            // Fallback to local filesystem
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
            // Fallback to local filesystem
            return await fs.readFile(filePath, 'utf8');
        }
    }

    log(message) {
        if (this.config.verbose) {
            console.log(`[BrunoDelegator] ${message}`);
        }
    }
}

module.exports = BrunoDelegator;

// CLI interface
if (require.main === module) {
    async function main() {
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            console.log(`
Bruno Delegator - Smart Task Delegation System

Usage:
  node brunoDelegator.js analyze <task.yaml>    Analyze if task should be delegated
  node brunoDelegator.js process <task.yaml>    Process task (execute or delegate)
  node brunoDelegator.js status                 Show delegation queue status
  node brunoDelegator.js test                   Run delegation pattern tests

Options:
  --verbose     Enable verbose logging
            `);
            process.exit(1);
        }

        const config = {
            verbose: args.includes('--verbose')
        };

        const delegator = new BrunoDelegator(config);

        if (args[0] === 'test') {
            await runDelegationTests(delegator);
        } else if (args[0] === 'status') {
            const status = await delegator.getDelegationQueueStatus();
            console.log('📊 Delegation Queue Status:');
            console.log(`Total: ${status.total}`);
            console.log(`Pending: ${status.pending}`);
            console.log(`Completed: ${status.completed}`);
            console.log(`Failed: ${status.failed}`);
        } else if (args[0] === 'analyze' && args[1]) {
            const taskFile = args[1];
            const tasks = await loadTasksFromFile(taskFile);
            
            for (const task of tasks) {
                const analysis = delegator.shouldDelegate(task);
                console.log(`\nTask: ${task.task || task.id}`);
                console.log(`Should delegate: ${analysis.shouldDelegate}`);
                console.log(`Confidence: ${analysis.confidence}%`);
                console.log(`Reasons: ${analysis.reasons.join(', ')}`);
                console.log(`Suggested agent: ${analysis.suggestedAgent}`);
            }
        } else if (args[0] === 'process' && args[1]) {
            const taskFile = args[1];
            const tasks = await loadTasksFromFile(taskFile);
            
            for (const task of tasks) {
                const result = await delegator.processTask(task);
                console.log(`\nTask: ${task.task || task.id}`);
                console.log(`Result: ${result.success ? '✅' : '❌'} ${result.message}`);
                if (result.delegated) {
                    console.log(`Delegation ID: ${result.delegationId}`);
                }
            }
        }
    }

    async function runDelegationTests(delegator) {
        console.log('🧪 Running delegation pattern tests...');
        
        const testTasks = [
            {
                id: 'test-api',
                task: 'Create Notion page',
                command: 'curl -X POST https://api.notion.com/v1/pages -H "Authorization: Bearer $NOTION_TOKEN"'
            },
            {
                id: 'test-local',
                task: 'List files',
                command: 'ls -la'
            },
            {
                id: 'test-dynamic',
                task: 'Generate JSON payload for API',
                command: 'echo "Need to generate dynamic JSON with LLM"'
            },
            {
                id: 'test-explicit',
                task: 'Complex auth flow',
                command: 'echo "test"',
                requires_delegation: true,
                delegate_to: 'claude-code'
            }
        ];

        for (const task of testTasks) {
            const analysis = delegator.shouldDelegate(task);
            console.log(`\n📋 ${task.id}:`);
            console.log(`  Should delegate: ${analysis.shouldDelegate ? '✅' : '❌'}`);
            console.log(`  Confidence: ${analysis.confidence}%`);
            console.log(`  Reasons: ${analysis.reasons.join(', ')}`);
        }
    }

    async function loadTasksFromFile(filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        const data = yaml.load(content);
        return Array.isArray(data) ? data : data.tasks || [data];
    }

    main().catch(console.error);
}