const yaml = require('yaml');

class TaskProcessor {
    constructor() {
        this.priorityKeywords = {
            high: ['urgent', 'critical', 'asap', 'priority', 'important', 'blocker'],
            medium: ['should', 'needed', 'required', 'implement'],
            low: ['nice to have', 'optional', 'consider', 'future', 'maybe']
        };
    }

    async process(data, options = {}) {
        const { format = 'detect', source = 'claude' } = options;
        
        if (typeof data === 'string') {
            return this.parseTextToTasks(data, format);
        } else if (Array.isArray(data)) {
            return this.processTasks(data);
        } else {
            return this.processTask(data);
        }
    }

    parseTextToTasks(text, format) {
        switch (format) {
            case 'markdown':
                return this.parseMarkdownTasks(text);
            case 'yaml':
                return this.parseYamlTasks(text);
            case 'plaintext':
                return this.parsePlaintextTasks(text);
            default:
                return this.detectAndParse(text);
        }
    }

    detectAndParse(text) {
        // Auto-detect format
        if (text.includes('- ') || text.includes('* ')) {
            return this.parseMarkdownTasks(text);
        } else if (text.includes('tasks:') || text.includes('- id:')) {
            return this.parseYamlTasks(text);
        } else {
            return this.parsePlaintextTasks(text);
        }
    }

    parseMarkdownTasks(markdownText) {
        const lines = markdownText.split('\n');
        const tasks = [];
        let currentTask = null;
        let currentSection = null;

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Section headers
            if (trimmed.match(/^#{1,3}\s+/)) {
                currentSection = trimmed.replace(/^#+\s*/, '');
                continue;
            }

            // Main task (starts with - or *)
            if (trimmed.match(/^[-*]\s+/)) {
                if (currentTask) {
                    tasks.push(this.finalizeTask(currentTask));
                }
                
                currentTask = {
                    name: trimmed.replace(/^[-*]\s+/, ''),
                    description: '',
                    subtasks: [],
                    section: currentSection,
                    priority: this.detectPriority(trimmed),
                    tags: this.extractTags(trimmed),
                    assignee: this.extractAssignee(trimmed),
                    dueDate: this.extractDueDate(trimmed)
                };
            }
            // Subtask (indented)
            else if (trimmed.match(/^\s+[-*]\s+/) && currentTask) {
                currentTask.subtasks.push({
                    name: trimmed.replace(/^\s+[-*]\s+/, ''),
                    priority: this.detectPriority(trimmed)
                });
            }
            // Description line
            else if (trimmed && currentTask && !trimmed.startsWith('#')) {
                currentTask.description += (currentTask.description ? ' ' : '') + trimmed;
            }
        }

        if (currentTask) {
            tasks.push(this.finalizeTask(currentTask));
        }

        return {
            tasks,
            totalTasks: tasks.length,
            sections: [...new Set(tasks.map(t => t.section).filter(Boolean))],
            processed: true
        };
    }

    parseYamlTasks(yamlText) {
        try {
            const parsed = yaml.parse(yamlText);
            
            if (parsed.tasks) {
                return {
                    tasks: parsed.tasks.map(task => this.processTask(task)),
                    totalTasks: parsed.tasks.length,
                    metadata: parsed.metadata || {},
                    processed: true
                };
            } else if (Array.isArray(parsed)) {
                return {
                    tasks: parsed.map(task => this.processTask(task)),
                    totalTasks: parsed.length,
                    processed: true
                };
            } else {
                return {
                    tasks: [this.processTask(parsed)],
                    totalTasks: 1,
                    processed: true
                };
            }
        } catch (error) {
            throw new Error(`YAML parsing failed: ${error.message}`);
        }
    }

    parsePlaintextTasks(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const tasks = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                tasks.push({
                    name: trimmed,
                    description: '',
                    priority: this.detectPriority(trimmed),
                    tags: this.extractTags(trimmed),
                    assignee: this.extractAssignee(trimmed),
                    dueDate: this.extractDueDate(trimmed)
                });
            }
        }

