const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const MarkdownIt = require('markdown-it');
const TurndownService = require('turndown');

class GoogleDocsConnector {
    constructor(config) {
        this.config = config;
        this.auth = null;
        this.docs = null;
        this.drive = null;
        this.markdown = new MarkdownIt();
        this.turndownService = new TurndownService();
        this.initializeAuth();
    }

    async initializeAuth() {
        try {
            // Initialize Google Auth
            this.auth = new GoogleAuth({
                keyFile: this.config.credentials,
                scopes: [
                    'https://www.googleapis.com/auth/documents',
                    'https://www.googleapis.com/auth/drive',
                    'https://www.googleapis.com/auth/drive.file'
                ]
            });

            // Initialize services
            this.docs = google.docs({ version: 'v1', auth: this.auth });
            this.drive = google.drive({ version: 'v3', auth: this.auth });

        } catch (error) {
            throw new Error(`Failed to initialize Google Auth: ${error.message}`);
        }
    }

    getMethods() {
        return [
            'createDocument',
            'updateDocument',
            'shareDocument',
            'createFromMarkdown',
            'convertToMarkdown',
            'applyFormatting',
            'insertTable',
            'insertImage',
            'createTechnicalDoc',
            'batchCreateDocs',
            'getDocument',
            'listDocuments',
            'duplicateDocument',
            'exportDocument'
        ];
    }

    async createDocument(data) {
        try {
            const { title, content = '', folder = null } = data;

            // Create the document
            const doc = await this.docs.documents.create({
                requestBody: { title }
            });

            const documentId = doc.data.documentId;

            // Add content if provided
            if (content) {
                await this.updateDocument({
                    documentId,
                    content,
                    action: 'replace'
                });
            }

            // Move to folder if specified
            if (folder) {
                await this.moveToFolder(documentId, folder);
            }

            return {
                id: documentId,
                title,
                url: `https://docs.google.com/document/d/${documentId}`,
                created: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Google Docs createDocument failed: ${error.message}`);
        }
    }

    async createFromMarkdown(data) {
        try {
            const { title, markdownContent, template = 'default' } = data;

            // Create the document
            const doc = await this.createDocument({ title });
            const documentId = doc.id;

            // Convert markdown to Google Docs format
            const requests = this.markdownToDocRequests(markdownContent);

            // Apply template formatting
            const templateRequests = this.getTemplateRequests(template);
            
            // Combine all requests
            const allRequests = [...templateRequests, ...requests];

            if (allRequests.length > 0) {
                await this.docs.documents.batchUpdate({
                    documentId,
                    requestBody: { requests: allRequests }
                });
            }

            return {
                ...doc,
                markdownProcessed: true,
                template
            };

        } catch (error) {
            throw new Error(`Google Docs createFromMarkdown failed: ${error.message}`);
        }
    }

    async updateDocument(data) {
        try {
            const { documentId, content, action = 'append', index = 1 } = data;

            const requests = [];

            if (action === 'replace') {
                // Get current document content
                const doc = await this.docs.documents.get({ documentId });
                const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;

                // Delete existing content
                requests.push({
                    deleteContentRange: {
                        range: { startIndex: 1, endIndex }
                    }
                });
            }

            // Insert new content
            requests.push({
                insertText: {
                    location: { index },
                    text: content
                }
            });

            await this.docs.documents.batchUpdate({
                documentId,
                requestBody: { requests }
            });

            return {
                documentId,
                updated: true,
                action,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Google Docs updateDocument failed: ${error.message}`);
        }
    }

    async shareDocument(data) {
        try {
            const { documentId, emails, role = 'writer', sendNotification = true } = data;

            const results = [];

            for (const email of emails) {
                const permission = await this.drive.permissions.create({
                    fileId: documentId,
                    requestBody: {
                        role,
                        type: 'user',
                        emailAddress: email
                    },
                    sendNotificationEmail: sendNotification
                });

                results.push({
                    email,
                    permissionId: permission.data.id,
                    role
                });
            }

            return {
                documentId,
                shared: results.length,
                permissions: results
            };

        } catch (error) {
            throw new Error(`Google Docs shareDocument failed: ${error.message}`);
        }
    }

    async applyFormatting(data) {
        try {
            const { documentId, formatting } = data;
            const requests = [];

            // Professional document formatting
            if (formatting.includes('professional')) {
                requests.push(
                    // Get document to find actual end index
                    {
                        updateTextStyle: {
                            range: { startIndex: 1, endIndex: 100 },
                            textStyle: {
                                fontSize: { magnitude: 11, unit: 'PT' }
                            },
                            fields: 'fontSize'
                        }
                    }
                );
            }

            // Header formatting
            if (formatting.includes('headers')) {
                requests.push({
                    updateTextStyle: {
                        range: { startIndex: 1, endIndex: 50 }, // First heading
                        textStyle: {
                            fontSize: { magnitude: 16, unit: 'PT' },
                            bold: true
                        },
                        fields: 'fontSize,bold'
                    }
                });
            }

            if (requests.length > 0) {
                await this.docs.documents.batchUpdate({
                    documentId,
                    requestBody: { requests }
                });
            }

            return {
                documentId,
                formatted: true,
                applied: formatting
            };

        } catch (error) {
            throw new Error(`Google Docs applyFormatting failed: ${error.message}`);
        }
    }

