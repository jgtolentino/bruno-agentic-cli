#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '/Users/tbwa/.bruno/clodrep/.clodrep.env' });

// Import connectors
const AsanaConnector = require('./connectors/asana');
const GoogleDocsConnector = require('./connectors/google-docs');
const GitHubConnector = require('./connectors/github');
const SupabaseConnector = require('./connectors/supabase');
const TaskProcessor = require('./processors/task-processor');
const DocProcessor = require('./processors/doc-processor');

class ClaudeMCPBridgeCLI {
    constructor() {
        this.program = new Command();
        this.connectors = new Map();
        this.processors = new Map();
        this.setupCommands();
        this.initializeComponents();
    }

    initializeComponents() {
        try {
            // Initialize processors
            this.processors.set('task', new TaskProcessor());
            this.processors.set('doc', new DocProcessor());

            // Initialize connectors based on available tokens
            if (process.env.ASANA_ACCESS_TOKEN) {
                this.connectors.set('asana', new AsanaConnector(process.env.ASANA_ACCESS_TOKEN));
            }

            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                this.connectors.set('google-docs', new GoogleDocsConnector({
                    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS
                }));
            }

            if (process.env.GITHUB_TOKEN) {
                this.connectors.set('github', new GitHubConnector(process.env.GITHUB_TOKEN));
            }

            if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
                this.connectors.set('supabase', new SupabaseConnector({
                    url: process.env.SUPABASE_URL,
                    key: process.env.SUPABASE_ANON_KEY
                }));
            }

        } catch (error) {
            console.error(chalk.red('Failed to initialize components:'), error.message);
        }
    }

    setupCommands() {
        this.program
            .name('claude-mcp-bridge')
            .description('CLI for Claude MCP Bridge - Multi-service integration')
            .version('1.0.0');

        // Status command
        this.program
            .command('status')
            .description('Show connection status for all services')
            .action(() => this.showStatus());

        // Task commands
        const taskCmd = this.program
            .command('task')
            .description('Task management commands');

        taskCmd
            .command('create <file>')
            .description('Create tasks from markdown/text file')
            .option('-s, --service <service>', 'Target service (asana, github)', 'asana')
            .option('-p, --project <project>', 'Project ID or repository')
            .action((file, options) => this.createTasks(file, options));

        taskCmd
            .command('parse <text>')
            .description('Parse text into structured tasks')
            .option('-f, --format <format>', 'Input format (markdown, yaml, plaintext)', 'detect')
            .action((text, options) => this.parseTasks(text, options));

        // Document commands
        const docCmd = this.program
            .command('doc')
            .description('Document management commands');

        docCmd
            .command('create <file>')
            .description('Create document from markdown/text file')
            .option('-s, --service <service>', 'Target service (google-docs)', 'google-docs')
            .option('-t, --template <template>', 'Document template', 'technical')
            .option('--title <title>', 'Document title')
            .action((file, options) => this.createDocument(file, options));

        docCmd
            .command('convert <file>')
            .description('Convert between document formats')
            .option('-f, --from <format>', 'Source format', 'detect')
            .option('-t, --to <format>', 'Target format', 'google-docs')
            .option('--template <template>', 'Document template', 'default')
            .action((file, options) => this.convertDocument(file, options));

        // Service-specific commands
        const asanaCmd = this.program
            .command('asana')
            .description('Asana-specific commands');

        asanaCmd
            .command('projects')
            .description('List Asana projects')
            .action(() => this.listAsanaProjects());

        asanaCmd
            .command('create-project <name>')
            .description('Create new Asana project')
            .option('-d, --description <desc>', 'Project description')
            .option('-t, --team <team>', 'Team ID')
            .action((name, options) => this.createAsanaProject(name, options));

        const githubCmd = this.program
            .command('github')
            .description('GitHub-specific commands');

        githubCmd
            .command('issues <owner> <repo>')
            .description('List GitHub issues')
            .option('-s, --state <state>', 'Issue state', 'open')
            .action((owner, repo, options) => this.listGitHubIssues(owner, repo, options));

        githubCmd
            .command('create-repo <name>')
            .description('Create new GitHub repository')
            .option('-d, --description <desc>', 'Repository description')
            .option('--private', 'Make repository private')
            .action((name, options) => this.createGitHubRepo(name, options));

        // Batch processing
        this.program
            .command('batch <configFile>')
            .description('Process batch operations from config file')
            .action((configFile) => this.processBatch(configFile));

        // Interactive mode
        this.program
            .command('interactive')
            .alias('i')
            .description('Start interactive mode')
            .action(() => this.startInteractive());

        // Configuration
        this.program
            .command('config')
            .description('Show configuration and token status')
            .action(() => this.showConfig());
    }

    async showStatus() {
        console.log(chalk.blue('\n🔗 Claude MCP Bridge Status\n'));
        
        const services = ['asana', 'google-docs', 'github', 'supabase'];
        
        for (const service of services) {
            const isConnected = this.connectors.has(service);
            const status = isConnected ? chalk.green('✅ Connected') : chalk.red('❌ Not configured');
            console.log(`${service.padEnd(15)} ${status}`);
        }

        console.log(chalk.blue('\n📊 Processors:'));
        for (const [name] of this.processors) {
            console.log(`${name.padEnd(15)} ${chalk.green('✅ Available')}`);
        }
    }

    async createTasks(file, options) {
        const spinner = ora('Processing tasks...').start();
        
        try {
            if (!fs.existsSync(file)) {
                throw new Error(`File not found: ${file}`);
            }

            const content = fs.readFileSync(file, 'utf8');
            const processor = this.processors.get('task');
            
            // Process the tasks
            const processed = await processor.process(content, { format: 'detect' });
            
            spinner.text = `Found ${processed.tasks.length} tasks. Creating in ${options.service}...`;

            const connector = this.connectors.get(options.service);
            if (!connector) {
                throw new Error(`Service not available: ${options.service}`);
            }

            let result;
            if (options.service === 'asana') {
                const formattedTasks = processor.formatForAsana(processed.tasks, options.project);
                result = await connector.createTaskBatch({
                    tasks: formattedTasks,
                    projectId: options.project
                });
            } else if (options.service === 'github') {
                if (!options.project || !options.project.includes('/')) {
                    throw new Error('GitHub requires owner/repo format for project option');
                }
                const [owner, repo] = options.project.split('/');
                const formattedTasks = processor.formatForGitHub(processed.tasks, { owner, repo });
                result = await connector.createIssuesFromTasks({
                    owner,
                    repo,
                    tasks: formattedTasks
                });
            }

            spinner.succeed(`Created ${result.created || result.inserted} tasks in ${options.service}`);
            
            if (result.tasks || result.issues) {
                console.log(chalk.blue('\nCreated tasks:'));
                (result.tasks || result.issues).forEach((task, index) => {
                    console.log(`${index + 1}. ${task.name || task.title} - ${task.url || task.permalink_url}`);
                });
            }

        } catch (error) {
            spinner.fail(`Task creation failed: ${error.message}`);
        }
    }

    async parseTasks(text, options) {
        try {
            const processor = this.processors.get('task');
            const processed = await processor.process(text, { format: options.format });
            
            console.log(chalk.blue('\n📋 Parsed Tasks:\n'));
            
            processed.tasks.forEach((task, index) => {
                console.log(`${index + 1}. ${chalk.bold(task.name)}`);
                if (task.description) {
                    console.log(`   ${task.description}`);
                }
                console.log(`   Priority: ${this.formatPriority(task.priority)} | Est: ${task.estimatedHours}h`);
                if (task.subtasks.length > 0) {
                    console.log(`   Subtasks: ${task.subtasks.length}`);
                }
                console.log('');
            });

            const analysis = processor.analyzeTaskComplexity(processed.tasks);
            console.log(chalk.blue('📊 Analysis:'));
            console.log(`Total tasks: ${analysis.totalTasks}`);
            console.log(`Estimated hours: ${analysis.estimatedHours}`);
            console.log(`High priority: ${analysis.priorities.high}`);
            console.log(`Medium priority: ${analysis.priorities.medium}`);
            console.log(`Low priority: ${analysis.priorities.low}`);

        } catch (error) {
            console.error(chalk.red('Parse failed:'), error.message);
        }
    }

    async createDocument(file, options) {
        const spinner = ora('Creating document...').start();
        
        try {
            if (!fs.existsSync(file)) {
                throw new Error(`File not found: ${file}`);
            }

            const content = fs.readFileSync(file, 'utf8');
            const processor = this.processors.get('doc');
            
            // Process the document
            const processed = await processor.process(content, {
                template: options.template,
                target: options.service,
                project: options.title || path.basename(file, path.extname(file))
            });

            spinner.text = 'Creating document in Google Docs...';

            const connector = this.connectors.get(options.service);
            if (!connector) {
                throw new Error(`Service not available: ${options.service}`);
            }

            const result = await connector.createFromMarkdown(processed);
            
            // Apply professional formatting
            await connector.applyFormatting({
                documentId: result.id,
                formatting: ['professional', 'headers']
            });

            spinner.succeed(`Document created: ${result.title}`);
            console.log(chalk.blue(`URL: ${result.url}`));

        } catch (error) {
            spinner.fail(`Document creation failed: ${error.message}`);
        }
    }

    async convertDocument(file, options) {
        const spinner = ora('Converting document...').start();
        
        try {
            if (!fs.existsSync(file)) {
                throw new Error(`File not found: ${file}`);
            }

            const content = fs.readFileSync(file, 'utf8');
            const processor = this.processors.get('doc');
            
            const processed = await processor.process(content, {
                format: options.from,
                template: options.template,
                target: options.to
            });

            const outputFile = file.replace(path.extname(file), `.converted${path.extname(file)}`);
            
            if (options.to === 'markdown') {
                fs.writeFileSync(outputFile, processed.content);
            } else if (options.to === 'html') {
                fs.writeFileSync(outputFile, processed.content);
            }

            spinner.succeed(`Document converted: ${outputFile}`);

        } catch (error) {
            spinner.fail(`Document conversion failed: ${error.message}`);
        }
    }

    async listAsanaProjects() {
        try {
            const connector = this.connectors.get('asana');
            if (!connector) {
                throw new Error('Asana not configured');
            }

            const projects = await connector.listProjects();
            
            console.log(chalk.blue('\n📁 Asana Projects:\n'));
            projects.forEach((project, index) => {
                console.log(`${index + 1}. ${project.name}`);
                console.log(`   ID: ${project.id}`);
                console.log(`   URL: ${project.permalink_url}`);
                console.log('');
            });

        } catch (error) {
            console.error(chalk.red('Failed to list projects:'), error.message);
        }
    }

    async createAsanaProject(name, options) {
        const spinner = ora('Creating Asana project...').start();
        
        try {
            const connector = this.connectors.get('asana');
            if (!connector) {
                throw new Error('Asana not configured');
            }

            // Get workspace first
            const workspaces = await connector.getWorkspaces();
            const workspace = workspaces[0]?.id;

            const result = await connector.createProject({
                name,
                description: options.description || '',
                workspace,
                team: options.team
            });

            spinner.succeed(`Project created: ${result.name}`);
            console.log(chalk.blue(`URL: ${result.permalink_url}`));

        } catch (error) {
            spinner.fail(`Project creation failed: ${error.message}`);
        }
    }

    async listGitHubIssues(owner, repo, options) {
        try {
            const connector = this.connectors.get('github');
            if (!connector) {
                throw new Error('GitHub not configured');
            }

            const issues = await connector.listIssues({
                owner,
                repo,
                state: options.state
            });

            console.log(chalk.blue(`\n🐛 GitHub Issues (${owner}/${repo}):\n`));
            issues.forEach((issue, index) => {
                console.log(`${index + 1}. #${issue.number} ${issue.title}`);
                console.log(`   State: ${issue.state} | Assignee: ${issue.assignee || 'None'}`);
                console.log(`   URL: ${issue.url}`);
                console.log('');
            });

        } catch (error) {
            console.error(chalk.red('Failed to list issues:'), error.message);
        }
    }

    async createGitHubRepo(name, options) {
        const spinner = ora('Creating GitHub repository...').start();
        
        try {
            const connector = this.connectors.get('github');
            if (!connector) {
                throw new Error('GitHub not configured');
            }

            const result = await connector.createRepository({
                name,
                description: options.description || '',
                private: options.private || false
            });

            spinner.succeed(`Repository created: ${result.name}`);
            console.log(chalk.blue(`URL: ${result.url}`));
            console.log(chalk.blue(`Clone: ${result.clone_url}`));

        } catch (error) {
            spinner.fail(`Repository creation failed: ${error.message}`);
        }
    }

    async processBatch(configFile) {
        const spinner = ora('Processing batch operations...').start();
        
        try {
            if (!fs.existsSync(configFile)) {
                throw new Error(`Config file not found: ${configFile}`);
            }

            const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            const results = [];

            for (const operation of config.operations) {
                try {
                    spinner.text = `Processing: ${operation.description || operation.action}`;
                    
                    const connector = this.connectors.get(operation.service);
                    if (!connector) {
                        throw new Error(`Service not available: ${operation.service}`);
                    }

                    const result = await connector[operation.action](operation.data);
                    results.push({ success: true, operation: operation.id, result });

                } catch (error) {
                    results.push({ success: false, operation: operation.id, error: error.message });
                }
            }

            spinner.succeed(`Batch processing completed: ${results.filter(r => r.success).length}/${results.length} successful`);
            
            // Show results
            results.forEach(result => {
                const status = result.success ? chalk.green('✅') : chalk.red('❌');
                console.log(`${status} ${result.operation}: ${result.success ? 'Success' : result.error}`);
            });

        } catch (error) {
            spinner.fail(`Batch processing failed: ${error.message}`);
        }
    }

    async startInteractive() {
        console.log(chalk.blue('\n🤖 Claude MCP Bridge Interactive Mode\n'));
        
        while (true) {
            const { action } = await inquirer.prompt([{
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    'Create tasks from text',
                    'Create document',
                    'List service data',
                    'Show status',
                    'Exit'
                ]
            }]);

            if (action === 'Exit') {
                console.log(chalk.blue('Goodbye! 👋'));
                break;
            }

            try {
                await this.handleInteractiveAction(action);
            } catch (error) {
                console.error(chalk.red('Error:'), error.message);
            }

            console.log(''); // Add spacing
        }
    }

    async handleInteractiveAction(action) {
        switch (action) {
            case 'Create tasks from text':
                await this.interactiveCreateTasks();
                break;
            case 'Create document':
                await this.interactiveCreateDocument();
                break;
            case 'List service data':
                await this.interactiveListData();
                break;
            case 'Show status':
                await this.showStatus();
                break;
        }
    }

    async interactiveCreateTasks() {
        const { taskText, service } = await inquirer.prompt([
            {
                type: 'editor',
                name: 'taskText',
                message: 'Enter your tasks (markdown format):'
            },
            {
                type: 'list',
                name: 'service',
                message: 'Where should these tasks be created?',
                choices: Array.from(this.connectors.keys()).filter(s => ['asana', 'github'].includes(s))
            }
        ]);

        const processor = this.processors.get('task');
        const processed = await processor.process(taskText);
        
        console.log(chalk.blue(`\nFound ${processed.tasks.length} tasks`));
        
        const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'Create these tasks?'
        }]);

        if (confirm) {
            // Implementation would depend on service
            console.log(chalk.green('Tasks would be created...'));
        }
    }

    async interactiveCreateDocument() {
        const { content, service, template } = await inquirer.prompt([
            {
                type: 'editor',
                name: 'content',
                message: 'Enter document content:'
            },
            {
                type: 'list',
                name: 'service',
                message: 'Where should this document be created?',
                choices: Array.from(this.connectors.keys()).filter(s => s === 'google-docs')
            },
            {
                type: 'list',
                name: 'template',
                message: 'Choose document template:',
                choices: ['technical', 'meeting', 'requirements', 'api', 'user_guide']
            }
        ]);

        console.log(chalk.green('Document would be created...'));
    }

    async interactiveListData() {
        const { service } = await inquirer.prompt([{
            type: 'list',
            name: 'service',
            message: 'Which service data to list?',
            choices: Array.from(this.connectors.keys())
        }]);

        // Implementation would depend on service
        console.log(chalk.blue(`Listing data from ${service}...`));
    }

    async showConfig() {
        console.log(chalk.blue('\n⚙️  Configuration Status\n'));
        
        const requiredEnvVars = {
            'Asana': 'ASANA_ACCESS_TOKEN',
            'Google Docs': ['GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_DOCS_API_KEY'],
            'GitHub': 'GITHUB_TOKEN',
            'Supabase': ['SUPABASE_URL', 'SUPABASE_ANON_KEY']
        };

        for (const [service, vars] of Object.entries(requiredEnvVars)) {
            const envVars = Array.isArray(vars) ? vars : [vars];
            const configured = envVars.every(envVar => !!process.env[envVar]);
            const status = configured ? chalk.green('✅ Configured') : chalk.red('❌ Missing tokens');
            
            console.log(`${service.padEnd(15)} ${status}`);
            
            if (!configured) {
                console.log(`  Required: ${envVars.join(', ')}`);
            }
        }

        console.log(chalk.blue('\n📁 Config file: /Users/tbwa/.bruno/clodrep/.clodrep.env'));
    }

    formatPriority(priority) {
        switch (priority) {
            case 'high':
                return chalk.red('🔴 High');
            case 'medium':
                return chalk.yellow('🟡 Medium');
            case 'low':
                return chalk.green('🟢 Low');
            default:
                return chalk.gray('⚪ Unknown');
        }
    }

    run() {
        this.program.parse();
    }
}

// Run the CLI
if (require.main === module) {
    const cli = new ClaudeMCPBridgeCLI();
    cli.run();
}

module.exports = ClaudeMCPBridgeCLI;