const { Octokit } = require('@octokit/rest');

class GitHubConnector {
    constructor(token) {
        this.octokit = new Octokit({ auth: token });
        this.token = token;
    }

    getMethods() {
        return [
            'createIssue',
            'createPullRequest',
            'createRepository',
            'createBranch',
            'commitFile',
            'createRelease',
            'addComment',
            'listIssues',
            'getRepository',
            'createProject',
            'addToProject',
            'updateIssue',
            'mergePullRequest'
        ];
    }

    async createIssue(data) {
        try {
            const { owner, repo, title, body, labels = [], assignees = [] } = data;

            const issue = await this.octokit.rest.issues.create({
                owner,
                repo,
                title,
                body,
                labels,
                assignees
            });

            return {
                id: issue.data.id,
                number: issue.data.number,
                title: issue.data.title,
                url: issue.data.html_url,
                state: issue.data.state
            };

        } catch (error) {
            throw new Error(`GitHub createIssue failed: ${error.message}`);
        }
    }

    async createPullRequest(data) {
        try {
            const { owner, repo, title, body, head, base = 'main', draft = false } = data;

            const pr = await this.octokit.rest.pulls.create({
                owner,
                repo,
                title,
                body,
                head,
                base,
                draft
            });

            return {
                id: pr.data.id,
                number: pr.data.number,
                title: pr.data.title,
                url: pr.data.html_url,
                state: pr.data.state
            };

        } catch (error) {
            throw new Error(`GitHub createPullRequest failed: ${error.message}`);
        }
    }

    async createRepository(data) {
        try {
            const { 
                name, 
                description = '', 
                private: isPrivate = false, 
                auto_init = true,
                gitignore_template,
                license_template 
            } = data;

            const repo = await this.octokit.rest.repos.createForAuthenticatedUser({
                name,
                description,
                private: isPrivate,
                auto_init,
                gitignore_template,
                license_template
            });

            return {
                id: repo.data.id,
                name: repo.data.name,
                full_name: repo.data.full_name,
                url: repo.data.html_url,
                clone_url: repo.data.clone_url,
                ssh_url: repo.data.ssh_url
            };

        } catch (error) {
            throw new Error(`GitHub createRepository failed: ${error.message}`);
        }
    }

    async commitFile(data) {
        try {
            const { owner, repo, path, content, message, branch = 'main', encoding = 'utf-8' } = data;

            // Check if file exists
            let sha = null;
            try {
                const existingFile = await this.octokit.rest.repos.getContent({
                    owner,
                    repo,
                    path,
                    ref: branch
                });
                sha = existingFile.data.sha;
            } catch (error) {
                // File doesn't exist, which is fine for creation
            }

            // Create or update file
            const result = await this.octokit.rest.repos.createOrUpdateFileContents({
                owner,
                repo,
                path,
                message,
                content: Buffer.from(content, encoding).toString('base64'),
                branch,
                ...(sha && { sha })
            });

            return {
                path,
                sha: result.data.content.sha,
                url: result.data.content.html_url,
                commit: result.data.commit
            };

        } catch (error) {
            throw new Error(`GitHub commitFile failed: ${error.message}`);
        }
    }

