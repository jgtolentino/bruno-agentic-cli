#!/usr/bin/env node

/**
 * Claude N8N Orchestrator - Custom N8N Instance
 * Built specifically for Claude ↔ Google Docs orchestration
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');
require('dotenv').config();

// Import our custom modules
const WorkflowEngine = require('./src/core/WorkflowEngine');
const ClaudeNode = require('./src/nodes/ClaudeNode');
const GoogleDocsNode = require('./src/nodes/GoogleDocsNode');
const FileWatcherNode = require('./src/nodes/FileWatcherNode');
const WebhookNode = require('./src/nodes/WebhookNode');
const WorkflowManager = require('./src/core/WorkflowManager');
const AuthManager = require('./src/core/AuthManager');

class ClaudeN8NServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 5678;
    this.dataDir = path.join(__dirname, 'data');
    this.workflowsDir = path.join(this.dataDir, 'workflows');
    this.logsDir = path.join(this.dataDir, 'logs');
    
    this.setupLogger();
    this.setupDirectories();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.initializeComponents();
  }

  setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'claude-n8n' },
      transports: [
        new winston.transports.File({ 
          filename: path.join(this.logsDir, 'error.log'), 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: path.join(this.logsDir, 'combined.log') 
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  async setupDirectories() {
    await fs.ensureDir(this.dataDir);
    await fs.ensureDir(this.workflowsDir);
    await fs.ensureDir(this.logsDir);
    await fs.ensureDir(path.join(this.dataDir, 'credentials'));
    await fs.ensureDir(path.join(this.dataDir, 'executions'));
    await fs.ensureDir(path.join(this.dataDir, 'temp'));
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Serve static files
    this.app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
    this.app.use('/editor', express.static(path.join(__dirname, 'public')));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: require('./package.json').version
      });
    });

    // API routes
    this.app.use('/api/workflows', require('./src/routes/workflows'));
    this.app.use('/api/executions', require('./src/routes/executions'));
    this.app.use('/api/nodes', require('./src/routes/nodes'));
    this.app.use('/api/credentials', require('./src/routes/credentials'));
    this.app.use('/api/claude', require('./src/routes/claude'));
    this.app.use('/api/gdocs', require('./src/routes/gdocs'));

    // Webhook endpoints
    this.app.use('/webhook', require('./src/routes/webhooks'));

    // Main editor interface
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public/index.html'));
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      this.logger.error('Express error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });
  }

  setupSocketIO() {
    this.io.on('connection', (socket) => {
      this.logger.info(`Client connected: ${socket.id}`);

      socket.on('join-workflow', (workflowId) => {
        socket.join(`workflow-${workflowId}`);
        this.logger.info(`Client ${socket.id} joined workflow ${workflowId}`);
      });

      socket.on('execute-workflow', async (data) => {
        try {
          const { workflowId, triggerData } = data;
          this.logger.info(`Executing workflow ${workflowId} from socket ${socket.id}`);
          
          const execution = await this.workflowEngine.executeWorkflow(workflowId, triggerData);
          
          socket.emit('workflow-execution-started', {
            executionId: execution.id,
            workflowId: workflowId
          });
          
        } catch (error) {
          this.logger.error('Socket workflow execution error:', error);
          socket.emit('workflow-execution-error', {
            error: error.message
          });
        }
      });

      socket.on('disconnect', () => {
        this.logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  async initializeComponents() {
    try {
      // Initialize core components
      this.authManager = new AuthManager(this.dataDir);
      this.workflowManager = new WorkflowManager(this.workflowsDir, this.logger);
      this.workflowEngine = new WorkflowEngine(this.dataDir, this.logger, this.io);

      // Register custom nodes
      this.workflowEngine.registerNode('claude', ClaudeNode);
      this.workflowEngine.registerNode('googleDocs', GoogleDocsNode);
      this.workflowEngine.registerNode('fileWatcher', FileWatcherNode);
      this.workflowEngine.registerNode('webhook', WebhookNode);

      // Load existing workflows
      await this.workflowManager.loadWorkflows();

      // Set up Claude sync directories
      await this.setupClaudeSync();

      this.logger.info('Claude N8N Orchestrator initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize components:', error);
      throw error;
    }
  }

  async setupClaudeSync() {
    const claudeSyncDir = path.join(process.env.HOME || __dirname, 'claude', 'sync');
    await fs.ensureDir(claudeSyncDir);
    
    // Create default sync files if they don't exist
    const syncFiles = [
      'claude-output.txt',
      'claude-input.md',
      'claude-suggestions.json'
    ];

    for (const file of syncFiles) {
      const filePath = path.join(claudeSyncDir, file);
      if (!await fs.pathExists(filePath)) {
        await fs.writeFile(filePath, '');
        this.logger.info(`Created sync file: ${filePath}`);
      }
    }

    this.logger.info(`Claude sync directory ready: ${claudeSyncDir}`);
  }

  broadcastToWorkflow(workflowId, event, data) {
    this.io.to(`workflow-${workflowId}`).emit(event, data);
  }

  async start() {
    try {
      this.server.listen(this.port, () => {
        this.logger.info(`🚀 Claude N8N Orchestrator running on port ${this.port}`);
        this.logger.info(`📝 Editor available at: http://localhost:${this.port}`);
        this.logger.info(`🔗 API available at: http://localhost:${this.port}/api`);
        this.logger.info(`📁 Data directory: ${this.dataDir}`);
        
        // Print available endpoints
        console.log('\n📋 Available Endpoints:');
        console.log('  GET  /health                   - Health check');
        console.log('  GET  /                         - Workflow editor');
        console.log('  GET  /api/workflows           - List workflows');
        console.log('  POST /api/workflows           - Create workflow');
        console.log('  GET  /api/executions          - List executions');
        console.log('  POST /webhook/claude-input    - Claude input webhook');
        console.log('  POST /webhook/gdocs-sync      - Google Docs sync webhook');
        
        console.log('\n🔧 Environment:');
        console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
        console.log(`  LOG_LEVEL: ${process.env.LOG_LEVEL || 'info'}`);
        console.log(`  GOOGLE_CREDENTIALS_PATH: ${process.env.GOOGLE_CREDENTIALS_PATH ? '✓ Set' : '✗ Not set'}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async gracefulShutdown(signal) {
    this.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    this.server.close(async () => {
      this.logger.info('HTTP server closed');
      
      // Clean up resources
      if (this.workflowEngine) {
        await this.workflowEngine.shutdown();
      }
      
      this.logger.info('Graceful shutdown completed');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      this.logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  }
}

// Start the server
if (require.main === module) {
  const server = new ClaudeN8NServer();
  server.start().catch(error => {
    console.error('Failed to start Claude N8N server:', error);
    process.exit(1);
  });
}

module.exports = ClaudeN8NServer;