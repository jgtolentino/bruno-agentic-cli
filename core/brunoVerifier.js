#!/usr/bin/env node
/**
 * Bruno Verifier - Validation-First Command Execution
 * Prevents false success claims by requiring explicit verification
 * Bruno will NEVER print success unless real conditions are met
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const BrunoDelegator = require('./brunoDelegator');

const execAsync = promisify(exec);

class BrunoVerifier {
    constructor(config = {}) {
        this.config = {
            timeout: config.timeout || 30000,
            verbose: config.verbose || false,
            workspaceDir: config.workspaceDir || path.join(process.cwd(), '.bruno-workspace'),
            strictMode: config.strictMode !== false, // Default to strict
            delegationEnabled: config.delegationEnabled !== false, // Default to enabled
            ...config
        };
        
        this.executionLog = [];
        
        // Initialize delegator for handling complex tasks
        this.delegator = new BrunoDelegator({
            verbose: this.config.verbose,
            workspaceDir: this.config.workspaceDir,
            ...config
        });
    }

    /**
     * Execute a task with mandatory verification
     * Will NEVER claim success without proof
     */
    async executeTask(task) {
        this.log(`▶ Starting task: ${task.task || 'Unnamed task'}`);
        
        // Validate task structure
        if (!this.validateTaskStructure(task)) {
            return this.fail("❌ Invalid task structure");
        }

        // Check if task should be delegated
        if (this.config.delegationEnabled) {
            const delegationResult = await this.delegator.processTask(task);
            
            if (delegationResult.delegated) {
                this.log(`🛑 Task delegated: ${delegationResult.message}`);
                return {
                    success: delegationResult.success,
                    delegated: true,
                    delegationId: delegationResult.delegationId,
                    message: delegationResult.message,
                    result: delegationResult.result,
                    verified: delegationResult.success // Delegated tasks are considered verified if successful
                };
            } else if (!delegationResult.canExecuteLocally) {
                return this.fail("❌ Task cannot be executed locally and delegation failed");
            }
            
            // Task approved for local execution
            this.log(`✅ Task approved for local execution`);
        }

        const startTime = Date.now();
        const execution = {
            task: task.task,
            command: task.command,
            startTime,
            status: 'running'
        };

        try {
            // Step 1: Execute the command
            this.log(`🔧 Executing: ${task.command}`);
            const commandResult = await this.executeCommand(task.command);
            
            execution.commandResult = commandResult;
            execution.commandSuccess = commandResult.exitCode === 0;

            if (!execution.commandSuccess) {
                execution.status = 'command_failed';
                this.executionLog.push(execution);
                return this.fail(`❌ Command failed with exit code ${commandResult.exitCode}\n${commandResult.stderr}`);
            }

            // Step 2: MANDATORY verification (in strict mode)
            if (this.config.strictMode && !task.verify) {
                execution.status = 'no_verification';
                this.executionLog.push(execution);
                return this.fail("⚠️ No verification step defined. Cannot confirm success in strict mode.");
            }

            if (task.verify) {
                this.log("🔍 Verifying success conditions...");
                const verificationResult = await this.executeVerification(task);
                
                execution.verificationResult = verificationResult;
                execution.verificationSuccess = verificationResult.success;

                if (!verificationResult.success) {
                    execution.status = 'verification_failed';
                    this.executionLog.push(execution);
                    return this.fail(task.fail_message || `❌ Verification failed: ${verificationResult.message}`);
                }
            }

            // Step 3: ONLY NOW can we claim success
            execution.status = 'verified_success';
            execution.endTime = Date.now();
            execution.duration = execution.endTime - startTime;
            this.executionLog.push(execution);

            this.log("✅ VERIFIED SUCCESS");
            return {
                success: true,
                message: "✅ VERIFIED SUCCESS",
                execution: execution,
                verified: true
            };

        } catch (error) {
            execution.status = 'error';
            execution.error = error.message;
            execution.endTime = Date.now();
            this.executionLog.push(execution);
            
            return this.fail(`❌ Execution error: ${error.message}`);
        }
    }

    /**
     * Execute multiple tasks with verification
     */
    async executeTasks(tasks) {
        this.log(`🚀 Executing ${tasks.length} tasks with verification`);
        
        const results = [];
        let allSucceeded = true;

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            this.log(`\n📋 Task ${i + 1}/${tasks.length}: ${task.task || 'Unnamed'}`);
            
            const result = await this.executeTask(task);
            results.push(result);
            
            if (!result.success) {
                allSucceeded = false;
                if (task.stop_on_failure !== false) {
                    this.log("🛑 Stopping execution due to task failure");
                    break;
                }
            }
        }

        return {
            success: allSucceeded,
            totalTasks: tasks.length,
            completedTasks: results.length,
            successfulTasks: results.filter(r => r.success).length,
            results: results,
            executionLog: this.executionLog
        };
    }

    /**
     * Execute a command and capture results
     */
    async executeCommand(command) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            exec(command, { timeout: this.config.timeout }, (error, stdout, stderr) => {
                const endTime = Date.now();
                
                resolve({
                    command,
                    exitCode: error ? error.code || 1 : 0,
                    stdout: stdout || '',
                    stderr: stderr || '',
                    duration: endTime - startTime,
                    success: !error
                });
            });
        });
    }

    /**
     * Execute verification step
     */
    async executeVerification(task) {
        try {
            // Handle different verification types
            if (task.verify_type) {
                return await this.executeTypedVerification(task);
            }

            // Default: command-based verification
            const verifyResult = await this.executeCommand(task.verify);
            
            if (verifyResult.exitCode !== 0) {
                return {
                    success: false,
                    message: `Verify command failed: ${verifyResult.stderr}`,
                    result: verifyResult
                };
            }

            const actualResult = verifyResult.stdout.trim();
            const expectedResult = task.success_condition;

            // Compare results
            const matches = this.compareResults(actualResult, expectedResult, task.comparison_type);
            
            return {
                success: matches,
                message: matches ? 'Verification passed' : `Expected "${expectedResult}", got "${actualResult}"`,
                expected: expectedResult,
                actual: actualResult,
                result: verifyResult
            };

        } catch (error) {
            return {
                success: false,
                message: `Verification error: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Execute typed verification (log_contains, output_match, etc.)
     */
    async executeTypedVerification(task) {
        switch (task.verify_type) {
            case 'log_contains':
                return await this.verifyLogContains(task);
            case 'output_match':
                return await this.verifyOutputMatch(task);
            case 'file_exists':
                return await this.verifyFileExists(task);
            case 'git_status':
                return await this.verifyGitStatus(task);
            case 'http_status':
                return await this.verifyHttpStatus(task);
            default:
                return {
                    success: false,
                    message: `Unknown verification type: ${task.verify_type}`
                };
        }
    }

    async verifyLogContains(task) {
        try {
            const logContent = await fs.readFile(task.log_file, 'utf8');
            const contains = logContent.includes(task.expect);
            
            return {
                success: contains,
                message: contains ? 'Log contains expected content' : `Log does not contain "${task.expect}"`,
                logFile: task.log_file,
                expected: task.expect
            };
        } catch (error) {
            return {
                success: false,
                message: `Cannot read log file: ${error.message}`
            };
        }
    }

    async verifyOutputMatch(task) {
        const result = await this.executeCommand(task.command);
        const matches = this.compareResults(result.stdout.trim(), task.expect, task.comparison_type);
        
        return {
            success: matches,
            message: matches ? 'Output matches expected' : `Output "${result.stdout.trim()}" does not match "${task.expect}"`,
            actual: result.stdout.trim(),
            expected: task.expect
        };
    }

    async verifyFileExists(task) {
        try {
            await fs.access(task.file_path);
            return {
                success: true,
                message: `File exists: ${task.file_path}`,
                filePath: task.file_path
            };
        } catch (error) {
            return {
                success: false,
                message: `File does not exist: ${task.file_path}`,
                filePath: task.file_path
            };
        }
    }

    async verifyGitStatus(task) {
        const result = await this.executeCommand('git status --porcelain');
        const isClean = result.stdout.trim() === '';
        
        if (task.expect === 'clean') {
            return {
                success: isClean,
                message: isClean ? 'Git working directory is clean' : 'Git working directory has changes',
                gitStatus: result.stdout
            };
        }
        
        return {
            success: false,
            message: `Unsupported git status expectation: ${task.expect}`
        };
    }

    async verifyHttpStatus(task) {
        const curlCommand = `curl -s -o /dev/null -w '%{http_code}' "${task.url}"`;
        const result = await this.executeCommand(curlCommand);
        
        const actualStatus = result.stdout.trim();
        const expectedStatus = task.expect || task.success_condition;
        const matches = actualStatus === expectedStatus;
        
        return {
            success: matches,
            message: matches ? `HTTP status OK: ${actualStatus}` : `Expected ${expectedStatus}, got ${actualStatus}`,
            url: task.url,
            expected: expectedStatus,
            actual: actualStatus
        };
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
            case 'numeric_gte':
                return parseFloat(actual) >= parseFloat(expected);
            default:
                return actual === expected;
        }
    }

    /**
     * Validate task structure
     */
    validateTaskStructure(task) {
        if (!task.command) {
            this.log("❌ Task missing required 'command' field");
            return false;
        }

        if (this.config.strictMode && !task.verify && !task.verify_type) {
            this.log("❌ Strict mode requires verification step");
            return false;
        }

        return true;
    }

    /**
     * Fail with message and return failure result
     */
    fail(message) {
        this.log(message);
        return {
            success: false,
            message: message,
            verified: false
        };
    }

    /**
     * Load tasks from YAML file
     */
    async loadTasksFromFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const data = yaml.load(content);
            
            // Support both single task and array of tasks
            return Array.isArray(data) ? data : data.tasks || [data];
        } catch (error) {
            throw new Error(`Failed to load tasks from ${filePath}: ${error.message}`);
        }
    }

    /**
     * Save execution report
     */
    async saveExecutionReport(filePath) {
        const report = {
            timestamp: new Date().toISOString(),
            config: this.config,
            executionLog: this.executionLog,
            summary: {
                totalExecutions: this.executionLog.length,
                successful: this.executionLog.filter(e => e.status === 'verified_success').length,
                failed: this.executionLog.filter(e => e.status !== 'verified_success').length
            }
        };

        await fs.writeFile(filePath, yaml.dump(report), 'utf8');
        this.log(`📊 Execution report saved to: ${filePath}`);
    }

    log(message) {
        if (this.config.verbose) {
            console.log(`[BrunoVerifier] ${message}`);
        }
    }
}

module.exports = BrunoVerifier;

// CLI interface
if (require.main === module) {
    async function main() {
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            console.log(`
Bruno Verifier - Validation-First Command Execution

Usage:
  node brunoVerifier.js <task-file.yaml>     Execute tasks from file
  node brunoVerifier.js --test               Run built-in test
  node brunoVerifier.js --init               Create sample task files

Options:
  --verbose     Enable verbose logging
  --strict      Enable strict mode (default)
  --no-strict   Disable strict mode
            `);
            process.exit(1);
        }

        const config = {
            verbose: args.includes('--verbose'),
            strictMode: !args.includes('--no-strict')
        };

        const verifier = new BrunoVerifier(config);

        if (args.includes('--test')) {
            await runTest(verifier);
        } else if (args.includes('--init')) {
            await initSampleFiles();
        } else {
            const taskFile = args.find(arg => !arg.startsWith('--'));
            if (!taskFile) {
                console.error('❌ No task file specified');
                process.exit(1);
            }

            try {
                const tasks = await verifier.loadTasksFromFile(taskFile);
                const result = await verifier.executeTasks(tasks);
                
                console.log(`\n📊 Execution Summary:`);
                console.log(`Total tasks: ${result.totalTasks}`);
                console.log(`Completed: ${result.completedTasks}`);
                console.log(`Successful: ${result.successfulTasks}`);
                console.log(`Success rate: ${Math.round((result.successfulTasks / result.totalTasks) * 100)}%`);

                if (!result.success) {
                    process.exit(1);
                }
            } catch (error) {
                console.error(`❌ Failed to execute tasks: ${error.message}`);
                process.exit(1);
            }
        }
    }

    async function runTest(verifier) {
        console.log('🧪 Running Bruno Verifier test...');
        
        const testTask = {
            task: "Test echo command",
            command: "echo 'Hello Bruno'",
            verify: "echo 'Hello Bruno'",
            success_condition: "Hello Bruno",
            fail_message: "❌ Echo test failed"
        };

        const result = await verifier.executeTask(testTask);
        
        if (result.success) {
            console.log('✅ Test passed - Bruno Verifier is working correctly');
        } else {
            console.log('❌ Test failed - Something is wrong with Bruno Verifier');
            console.log(result.message);
            process.exit(1);
        }
    }

    async function initSampleFiles() {
        console.log('📝 Creating sample task files...');
        
        const sampleTasks = [
            {
                task: "Deploy app to Vercel",
                command: "vercel deploy --prod",
                verify: "curl -s -o /dev/null -w '%{http_code}' https://yourapp.com",
                success_condition: "200",
                fail_message: "❌ Deployment failed — site did not respond with 200."
            },
            {
                task: "Build project",
                command: "npm run build",
                verify_type: "log_contains",
                log_file: "build.log",
                expect: "BUILD COMPLETE",
                fail_message: "❌ Build did not complete successfully"
            },
            {
                task: "Check git status",
                command: "git add .",
                verify_type: "git_status",
                expect: "clean",
                fail_message: "❌ Git working directory is not clean"
            }
        ];

        await fs.writeFile('sample-tasks.yaml', yaml.dump(sampleTasks), 'utf8');
        console.log('✅ Created sample-tasks.yaml');
        
        const singleTask = {
            task: "Simple test",
            command: "echo 'test'",
            verify: "echo 'test'",
            success_condition: "test"
        };

        await fs.writeFile('simple-task.yaml', yaml.dump(singleTask), 'utf8');
        console.log('✅ Created simple-task.yaml');
        
        console.log('\nRun with: node brunoVerifier.js sample-tasks.yaml --verbose');
    }

    main().catch(console.error);
}