        return {
            tasks,
            totalTasks: tasks.length,
            processed: true
        };
    }

    processTask(task) {
        return {
            id: task.id || this.generateTaskId(),
            name: task.name || task.title,
            description: task.description || task.notes || '',
            priority: task.priority || this.detectPriority(task.name || ''),
            tags: task.tags || this.extractTags(task.name || ''),
            assignee: task.assignee || this.extractAssignee(task.name || ''),
            dueDate: task.dueDate || task.due_date || this.extractDueDate(task.name || ''),
            status: task.status || 'pending',
            section: task.section || null,
            subtasks: task.subtasks || [],
            estimatedHours: task.estimatedHours || this.estimateHours(task.name || ''),
            createdAt: new Date().toISOString(),
            source: 'claude-processor'
        };
    }

    processTasks(tasks) {
        return {
            tasks: tasks.map(task => this.processTask(task)),
            totalTasks: tasks.length,
            processed: true
        };
    }

    finalizeTask(task) {
        return {
            ...task,
            id: this.generateTaskId(),
            estimatedHours: this.estimateHours(task.name),
            createdAt: new Date().toISOString(),
            source: 'claude-processor'
        };
    }

    detectPriority(text) {
        const lowerText = text.toLowerCase();
        
        for (const [priority, keywords] of Object.entries(this.priorityKeywords)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return priority;
            }
        }
        
        return 'medium';
    }

    extractTags(text) {
        const tagPattern = /#(\w+)/g;
        const tags = [];
        let match;
        
        while ((match = tagPattern.exec(text)) !== null) {
            tags.push(match[1]);
        }
        
        return tags;
    }

    extractAssignee(text) {
        const assigneePattern = /@(\w+)/;
        const match = text.match(assigneePattern);
        return match ? match[1] : null;
    }

    extractDueDate(text) {
        // Simple date extraction patterns
        const datePatterns = [
            /due:?\s*(\d{4}-\d{2}-\d{2})/i,
            /by\s*(\d{4}-\d{2}-\d{2})/i,
            /(\d{1,2}\/\d{1,2}\/\d{4})/,
            /(\d{1,2}-\d{1,2}-\d{4})/
        ];
        
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return null;
    }

    estimateHours(taskName) {
        const lowerName = taskName.toLowerCase();
        
        // Simple estimation based on keywords
        if (lowerName.includes('implement') || lowerName.includes('build') || lowerName.includes('create')) {
            return 8;
        } else if (lowerName.includes('fix') || lowerName.includes('update')) {
            return 4;
        } else if (lowerName.includes('test') || lowerName.includes('review')) {
            return 2;
        } else if (lowerName.includes('document') || lowerName.includes('write')) {
            return 3;
        }
        
        return 4; // default
    }

    generateTaskId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Convert tasks to different formats for different services
    formatForAsana(tasks, projectId = null) {
        return tasks.map(task => ({
            name: task.name,
            notes: task.description,
            projects: projectId ? [projectId] : [],
            tags: task.tags,
            assignee: task.assignee,
            due_on: task.dueDate,
            completed: task.status === 'completed'
        }));
    }

    formatForGitHub(tasks, repository) {
        return tasks.map(task => ({
            ...repository,
            title: task.name,
            body: this.generateGitHubIssueBody(task),
            labels: ['task', ...task.tags, `priority:${task.priority}`],
            assignees: task.assignee ? [task.assignee] : []
        }));
    }

    formatForGoogleDocs(tasks, projectName = 'Task List') {
        const sections = [
            {
                title: 'Overview',
                content: `This document contains ${tasks.length} tasks generated from Claude analysis.`
            },
            {
                title: 'High Priority Tasks',
                items: tasks.filter(t => t.priority === 'high').map(t => t.name)
            },
            {
                title: 'Medium Priority Tasks',
                items: tasks.filter(t => t.priority === 'medium').map(t => t.name)
            },
            {
                title: 'Low Priority Tasks',
                items: tasks.filter(t => t.priority === 'low').map(t => t.name)
            },
            {
                title: 'Task Details',
                content: tasks.map(task => 
                    `**${task.name}**\n${task.description}\n- Priority: ${task.priority}\n- Estimated: ${task.estimatedHours}h\n`
                ).join('\n')
            }
        ];

        return {
            title: `${projectName} - Task Planning`,
            sections,
            template: 'technical'
        };
    }

    generateGitHubIssueBody(task) {
        let body = task.description + '\n\n';
        
        body += '## Task Details\n';
        body += `- **Priority**: ${task.priority}\n`;
        body += `- **Estimated Hours**: ${task.estimatedHours}\n`;
        
        if (task.tags.length > 0) {
            body += `- **Tags**: ${task.tags.join(', ')}\n`;
        }
        
        if (task.subtasks.length > 0) {
            body += '\n## Subtasks\n';
            task.subtasks.forEach(subtask => {
                body += `- [ ] ${subtask.name}\n`;
            });
        }
        
        body += '\n---\n*Generated by Claude MCP Bridge*';
        
        return body;
    }

    // Statistics and analysis
    analyzeTaskComplexity(tasks) {
        const analysis = {
            totalTasks: tasks.length,
            priorities: {
                high: tasks.filter(t => t.priority === 'high').length,
                medium: tasks.filter(t => t.priority === 'medium').length,
                low: tasks.filter(t => t.priority === 'low').length
            },
            estimatedHours: tasks.reduce((sum, task) => sum + task.estimatedHours, 0),
            sections: [...new Set(tasks.map(t => t.section).filter(Boolean))],
            withSubtasks: tasks.filter(t => t.subtasks && t.subtasks.length > 0).length,
            withAssignees: tasks.filter(t => t.assignee).length,
            withDueDates: tasks.filter(t => t.dueDate).length
        };

        return analysis;
    }
}

module.exports = TaskProcessor;