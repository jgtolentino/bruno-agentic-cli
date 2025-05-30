#!/usr/bin/env node
/**
 * Bruno Task Runner - Executes tasks from multi-agent plans
 * Integrates with existing Bruno v3 infrastructure while adding multi-agent capabilities
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios');

// Import existing Bruno core modules
const UniversalRouter = require('./universalRouter');
const OllamaClient = require('./ollamaClient');
const MemoryManager = require('./memoryManager');
const PromptLoader = require('./promptLoader');

class BrunoTaskRunner {
    constructor(config = {}) {
        this.config = {
            mcpFileServer: config.mcpFileServer || 'http://localhost:8001',
            workspaceDir: config.workspaceDir || path.join(process.cwd(), '.bruno-workspace'),
            maxRetries: config.maxRetries || 3,
            timeout: config.timeout || 300000,
            verbose: config.verbose || false,
            ...config
        };

        // Initialize Bruno v3 components
        this.router = new UniversalRouter();
        this.ollamaClient = new OllamaClient();
        this.memory = new MemoryManager();
        this.promptLoader = new PromptLoader();
        
        this.executionContext = {
            currentPlan: null,
            currentStep: null,
            artifacts: {},
            stepResults: []
        };
    }

    /**
     * Execute a plan step assigned to Bruno
     */
    async executeStep(step, planContext = {}) {
        this.log(`🎯 Executing Bruno step: ${step.id} - ${step.description}`);
        
        this.executionContext.currentStep = step;
        this.executionContext.currentPlan = planContext.plan || null;
        
        try {
            // Prepare inputs from previous steps
            const inputs = await this.prepareStepInputs(step, planContext);
            
            // Execute based on step type
            let result;
            switch (step.type) {
                case 'implementation':
                    result = await this.executeImplementation(step, inputs);
                    break;
                case 'testing':
                    result = await this.executeTesting(step, inputs);
                    break;
                case 'file-operation':
                    result = await this.executeFileOperation(step, inputs);
                    break;
                case 'code-review':
                    result = await this.executeCodeReview(step, inputs);
                    break;
                case 'validation':
                    result = await this.executeValidation(step, inputs);
                    break;
                default:
                    result = await this.executeGenericTask(step, inputs);
            }
            
            // Store outputs for next steps
            await this.storeStepOutputs(step, result);
            
            this.log(`✅ Step completed: ${step.id}`);
            return {
                stepId: step.id,
                status: 'completed',
                result: result,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            this.log(`❌ Step failed: ${step.id} - ${error.message}`);
            return {
                stepId: step.id,
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Execute implementation-type steps
     */
    async executeImplementation(step, inputs) {
        this.log('🔨 Executing implementation step...');
        
        // Build implementation prompt
        const prompt = this.buildImplementationPrompt(step, inputs);
        
        // Use Bruno's router to process the request
        const response = await this.router.route(prompt);
        
        // If the response includes code, save it
        if (this.containsCode(response)) {
            await this.saveImplementationCode(step, response);
        }
        
        return {
            type: 'implementation',
            output: response,
            artifacts: await this.extractArtifacts(response),
            metrics: {
                responseLength: response.length,
                executionTime: Date.now()
            }
        };
    }

    /**
     * Execute testing-type steps
     */
    async executeTesting(step, inputs) {
        this.log('🧪 Executing testing step...');
        
        const prompt = this.buildTestingPrompt(step, inputs);
        const response = await this.router.route(prompt);
        
        // Extract test results if present
        const testResults = await this.parseTestResults(response);
        
        return {
            type: 'testing',
            output: response,
            testResults: testResults,
            artifacts: await this.extractArtifacts(response)
        };
    }

    /**
     * Execute file operations
     */
    async executeFileOperation(step, inputs) {
        this.log('📁 Executing file operation...');
        
        const operation = step.parameters?.operation || 'read';
        const filePath = step.parameters?.path || inputs.filePath;
        
        let result;
        switch (operation) {
            case 'read':
                result = await this.readFromMCP(filePath);
                break;
            case 'write':
                result = await this.writeToMCP(filePath, inputs.content || step.parameters?.content);
                break;
            case 'analyze':
                const content = await this.readFromMCP(filePath);
                const analysisPrompt = `Analyze this file content:\n\n${content}`;
                result = await this.router.route(analysisPrompt);
                break;
            default:
                throw new Error(`Unknown file operation: ${operation}`);
        }
        
        return {
            type: 'file-operation',
            operation: operation,
            filePath: filePath,
            result: result
        };
    }

    /**
     * Execute code review steps
     */
    async executeCodeReview(step, inputs) {
        this.log('👀 Executing code review...');
        
        const codeToReview = inputs.code || inputs.content;
        const reviewPrompt = this.buildCodeReviewPrompt(step, codeToReview);
        
        const review = await this.router.route(reviewPrompt);
        
        return {
            type: 'code-review',
            review: review,
            suggestions: await this.extractSuggestions(review),
            artifacts: await this.extractArtifacts(review)
        };
    }

    /**
     * Execute validation steps
     */
    async executeValidation(step, inputs) {
        this.log('✓ Executing validation...');
        
        const validationPrompt = this.buildValidationPrompt(step, inputs);
        const response = await this.router.route(validationPrompt);
        
        const validationResult = await this.parseValidationResult(response);
        
        return {
            type: 'validation',
            output: response,
            isValid: validationResult.isValid,
            issues: validationResult.issues,
            score: validationResult.score
        };
    }

    /**
     * Execute generic tasks using Bruno's router
     */
    async executeGenericTask(step, inputs) {
        this.log('⚡ Executing generic task...');
        
        const prompt = this.buildGenericPrompt(step, inputs);
        const response = await this.router.route(prompt);
        
        return {
            type: 'generic',
            output: response,
            artifacts: await this.extractArtifacts(response)
        };
    }

    /**
     * Prepare inputs for a step from previous step outputs
     */
    async prepareStepInputs(step, planContext) {
        const inputs = {};
        
        if (step.inputs && step.inputs.length > 0) {
            for (const inputName of step.inputs) {
                // Look for this input in artifacts from previous steps
                if (this.executionContext.artifacts[inputName]) {
                    inputs[inputName] = this.executionContext.artifacts[inputName];
                }
                
                // Try to load from workspace files
                const inputPath = path.join(this.config.workspaceDir, `${inputName}.yaml`);
                try {
                    const content = await this.readFromMCP(inputPath);
                    inputs[inputName] = yaml.load(content);
                } catch (error) {
                    // Input file doesn't exist, that's okay
                }
            }
        }
        
        return inputs;
    }

    /**
     * Store step outputs for use by subsequent steps
     */
    async storeStepOutputs(step, result) {
        if (step.outputs && step.outputs.length > 0) {
            for (const outputName of step.outputs) {
                // Store in memory for immediate access
                this.executionContext.artifacts[outputName] = result;
                
                // Save to workspace for persistence
                const outputPath = path.join(this.config.workspaceDir, `${outputName}.yaml`);
                await this.writeToMCP(outputPath, yaml.dump(result));
            }
        }
    }

    /**
     * Prompt builders for different step types
     */
    buildImplementationPrompt(step, inputs) {
        return `# Implementation Task

## Description
${step.description}

## Inputs
${JSON.stringify(inputs, null, 2)}

## Requirements
${step.parameters?.requirements || 'Implement the requested functionality'}

## Instructions
Please provide a complete implementation that addresses the description above. Include:
- Clean, well-structured code
- Error handling where appropriate
- Comments explaining key logic
- Any necessary imports or dependencies

Focus on creating a working solution that follows best practices.`;
    }

    buildTestingPrompt(step, inputs) {
        return `# Testing Task

## Description
${step.description}

## Code to Test
${inputs.code || inputs.implementation || 'No code provided'}

## Test Requirements
${step.parameters?.testType || 'Create comprehensive tests'}

## Instructions
Please create tests that verify the functionality works correctly. Include:
- Unit tests for individual functions
- Integration tests if applicable
- Edge case testing
- Clear test descriptions

Provide both the test code and expected results.`;
    }

    buildCodeReviewPrompt(step, code) {
        return `# Code Review Task

## Description
${step.description}

## Code to Review
\`\`\`
${code}
\`\`\`

## Review Criteria
${step.parameters?.criteria || 'General code quality, security, performance, maintainability'}

## Instructions
Please provide a thorough code review including:
- Overall assessment
- Specific issues or improvements
- Security considerations
- Performance optimizations
- Best practice recommendations

Be constructive and specific in your feedback.`;
    }

    buildValidationPrompt(step, inputs) {
        return `# Validation Task

## Description
${step.description}

## Content to Validate
${JSON.stringify(inputs, null, 2)}

## Validation Criteria
${step.parameters?.criteria || 'Verify correctness and completeness'}

## Instructions
Please validate the provided content and provide:
- Pass/fail assessment
- List of any issues found
- Suggestions for improvement
- Confidence score (0-100)

Be thorough in your validation.`;
    }

    buildGenericPrompt(step, inputs) {
        return `# Task: ${step.description}

## Inputs
${Object.keys(inputs).length > 0 ? JSON.stringify(inputs, null, 2) : 'No specific inputs provided'}

## Instructions
${step.parameters?.instructions || 'Please complete the task as described above.'}

Please provide a comprehensive response that addresses the task requirements.`;
    }

    /**
     * Utility methods
     */
    containsCode(text) {
        return text.includes('```') || text.includes('function ') || text.includes('class ') || text.includes('def ');
    }

    async saveImplementationCode(step, response) {
        const codeBlocks = this.extractCodeBlocks(response);
        for (let i = 0; i < codeBlocks.length; i++) {
            const filename = `${step.id}-implementation-${i + 1}.js`;
            const filepath = path.join(this.config.workspaceDir, filename);
            await this.writeToMCP(filepath, codeBlocks[i]);
        }
    }

    extractCodeBlocks(text) {
        const codeBlocks = [];
        const regex = /```(?:javascript|js|typescript|ts|python|py)?\n([\s\S]*?)```/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            codeBlocks.push(match[1].trim());
        }
        
        return codeBlocks;
    }

    async extractArtifacts(response) {
        const artifacts = {};
        
        // Extract code blocks
        const codeBlocks = this.extractCodeBlocks(response);
        if (codeBlocks.length > 0) {
            artifacts.code = codeBlocks;
        }
        
        // Extract file references
        const fileMatches = response.match(/file:\s*([^\s]+)/g);
        if (fileMatches) {
            artifacts.files = fileMatches.map(m => m.replace('file:', '').trim());
        }
        
        return artifacts;
    }

    async parseTestResults(response) {
        // Simple test result parsing - could be enhanced
        const passCount = (response.match(/✓|PASS|passed/gi) || []).length;
        const failCount = (response.match(/✗|FAIL|failed/gi) || []).length;
        
        return {
            totalTests: passCount + failCount,
            passed: passCount,
            failed: failCount,
            success: failCount === 0 && passCount > 0
        };
    }

    async parseValidationResult(response) {
        // Extract validation results from response
        const isValid = !response.toLowerCase().includes('fail') && 
                       !response.toLowerCase().includes('invalid') &&
                       !response.toLowerCase().includes('error');
        
        const issues = [];
        const issueMatches = response.match(/- (.*(?:issue|problem|error|warning).*)/gi);
        if (issueMatches) {
            issues.push(...issueMatches.map(m => m.replace(/^- /, '')));
        }
        
        // Simple scoring based on issues found
        const score = isValid && issues.length === 0 ? 100 : Math.max(0, 100 - (issues.length * 20));
        
        return {
            isValid,
            issues,
            score
        };
    }

    extractSuggestions(review) {
        const suggestions = [];
        const suggestionMatches = review.match(/suggestion:\s*(.*)/gi) || 
                                review.match(/recommend:\s*(.*)/gi) ||
                                review.match(/improve:\s*(.*)/gi);
        
        if (suggestionMatches) {
            suggestions.push(...suggestionMatches.map(m => m.replace(/^[^:]+:\s*/, '')));
        }
        
        return suggestions;
    }

    /**
     * MCP File Server operations
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
            this.log(`MCP write failed, using local filesystem: ${error.message}`);
            await fs.writeFile(filePath, content, 'utf8');
            return { status: 'success', message: 'Written locally' };
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
            this.log(`MCP read failed, using local filesystem: ${error.message}`);
            return await fs.readFile(filePath, 'utf8');
        }
    }

    log(message) {
        if (this.config.verbose) {
            console.log(`[BrunoTaskRunner] ${message}`);
        }
    }
}

module.exports = BrunoTaskRunner;

// CLI interface for testing
if (require.main === module) {
    const runner = new BrunoTaskRunner({ verbose: true });
    
    // Example step for testing
    const testStep = {
        id: 'step-1',
        type: 'implementation',
        description: 'Create a simple Hello World function',
        agent: 'bruno',
        inputs: [],
        outputs: ['hello-world-code'],
        parameters: {
            requirements: 'Create a function that returns "Hello, World!"'
        }
    };
    
    runner.executeStep(testStep)
        .then(result => {
            console.log('\n✅ Test step completed:');
            console.log(JSON.stringify(result, null, 2));
        })
        .catch(error => {
            console.error('\n❌ Test step failed:', error.message);
        });
}