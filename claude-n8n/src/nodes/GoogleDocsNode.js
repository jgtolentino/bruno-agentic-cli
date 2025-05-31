/**
 * GoogleDocsNode - Custom N8N node for Google Docs integration
 * Handles document creation, reading, updating, and batch operations
 */

const { google } = require('googleapis');
const fs = require('fs-extra');
const TurndownService = require('turndown');
const MarkdownIt = require('markdown-it');

class GoogleDocsNode {
  constructor(parameters = {}, logger) {
    this.parameters = parameters;
    this.logger = logger;
    this.type = 'googleDocs';
    this.displayName = 'Google Docs';
    this.description = 'Create, read, and update Google Docs';
    
    // Default parameters
    this.operation = parameters.operation || 'read';
    this.credentialsPath = parameters.credentialsPath || process.env.GOOGLE_CREDENTIALS_PATH;
    
    // Initialize services
    this.turndownService = new TurndownService();
    this.markdownIt = new MarkdownIt();
    
    this.auth = null;
    this.docs = null;
    this.drive = null;
  }

  async execute(inputData, executionContext) {
    this.logger.info(`Executing Google Docs node operation: ${this.operation}`);

    // Initialize Google APIs
    await this.initializeGoogleAPIs();

    switch (this.operation) {
      case 'create':
        return await this.createDocument(inputData, executionContext);
      
      case 'read':
        return await this.readDocument(inputData, executionContext);
      
      case 'update':
        return await this.updateDocument(inputData, executionContext);
      
      case 'batchUpdate':
        return await this.batchUpdateDocument(inputData, executionContext);
      
      case 'export':
        return await this.exportDocument(inputData, executionContext);
      
      case 'share':
        return await this.shareDocument(inputData, executionContext);
      
      case 'list':
        return await this.listDocuments(inputData, executionContext);
      
      case 'search':
        return await this.searchDocuments(inputData, executionContext);
      
      default:
        throw new Error(`Unknown Google Docs operation: ${this.operation}`);
    }
  }

  async initializeGoogleAPIs() {
    if (this.auth) return; // Already initialized

    try {
      // Load service account credentials
      const credentials = JSON.parse(await fs.readFile(this.credentialsPath, 'utf8'));
      
      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      this.docs = google.docs({ version: 'v1', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });

      this.logger.info('Google APIs initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize Google APIs:', error);
      throw new Error(`Google API initialization failed: ${error.message}`);
    }
  }

  async createDocument(inputData, executionContext) {
    const input = inputData.main?.[0] || {};
    const title = input.title || this.parameters.title || 'Untitled Document';
    
    try {
      // Create document
      const createResult = await this.docs.documents.create({
        requestBody: {
          title: title
        }
      });

      const documentId = createResult.data.documentId;
      this.logger.info(`Created Google Doc: ${documentId}`);

      // Add initial content if provided
      if (input.content || input.markdown) {
        await this.insertContent(documentId, input.content || input.markdown, input.isMarkdown);
      }

      // Apply formatting if provided
      if (input.formatting) {
        await this.applyFormatting(documentId, input.formatting);
      }

      const result = {
        documentId: documentId,
        title: title,
        url: `https://docs.google.com/document/d/${documentId}/edit`,
        success: true,
        timestamp: new Date().toISOString()
      };

      this.logger.info(`Google Doc created successfully: ${title}`);
      return result;

    } catch (error) {
      this.logger.error('Failed to create Google Doc:', error);
      throw new Error(`Document creation failed: ${error.message}`);
    }
  }

