# Claude.ai Integration Setup Guide

## 🔗 Connecting Claude.ai to Your MCP Bridge

### Option 1: HTTP API Integration (Recommended)

#### 1. Start the MCP Bridge Server
```bash
cd /Users/tbwa/Documents/GitHub/bruno-agentic-cli/claude-mcp-bridge
node src/server.js
```
The server runs on `http://localhost:3001`

#### 2. Use Claude.ai with HTTP Requests
In Claude.ai conversations, you can now reference your bridge:

**Example Conversation with Claude.ai:**
```
You: "I need to create tasks for the TBWA retail dashboard project. Here are the requirements:

- Set up authentication system
- Build dashboard components  
- Create API endpoints
- Add data visualization

Can you format this for my task management system?"

Claude.ai: "Here's your task list formatted for automation:

# TBWA Retail Dashboard Tasks

## Backend Development
- Set up user authentication system with Supabase Auth
- Create RESTful API endpoints for brand data retrieval
- Implement database schema with proper RLS policies
- Add data validation and error handling

## Frontend Development  
- Build responsive dashboard layout components
- Implement interactive data visualization charts
- Create search and filtering functionality
- Add export capabilities for reports

You can now send this to your MCP Bridge:

curl -X POST http://localhost:3001/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "service": "asana",
    "action": "createTaskBatch", 
    "data": {
      "tasks": [
        {"name": "Set up user authentication system", "description": "Implement Supabase Auth integration"},
        {"name": "Create RESTful API endpoints", "description": "Build endpoints for brand data retrieval"},
        {"name": "Build dashboard layout components", "description": "Create responsive UI components"},
        {"name": "Implement data visualization", "description": "Add interactive charts and graphs"}
      ]
    }
  }'
```

### Option 2: Copy-Paste Workflow (Immediate Use)

#### Step 1: Get Claude.ai Output
Ask Claude.ai to generate tasks/documentation:
```
"Generate a technical specification for a retail analytics dashboard with 
authentication, real-time data, and mobile support"
```

#### Step 2: Save Claude's Response
```bash
# Save Claude's response to a file
echo "Claude's markdown response here" > claude-output.md
```

#### Step 3: Process with MCP Bridge
```bash
# Create Asana tasks
./claude-bridge task create claude-output.md --service asana

# Create Google Docs
./claude-bridge doc create claude-output.md --template technical --title "Technical Specification"

# Create GitHub issues  
./claude-bridge task create claude-output.md --service github --project "tbwa/retail-insights-dashboard-ph"
```

### Option 3: Webhook Integration (Advanced)

#### 1. Set up Webhook Endpoint
The MCP Bridge server already includes webhook support:
```javascript
// POST /api/webhook
{
  "source": "claude.ai",
  "content": "markdown content from Claude",
  "action": "create_tasks",
  "services": ["asana", "google-docs"]
}
```

#### 2. Configure Automation
Create `webhook-config.json`:
```json
{
  "webhooks": {
    "claude_analysis": {
      "url": "http://localhost:3001/api/webhook",
      "actions": [
        {"service": "asana", "action": "createTaskBatch"},
        {"service": "google-docs", "action": "createFromMarkdown"}, 
        {"service": "github", "action": "createIssuesFromTasks"}
      ]
    }
  }
}
```

## 🚀 Automated Workflows

### Workflow 1: Project Planning
1. **Claude.ai Prompt**:
   ```
   "Create a comprehensive project plan for implementing a retail analytics 
   dashboard. Include backend tasks, frontend development, testing, and 
   deployment phases with estimated timelines."
   ```

2. **Copy Response** → Save as `project-plan.md`

3. **Execute Automation**:
   ```bash
   # Create all deliverables simultaneously
   ./claude-bridge task create project-plan.md --service asana
   ./claude-bridge doc create project-plan.md --template technical --title "Project Plan"
   ./claude-bridge task create project-plan.md --service github --project "tbwa/retail-insights-dashboard-ph"
   ```

### Workflow 2: Sprint Planning
1. **Claude.ai Prompt**:
   ```
   "Break down these user stories into development tasks for a 2-week sprint:
   - User authentication and authorization
   - Dashboard data visualization  
   - Real-time updates
   - Mobile responsiveness"
   ```

2. **Process Sprint Tasks**:
   ```bash
   ./claude-bridge task create sprint-tasks.md --service asana
   ```

### Workflow 3: Documentation Generation
1. **Claude.ai Prompt**:
   ```
   "Generate comprehensive API documentation for a retail analytics platform 
   including authentication, brand endpoints, demographics, and reporting APIs"
   ```

2. **Create Professional Docs**:
   ```bash
   ./claude-bridge doc create api-docs.md --template api --title "TBWA API Documentation"
   ```

## 🔧 Setup Action Items

### Immediate Setup (5 minutes)
```bash
# 1. Start the MCP Bridge server
cd /Users/tbwa/Documents/GitHub/bruno-agentic-cli/claude-mcp-bridge
node src/server.js &

# 2. Test the connection
curl http://localhost:3001/health

# 3. Update GitHub token (if needed)
# Edit /Users/tbwa/.bruno/clodrep/.clodrep.env
# Add: GITHUB_TOKEN=ghp_your_new_token

# 4. Test full workflow
./claude-bridge status
```

### Advanced Setup (Optional)
```bash
# 1. Set up ngrok for external access (if needed)
npm install -g ngrok
ngrok http 3001

# 2. Create automation scripts
chmod +x claude-bridge
ln -s /Users/tbwa/Documents/GitHub/bruno-agentic-cli/claude-mcp-bridge/claude-bridge /usr/local/bin/

# 3. Set up environment variables
echo 'export CLAUDE_BRIDGE_URL="http://localhost:3001"' >> ~/.zshrc
```

## 📋 Ready-to-Use Templates

### Template 1: Task Creation
**Claude.ai Prompt**:
```
"Create development tasks for implementing user authentication in a React/Supabase app. 
Include backend setup, frontend components, testing, and security considerations. 
Format as a markdown list with priorities and time estimates."
```

**Process Command**:
```bash
./claude-bridge task create auth-tasks.md --service asana
```

### Template 2: Technical Documentation  
**Claude.ai Prompt**:
```
"Generate technical architecture documentation for a retail analytics platform 
using React, Node.js, Supabase, and deployed on Vercel. Include system overview, 
API design, database schema, and deployment architecture."
```

**Process Command**:
```bash
./claude-bridge doc create tech-arch.md --template technical --title "System Architecture"
```

### Template 3: Sprint Planning
**Claude.ai Prompt**:
```
"Plan a 2-week development sprint for adding real-time features to a dashboard. 
Include WebSocket implementation, database subscriptions, frontend updates, 
testing, and deployment tasks with dependencies and time estimates."
```

**Process Commands**:
```bash
./claude-bridge task create sprint.md --service asana
./claude-bridge task create sprint.md --service github --project "tbwa/retail-insights-dashboard-ph"
```

## 🎯 No Action Required!

**Your MCP Bridge is already configured and ready to use with Claude.ai!**

✅ **Asana**: Connected and tested (20 tasks created)
✅ **Google Docs**: Connected and tested (2 documents created)  
✅ **GitHub**: Ready (just needs token refresh)
✅ **CLI**: Fully functional with wrapper script

**Just start using it:**
1. Get output from Claude.ai
2. Save to file  
3. Run `./claude-bridge` commands
4. Watch automation happen! 🚀