    async createTechnicalDoc(data) {
        try {
            const { title, sections, project = 'TBWA Retail Dashboard' } = data;

            // Create document with technical template
            const doc = await this.createFromMarkdown({
                title,
                markdownContent: this.generateTechnicalMarkdown(sections, project),
                template: 'technical'
            });

            // Apply professional formatting
            await this.applyFormatting({
                documentId: doc.id,
                formatting: ['professional', 'headers', 'technical']
            });

            return {
                ...doc,
                type: 'technical',
                project
            };

        } catch (error) {
            throw new Error(`Google Docs createTechnicalDoc failed: ${error.message}`);
        }
    }

    async batchCreateDocs(data) {
        try {
            const { documents, folder = null } = data;
            const results = [];

            for (const docData of documents) {
                const doc = await this.createDocument({
                    ...docData,
                    folder
                });

                results.push(doc);
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            return {
                created: results.length,
                documents: results
            };

        } catch (error) {
            throw new Error(`Google Docs batchCreateDocs failed: ${error.message}`);
        }
    }

    async getDocument(data) {
        try {
            const { documentId } = data;
            
            const doc = await this.docs.documents.get({ documentId });
            
            return {
                id: doc.data.documentId,
                title: doc.data.title,
                content: this.extractTextContent(doc.data.body.content),
                lastModified: doc.data.revisionId
            };

        } catch (error) {
            throw new Error(`Google Docs getDocument failed: ${error.message}`);
        }
    }

    // Helper methods
    markdownToDocRequests(markdown) {
        const requests = [];
        const lines = markdown.split('\n');
        let currentIndex = 1;

        for (const line of lines) {
            if (line.trim()) {
                // Insert text
                requests.push({
                    insertText: {
                        location: { index: currentIndex },
                        text: line + '\n'
                    }
                });

                // Apply formatting based on markdown syntax
                if (line.startsWith('#')) {
                    const level = line.match(/^#+/)[0].length;
                    const size = level === 1 ? 16 : level === 2 ? 14 : 12;
                    
                    requests.push({
                        updateTextStyle: {
                            range: {
                                startIndex: currentIndex,
                                endIndex: currentIndex + line.length
                            },
                            textStyle: {
                                fontSize: { magnitude: size, unit: 'PT' },
                                bold: true
                            },
                            fields: 'fontSize,bold'
                        }
                    });
                }

                currentIndex += line.length + 1;
            }
        }

        return requests;
    }

    getTemplateRequests(template) {
        const requests = [];

        if (template === 'technical') {
            // Technical document styling
            requests.push({
                updateDocumentStyle: {
                    documentStyle: {
                        marginTop: { magnitude: 72, unit: 'PT' },
                        marginBottom: { magnitude: 72, unit: 'PT' },
                        marginLeft: { magnitude: 72, unit: 'PT' },
                        marginRight: { magnitude: 72, unit: 'PT' }
                    },
                    fields: 'marginTop,marginBottom,marginLeft,marginRight'
                }
            });
        }

        return requests;
    }

    generateTechnicalMarkdown(sections, project) {
        let markdown = `# ${project} - Technical Specification\n\n`;
        markdown += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;
        
        for (const section of sections) {
            markdown += `## ${section.title}\n\n`;
            if (section.content) {
                markdown += `${section.content}\n\n`;
            }
            if (section.items) {
                for (const item of section.items) {
                    markdown += `- ${item}\n`;
                }
                markdown += '\n';
            }
        }

        return markdown;
    }

    extractTextContent(content) {
        let text = '';
        
        function extractFromElement(element) {
            if (element.paragraph) {
                for (const textRun of element.paragraph.elements || []) {
                    if (textRun.textRun) {
                        text += textRun.textRun.content;
                    }
                }
            }
        }

        if (Array.isArray(content)) {
            content.forEach(extractFromElement);
        }

        return text;
    }

    async moveToFolder(documentId, folderId) {
        try {
            // Get current parents
            const file = await this.drive.files.get({
                fileId: documentId,
                fields: 'parents'
            });

            const previousParents = file.data.parents.join(',');

            // Move to new folder
            await this.drive.files.update({
                fileId: documentId,
                addParents: folderId,
                removeParents: previousParents
            });

            return true;
        } catch (error) {
            console.error('Failed to move to folder:', error);
            return false;
        }
    }
}

module.exports = GoogleDocsConnector;