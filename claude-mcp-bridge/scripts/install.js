#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

class BridgeInstaller {
    constructor() {
        this.bridgeDir = path.dirname(__dirname);
        this.globalBinDir = '/usr/local/bin';
        this.envPath = '/Users/tbwa/.bruno/clodrep/.clodrep.env';
    }

    async install() {
        console.log(chalk.blue('🚀 Installing Claude MCP Bridge...\n'));

        try {
            // Step 1: Install dependencies
            this.installDependencies();

            // Step 2: Create directories
            this.createDirectories();

            // Step 3: Set up global CLI
            this.setupGlobalCLI();

            // Step 4: Check environment
            this.checkEnvironment();

            // Step 5: Run tests
            this.runTests();

            console.log(chalk.green('\n✅ Installation completed successfully!'));
            this.showUsageInstructions();

        } catch (error) {
            console.error(chalk.red('\n❌ Installation failed:'), error.message);
            process.exit(1);
        }
    }

    installDependencies() {
        console.log(chalk.blue('📦 Installing dependencies...'));
        
        try {
            // Install production dependencies
            execSync('npm install --production', { 
                cwd: this.bridgeDir, 
                stdio: 'inherit' 
            });

            // Install optional dependencies for PDF generation
            try {
                execSync('npm install puppeteer --optional', { 
                    cwd: this.bridgeDir, 
                    stdio: 'pipe' 
                });
                console.log(chalk.green('  ✅ PDF generation support installed'));
            } catch (error) {
                console.log(chalk.yellow('  ⚠️  PDF generation support skipped (optional)'));
            }

            console.log(chalk.green('  ✅ Dependencies installed'));

        } catch (error) {
            throw new Error(`Dependency installation failed: ${error.message}`);
        }
    }