  async readDocument(inputData, executionContext) {
    const input = inputData.main?.[0] || {};
    const documentId = input.documentId || this.parameters.documentId;
    
    if (!documentId) {
      throw new Error('Document ID is required for read operation');
    }

    try {
      const response = await this.docs.documents.get({
        documentId: documentId
      });

      const doc = response.data;
      const textContent = this.extractTextFromDocument(doc);
      const markdownContent = this.convertToMarkdown(doc);

      const result = {
        documentId: documentId,
        title: doc.title,
        textContent: textContent,
        markdownContent: markdownContent,
        documentStructure: doc.body,
        revisionId: doc.revisionId,
        lastModified: doc.lastModifiedTime,
        wordCount: textContent.split(/\s+/).length,
        characterCount: textContent.length,
        url: `https://docs.google.com/document/d/${documentId}/edit`,
        timestamp: new Date().toISOString()
      };

      this.logger.info(`Google Doc read successfully: ${doc.title}`);
      return result;

    } catch (error) {
      this.logger.error('Failed to read Google Doc:', error);
      throw new Error(`Document read failed: ${error.message}`);
    }
  }

  async updateDocument(inputData, executionContext) {
    const input = inputData.main?.[0] || {};
    const documentId = input.documentId || this.parameters.documentId;
    
    if (!documentId) {
      throw new Error('Document ID is required for update operation');
    }

    try {
      let requests = [];

      // Handle different types of updates
      if (input.content || input.markdown) {
        // Replace all content
        requests.push({
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: -1 // End of document
            }
          }
        });
        
        const content = input.isMarkdown ? 
          this.convertMarkdownToGoogleDocs(input.content || input.markdown) :
          input.content || input.markdown;

        requests.push({
          insertText: {
            text: content,
            location: { index: 1 }
          }
        });
      }

      // Handle append operation
      if (input.appendContent) {
        requests.push({
          insertText: {
            text: '\n\n' + input.appendContent,
            location: { endOfSegmentLocation: {} }
          }
        });
      }

      // Handle custom requests
      if (input.requests && Array.isArray(input.requests)) {
        requests = requests.concat(input.requests);
      }

