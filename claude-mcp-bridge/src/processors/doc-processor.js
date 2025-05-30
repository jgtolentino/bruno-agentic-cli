const MarkdownIt = require('markdown-it');
const TurndownService = require('turndown');

class DocProcessor {
    constructor() {
        this.markdown = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true
        });
        
        this.turndown = new TurndownService({
            codeBlockStyle: 'fenced',
            fence: '```'
        });

        this.templates = {
            technical: this.technicalTemplate.bind(this),
            meeting: this.meetingTemplate.bind(this),
            requirements: this.requirementsTemplate.bind(this),
            api: this.apiDocTemplate.bind(this),
            user_guide: this.userGuideTemplate.bind(this)
        };
    }

    async process(data, options = {}) {
        const { 
            format = 'detect', 
            template = 'default',
            target = 'google-docs',
            project = 'TBWA Project'
        } = options;

        if (typeof data === 'string') {
            return this.processText(data, format, template, target, project);
        } else if (typeof data === 'object') {
            return this.processStructuredData(data, template, target, project);
        }

        throw new Error('Unsupported data type for document processing');
    }

    processText(text, format, template, target, project) {
        let processed;

        switch (format) {
            case 'markdown':
                processed = this.processMarkdown(text, template, project);
                break;
            case 'html':
                processed = this.processHTML(text, template, project);
                break;
            case 'plaintext':
                processed = this.processPlaintext(text, template, project);
                break;
            default:
                processed = this.detectAndProcess(text, template, project);
        }

        return this.formatForTarget(processed, target);
    }

    processStructuredData(data, template, target, project) {
        const processed = this.applyTemplate(data, template, project);
        return this.formatForTarget(processed, target);
    }

    detectAndProcess(text, template, project) {
        // Auto-detect content type
        if (text.includes('```') || text.includes('#')) {
            return this.processMarkdown(text, template, project);
        } else if (text.includes('<') && text.includes('>')) {
            return this.processHTML(text, template, project);
        } else {
            return this.processPlaintext(text, template, project);
        }
    }

    processMarkdown(markdown, template, project) {
        const html = this.markdown.render(markdown);
        const structure = this.extractStructure(markdown);
        
        return {
            content: markdown,
            html,
            structure,
            template,
            project,
            type: 'markdown',
            processed: true,
            timestamp: new Date().toISOString()
        };
    }

    processHTML(html, template, project) {
        const markdown = this.turndown.turndown(html);
        const structure = this.extractStructure(markdown);
        
        return {
            content: markdown,
            html,
            structure,
            template,
            project,
            type: 'html',
            processed: true,
            timestamp: new Date().toISOString()
        };
    }

    processPlaintext(text, template, project) {
        const lines = text.split('\n');
        const markdown = this.convertToMarkdown(lines);
        const html = this.markdown.render(markdown);
        const structure = this.extractStructure(markdown);
        
        return {
            content: markdown,
            html,
            structure,
            template,
            project,
            type: 'plaintext',
            processed: true,
            timestamp: new Date().toISOString()
        };
    }

    applyTemplate(data, templateName, project) {
        if (this.templates[templateName]) {
            return this.templates[templateName](data, project);
        } else {
            return this.defaultTemplate(data, project);
        }
    }

    technicalTemplate(data, project) {
        const sections = [
            {
                title: 'Overview',
                content: data.overview || 'Technical specification document generated from Claude analysis.'
            },
            {
                title: 'Requirements',
                items: data.requirements || []
            },
            {
                title: 'Architecture',
                content: data.architecture || ''
            },
            {
                title: 'Implementation Plan',
                items: data.implementationSteps || []
            },
            {
                title: 'API Endpoints',
                content: data.apiEndpoints || ''
            },
            {
                title: 'Database Schema',
                content: data.databaseSchema || ''
            },
            {
                title: 'Testing Strategy',
                content: data.testingStrategy || ''
            },
            {
                title: 'Deployment',
                content: data.deployment || ''
            }
        ];

        return {
            title: `${project} - Technical Specification`,
            sections: sections.filter(section => section.content || (section.items && section.items.length > 0)),
            template: 'technical',
            project,
            type: 'structured',
            processed: true,
            timestamp: new Date().toISOString()
        };
    }

    requirementsTemplate(data, project) {
        const sections = [
            {
                title: 'Functional Requirements',
                items: data.functionalRequirements || []
            },
            {
                title: 'Non-Functional Requirements',
                items: data.nonFunctionalRequirements || []
            },
            {
                title: 'User Stories',
                items: data.userStories || []
            },
            {
                title: 'Acceptance Criteria',
                items: data.acceptanceCriteria || []
            },
            {
                title: 'Constraints',
                items: data.constraints || []
            },
            {
                title: 'Dependencies',
                items: data.dependencies || []
            }
        ];

        return {
            title: `${project} - Requirements Document`,
            sections: sections.filter(section => section.items && section.items.length > 0),
            template: 'requirements',
            project,
            type: 'structured',
            processed: true,
            timestamp: new Date().toISOString()
        };
    }

    meetingTemplate(data, project) {
        const sections = [
            {
                title: 'Meeting Details',
                content: `**Date:** ${data.date || new Date().toLocaleDateString()}\n**Attendees:** ${(data.attendees || []).join(', ')}\n**Duration:** ${data.duration || 'TBD'}`
            },
            {
                title: 'Agenda',
                items: data.agenda || []
            },
            {
                title: 'Discussion Points',
                items: data.discussionPoints || []
            },
            {
                title: 'Decisions Made',
                items: data.decisions || []
            },
            {
                title: 'Action Items',
                items: data.actionItems || []
            },
            {
                title: 'Next Steps',
                items: data.nextSteps || []
            }
        ];

        return {
            title: `${project} - Meeting Notes`,
            sections: sections.filter(section => section.content || (section.items && section.items.length > 0)),
            template: 'meeting',
            project,
            type: 'structured',
            processed: true,
            timestamp: new Date().toISOString()
        };
    }

    apiDocTemplate(data, project) {
        const sections = [
            {
                title: 'API Overview',
                content: data.overview || 'API documentation generated from Claude analysis.'
            },
            {
                title: 'Authentication',
                content: data.authentication || ''
            },
            {
                title: 'Base URL',
                content: `\`\`\`\n${data.baseUrl || 'https://api.example.com'}\n\`\`\``
            },
            {
                title: 'Endpoints',
                content: this.formatApiEndpoints(data.endpoints || [])
            },
            {
                title: 'Error Handling',
                content: data.errorHandling || ''
            },
            {
                title: 'Rate Limiting',
                content: data.rateLimiting || ''
            },
            {
                title: 'Examples',
                content: this.formatApiExamples(data.examples || [])
            }
        ];

        return {
            title: `${project} - API Documentation`,
            sections: sections.filter(section => section.content),
            template: 'api',
            project,
            type: 'structured',
            processed: true,
            timestamp: new Date().toISOString()
        };
    }

    userGuideTemplate(data, project) {
        const sections = [
            {
                title: 'Getting Started',
                content: data.gettingStarted || ''
            },
            {
                title: 'Features',
                items: data.features || []
            },
            {
                title: 'Step-by-Step Guide',
                content: this.formatSteps(data.steps || [])
            },
            {
                title: 'Troubleshooting',
                items: data.troubleshooting || []
            },
            {
                title: 'FAQ',
                content: this.formatFAQ(data.faq || [])
            },
            {
                title: 'Support',
                content: data.support || ''
            }
        ];

        return {
            title: `${project} - User Guide`,
            sections: sections.filter(section => section.content || (section.items && section.items.length > 0)),
            template: 'user_guide',
            project,
            type: 'structured',
            processed: true,
            timestamp: new Date().toISOString()
        };
    }

    defaultTemplate(data, project) {
        return {
            title: `${project} - Document`,
            content: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
            template: 'default',
            project,
            type: 'simple',
            processed: true,
            timestamp: new Date().toISOString()
        };
    }

    formatForTarget(processed, target) {
        switch (target) {
            case 'google-docs':
                return this.formatForGoogleDocs(processed);
            case 'markdown':
                return this.formatForMarkdown(processed);
            case 'html':
                return this.formatForHTML(processed);
            case 'pdf':
                return this.formatForPDF(processed);
            default:
                return processed;
        }
    }

    formatForGoogleDocs(processed) {
        if (processed.sections) {
            // Convert sections to markdown
            let markdown = `# ${processed.title}\n\n`;
            markdown += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;

            for (const section of processed.sections) {
                markdown += `## ${section.title}\n\n`;
                
                if (section.content) {
                    markdown += `${section.content}\n\n`;
                }
                
                if (section.items && section.items.length > 0) {
                    for (const item of section.items) {
                        markdown += `- ${item}\n`;
                    }
                    markdown += '\n';
                }
            }

            return {
                title: processed.title,
                markdownContent: markdown,
                template: processed.template,
                project: processed.project
            };
        } else {
            return {
                title: processed.title || 'Generated Document',
                markdownContent: processed.content,
                template: processed.template,
                project: processed.project
            };
        }
    }

    formatForMarkdown(processed) {
        return {
            content: processed.content,
            filename: `${processed.project.replace(/\s+/g, '-').toLowerCase()}.md`
        };
    }

    formatForHTML(processed) {
        return {
            content: processed.html || this.markdown.render(processed.content),
            filename: `${processed.project.replace(/\s+/g, '-').toLowerCase()}.html`
        };
    }

    formatForPDF(processed) {
        // This would require additional libraries for PDF generation
        return {
            content: processed.content,
            filename: `${processed.project.replace(/\s+/g, '-').toLowerCase()}.pdf`,
            requiresPDFGeneration: true
        };
    }

    // Helper methods
    extractStructure(markdown) {
        const lines = markdown.split('\n');
        const structure = {
            headings: [],
            codeBlocks: [],
            lists: [],
            links: []
        };

        for (const line of lines) {
            // Extract headings
            const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
            if (headingMatch) {
                structure.headings.push({
                    level: headingMatch[1].length,
                    text: headingMatch[2]
                });
            }

            // Extract code blocks
            if (line.includes('```')) {
                structure.codeBlocks.push(line);
            }

            // Extract lists
            if (line.match(/^[\s]*[-*+]\s+/)) {
                structure.lists.push(line.trim());
            }

            // Extract links
            const linkMatches = line.match(/\[([^\]]+)\]\(([^)]+)\)/g);
            if (linkMatches) {
                structure.links.push(...linkMatches);
            }
        }

        return structure;
    }

    convertToMarkdown(lines) {
        let markdown = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (!trimmed) {
                markdown += '\n';
                continue;
            }

            // Convert simple patterns to markdown
            if (trimmed.toUpperCase() === trimmed && trimmed.length > 3) {
                // All caps might be a heading
                markdown += `## ${trimmed}\n\n`;
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                // Already a list
                markdown += `${trimmed}\n`;
            } else {
                // Regular paragraph
                markdown += `${trimmed}\n\n`;
            }
        }

        return markdown;
    }

    formatApiEndpoints(endpoints) {
        let content = '';
        
        for (const endpoint of endpoints) {
            content += `### ${endpoint.method} ${endpoint.path}\n\n`;
            content += `${endpoint.description}\n\n`;
            
            if (endpoint.parameters) {
                content += '**Parameters:**\n';
                for (const param of endpoint.parameters) {
                    content += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
                }
                content += '\n';
            }
            
            if (endpoint.response) {
                content += '**Response:**\n```json\n';
                content += JSON.stringify(endpoint.response, null, 2);
                content += '\n```\n\n';
            }
        }

        return content;
    }

    formatApiExamples(examples) {
        let content = '';
        
        for (const example of examples) {
            content += `### ${example.title}\n\n`;
            content += '**Request:**\n```bash\n';
            content += example.request;
            content += '\n```\n\n';
            
            if (example.response) {
                content += '**Response:**\n```json\n';
                content += JSON.stringify(example.response, null, 2);
                content += '\n```\n\n';
            }
        }

        return content;
    }

    formatSteps(steps) {
        let content = '';
        
        steps.forEach((step, index) => {
            content += `${index + 1}. **${step.title}**\n\n`;
            content += `   ${step.description}\n\n`;
            
            if (step.code) {
                content += '   ```\n';
                content += `   ${step.code}\n`;
                content += '   ```\n\n';
            }
        });

        return content;
    }

    formatFAQ(faq) {
        let content = '';
        
        for (const item of faq) {
            content += `**Q: ${item.question}**\n\n`;
            content += `A: ${item.answer}\n\n`;
        }

        return content;
    }

    // Analytics
    analyzeDocument(processed) {
        const analysis = {
            wordCount: this.countWords(processed.content || ''),
            headingCount: processed.structure ? processed.structure.headings.length : 0,
            codeBlockCount: processed.structure ? processed.structure.codeBlocks.length : 0,
            listCount: processed.structure ? processed.structure.lists.length : 0,
            linkCount: processed.structure ? processed.structure.links.length : 0,
            estimatedReadTime: Math.ceil(this.countWords(processed.content || '') / 200), // minutes
            complexity: this.assessComplexity(processed)
        };

        return analysis;
    }

    countWords(text) {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    assessComplexity(processed) {
        const content = processed.content || '';
        let score = 0;

        // Technical terms increase complexity
        const technicalTerms = ['API', 'database', 'authentication', 'endpoint', 'schema'];
        technicalTerms.forEach(term => {
            if (content.toLowerCase().includes(term.toLowerCase())) {
                score += 1;
            }
        });

        // Code blocks increase complexity
        if (processed.structure && processed.structure.codeBlocks.length > 0) {
            score += processed.structure.codeBlocks.length;
        }

        // Many headings suggest detailed structure
        if (processed.structure && processed.structure.headings.length > 5) {
            score += 2;
        }

        if (score <= 2) return 'low';
        if (score <= 5) return 'medium';
        return 'high';
    }
}

module.exports = DocProcessor;