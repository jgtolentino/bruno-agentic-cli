/**
 * ClaudeNode - Custom N8N node for Claude CLI integration
 * Handles Claude input/output, file monitoring, and command execution
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const chokidar = require('chokidar');

class ClaudeNode {
  constructor(parameters = {}, logger) {
    this.parameters = parameters;
    this.logger = logger;
    this.type = 'claude';
    this.displayName = 'Claude';
    this.description = 'Interact with Claude CLI and monitor Claude I/O';
    
    // Default parameters
    this.operation = parameters.operation || 'watch-output';
    this.claudeSyncDir = parameters.claudeSyncDir || path.join(process.env.HOME || __dirname, 'claude', 'sync');
    this.timeout = parameters.timeout || 30000;
  }

  async execute(inputData, executionContext) {
    this.logger.info(`Executing Claude node operation: ${this.operation}`);

    switch (this.operation) {
      case 'watch-output':
        return await this.watchClaudeOutput(inputData, executionContext);
      
      case 'send-input':
        return await this.sendClaudeInput(inputData, executionContext);
      
      case 'execute-command':
        return await this.executeClaudeCommand(inputData, executionContext);
      
      case 'process-suggestions':
        return await this.processClaudeSuggestions(inputData, executionContext);
      
      case 'read-output':
        return await this.readClaudeOutput(inputData, executionContext);
      
      default:
        throw new Error(`Unknown Claude operation: ${this.operation}`);
    }
  }

  async watchClaudeOutput(inputData, executionContext) {
    const outputFile = path.join(this.claudeSyncDir, 'claude-output.txt');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        watcher.close();
        reject(new Error('Claude output watch timeout'));
      }, this.timeout);

      const watcher = chokidar.watch(outputFile, {
        persistent: false,
        ignoreInitial: false
      });

      watcher.on('change', async () => {
        try {
          clearTimeout(timeout);
          watcher.close();
          
          const content = await fs.readFile(outputFile, 'utf8');
          const result = await this.parseClaudeOutput(content);
          
          this.logger.info('Claude output detected and processed');
          resolve(result);
          
        } catch (error) {
          clearTimeout(timeout);
          watcher.close();
          reject(error);
        }
      });

      watcher.on('error', (error) => {
        clearTimeout(timeout);
        watcher.close();
        reject(error);
      });
    });
  }

  async sendClaudeInput(inputData, executionContext) {
    const inputFile = path.join(this.claudeSyncDir, 'claude-input.md');
    const input = inputData.main?.[0];
    
    if (!input) {
      throw new Error('No input data provided for Claude');
    }

    let content;
    if (typeof input === 'string') {
      content = input;
    } else if (input.content) {
      content = input.content;
    } else {
      content = JSON.stringify(input, null, 2);
    }

    // Add metadata if provided
    if (input.metadata) {
      content = `---\n${JSON.stringify(input.metadata, null, 2)}\n---\n\n${content}`;
    }

    await fs.writeFile(inputFile, content, 'utf8');
    
    this.logger.info(`Claude input written to: ${inputFile}`);
    
    return {
      success: true,
      inputFile: inputFile,
      contentLength: content.length,
      timestamp: new Date().toISOString()
    };
  }

  async executeClaudeCommand(inputData, executionContext) {
    const input = inputData.main?.[0];
    const command = input?.command || this.parameters.command;
    
    if (!command) {
      throw new Error('No command specified for Claude execution');
    }

    return new Promise((resolve, reject) => {
      const claudeProcess = spawn('claude', command.split(' '), {
        stdio: 'pipe',
        env: { ...process.env, ...this.parameters.env }
      });

      let stdout = '';
      let stderr = '';

      claudeProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      claudeProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      claudeProcess.on('close', (code) => {
        const result = {
          command: command,
          exitCode: code,
          stdout: stdout,
          stderr: stderr,
          success: code === 0,
          timestamp: new Date().toISOString()
        };

        if (code === 0) {
          this.logger.info(`Claude command executed successfully: ${command}`);
          resolve(result);
        } else {
          this.logger.error(`Claude command failed with code ${code}: ${command}`);
          reject(new Error(`Claude command failed: ${stderr || stdout}`));
        }
      });

      claudeProcess.on('error', (error) => {
        this.logger.error(`Claude process error: ${error.message}`);
        reject(error);
      });

      // Send input if provided
      if (input?.stdin) {
        claudeProcess.stdin.write(input.stdin);
        claudeProcess.stdin.end();
      }
    });
  }

  async processClaudeSuggestions(inputData, executionContext) {
    const suggestionsFile = path.join(this.claudeSyncDir, 'claude-suggestions.json');
    
    try {
      const content = await fs.readFile(suggestionsFile, 'utf8');
      const suggestions = JSON.parse(content);
      
      // Validate suggestions format
      if (!suggestions.documentId || !Array.isArray(suggestions.edits)) {
        throw new Error('Invalid suggestions format');
      }

      // Process and format suggestions for Google Docs API
      const processedSuggestions = {
        documentId: suggestions.documentId,
        requests: [],
        metadata: suggestions.metadata || {},
        timestamp: new Date().toISOString()
      };

      for (const edit of suggestions.edits) {
        const request = await this.convertEditToGoogleDocsRequest(edit);
        if (request) {
          processedSuggestions.requests.push(request);
        }
      }

      this.logger.info(`Processed ${processedSuggestions.requests.length} Claude suggestions`);
      
      return processedSuggestions;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn('Claude suggestions file not found');
        return {
          documentId: null,
          requests: [],
          metadata: {},
          timestamp: new Date().toISOString()
        };
      }
      throw error;
    }
  }

  async readClaudeOutput(inputData, executionContext) {
    const outputFile = path.join(this.claudeSyncDir, 'claude-output.txt');
    
    try {
      const content = await fs.readFile(outputFile, 'utf8');
      const result = await this.parseClaudeOutput(content);
      
      this.logger.info('Claude output read and parsed successfully');
      return result;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn('Claude output file not found');
        return {
          content: '',
          metadata: {},
          timestamp: new Date().toISOString()
        };
      }
      throw error;
    }
  }

  async parseClaudeOutput(rawContent) {
    let content = rawContent.trim();
    let metadata = {};

    try {
      // Check for JSON metadata header
      if (content.startsWith('```json')) {
        const lines = content.split('\n');
        const jsonEndIndex = lines.slice(1).indexOf('```');
        
        if (jsonEndIndex > 0) {
          const jsonContent = lines.slice(1, jsonEndIndex + 1).join('\n');
          metadata = JSON.parse(jsonContent);
          content = lines.slice(jsonEndIndex + 2).join('\n').trim();
        }
      }
      
      // Check for YAML frontmatter
      else if (content.startsWith('---')) {
        const lines = content.split('\n');
        const yamlEndIndex = lines.slice(1).indexOf('---');
        
        if (yamlEndIndex > 0) {
          const yamlContent = lines.slice(1, yamlEndIndex + 1).join('\n');
          const yaml = require('yaml');
          metadata = yaml.parse(yamlContent);
          content = lines.slice(yamlEndIndex + 2).join('\n').trim();
        }
      }
    } catch (error) {
      this.logger.warn('Failed to parse Claude output metadata:', error);
    }

    return {
      content: content,
      metadata: metadata,
      rawContent: rawContent,
      wordCount: content.split(/\s+/).length,
      characterCount: content.length,
      timestamp: new Date().toISOString()
    };
  }

  async convertEditToGoogleDocsRequest(edit) {
    switch (edit.type) {
      case 'insert':
        return {
          insertText: {
            text: edit.text,
            location: edit.location || { index: 1 }
          }
        };
      
      case 'replace':
        return [
          {
            deleteContentRange: {
              range: edit.range
            }
          },
          {
            insertText: {
              text: edit.newText,
              location: { index: edit.range.startIndex }
            }
          }
        ];
      
      case 'delete':
        return {
          deleteContentRange: {
            range: edit.range
          }
        };
      
      case 'format':
        return {
          updateTextStyle: {
            range: edit.range,
            textStyle: edit.style,
            fields: Object.keys(edit.style).join(',')
          }
        };
      
      default:
        this.logger.warn(`Unknown edit type: ${edit.type}`);
        return null;
    }
  }

  // Node metadata for n8n interface
  static getNodeProperties() {
    return {
      displayName: 'Claude',
      name: 'claude',
      icon: 'fa:robot',
      group: ['input', 'output'],
      version: 1,
      description: 'Interact with Claude CLI and monitor Claude I/O',
      defaults: {
        name: 'Claude',
        color: '#1f77b4'
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        {
          displayName: 'Operation',
          name: 'operation',
          type: 'options',
          options: [
            {
              name: 'Watch Output',
              value: 'watch-output',
              description: 'Monitor Claude output file for changes'
            },
            {
              name: 'Send Input',
              value: 'send-input',
              description: 'Send input to Claude via file'
            },
            {
              name: 'Execute Command',
              value: 'execute-command',
              description: 'Execute Claude CLI command'
            },
            {
              name: 'Process Suggestions',
              value: 'process-suggestions',
              description: 'Process Claude edit suggestions'
            },
            {
              name: 'Read Output',
              value: 'read-output',
              description: 'Read Claude output file once'
            }
          ],
          default: 'watch-output'
        },
        {
          displayName: 'Claude Sync Directory',
          name: 'claudeSyncDir',
          type: 'string',
          default: '~/claude/sync',
          description: 'Directory where Claude sync files are located'
        },
        {
          displayName: 'Timeout (ms)',
          name: 'timeout',
          type: 'number',
          default: 30000,
          description: 'Timeout for watch operations'
        },
        {
          displayName: 'Command',
          name: 'command',
          type: 'string',
          default: '',
          description: 'Claude CLI command to execute',
          displayOptions: {
            show: {
              operation: ['execute-command']
            }
          }
        }
      ]
    };
  }
}

module.exports = ClaudeNode;