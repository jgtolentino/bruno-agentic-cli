const asana = require('asana');

class AsanaConnector {
    constructor(accessToken) {
        this.client = new asana.ApiClient();
        this.client.authentications['token'].accessToken = accessToken;
        this.accessToken = accessToken;
        
        // Initialize API instances
        this.tasksApi = new asana.TasksApi(this.client);
        this.projectsApi = new asana.ProjectsApi(this.client);
        this.workspacesApi = new asana.WorkspacesApi(this.client);
        this.sectionsApi = new asana.SectionsApi(this.client);
    }

    getMethods() {
        return [
            'createTask',
            'updateTask',
            'deleteTask',
            'createProject',
            'listProjects',
            'addTaskToProject',
            'createTaskBatch',
            'getTasksByProject',
            'createSubtask',
            'setTaskAssignee',
            'addTaskComment',
            'getWorkspaces',
            'createSection',
            'moveTaskToSection'
        ];
    }

    async createTask(data) {
        try {
            // Get workspace if not provided
            let workspace = data.workspace;
            if (!workspace && !data.projects?.length) {
                const workspaces = await this.workspacesApi.getWorkspaces();
                workspace = workspaces.data[0]?.gid;
            }

            const taskData = {
                data: {
                    name: data.name,
                    notes: data.description || data.notes || ''
                }
            };

            // Add workspace or projects
            if (data.projects?.length) {
                taskData.data.projects = data.projects;
            } else if (workspace) {
                taskData.data.workspace = workspace;
            }

            // Add optional fields
            if (data.assignee) taskData.data.assignee = data.assignee;
            if (data.dueDate) taskData.data.due_on = data.dueDate;
            if (data.completed !== undefined) taskData.data.completed = data.completed;
            if (data.tags) taskData.data.tags = data.tags;
            if (data.followers) taskData.data.followers = data.followers;

            const task = await this.tasksApi.createTask(taskData);
            
            // Add custom fields if provided
            if (data.customFields) {
                for (const field of data.customFields) {
                    await this.client.tasks.addCustomFieldSetting(task.gid, field);
                }
            }

            return {
                id: task.data.gid,
                name: task.data.name,
                permalink_url: task.data.permalink_url,
                created_at: task.data.created_at
            };

        } catch (error) {
            throw new Error(`Asana createTask failed: ${error.message}`);
        }
    }

