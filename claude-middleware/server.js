#!/usr/bin/env node

/**
 * Claude Middleware Bridge
 * Custom middleware for Claude Desktop ↔ Google Docs + File System integration
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const chokidar = require('chokidar');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class ClaudeMiddlewareBridge {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    
    this.port = process.env.PORT || 3141;
    this.dataDir = path.join(__dirname, 'data');
    this.mountDir = process.env.MOUNT_DIR || '/tmp/claude';
    
    // Google APIs
    this.auth = null;
    this.docs = null;
    this.drive = null;
    
    // Claude sync
    this.claudeSyncDir = path.join(process.env.HOME || __dirname, 'claude', 'sync');
    this.watchers = new Map();
    this.activeClients = new Set();
    
    this.setupLogger();
    this.setupDirectories();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupFileWatchers();
    this.initializeGoogleAPIs();
  }

  setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(this.dataDir, 'middleware.log') })
      ]
    });
  }

  async setupDirectories() {
    await fs.ensureDir(this.dataDir);
    await fs.ensureDir(this.claudeSyncDir);
    await fs.ensureDir(this.mountDir);
    
    // Create Claude sync files if they don't exist
    const syncFiles = ['claude-output.txt', 'claude-input.md', 'claude-commands.json'];
    for (const file of syncFiles) {
      const filePath = path.join(this.claudeSyncDir, file);
      if (!await fs.pathExists(filePath)) {
        await fs.writeFile(filePath, '');
      }
    }
    
    this.logger.info(`Directories ready: data=${this.dataDir}, sync=${this.claudeSyncDir}, mount=${this.mountDir}`);
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.text({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Logging middleware
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`, { 
        ip: req.ip, 
        userAgent: req.get('User-Agent') 
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: require('./package.json').version,
        googledocs: !!this.docs,
        sync_dir: this.claudeSyncDir,
        mount_dir: this.mountDir
      });
    });

    // Main command endpoint
    this.app.post('/command', async (req, res) => {
      try {
        const result = await this.handleCommand(req.body);
        res.json(result);
      } catch (error) {
        this.logger.error('Command failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Claude I/O endpoints
    this.app.post('/claude/input', async (req, res) => {
      try {
        const result = await this.handleClaudeInput(req.body);
        res.json(result);
      } catch (error) {
        this.logger.error('Claude input failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/claude/output', async (req, res) => {
      try {
        const result = await this.getClaudeOutput();
        res.json(result);
      } catch (error) {
        this.logger.error('Claude output failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Google Docs endpoints
    this.app.post('/gdocs/create', async (req, res) => {
      try {
        const result = await this.createGoogleDoc(req.body);
        res.json(result);
      } catch (error) {
        this.logger.error('Google Docs create failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/gdocs/update', async (req, res) => {
      try {
        const result = await this.updateGoogleDoc(req.body);
        res.json(result);
      } catch (error) {
        this.logger.error('Google Docs update failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/gdocs/read/:docId', async (req, res) => {
      try {
        const result = await this.readGoogleDoc(req.params.docId);
        res.json(result);
      } catch (error) {
        this.logger.error('Google Docs read failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // File system endpoints
    this.app.post('/fs/read', async (req, res) => {
      try {
        const result = await this.readFile(req.body);
        res.json(result);
      } catch (error) {
        this.logger.error('File read failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/fs/write', async (req, res) => {
      try {
        const result = await this.writeFile(req.body);
        res.json(result);
      } catch (error) {
        this.logger.error('File write failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Bridge status
    this.app.get('/status', (req, res) => {
      res.json({
        active_clients: this.activeClients.size,
        watchers: Array.from(this.watchers.keys()),
        google_auth: !!this.auth,
        uptime: process.uptime()
      });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      this.logger.error('Express error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      this.activeClients.add(clientId);
      ws.clientId = clientId;
      
      this.logger.info(`WebSocket client connected: ${clientId}`);

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          const result = await this.handleWebSocketCommand(data, ws);
          ws.send(JSON.stringify({ type: 'result', data: result }));
        } catch (error) {
          this.logger.error('WebSocket command failed:', error);
          ws.send(JSON.stringify({ type: 'error', error: error.message }));
        }
      });

      ws.on('close', () => {
        this.activeClients.delete(clientId);
        this.logger.info(`WebSocket client disconnected: ${clientId}`);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        clientId: clientId,
        message: 'Claude Middleware Bridge connected'
      }));
    });
  }

  setupFileWatchers() {
    // Watch Claude output file
    const claudeOutputFile = path.join(this.claudeSyncDir, 'claude-output.txt');
    const outputWatcher = chokidar.watch(claudeOutputFile, { ignoreInitial: true });
    
    outputWatcher.on('change', async (filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = await this.parseClaudeOutput(content);
        
        this.logger.info('Claude output detected');
        this.broadcastToClients({
          type: 'claude-output',
          content: parsed
        });
        
        // Auto-process if it contains commands
        if (parsed.commands && parsed.commands.length > 0) {
          for (const command of parsed.commands) {
            await this.handleCommand(command);
          }
        }
        
      } catch (error) {
        this.logger.error('Failed to process Claude output:', error);
      }
    });
    
    this.watchers.set('claude-output', outputWatcher);
    this.logger.info('File watchers initialized');
  }

  async initializeGoogleAPIs() {
    try {
      const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;
      if (!credentialsPath || !await fs.pathExists(credentialsPath)) {
        this.logger.warn('Google credentials not found - Google Docs integration disabled');
        return;
      }

      this.auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      this.docs = google.docs({ version: 'v1', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });

      this.logger.info('Google APIs initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google APIs:', error);
    }
  }

  // Command handling
  async handleCommand(commandData) {
    const { intent, target, payload } = commandData;
    
    this.logger.info('Processing command:', { intent, target });

    switch (`${intent}:${target}`) {
      case 'read:google_docs':
        return await this.readGoogleDoc(payload.docId || payload.docTitle);
      
      case 'write:google_docs':
        return await this.createGoogleDoc(payload);
      
      case 'edit:google_docs':
        return await this.updateGoogleDoc(payload);
      
      case 'read:file':
        return await this.readFile({ filePath: payload.path || payload.filePath });
      
      case 'write:file':
        return await this.writeFile({ 
          filePath: payload.path || payload.filePath, 
          content: payload.content 
        });
      
      case 'list:files':
        return await this.listFiles(payload);
      
      case 'watch:file':
        return await this.watchFile(payload);
      
      default:
        throw new Error(`Unknown command: ${intent}:${target}`);
    }
  }

  async handleWebSocketCommand(data, ws) {
    const result = await this.handleCommand(data);
    
    // Send progress updates for long operations
    if (data.streaming) {
      ws.send(JSON.stringify({
        type: 'progress',
        message: 'Command completed'
      }));
    }
    
    return result;
  }

  // Claude I/O handling
  async handleClaudeInput(data) {
    const { content, metadata = {} } = data;
    const inputFile = path.join(this.claudeSyncDir, 'claude-input.md');
    
    let formattedContent = content;
    if (metadata.title) {
      formattedContent = `# ${metadata.title}\n\n${content}`;
    }
    
    if (Object.keys(metadata).length > 0) {
      formattedContent = `---\n${JSON.stringify(metadata, null, 2)}\n---\n\n${formattedContent}`;
    }
    
    await fs.writeFile(inputFile, formattedContent, 'utf8');
    
    this.logger.info('Claude input written');
    return {
      success: true,
      file: inputFile,
      timestamp: new Date().toISOString()
    };
  }

  async getClaudeOutput() {
    const outputFile = path.join(this.claudeSyncDir, 'claude-output.txt');
    
    try {
      const content = await fs.readFile(outputFile, 'utf8');
      const parsed = await this.parseClaudeOutput(content);
      
      return {
        raw: content,
        parsed: parsed,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { raw: '', parsed: {}, timestamp: new Date().toISOString() };
      }
      throw error;
    }
  }

  async parseClaudeOutput(content) {
    const lines = content.split('\n');
    let metadata = {};
    let actualContent = content;
    let commands = [];

    // Parse YAML frontmatter
    if (content.startsWith('---')) {
      const yamlEndIndex = lines.slice(1).indexOf('---');
      if (yamlEndIndex > 0) {
        try {
          const yamlContent = lines.slice(1, yamlEndIndex + 1).join('\n');
          const yaml = require('yaml');
          metadata = yaml.parse(yamlContent);
          actualContent = lines.slice(yamlEndIndex + 2).join('\n');
        } catch (error) {
          this.logger.warn('Failed to parse YAML metadata:', error);
        }
      }
    }

    // Extract commands (lines starting with :)
    const commandRegex = /^:(\w+)\s+(.+)$/gm;
    let match;
    while ((match = commandRegex.exec(actualContent)) !== null) {
      commands.push({
        intent: match[1],
        instruction: match[2]
      });
    }

    return {
      content: actualContent,
      metadata: metadata,
      commands: commands,
      wordCount: actualContent.split(/\s+/).length,
      characterCount: actualContent.length
    };
  }

  // Google Docs operations
  async createGoogleDoc(data) {
    if (!this.docs) {
      throw new Error('Google Docs not initialized');
    }

    const { title, content = '', sharing = {} } = data;
    
    // Create document
    const createResult = await this.docs.documents.create({
      requestBody: { title: title }
    });

    const documentId = createResult.data.documentId;
    
    // Add content if provided
    if (content) {
      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: [{
            insertText: {
              text: content,
              location: { index: 1 }
            }
          }]
        }
      });
    }

    // Handle sharing
    if (sharing.email) {
      await this.drive.permissions.create({
        fileId: documentId,
        requestBody: {
          role: sharing.role || 'reader',
          type: 'user',
          emailAddress: sharing.email
        }
      });
    }

    this.logger.info(`Created Google Doc: ${title} (${documentId})`);
    
    return {
      documentId: documentId,
      title: title,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
      success: true
    };
  }

  async readGoogleDoc(docIdOrTitle) {
    if (!this.docs) {
      throw new Error('Google Docs not initialized');
    }

    let documentId = docIdOrTitle;
    
    // If it looks like a title, search for it
    if (!docIdOrTitle.match(/^[a-zA-Z0-9_-]{20,}$/)) {
      const searchResults = await this.drive.files.list({
        q: `name contains '${docIdOrTitle}' and mimeType='application/vnd.google-apps.document'`,
        fields: 'files(id,name)'
      });
      
      if (searchResults.data.files.length === 0) {
        throw new Error(`Document not found: ${docIdOrTitle}`);
      }
      
      documentId = searchResults.data.files[0].id;
    }

    const doc = await this.docs.documents.get({ documentId });
    const content = this.extractTextFromDocument(doc.data);

    return {
      documentId: documentId,
      title: doc.data.title,
      content: content,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
      lastModified: doc.data.revisionId
    };
  }

  async updateGoogleDoc(data) {
    if (!this.docs) {
      throw new Error('Google Docs not initialized');
    }

    const { documentId, content, operation = 'append' } = data;
    let requests = [];

    switch (operation) {
      case 'replace':
        requests.push({
          deleteContentRange: {
            range: { startIndex: 1, endIndex: -1 }
          }
        });
        requests.push({
          insertText: {
            text: content,
            location: { index: 1 }
          }
        });
        break;
        
      case 'append':
        requests.push({
          insertText: {
            text: '\n\n' + content,
            location: { endOfSegmentLocation: {} }
          }
        });
        break;
        
      case 'prepend':
        requests.push({
          insertText: {
            text: content + '\n\n',
            location: { index: 1 }
          }
        });
        break;
    }

    await this.docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: { requests }
    });

    this.logger.info(`Updated Google Doc: ${documentId} (${operation})`);
    
    return {
      documentId: documentId,
      operation: operation,
      success: true,
      url: `https://docs.google.com/document/d/${documentId}/edit`
    };
  }

  extractTextFromDocument(doc) {
    let text = '';
    
    if (doc.body && doc.body.content) {
      for (const element of doc.body.content) {
        if (element.paragraph) {
          for (const textElement of element.paragraph.elements || []) {
            if (textElement.textRun) {
              text += textElement.textRun.content;
            }
          }
        }
      }
    }
    
    return text.trim();
  }

  // File system operations
  async readFile(data) {
    const { filePath } = data;
    const fullPath = this.resolvePath(filePath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      const stats = await fs.stat(fullPath);
      
      return {
        filePath: fullPath,
        content: content,
        size: stats.size,
        modified: stats.mtime,
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to read file ${fullPath}: ${error.message}`);
    }
  }

  async writeFile(data) {
    const { filePath, content, mode = 'write' } = data;
    const fullPath = this.resolvePath(filePath);
    
    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(fullPath));
      
      if (mode === 'append') {
        await fs.appendFile(fullPath, content, 'utf8');
      } else {
        await fs.writeFile(fullPath, content, 'utf8');
      }
      
      const stats = await fs.stat(fullPath);
      
      this.logger.info(`File ${mode}: ${fullPath}`);
      
      return {
        filePath: fullPath,
        size: stats.size,
        mode: mode,
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to write file ${fullPath}: ${error.message}`);
    }
  }

  async listFiles(data) {
    const { directory = this.mountDir, pattern } = data;
    const fullPath = this.resolvePath(directory);
    
    try {
      let files = await fs.readdir(fullPath, { withFileTypes: true });
      
      if (pattern) {
        const regex = new RegExp(pattern);
        files = files.filter(file => regex.test(file.name));
      }
      
      const fileList = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(fullPath, file.name);
          const stats = await fs.stat(filePath);
          
          return {
            name: file.name,
            path: filePath,
            type: file.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime
          };
        })
      );
      
      return {
        directory: fullPath,
        files: fileList,
        count: fileList.length
      };
    } catch (error) {
      throw new Error(`Failed to list directory ${fullPath}: ${error.message}`);
    }
  }

  async watchFile(data) {
    const { filePath, events = ['change'] } = data;
    const fullPath = this.resolvePath(filePath);
    const watcherId = uuidv4();
    
    const watcher = chokidar.watch(fullPath, { ignoreInitial: true });
    
    events.forEach(event => {
      watcher.on(event, (path) => {
        this.broadcastToClients({
          type: 'file-event',
          event: event,
          path: path,
          watcherId: watcherId
        });
      });
    });
    
    this.watchers.set(watcherId, watcher);
    
    return {
      watcherId: watcherId,
      filePath: fullPath,
      events: events,
      success: true
    };
  }

  resolvePath(filePath) {
    // Security: restrict to mount directory
    if (path.isAbsolute(filePath)) {
      // Allow absolute paths within mount directory
      if (filePath.startsWith(this.mountDir)) {
        return filePath;
      }
      throw new Error('Absolute paths outside mount directory not allowed');
    }
    
    // Resolve relative paths within mount directory
    return path.resolve(this.mountDir, filePath);
  }

  // Utility methods
  broadcastToClients(message) {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  async start() {
    this.server.listen(this.port, () => {
      this.logger.info(`🚀 Claude Middleware Bridge running on port ${this.port}`);
      this.logger.info(`📡 WebSocket available at ws://localhost:${this.port}`);
      this.logger.info(`📁 Mount directory: ${this.mountDir}`);
      this.logger.info(`🔄 Claude sync directory: ${this.claudeSyncDir}`);
      
      console.log('\n🔗 Available Endpoints:');
      console.log('  POST /command               - Main command processor');
      console.log('  POST /claude/input          - Send input to Claude');
      console.log('  GET  /claude/output         - Get Claude output');
      console.log('  POST /gdocs/create          - Create Google Doc');
      console.log('  POST /gdocs/update          - Update Google Doc');
      console.log('  GET  /gdocs/read/:docId     - Read Google Doc');
      console.log('  POST /fs/read               - Read file');
      console.log('  POST /fs/write              - Write file');
      console.log('  GET  /health                - Health check');
      console.log('  GET  /status                - Bridge status');
      
      console.log('\n📋 Quick Examples:');
      console.log('  curl -X POST http://localhost:3141/command \\');
      console.log('    -H "Content-Type: application/json" \\');
      console.log('    -d \'{"intent":"write","target":"file","payload":{"path":"test.txt","content":"Hello Claude"}}\'');
      console.log('');
      console.log('  echo "Claude test content" > ~/claude/sync/claude-output.txt');
    });
  }

  async shutdown() {
    this.logger.info('Shutting down Claude Middleware Bridge...');
    
    // Close file watchers
    for (const [id, watcher] of this.watchers) {
      watcher.close();
    }
    
    // Close WebSocket connections
    this.wss.clients.forEach(client => {
      client.close();
    });
    
    this.server.close();
    this.logger.info('Shutdown complete');
  }
}

// Start the server
if (require.main === module) {
  const bridge = new ClaudeMiddlewareBridge();
  
  bridge.start().catch(error => {
    console.error('Failed to start Claude Middleware Bridge:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => bridge.shutdown());
  process.on('SIGINT', () => bridge.shutdown());
}

module.exports = ClaudeMiddlewareBridge;