    async createBranch(data) {
        try {
            const { owner, repo, branch, from_branch = 'main' } = data;

            // Get the SHA of the from_branch
            const ref = await this.octokit.rest.git.getRef({
                owner,
                repo,
                ref: `heads/${from_branch}`
            });

            // Create new branch
            const newBranch = await this.octokit.rest.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${branch}`,
                sha: ref.data.object.sha
            });

            return {
                branch,
                sha: newBranch.data.object.sha,
                url: newBranch.data.url
            };

        } catch (error) {
            throw new Error(`GitHub createBranch failed: ${error.message}`);
        }
    }

    async listIssues(data) {
        try {
            const { 
                owner, 
                repo, 
                state = 'open', 
                labels = '', 
                assignee,
                per_page = 30 
            } = data;

            const issues = await this.octokit.rest.issues.listForRepo({
                owner,
                repo,
                state,
                labels,
                assignee,
                per_page
            });

            return issues.data.map(issue => ({
                id: issue.id,
                number: issue.number,
                title: issue.title,
                state: issue.state,
                url: issue.html_url,
                assignee: issue.assignee ? issue.assignee.login : null,
                labels: issue.labels.map(label => label.name),
                created_at: issue.created_at,
                updated_at: issue.updated_at
            }));

        } catch (error) {
            throw new Error(`GitHub listIssues failed: ${error.message}`);
        }
    }

    async addComment(data) {
        try {
            const { owner, repo, issue_number, body } = data;

            const comment = await this.octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number,
                body
            });

            return {
                id: comment.data.id,
                body: comment.data.body,
                url: comment.data.html_url,
                created_at: comment.data.created_at
            };

        } catch (error) {
            throw new Error(`GitHub addComment failed: ${error.message}`);
        }
    }

    async createRelease(data) {
        try {
            const { 
                owner, 
                repo, 
                tag_name, 
                name, 
                body = '', 
                draft = false, 
                prerelease = false,
                target_commitish = 'main'
            } = data;

            const release = await this.octokit.rest.repos.createRelease({
                owner,
                repo,
                tag_name,
                name,
                body,
                draft,
                prerelease,
                target_commitish
            });

            return {
                id: release.data.id,
                tag_name: release.data.tag_name,
                name: release.data.name,
                url: release.data.html_url,
                published_at: release.data.published_at
            };

        } catch (error) {
            throw new Error(`GitHub createRelease failed: ${error.message}`);
        }
    }

    async getRepository(data) {
        try {
            const { owner, repo } = data;

            const repository = await this.octokit.rest.repos.get({
                owner,
                repo
            });

            return {
                id: repository.data.id,
                name: repository.data.name,
                full_name: repository.data.full_name,
                description: repository.data.description,
                url: repository.data.html_url,
                clone_url: repository.data.clone_url,
                ssh_url: repository.data.ssh_url,
                default_branch: repository.data.default_branch,
                stars: repository.data.stargazers_count,
                forks: repository.data.forks_count,
                created_at: repository.data.created_at,
                updated_at: repository.data.updated_at,
                language: repository.data.language,
                topics: repository.data.topics
            };

        } catch (error) {
            throw new Error(`GitHub getRepository failed: ${error.message}`);
        }
    }

    async updateIssue(data) {
        try {
            const { owner, repo, issue_number, title, body, state, labels, assignees } = data;

            const updateData = {};
            if (title) updateData.title = title;
            if (body) updateData.body = body;
            if (state) updateData.state = state;
            if (labels) updateData.labels = labels;
            if (assignees) updateData.assignees = assignees;

            const issue = await this.octokit.rest.issues.update({
                owner,
                repo,
                issue_number,
                ...updateData
            });

            return {
                id: issue.data.id,
                number: issue.data.number,
                title: issue.data.title,
                state: issue.data.state,
                url: issue.data.html_url,
                updated_at: issue.data.updated_at
            };

        } catch (error) {
            throw new Error(`GitHub updateIssue failed: ${error.message}`);
        }
    }

    async mergePullRequest(data) {
        try {
            const { owner, repo, pull_number, commit_title, commit_message, merge_method = 'merge' } = data;

            const merge = await this.octokit.rest.pulls.merge({
                owner,
                repo,
                pull_number,
                commit_title,
                commit_message,
                merge_method
            });

            return {
                merged: merge.data.merged,
                sha: merge.data.sha,
                message: merge.data.message
            };

        } catch (error) {
            throw new Error(`GitHub mergePullRequest failed: ${error.message}`);
        }
    }

    // Helper method to parse Claude output into GitHub issues
    parseTasksToIssues(markdownText, repository) {
        const lines = markdownText.split('\n');
        const issues = [];
        let currentIssue = null;

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Main task (starts with - or *)
            if (trimmed.match(/^[-*]\s+/)) {
                if (currentIssue) {
                    issues.push(currentIssue);
                }
                
                currentIssue = {
                    title: trimmed.replace(/^[-*]\s+/, ''),
                    body: '',
                    labels: ['task'],
                    ...repository
                };
            }
            // Description line
            else if (trimmed && currentIssue && !trimmed.startsWith('#')) {
                currentIssue.body += (currentIssue.body ? '\n' : '') + trimmed;
            }
        }

        if (currentIssue) {
            issues.push(currentIssue);
        }

        return issues;
    }

    // Batch create issues from task list
    async createIssuesFromTasks(data) {
        try {
            const { owner, repo, tasks, labels = ['claude-generated'] } = data;
            const results = [];

            for (const task of tasks) {
                const issueData = {
                    owner,
                    repo,
                    title: task.title || task.name,
                    body: task.description || task.body || '',
                    labels: [...labels, ...(task.labels || [])]
                };

                if (task.assignee) {
                    issueData.assignees = [task.assignee];
                }

                const issue = await this.createIssue(issueData);
                results.push(issue);

                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            return {
                created: results.length,
                issues: results
            };

        } catch (error) {
            throw new Error(`GitHub createIssuesFromTasks failed: ${error.message}`);
        }
    }
}

module.exports = GitHubConnector;