    createDirectories() {
        console.log(chalk.blue('📁 Creating directories...'));

        const directories = [
            path.join(this.bridgeDir, 'logs'),
            path.join(this.bridgeDir, 'temp'),
            path.join(this.bridgeDir, 'output'),
            path.join(this.bridgeDir, 'config')
        ];

        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(chalk.green(`  ✅ Created ${path.basename(dir)}/`));
            }
        }
    }

    setupGlobalCLI() {
        console.log(chalk.blue('🔗 Setting up global CLI...'));

        const cliPath = path.join(this.bridgeDir, 'src', 'cli.js');
        const globalCliPath = path.join(this.globalBinDir, 'claude-bridge');

        try {
            // Make CLI executable
            fs.chmodSync(cliPath, '755');

            // Create symlink in global bin directory
            if (fs.existsSync(globalCliPath)) {
                fs.unlinkSync(globalCliPath);
            }

            fs.symlinkSync(cliPath, globalCliPath);
            console.log(chalk.green('  ✅ Global CLI command: claude-bridge'));

        } catch (error) {
            // Fallback: add to PATH instruction
            console.log(chalk.yellow('  ⚠️  Could not create global symlink'));
            console.log(chalk.yellow(`     Add to PATH: export PATH="$PATH:${path.dirname(cliPath)}"`));
        }
    }

    checkEnvironment() {
        console.log(chalk.blue('🔍 Checking environment...'));

        const requiredTokens = {
            'ASANA_ACCESS_TOKEN': 'Asana integration',
            'GOOGLE_APPLICATION_CREDENTIALS': 'Google Docs integration',
            'GOOGLE_DOCS_API_KEY': 'Google Docs API',
            'GITHUB_TOKEN': 'GitHub integration'
        };

        if (!fs.existsSync(this.envPath)) {
            console.log(chalk.yellow('  ⚠️  Environment file not found'));
            console.log(chalk.yellow(`     Create: ${this.envPath}`));
            return;
        }

        const envContent = fs.readFileSync(this.envPath, 'utf8');
        const configuredTokens = [];
        const missingTokens = [];

        for (const [token, description] of Object.entries(requiredTokens)) {
            const hasToken = envContent.includes(`${token}=`) && 
                           !envContent.includes(`${token}=your_`) &&
                           !envContent.includes(`${token}=`) && envContent.split(`${token}=`)[1]?.split('\n')[0]?.trim();

            if (hasToken) {
                configuredTokens.push(token);
                console.log(chalk.green(`  ✅ ${description}`));
            } else {
                missingTokens.push({ token, description });
                console.log(chalk.yellow(`  ⚠️  ${description} (${token})`));
            }
        }

        if (missingTokens.length > 0) {
            console.log(chalk.blue('\n🔧 Missing tokens configuration:'));
            missingTokens.forEach(({ token, description }) => {
                console.log(`  ${token} - ${description}`);
            });
        }
    }

    runTests() {
        console.log(chalk.blue('🧪 Running tests...'));

        try {
            // Test processors
            const TaskProcessor = require('../src/processors/task-processor');
            const DocProcessor = require('../src/processors/doc-processor');

            const taskProcessor = new TaskProcessor();
            const docProcessor = new DocProcessor();

            // Test task processing
            const testTasks = taskProcessor.parseMarkdownTasks(`
# Test Tasks
- Implement user authentication
- Create dashboard layout
- Add data visualization
            `);

            if (testTasks.tasks.length === 3) {
                console.log(chalk.green('  ✅ Task processor'));
            } else {
                throw new Error('Task processor test failed');
            }

            // Test document processing
            const testDoc = docProcessor.processMarkdown('# Test Document\n\nThis is a test.', 'technical', 'Test Project');
            
            if (testDoc.processed) {
                console.log(chalk.green('  ✅ Document processor'));
            } else {
                throw new Error('Document processor test failed');
            }

            // Test CLI
            const CLIClass = require('../src/cli');
            const cli = new CLIClass();
            
            if (cli.processors.size >= 2) {
                console.log(chalk.green('  ✅ CLI initialization'));
            } else {
                throw new Error('CLI test failed');
            }

        } catch (error) {
            throw new Error(`Tests failed: ${error.message}`);
        }
    }

    showUsageInstructions() {
        console.log(chalk.blue('\n📚 Usage Instructions:\n'));
        
        console.log(chalk.white('🔗 Check connection status:'));
        console.log(chalk.gray('  claude-bridge status\n'));
        
        console.log(chalk.white('📋 Create tasks from markdown file:'));
        console.log(chalk.gray('  claude-bridge task create tasks.md --service asana --project PROJECT_ID\n'));
        
        console.log(chalk.white('📄 Create Google Doc from markdown:'));
        console.log(chalk.gray('  claude-bridge doc create spec.md --template technical --title "API Spec"\n'));
        
        console.log(chalk.white('🤖 Interactive mode:'));
        console.log(chalk.gray('  claude-bridge interactive\n'));
        
        console.log(chalk.white('⚙️  Configuration:'));
        console.log(chalk.gray('  claude-bridge config\n'));
        
        console.log(chalk.blue('🌐 Start HTTP server:'));
        console.log(chalk.gray('  cd claude-mcp-bridge && npm start\n'));
        
        console.log(chalk.white('📖 Full documentation:'));
        console.log(chalk.gray('  claude-bridge --help\n'));

        console.log(chalk.yellow('💡 Next steps:'));
        console.log(chalk.yellow('1. Add missing API tokens to .clodrep.env'));
        console.log(chalk.yellow('2. Test with: claude-bridge status'));
        console.log(chalk.yellow('3. Try interactive mode: claude-bridge interactive'));
    }

    createSampleFiles() {
        console.log(chalk.blue('📝 Creating sample files...'));

        const samplesDir = path.join(this.bridgeDir, 'samples');
        if (!fs.existsSync(samplesDir)) {
            fs.mkdirSync(samplesDir);
        }

        // Sample task file
        const sampleTasks = `# TBWA Retail Dashboard Tasks

## Backend Implementation
- Set up Supabase database schema
- Implement brand hierarchy API endpoints  
- Create data aggregation functions
- Add authentication middleware

## Frontend Development  
- Build dashboard layout components
- Implement data visualization charts
- Create filter and search functionality
- Add responsive design

## Testing & Deployment
- Write unit tests for API endpoints
- Set up automated testing pipeline
- Configure production deployment
- Document API endpoints

## Project Management
- Create project milestones @john
- Set up team communication channels
- Schedule weekly review meetings due:2024-01-15
- Update stakeholder documentation #urgent
`;

        fs.writeFileSync(path.join(samplesDir, 'sample-tasks.md'), sampleTasks);
        console.log(chalk.green('  ✅ sample-tasks.md'));

        // Sample technical doc
        const sampleDoc = `# TBWA Retail Dashboard Technical Specification

## Overview
This document outlines the technical architecture for the TBWA retail insights dashboard.

## Requirements
- Real-time data processing
- Interactive visualizations  
- Multi-tenant architecture
- Mobile responsive design

## Architecture
The system uses a modern stack with React frontend, Node.js backend, and Supabase database.

## Implementation Plan
1. Database schema design
2. API development
3. Frontend implementation  
4. Testing and deployment
`;

        fs.writeFileSync(path.join(samplesDir, 'sample-spec.md'), sampleDoc);
        console.log(chalk.green('  ✅ sample-spec.md'));

        // Sample batch config
        const sampleBatch = {
            operations: [
                {
                    id: 'create-project',
                    service: 'asana',
                    action: 'createProject',
                    description: 'Create TBWA Dashboard project',
                    data: {
                        name: 'TBWA Retail Dashboard',
                        description: 'Implementation of retail insights dashboard',
                        sections: ['Backend', 'Frontend', 'Testing', 'Documentation']
                    }
                },
                {
                    id: 'create-repo',
                    service: 'github',
                    action: 'createRepository',
                    description: 'Create GitHub repository',
                    data: {
                        name: 'tbwa-retail-dashboard',
                        description: 'TBWA retail insights dashboard implementation',
                        private: false
                    }
                }
            ]
        };

        fs.writeFileSync(path.join(samplesDir, 'sample-batch.json'), JSON.stringify(sampleBatch, null, 2));
        console.log(chalk.green('  ✅ sample-batch.json'));
    }
}

// Run installer
if (require.main === module) {
    const installer = new BridgeInstaller();
    installer.install().catch(error => {
        console.error(chalk.red('Installation failed:'), error);
        process.exit(1);
    });
}

module.exports = BridgeInstaller;