      // Execute batch update
      const response = await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests
        }
      });

      const result = {
        documentId: documentId,
        updateResults: response.data.replies,
        success: true,
        timestamp: new Date().toISOString(),
        url: `https://docs.google.com/document/d/${documentId}/edit`
      };

      this.logger.info(`Google Doc updated successfully: ${documentId}`);
      return result;

    } catch (error) {
      this.logger.error('Failed to update Google Doc:', error);
      throw new Error(`Document update failed: ${error.message}`);
    }
  }

  async batchUpdateDocument(inputData, executionContext) {
    const input = inputData.main?.[0] || {};
    const documentId = input.documentId || this.parameters.documentId;
    const requests = input.requests || [];
    
    if (!documentId) {
      throw new Error('Document ID is required for batch update operation');
    }

    if (!Array.isArray(requests) || requests.length === 0) {
      throw new Error('Requests array is required for batch update operation');
    }

    try {
      const response = await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests
        }
      });

      const result = {
        documentId: documentId,
        requestsProcessed: requests.length,
        updateResults: response.data.replies,
        success: true,
        timestamp: new Date().toISOString(),
        url: `https://docs.google.com/document/d/${documentId}/edit`
      };

      this.logger.info(`Google Doc batch updated successfully: ${documentId} (${requests.length} requests)`);
      return result;

    } catch (error) {
      this.logger.error('Failed to batch update Google Doc:', error);
      throw new Error(`Batch update failed: ${error.message}`);
    }
  }

  async exportDocument(inputData, executionContext) {
    const input = inputData.main?.[0] || {};
    const documentId = input.documentId || this.parameters.documentId;
    const format = input.format || this.parameters.format || 'pdf';
    
    if (!documentId) {
      throw new Error('Document ID is required for export operation');
    }

    const mimeTypes = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'odt': 'application/vnd.oasis.opendocument.text',
      'txt': 'text/plain',
      'html': 'text/html',
      'epub': 'application/epub+zip'
    };

    const mimeType = mimeTypes[format];
    if (!mimeType) {
      throw new Error(`Unsupported export format: ${format}`);
    }

    try {
      const response = await this.drive.files.export({
        fileId: documentId,
        mimeType: mimeType
      }, { responseType: 'arraybuffer' });

      const buffer = Buffer.from(response.data);
      
      // Optionally save to file
      if (input.saveToFile) {
        const filePath = input.filePath || `exported_doc_${documentId}.${format}`;
        await fs.writeFile(filePath, buffer);
        
        return {
          documentId: documentId,
          format: format,
          filePath: filePath,
          fileSize: buffer.length,
          success: true,
          timestamp: new Date().toISOString()
        };
      }

      const result = {
        documentId: documentId,
        format: format,
        data: buffer.toString('base64'),
        fileSize: buffer.length,
        success: true,
        timestamp: new Date().toISOString()
      };

      this.logger.info(`Google Doc exported successfully: ${documentId} as ${format}`);
      return result;

    } catch (error) {
      this.logger.error('Failed to export Google Doc:', error);
      throw new Error(`Document export failed: ${error.message}`);
    }
  }

  async shareDocument(inputData, executionContext) {
    const input = inputData.main?.[0] || {};
    const documentId = input.documentId || this.parameters.documentId;
    const email = input.email || this.parameters.email;
    const role = input.role || this.parameters.role || 'reader';
    
    if (!documentId || !email) {
      throw new Error('Document ID and email are required for share operation');
    }

    try {
      const response = await this.drive.permissions.create({
        fileId: documentId,
        requestBody: {
          role: role, // 'reader', 'writer', 'commenter'
          type: 'user',
          emailAddress: email
        },
        sendNotificationEmail: input.sendNotification !== false
      });

      const result = {
        documentId: documentId,
        email: email,
        role: role,
        permissionId: response.data.id,
        success: true,
        timestamp: new Date().toISOString(),
        url: `https://docs.google.com/document/d/${documentId}/edit`
      };

      this.logger.info(`Google Doc shared successfully: ${documentId} with ${email}`);
      return result;

    } catch (error) {
      this.logger.error('Failed to share Google Doc:', error);
      throw new Error(`Document sharing failed: ${error.message}`);
    }
  }

  async listDocuments(inputData, executionContext) {
    const input = inputData.main?.[0] || {};
    const limit = input.limit || this.parameters.limit || 50;
    const query = input.query || this.parameters.query || "mimeType='application/vnd.google-apps.document'";

    try {
      const response = await this.drive.files.list({
        q: query,
        pageSize: limit,
        fields: 'files(id,name,createdTime,modifiedTime,owners,webViewLink)',
        orderBy: 'modifiedTime desc'
      });

      const result = {
        documents: response.data.files,
        count: response.data.files.length,
        success: true,
        timestamp: new Date().toISOString()
      };

      this.logger.info(`Listed ${result.count} Google Docs`);
      return result;

    } catch (error) {
      this.logger.error('Failed to list Google Docs:', error);
      throw new Error(`Document listing failed: ${error.message}`);
    }
  }

  async searchDocuments(inputData, executionContext) {
    const input = inputData.main?.[0] || {};
    const searchTerm = input.searchTerm || this.parameters.searchTerm;
    
    if (!searchTerm) {
      throw new Error('Search term is required for search operation');
    }

    const query = `mimeType='application/vnd.google-apps.document' and fullText contains '${searchTerm}'`;

    try {
      const response = await this.drive.files.list({
        q: query,
        pageSize: 20,
        fields: 'files(id,name,createdTime,modifiedTime,owners,webViewLink)',
        orderBy: 'modifiedTime desc'
      });

      const result = {
        searchTerm: searchTerm,
        documents: response.data.files,
        count: response.data.files.length,
        success: true,
        timestamp: new Date().toISOString()
      };

      this.logger.info(`Found ${result.count} Google Docs matching: ${searchTerm}`);
      return result;

    } catch (error) {
      this.logger.error('Failed to search Google Docs:', error);
      throw new Error(`Document search failed: ${error.message}`);
    }
  }

  // Helper methods

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

  convertToMarkdown(doc) {
    // Basic conversion - can be enhanced for more complex formatting
    let markdown = '';
    
    if (doc.body && doc.body.content) {
      for (const element of doc.body.content) {
        if (element.paragraph) {
          let paragraphText = '';
          
          for (const textElement of element.paragraph.elements || []) {
            if (textElement.textRun) {
              let text = textElement.textRun.content;
              
              // Apply formatting based on textStyle
              if (textElement.textRun.textStyle) {
                const style = textElement.textRun.textStyle;
                if (style.bold) text = `**${text}**`;
                if (style.italic) text = `*${text}*`;
              }
              
              paragraphText += text;
            }
          }
          
          // Handle paragraph styles
          const style = element.paragraph.paragraphStyle;
          if (style && style.namedStyleType) {
            switch (style.namedStyleType) {
              case 'HEADING_1':
                markdown += `# ${paragraphText}`;
                break;
              case 'HEADING_2':
                markdown += `## ${paragraphText}`;
                break;
              case 'HEADING_3':
                markdown += `### ${paragraphText}`;
                break;
              default:
                markdown += paragraphText;
            }
          } else {
            markdown += paragraphText;
          }
        }
      }
    }
    
    return markdown.trim();
  }

  convertMarkdownToGoogleDocs(markdown) {
    // Basic markdown to plain text conversion
    // Google Docs formatting would need to be applied via separate requests
    return markdown
      .replace(/^# /gm, '')
      .replace(/^## /gm, '')
      .replace(/^### /gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1');
  }

  async insertContent(documentId, content, isMarkdown = false) {
    const text = isMarkdown ? this.convertMarkdownToGoogleDocs(content) : content;
    
    return await this.docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [{
          insertText: {
            text: text,
            location: { index: 1 }
          }
        }]
      }
    });
  }

  async applyFormatting(documentId, formatting) {
    const requests = [];
    
    // Add formatting requests based on formatting object
    // This is a simplified version - can be extended for complex formatting
    
    return await this.docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: requests
      }
    });
  }

  // Node metadata for n8n interface
  static getNodeProperties() {
    return {
      displayName: 'Google Docs',
      name: 'googleDocs',
      icon: 'file:googledocs.svg',
      group: ['input', 'output'],
      version: 1,
      description: 'Create, read, and update Google Docs',
      defaults: {
        name: 'Google Docs',
        color: '#4285f4'
      },
      inputs: ['main'],
      outputs: ['main'],
      credentials: [
        {
          name: 'googleServiceAccount',
          required: true
        }
      ],
      properties: [
        {
          displayName: 'Operation',
          name: 'operation',
          type: 'options',
          options: [
            {
              name: 'Create',
              value: 'create',
              description: 'Create a new document'
            },
            {
              name: 'Read',
              value: 'read',
              description: 'Read document content'
            },
            {
              name: 'Update',
              value: 'update',
              description: 'Update document content'
            },
            {
              name: 'Batch Update',
              value: 'batchUpdate',
              description: 'Perform multiple updates'
            },
            {
              name: 'Export',
              value: 'export',
              description: 'Export document in various formats'
            },
            {
              name: 'Share',
              value: 'share',
              description: 'Share document with users'
            },
            {
              name: 'List',
              value: 'list',
              description: 'List available documents'
            },
            {
              name: 'Search',
              value: 'search',
              description: 'Search documents'
            }
          ],
          default: 'read'
        },
        {
          displayName: 'Document ID',
          name: 'documentId',
          type: 'string',
          default: '',
          description: 'The ID of the Google Doc',
          displayOptions: {
            hide: {
              operation: ['create', 'list', 'search']
            }
          }
        },
        {
          displayName: 'Document Title',
          name: 'title',
          type: 'string',
          default: '',
          description: 'Title for the new document',
          displayOptions: {
            show: {
              operation: ['create']
            }
          }
        }
      ]
    };
  }
}

module.exports = GoogleDocsNode;