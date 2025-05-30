const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const path = require('path');
require('dotenv').config({ path: '/Users/tbwa/.bruno/clodrep/.clodrep.env' });

const AsanaConnector = require('./connectors/asana');
const GoogleDocsConnector = require('./connectors/google-docs');
const SupabaseConnector = require('./connectors/supabase');
const GitHubConnector = require('./connectors/github');
const TaskProcessor = require('./processors/task-processor');
const DocProcessor = require('./processors/doc-processor');

class ClaudeMCPBridge {
    constructor() {
        this.app = express();
        this.port = process.env.BRIDGE_PORT || 3002;
        this.connectors = new Map();
        this.processors = new Map();
        this.setupLogging();
        this.setupMiddleware();
        this.setupConnectors();
        this.setupProcessors();
        this.setupRoutes();
    }

    setupLogging() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'claude-mcp-bridge' },
            transports: [
                new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
                new winston.transports.File({ filename: 'logs/combined.log' }),
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Request logging
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            next();
        });
    }

    setupConnectors() {
        try {
            // Initialize connectors with existing tokens
            if (process.env.ASANA_ACCESS_TOKEN) {
                this.connectors.set('asana', new AsanaConnector(process.env.ASANA_ACCESS_TOKEN));
                this.logger.info('✅ Asana connector initialized');
            }

            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                this.connectors.set('google-docs', new GoogleDocsConnector({
                    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS
                }));
                this.logger.info('✅ Google Docs connector initialized');
            }

            if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
                this.connectors.set('supabase', new SupabaseConnector({
                    url: process.env.SUPABASE_URL,
                    key: process.env.SUPABASE_ANON_KEY
                }));
                this.logger.info('✅ Supabase connector initialized');
            }

            if (process.env.GITHUB_TOKEN) {
                this.connectors.set('github', new GitHubConnector(process.env.GITHUB_TOKEN));
                this.logger.info('✅ GitHub connector initialized');
            }

        } catch (error) {
            this.logger.error('Failed to initialize connectors:', error);
        }
    }

    setupProcessors() {
        this.processors.set('task', new TaskProcessor());
        this.processors.set('doc', new DocProcessor());
        this.logger.info('✅ Processors initialized');
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                connectors: Array.from(this.connectors.keys()),
                processors: Array.from(this.processors.keys())
            });
        });

        // Main processing endpoint
        this.app.post('/api/process', async (req, res) => {
            try {
                const { service, action, data, options = {} } = req.body;

                if (!service || !action) {
                    return res.status(400).json({
                        error: 'Missing required fields: service, action'
                    });
                }

                const connector = this.connectors.get(service);
                if (!connector) {
                    return res.status(404).json({
                        error: `Service not available: ${service}`,
                        availableServices: Array.from(this.connectors.keys())
                    });
                }

                // Process the request
                const result = await this.processRequest(service, action, data, options);
                
                res.json({
                    success: true,
                    service,
                    action,
                    result,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                this.logger.error('Request processing failed:', error);
                res.status(500).json({
                    error: error.message,
                    service: req.body.service,
                    action: req.body.action
                });
            }
        });

        // Batch processing endpoint
        this.app.post('/api/batch', async (req, res) => {
            try {
                const { commands } = req.body;
                
                if (!Array.isArray(commands)) {
                    return res.status(400).json({
                        error: 'commands must be an array'
                    });
                }

                const results = [];
                for (const command of commands) {
                    try {
                        const result = await this.processRequest(
                            command.service,
                            command.action,
                            command.data,
                            command.options || {}
                        );
                        results.push({ success: true, result, command: command.id });
                    } catch (error) {
                        results.push({ success: false, error: error.message, command: command.id });
                    }
                }

                res.json({
                    success: true,
                    processed: results.length,
                    results
                });

            } catch (error) {
                this.logger.error('Batch processing failed:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Service-specific endpoints
        this.app.get('/api/services/:service/status', (req, res) => {
            const { service } = req.params;
            const connector = this.connectors.get(service);
            
            if (!connector) {
                return res.status(404).json({ error: `Service not found: ${service}` });
            }

            res.json({
                service,
                available: true,
                methods: typeof connector.getMethods === 'function' ? connector.getMethods() : []
            });
        });

        // Configuration endpoint
        this.app.get('/api/config', (req, res) => {
            res.json({
                services: Array.from(this.connectors.keys()),
                processors: Array.from(this.processors.keys()),
                environment: {
                    hasAsanaToken: !!process.env.ASANA_ACCESS_TOKEN,
                    hasGoogleCreds: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
                    hasGoogleDocsKey: !!process.env.GOOGLE_DOCS_API_KEY,
                    hasGitHubToken: !!process.env.GITHUB_TOKEN,
                    hasSupabaseConfig: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
                }
            });
        });
    }

    async processRequest(service, action, data, options) {
        const connector = this.connectors.get(service);
        
        if (!connector[action]) {
            throw new Error(`Action not supported: ${action} for service ${service}`);
        }

        // Apply preprocessing if needed
        if (options.preprocess) {
            const processor = this.processors.get(options.preprocess);
            if (processor) {
                data = await processor.process(data);
            }
        }

        // Execute the action
        const result = await connector[action](data, options);

        // Apply post-processing if needed
        if (options.postprocess) {
            const processor = this.processors.get(options.postprocess);
            if (processor) {
                return await processor.process(result);
            }
        }

        return result;
    }

    start() {
        this.app.listen(this.port, () => {
            this.logger.info(`🚀 Claude MCP Bridge running on port ${this.port}`);
            this.logger.info(`🔗 Available services: ${Array.from(this.connectors.keys()).join(', ')}`);
            this.logger.info(`📊 Health check: http://localhost:${this.port}/health`);
        });
    }
}

// Start the server
if (require.main === module) {
    const bridge = new ClaudeMCPBridge();
    bridge.start();
}

module.exports = ClaudeMCPBridge;