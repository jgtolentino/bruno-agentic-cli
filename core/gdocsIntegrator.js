const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class GDocsIntegrator {
    constructor(config = {}) {
        this.config = {
            templatesDir: path.join(__dirname, '..', 'templates'),
            outputDir: path.join(__dirname, '..', 'output'),
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedExtensions: ['.md', '.txt', '.html'],
            ...config
        };
        
        this.requiredEnvVars = [
            'GOOGLE_APPLICATION_CREDENTIALS',
            'GOOGLE_DOCS_API_KEY'
        ];
    }

    log(message) {
        console.log(`📄 [GDocs] ${message}`);
    }

    error(message) {
        console.error(`❌ [GDocs] ${message}`);
    }

    validateEnvironment() {
        const missing = this.requiredEnvVars.filter(envVar => !process.env[envVar]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }

        // Check if Google credentials file exists
        if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
            throw new Error(`Google credentials file not found: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
        }

        this.log('✅ Environment validation passed');
        return true;
    }

    validateInputFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Input file not found: ${filePath}`);
        }

        const stats = fs.statSync(filePath);
        if (stats.size > this.config.maxFileSize) {
            throw new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxFileSize})`);
        }

        const ext = path.extname(filePath).toLowerCase();
        if (!this.config.allowedExtensions.includes(ext)) {
            throw new Error(`Unsupported file extension: ${ext}`);
        }

        this.log(`✅ File validation passed: ${path.basename(filePath)}`);
        return true;
    }

    async convertMarkdownToGDocs(inputFile, options = {}) {
        try {
            this.validateEnvironment();
            this.validateInputFile(inputFile);

            const {
                docTitle = path.basename(inputFile, path.extname(inputFile)),
                applyFormatting = true,
                shareable = false
            } = options;

            this.log(`Converting ${inputFile} to Google Docs...`);

            // Load conversion template
            const templatePath = path.join(this.config.templatesDir, 'google-docs-converter.yaml');
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Template not found: ${templatePath}`);
            }

            // Prepare conversion parameters
            const conversionParams = {
                INPUT_FILE: inputFile,
                DOC_TITLE: docTitle,
                GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                GOOGLE_DOCS_API_KEY: process.env.GOOGLE_DOCS_API_KEY
            };

            // Execute conversion
            const BrunoVerifier = require('./brunoVerifier');
            const verifier = new BrunoVerifier();

            // Load and process template
            const yaml = require('yaml');
            const templateContent = fs.readFileSync(templatePath, 'utf8');
            const tasks = yaml.parse(templateContent);

            let docId = null;
            let docUrl = null;

            // Execute conversion task
            for (const task of tasks) {
                if (task.id === 'md-to-gdocs') {
                    // Inject parameters into command
                    let command = task.command;
                    for (const [key, value] of Object.entries(conversionParams)) {
                        command = command.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
                    }

                    const result = await execAsync(command, {
                        env: { ...process.env, ...conversionParams }
                    });

                    // Extract document ID from output
                    const docUrlMatch = result.stdout.match(/https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/);
                    if (docUrlMatch) {
                        docId = docUrlMatch[1];
                        docUrl = docUrlMatch[0];
                        this.log(`✅ Document created: ${docUrl}`);
                    }
                }

                // Apply professional formatting if requested
                if (task.id === 'format-gdocs' && applyFormatting && docId) {
                    let formatCommand = task.command.replace(/\{\{DOC_ID\}\}/g, docId);
                    for (const [key, value] of Object.entries(conversionParams)) {
                        formatCommand = formatCommand.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
                    }

                    await execAsync(formatCommand, {
                        env: { ...process.env, ...conversionParams }
                    });
                    this.log('✅ Professional formatting applied');
                }
            }

            // Generate summary
            const summary = {
                success: true,
                inputFile,
                docTitle,
                docId,
                docUrl,
                timestamp: new Date().toISOString(),
                formattingApplied: applyFormatting
            };

            // Save summary
            const summaryPath = path.join(this.config.outputDir, `gdocs-conversion-${Date.now()}.json`);
            fs.mkdirSync(this.config.outputDir, { recursive: true });
            fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

            this.log(`✅ Conversion completed successfully`);
            this.log(`📄 Document URL: ${docUrl}`);
            this.log(`📊 Summary saved: ${summaryPath}`);

            return summary;

        } catch (error) {
            this.error(`Conversion failed: ${error.message}`);
            throw error;
        }
    }

    async batchConvertFiles(inputDir, pattern = '*.md', options = {}) {
        try {
            const glob = require('glob');
            const files = glob.sync(path.join(inputDir, pattern));

            if (files.length === 0) {
                this.log(`No files found matching pattern: ${pattern}`);
                return [];
            }

            this.log(`Found ${files.length} files to convert`);
            
            const results = [];
            for (const file of files) {
                try {
                    const result = await this.convertMarkdownToGDocs(file, options);
                    results.push(result);
                    
                    // Small delay between conversions to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    this.error(`Failed to convert ${file}: ${error.message}`);
                    results.push({
                        success: false,
                        inputFile: file,
                        error: error.message
                    });
                }
            }

            this.log(`✅ Batch conversion completed: ${results.filter(r => r.success).length}/${results.length} successful`);
            return results;

        } catch (error) {
            this.error(`Batch conversion failed: ${error.message}`);
            throw error;
        }
    }

    getAvailableTokens() {
        return {
            required: this.requiredEnvVars,
            optional: [
                'GOOGLE_DRIVE_API_KEY',
                'GOOGLE_SHEETS_API_KEY'
            ],
            current_status: this.requiredEnvVars.map(envVar => ({
                name: envVar,
                configured: !!process.env[envVar],
                file_exists: envVar === 'GOOGLE_APPLICATION_CREDENTIALS' ? 
                    fs.existsSync(process.env[envVar] || '') : null
            }))
        };
    }
}

module.exports = GDocsIntegrator;