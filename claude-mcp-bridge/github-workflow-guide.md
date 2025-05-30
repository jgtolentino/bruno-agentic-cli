# GitHub Repository Integration Guide

## 🔗 How to Leverage Remote GitHub Repositories

### 1. Repository Analysis & Issues
```bash
# List issues from any repo
./claude-bridge github issues OWNER/REPO open

# Example: List issues from your retail dashboard
./claude-bridge github issues tbwa/retail-insights-dashboard-ph open

# List all repositories you have access to
./claude-bridge github repos list
```

### 2. Create Issues from Claude Analysis
```bash
# Convert Claude task lists directly to GitHub issues
./claude-bridge task create tasks.md --service github --project "tbwa/retail-insights-dashboard-ph"

# This will:
# - Parse markdown tasks from Claude output
# - Create individual GitHub issues
# - Add proper labels (task, priority:high, etc.)
# - Include estimated hours and descriptions
```

### 3. Repository Management
```bash
# Create new repository
./claude-bridge github create-repo "new-project-name" --description "Project description"

# Create branches for features
./claude-bridge github create-branch feature/dashboard-improvements --repo tbwa/retail-insights-dashboard-ph

# Create pull requests
./claude-bridge github create-pr --repo tbwa/retail-insights-dashboard-ph --title "Add new features" --head feature/dashboard-improvements
```

### 4. Code & Documentation Integration
```bash
# Commit documentation to repo
./claude-bridge github commit-file README.md --repo tbwa/retail-insights-dashboard-ph --message "Update documentation"

# Create releases
./claude-bridge github create-release v1.0.0 --repo tbwa/retail-insights-dashboard-ph --notes "Initial release"
```

## 🚀 Complete Claude → GitHub Automation Workflow

### Step 1: Claude Analysis → GitHub Issues
1. **Claude.ai analyzes** your project needs
2. **Copy Claude output** (task lists, requirements)
3. **Create markdown file** with tasks:
   ```markdown
   # TBWA Dashboard Sprint Planning
   
   ## Backend Tasks
   - Implement user authentication system
   - Create API endpoints for brand data
   - Set up database migrations
   
   ## Frontend Tasks  
   - Build responsive dashboard layout
   - Add data visualization components
   - Implement search and filtering
   ```
4. **Run command**:
   ```bash
   ./claude-bridge task create sprint-tasks.md --service github --project "tbwa/retail-insights-dashboard-ph"
   ```

### Step 2: Documentation → GitHub Pages
1. **Claude.ai generates** technical documentation
2. **Convert to professional docs**:
   ```bash
   ./claude-bridge doc create tech-spec.md --template technical --title "API Documentation"
   ```
3. **Commit to repository**:
   ```bash
   ./claude-bridge github commit-file docs/api-spec.md --repo tbwa/retail-insights-dashboard-ph
   ```

### Step 3: Project Management Integration
```bash
# Create project milestones in GitHub
./claude-bridge github create-milestone "Sprint 1" --repo tbwa/retail-insights-dashboard-ph --due-date "2024-02-15"

# Add issues to milestone and assign team members
./claude-bridge github update-issue 123 --repo tbwa/retail-insights-dashboard-ph --assignee "developer-username" --milestone "Sprint 1"
```

## 🔧 Setup Required

### Update GitHub Token
1. Go to https://github.com/settings/tokens
2. Generate new token with these scopes:
   - `repo` (full repository access)
   - `issues` (create/read issues)
   - `pull_requests` (create/manage PRs)
3. Add to `.clodrep.env`:
   ```bash
   GITHUB_TOKEN=ghp_your_new_token_here
   ```

### Repository Configuration
```bash
# Set default repository (optional)
export DEFAULT_GITHUB_REPO="tbwa/retail-insights-dashboard-ph"

# Test connection
./claude-bridge github repos get tbwa retail-insights-dashboard-ph
```

## 📊 Advanced GitHub Automation

### Batch Operations
Create `github-batch-config.json`:
```json
{
  "operations": [
    {
      "id": "create-sprint-issues",
      "service": "github", 
      "action": "createIssuesFromTasks",
      "data": {
        "owner": "tbwa",
        "repo": "retail-insights-dashboard-ph",
        "tasks": [
          {"title": "Implement authentication", "body": "Add user login system", "labels": ["backend", "high-priority"]},
          {"title": "Create dashboard layout", "body": "Build responsive UI", "labels": ["frontend", "medium-priority"]}
        ]
      }
    },
    {
      "id": "create-documentation",
      "service": "github",
      "action": "commitFile", 
      "data": {
        "owner": "tbwa",
        "repo": "retail-insights-dashboard-ph",
        "path": "docs/ARCHITECTURE.md",
        "content": "# System Architecture...",
        "message": "Add architecture documentation"
      }
    }
  ]
}
```

Run batch operations:
```bash
./claude-bridge batch github-batch-config.json
```

## 🎯 Example: Complete Project Setup

### 1. Create New Project Repository
```bash
./claude-bridge github create-repo "tbwa-dashboard-v2" \
  --description "Next generation TBWA retail insights dashboard" \
  --private
```

### 2. Initialize with Claude-Generated Structure
```bash
# Generate project structure with Claude.ai, then:
./claude-bridge github commit-file package.json --repo tbwa/tbwa-dashboard-v2 --message "Initial project setup"
./claude-bridge github commit-file README.md --repo tbwa/tbwa-dashboard-v2 --message "Add project documentation"
./claude-bridge github commit-file .gitignore --repo tbwa/tbwa-dashboard-v2 --message "Add gitignore"
```

### 3. Create Development Workflow
```bash
# Create feature branches
./claude-bridge github create-branch feature/authentication --repo tbwa/tbwa-dashboard-v2
./claude-bridge github create-branch feature/dashboard-ui --repo tbwa/tbwa-dashboard-v2

# Create issues for tracking
./claude-bridge task create development-tasks.md --service github --project "tbwa/tbwa-dashboard-v2"
```

## 🔄 Integration with Asana + GitHub

### Synchronized Project Management
1. **Create tasks in Asana** for project planning
2. **Create corresponding GitHub issues** for development tracking
3. **Link them together** with cross-references

```bash
# Create Asana tasks first
./claude-bridge task create project-plan.md --service asana

# Then create GitHub issues  
./claude-bridge task create development-tasks.md --service github --project "tbwa/retail-insights-dashboard-ph"
```

This creates a complete **Claude.ai → Asana → GitHub** workflow for project management and development tracking!