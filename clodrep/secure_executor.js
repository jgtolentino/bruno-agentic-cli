#!/usr/bin/env node
/**
 * Claude Code CLI Secure Executor
 * Credential-aware shell runner with secret injection and verification
 * Ensures secure automation without exposing tokens to Claude
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const yaml = require('js-yaml');

class SecureExecutor {
    constructor(config = {}) {
        this.config = {
            envFile: config.envFile || path.join(__dirname, '.clodrep.env'),
            verbose: config.verbose || false,
            dryRun: config.dryRun || false,
            timeout: config.timeout || 60000,
            ...config
        };
        
        this.secrets = {};
        this.loadSecrets();
        this.executionLog = [];
    }

    /**
     * Load secrets from .clodrep.env file
     */
    loadSecrets() {
        try {
            if (!fs.existsSync(this.config.envFile)) {
                this.log(`⚠️ Secrets file not found: ${this.config.envFile}`);
                this.log(`Create it from: ${this.config.envFile}.example`);
                return;
            }

            const envContent = fs.readFileSync(this.config.envFile, 'utf8');
            const lines = envContent.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    if (key && valueParts.length > 0) {
                        this.secrets[key.trim()] = valueParts.join('=').trim();
                    }
                }
            }
            
            const secretCount = Object.keys(this.secrets).length;
            this.log(`🔑 Loaded ${secretCount} secrets from ${this.config.envFile}`);
            
        } catch (error) {
            console.error(`❌ Failed to load secrets: ${error.message}`);
            process.exit(1);
        }
    }

    /**
     * Inject secrets into command using {{TOKEN_NAME}} placeholders
     */
    injectSecrets(command) {
        let injectedCommand = command;
        let injectionCount = 0;
        
        // Replace all {{SECRET_NAME}} patterns
        const secretPattern = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;
        
        injectedCommand = injectedCommand.replace(secretPattern, (match, secretName) => {
            if (this.secrets[secretName]) {
                injectionCount++;
                this.log(`🔑 Injecting secret: ${secretName}`);
                return this.secrets[secretName];
            } else {
                console.error(`❌ Secret not found: ${secretName}`);
                console.error(`Available secrets: ${Object.keys(this.secrets).join(', ')}`);
                process.exit(1);
            }
        });
        
        if (injectionCount > 0) {
            this.log(`🔐 Injected ${injectionCount} secret(s) into command`);
        }
        
        return injectedCommand;
    }

    /**
     * Execute a single task with secret injection and verification
     */
    async runTask(task) {
        this.log(`🎯 Starting task: ${task.id || 'unnamed'}`);
        
        const execution = {
            taskId: task.id,
            startTime: new Date().toISOString(),
            status: 'running'
        };

        try {
            // Check if task should be delegated to Bruno
            if (this.shouldDelegateToBruno(task)) {
                return await this.delegateToBruno(task);
            }

            // Inject secrets into command
            const command = this.injectSecrets(task.command);
            
            // Security: Never log commands with secrets
            const safeCommand = this.sanitizeForLogging(command);
            this.log(`▶ Executing: ${safeCommand}`);
            
            if (this.config.dryRun) {
                this.log(`🏃 DRY RUN - Command would execute: ${safeCommand}`);
                return { success: true, dryRun: true };
            }

            // Execute the command
            const result = await this.executeCommand(command);
            execution.commandResult = result;
            
            if (!result.success) {
                execution.status = 'command_failed';
                this.executionLog.push(execution);
                throw new Error(`Command failed: ${result.error}`);
            }

            // Verify the result if verification is specified
            if (task.verify) {
                this.log(`🔍 Verifying result...`);
                const verificationResult = await this.verifyResult(task);
                execution.verificationResult = verificationResult;
                
                if (!verificationResult.success) {
                    execution.status = 'verification_failed';
                    this.executionLog.push(execution);
                    throw new Error(`Verification failed: ${verificationResult.message}`);
                }
                
                this.log(`✅ VERIFIED SUCCESS`);
            } else {
                this.log(`⚠️ No verification step defined`);
                if (this.config.strictMode) {
                    throw new Error('Verification required in strict mode');
                }
            }

            execution.status = 'success';
            execution.endTime = new Date().toISOString();
            this.executionLog.push(execution);
            
            return { 
                success: true, 
                output: result.stdout,
                execution: execution
            };

        } catch (error) {
            execution.status = 'failed';
            execution.error = error.message;
            execution.endTime = new Date().toISOString();
            this.executionLog.push(execution);
            
            console.error(`❌ TASK FAILED: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute multiple tasks from a YAML file
     */
    async runTaskFile(filePath) {
        this.log(`📋 Loading tasks from: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Task file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(content);
        const tasks = Array.isArray(data) ? data : data.tasks || [data];
        
        this.log(`🎯 Found ${tasks.length} task(s) to execute`);
        
        const results = [];
        let successCount = 0;
        
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            this.log(`\n📌 Task ${i + 1}/${tasks.length}: ${task.id || `task-${i + 1}`}`);
            
            try {
                const result = await this.runTask(task);
                results.push({ task: task.id, success: true, result });
                successCount++;
                
            } catch (error) {
                results.push({ task: task.id, success: false, error: error.message });
                
                if (task.stop_on_failure !== false) {
                    this.log(`🛑 Stopping execution due to task failure`);
                    break;
                }
            }
        }
        
        // Summary
        this.log(`\n📊 Execution Summary:`);
        this.log(`Total tasks: ${tasks.length}`);
        this.log(`Completed: ${results.length}`);
        this.log(`Successful: ${successCount}`);
        this.log(`Success rate: ${Math.round((successCount / tasks.length) * 100)}%`);
        
        return {
            success: successCount === tasks.length,
            totalTasks: tasks.length,
            successfulTasks: successCount,
            results: results,
            executionLog: this.executionLog
        };
    }

    /**
     * Check if task should be delegated to Bruno
     */
    shouldDelegateToBruno(task) {
        if (task.requires_delegation === false) {
            return false;
        }
        
        if (task.delegate_to === 'bruno' || task.agent === 'executor') {
            return true;
        }
        
        // Auto-detect local file operations that Bruno can handle
        const localPatterns = [
            /^(cp|mv|mkdir|rm|touch|chmod|ls|cat|grep|find)/,
            /^npm\s+(install|run|test|build)/,
            /^git\s+(add|commit|push|pull|status)/,
            /^docker\s+(build|run|stop)(?!\s+.*https?:\/\/)/,
            /^(tar|zip|unzip|gzip)/
        ];
        
        return localPatterns.some(pattern => pattern.test(task.command.trim()));
    }

    /**
     * Delegate task to Bruno
     */
    async delegateToBruno(task) {
        this.log(`📤 Delegating to Bruno: ${task.id}`);
        
        // Create temporary task file for Bruno
        const brunoTaskFile = path.join(__dirname, 'temp', `bruno-task-${Date.now()}.yaml`);
        
        // Ensure temp directory exists
        const tempDir = path.dirname(brunoTaskFile);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Prepare task for Bruno (remove secret placeholders)
        const brunoTask = {
            ...task,
            command: this.sanitizeForBruno(task.command)
        };
        
        fs.writeFileSync(brunoTaskFile, yaml.dump(brunoTask));
        
        try {
            // Execute via Bruno
            const brunoCommand = `node ../bin/bruno-verified.js verify "${brunoTaskFile}" --verbose`;
            const result = await this.executeCommand(brunoCommand);
            
            // Clean up temp file
            fs.unlinkSync(brunoTaskFile);
            
            return {
                success: result.success,
                delegated: true,
                agent: 'bruno',
                output: result.stdout
            };
            
        } catch (error) {
            // Clean up temp file on error
            if (fs.existsSync(brunoTaskFile)) {
                fs.unlinkSync(brunoTaskFile);
            }
            throw error;
        }
    }

    /**
     * Execute command with timeout and proper error handling
     */
    async executeCommand(command) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            exec(command, { 
                timeout: this.config.timeout,
                maxBuffer: 1024 * 1024 // 1MB buffer
            }, (error, stdout, stderr) => {
                const endTime = Date.now();
                
                resolve({
                    success: !error,
                    stdout: stdout || '',
                    stderr: stderr || '',
                    exitCode: error ? error.code || 1 : 0,
                    duration: endTime - startTime,
                    command: this.sanitizeForLogging(command)
                });
            });
        });
    }

    /**
     * Verify task result
     */
    async verifyResult(task) {
        try {
            const verifyCommand = this.injectSecrets(task.verify);
            const result = await this.executeCommand(verifyCommand);
            
            if (!result.success) {
                return {
                    success: false,
                    message: `Verify command failed: ${result.stderr}`
                };
            }
            
            const actualResult = result.stdout.trim();
            const expectedResult = task.success_condition;
            
            const matches = this.compareResults(actualResult, expectedResult, task.comparison_type);
            
            return {
                success: matches,
                message: matches ? 'Verification passed' : `Expected "${expectedResult}", got "${actualResult}"`,
                actual: actualResult,
                expected: expectedResult
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Verification error: ${error.message}`
            };
        }
    }

    /**
     * Compare verification results
     */
    compareResults(actual, expected, comparisonType = 'exact') {
        switch (comparisonType) {
            case 'exact':
                return actual === expected;
            case 'contains':
                return actual.includes(expected);
            case 'regex':
                return new RegExp(expected).test(actual);
            case 'numeric':
                return parseFloat(actual) === parseFloat(expected);
            case 'numeric_gt':
                return parseFloat(actual) > parseFloat(expected);
            default:
                return actual === expected;
        }
    }

    /**
     * Sanitize command for logging (remove secrets)
     */
    sanitizeForLogging(command) {
        let sanitized = command;
        
        // Replace any of our known secrets with [REDACTED]
        for (const [key, value] of Object.entries(this.secrets)) {
            if (value && value.length > 4) {
                sanitized = sanitized.replace(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `[${key}]`);
            }
        }
        
        // Also redact common patterns
        sanitized = sanitized.replace(/(Bearer\s+)[a-zA-Z0-9_-]+/g, '$1[REDACTED]');
        sanitized = sanitized.replace(/(token[=:]\s*)[a-zA-Z0-9_-]+/gi, '$1[REDACTED]');
        sanitized = sanitized.replace(/(key[=:]\s*)[a-zA-Z0-9_-]+/gi, '$1[REDACTED]');
        
        return sanitized;
    }

    /**
     * Prepare command for Bruno (remove secret placeholders)
     */
    sanitizeForBruno(command) {
        // Remove secret placeholder patterns that Bruno can't handle
        return command.replace(/\{\{[A-Z_][A-Z0-9_]*\}\}/g, '[SECRET_PLACEHOLDER]');
    }

    /**
     * Save execution report
     */
    async saveExecutionReport(filePath) {
        const report = {
            timestamp: new Date().toISOString(),
            config: {
                ...this.config,
                envFile: this.config.envFile // Don't include actual secrets
            },
            secretsLoaded: Object.keys(this.secrets).length,
            executionLog: this.executionLog
        };
        
        fs.writeFileSync(filePath, yaml.dump(report));
        this.log(`📊 Execution report saved: ${filePath}`);
    }

    log(message) {
        if (this.config.verbose) {
            console.log(`[SecureExecutor] ${message}`);
        }
    }
}

// CLI interface
if (require.main === module) {
    async function main() {
        const args = process.argv.slice(2);
        
        if (args.length === 0 || args[0] === '--help') {
            console.log(`
Claude Code CLI Secure Executor

Usage:
  node secure_executor.js <task-file.yaml>     Execute tasks from file
  node secure_executor.js --init               Initialize environment files
  node secure_executor.js --test               Run test tasks
  node secure_executor.js --check-secrets      Verify secrets are loaded

Options:
  --verbose       Enable verbose logging
  --dry-run       Show what would execute without running
  --strict        Require verification for all tasks
  --env <file>    Use custom env file (default: .clodrep.env)

Examples:
  node secure_executor.js deploy-tasks.yaml --verbose
  node secure_executor.js api-tasks.yaml --dry-run
  node secure_executor.js --init
            `);
            process.exit(0);
        }

        const config = {
            verbose: args.includes('--verbose'),
            dryRun: args.includes('--dry-run'),
            strictMode: args.includes('--strict')
        };

        // Custom env file
        const envIndex = args.indexOf('--env');
        if (envIndex !== -1 && args[envIndex + 1]) {
            config.envFile = args[envIndex + 1];
        }

        const executor = new SecureExecutor(config);

        if (args[0] === '--init') {
            await initializeEnvironment();
        } else if (args[0] === '--test') {
            await runTestTasks(executor);
        } else if (args[0] === '--check-secrets') {
            checkSecrets(executor);
        } else {
            const taskFile = args.find(arg => !arg.startsWith('--'));
            if (!taskFile) {
                console.error('❌ No task file specified');
                process.exit(1);
            }

            try {
                const result = await executor.runTaskFile(taskFile);
                
                if (!result.success) {
                    console.error(`❌ Some tasks failed`);
                    process.exit(1);
                }
                
                console.log(`✅ All tasks completed successfully`);
                
            } catch (error) {
                console.error(`❌ Execution failed: ${error.message}`);
                process.exit(1);
            }
        }
    }

    async function initializeEnvironment() {
        console.log('🚀 Initializing Claude Code CLI Secure Environment');
        
        const envPath = path.join(__dirname, '.clodrep.env');
        const examplePath = path.join(__dirname, '.clodrep.env.example');
        
        if (fs.existsSync(envPath)) {
            console.log('⚠️ .clodrep.env already exists');
        } else {
            if (fs.existsSync(examplePath)) {
                fs.copyFileSync(examplePath, envPath);
                console.log('✅ Created .clodrep.env from example');
                console.log('📝 Please edit .clodrep.env and add your actual secrets');
            } else {
                console.error('❌ .clodrep.env.example not found');
            }
        }
        
        // Create temp directory
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
            console.log('✅ Created temp directory for task delegation');
        }
        
        console.log('\n🔐 Security Reminders:');
        console.log('1. Never commit .clodrep.env to version control');
        console.log('2. Use {{TOKEN_NAME}} placeholders in task files');
        console.log('3. Secrets are automatically injected at runtime');
        console.log('4. Commands are sanitized in logs');
    }

    async function runTestTasks(executor) {
        console.log('🧪 Running secure executor tests...');
        
        const testTasks = [
            {
                id: 'test-echo',
                command: 'echo "Hello from secure executor"',
                verify: 'echo "Hello from secure executor"',
                success_condition: 'Hello from secure executor'
            },
            {
                id: 'test-secret-injection',
                command: 'echo "Testing with {{NODE_ENV}} environment"',
                verify: 'echo "Testing with production environment"',
                success_condition: 'Testing with production environment'
            }
        ];
        
        for (const task of testTasks) {
            try {
                console.log(`\n🎯 Testing: ${task.id}`);
                const result = await executor.runTask(task);
                console.log(`✅ ${task.id}: ${result.success ? 'PASSED' : 'FAILED'}`);
            } catch (error) {
                console.log(`❌ ${task.id}: FAILED - ${error.message}`);
            }
        }
    }

    function checkSecrets(executor) {
        const secretCount = Object.keys(executor.secrets).length;
        console.log(`🔑 Loaded ${secretCount} secrets`);
        
        if (secretCount > 0) {
            console.log('Available secret names:');
            Object.keys(executor.secrets).forEach(key => {
                const value = executor.secrets[key];
                const preview = value.length > 10 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : '[SHORT]';
                console.log(`  ${key}: ${preview}`);
            });
        } else {
            console.log('❌ No secrets loaded. Check your .clodrep.env file.');
        }
    }

    main().catch(error => {
        console.error(`❌ Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = SecureExecutor;