    async createTaskBatch(data) {
        try {
            const { tasks, projectId, section } = data;
            const results = [];

            for (const taskData of tasks) {
                const enrichedTaskData = {
                    ...taskData,
                    projects: projectId ? [projectId] : taskData.projects || []
                };

                const task = await this.createTask(enrichedTaskData);
                
                // Move to section if specified
                if (section && task.id) {
                    await this.moveTaskToSection({ taskId: task.id, sectionId: section });
                }

                results.push(task);
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            return {
                created: results.length,
                tasks: results
            };

        } catch (error) {
            throw new Error(`Asana createTaskBatch failed: ${error.message}`);
        }
    }

    async updateTask(data) {
        try {
            const { taskId, updates } = data;
            
            const task = await this.client.tasks.update(taskId, updates);
            
            return {
                id: task.gid,
                name: task.name,
                modified_at: task.modified_at
            };

        } catch (error) {
            throw new Error(`Asana updateTask failed: ${error.message}`);
        }
    }

    async createProject(data) {
        try {
            const projectData = {
                name: data.name,
                notes: data.description || '',
                team: data.team || null,
                workspace: data.workspace,
                privacy_setting: data.privacy || 'team_only'
            };

            if (data.layout) {
                projectData.layout = data.layout; // 'list' or 'board'
            }

            const project = await this.client.projects.create(projectData);

            // Create default sections if provided
            if (data.sections) {
                for (const sectionName of data.sections) {
                    await this.createSection({
                        name: sectionName,
                        project: project.gid
                    });
                }
            }

            return {
                id: project.gid,
                name: project.name,
                permalink_url: project.permalink_url,
                created_at: project.created_at
            };

        } catch (error) {
            throw new Error(`Asana createProject failed: ${error.message}`);
        }
    }

    async createSection(data) {
        try {
            const section = await this.client.sections.create({
                name: data.name,
                project: data.project
            });

            return {
                id: section.gid,
                name: section.name,
                project: section.project
            };

        } catch (error) {
            throw new Error(`Asana createSection failed: ${error.message}`);
        }
    }

    async listProjects(data = {}) {
        try {
            const { workspace, team, limit = 50 } = data;
            
            let params = { limit };
            if (workspace) params.workspace = workspace;
            if (team) params.team = team;

            const projects = await this.client.projects.findAll(params);
            
            return projects.data.map(project => ({
                id: project.gid,
                name: project.name,
                permalink_url: project.permalink_url,
                created_at: project.created_at,
                modified_at: project.modified_at
            }));

        } catch (error) {
            throw new Error(`Asana listProjects failed: ${error.message}`);
        }
    }

    async getTasksByProject(data) {
        try {
            const { projectId, completed = false, limit = 100 } = data;
            
            const tasks = await this.client.tasks.findByProject(projectId, {
                limit,
                completed_since: completed ? null : 'now'
            });

            return tasks.data.map(task => ({
                id: task.gid,
                name: task.name,
                completed: task.completed,
                assignee: task.assignee,
                due_on: task.due_on,
                created_at: task.created_at
            }));

        } catch (error) {
            throw new Error(`Asana getTasksByProject failed: ${error.message}`);
        }
    }

    async addTaskComment(data) {
        try {
            const { taskId, text, isPinned = false } = data;
            
            const story = await this.client.stories.create({
                text,
                target: taskId,
                is_pinned: isPinned
            });

            return {
                id: story.gid,
                text: story.text,
                created_at: story.created_at
            };

        } catch (error) {
            throw new Error(`Asana addTaskComment failed: ${error.message}`);
        }
    }

    async setTaskAssignee(data) {
        try {
            const { taskId, assigneeId } = data;
            
            const task = await this.client.tasks.update(taskId, {
                assignee: assigneeId
            });

            return {
                id: task.gid,
                assignee: task.assignee
            };

        } catch (error) {
            throw new Error(`Asana setTaskAssignee failed: ${error.message}`);
        }
    }

    async createSubtask(data) {
        try {
            const { parentTaskId, ...taskData } = data;
            
            const subtask = await this.client.tasks.create({
                ...taskData,
                parent: parentTaskId
            });

            return {
                id: subtask.gid,
                name: subtask.name,
                parent: subtask.parent,
                permalink_url: subtask.permalink_url
            };

        } catch (error) {
            throw new Error(`Asana createSubtask failed: ${error.message}`);
        }
    }

    async moveTaskToSection(data) {
        try {
            const { taskId, sectionId } = data;
            
            await this.client.sections.addTask(sectionId, {
                task: taskId
            });

            return {
                taskId,
                sectionId,
                moved: true
            };

        } catch (error) {
            throw new Error(`Asana moveTaskToSection failed: ${error.message}`);
        }
    }

    async getWorkspaces() {
        try {
            const workspaces = await this.client.workspaces.findAll();
            
            return workspaces.data.map(workspace => ({
                id: workspace.gid,
                name: workspace.name
            }));

        } catch (error) {
            throw new Error(`Asana getWorkspaces failed: ${error.message}`);
        }
    }

    // Helper method for Claude to parse markdown task lists
    parseMarkdownTasks(markdownText) {
        const lines = markdownText.split('\n');
        const tasks = [];
        let currentTask = null;

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Main task (starts with - or *)
            if (trimmed.match(/^[-*]\s+/)) {
                if (currentTask) {
                    tasks.push(currentTask);
                }
                
                currentTask = {
                    name: trimmed.replace(/^[-*]\s+/, ''),
                    description: '',
                    subtasks: []
                };
            }
            // Subtask (indented)
            else if (trimmed.match(/^\s+[-*]\s+/) && currentTask) {
                currentTask.subtasks.push({
                    name: trimmed.replace(/^\s+[-*]\s+/, '')
                });
            }
            // Description line
            else if (trimmed && currentTask && !trimmed.startsWith('#')) {
                currentTask.description += (currentTask.description ? ' ' : '') + trimmed;
            }
        }

        if (currentTask) {
            tasks.push(currentTask);
        }

        return tasks;
    }
}

module.exports = AsanaConnector;