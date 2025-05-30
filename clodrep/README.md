# Claude Code CLI Secure Executor

🔐 **Credential-aware automation controller** that securely executes tasks with secret injection and verification, while intelligently delegating to Bruno for local operations.

## 🎯 Overview

The Secure Executor transforms Claude Code CLI into a production-ready automation controller that:

- **🔑 Manages secrets** safely with automatic injection
- **🛡️ Prevents token exposure** in logs or to Claude
- **✅ Verifies all operations** before claiming success
- **📤 Delegates intelligently** to Bruno for local tasks
- **📋 Executes workflows** from YAML task definitions

## 🚀 Quick Start

### 1. Initialize Environment
```bash
cd clodrep/
./clodrep init
```

This creates `.clodrep.env` from the example file.

### 2. Configure Secrets
Edit `.clodrep.env` with your actual tokens:
```bash
# API Tokens
NOTION_TOKEN=secret_notion_token_here
VERCEL_TOKEN=vercel_prod_token_here
GITHUB_TOKEN=ghp_your_github_token_here
SLACK_TOKEN=xoxb_your_slack_bot_token

# Add your other secrets...
```

### 3. Test the System
```bash
./clodrep test --verbose
```

### 4. Run Sample Tasks
```bash
./clodrep dry-run sample-tasks.yaml  # Preview mode
./clodrep run sample-tasks.yaml --verbose  # Execute mode
```

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `clodrep run <file>` | Execute tasks from YAML file |
| `clodrep test` | Run built-in test tasks |
| `clodrep dry-run <file>` | Preview what would execute |
| `clodrep init` | Initialize environment files |
| `clodrep secrets` | Check loaded secrets |
| `clodrep sample` | Run sample task demonstrations |

## 📋 Task Structure

### Basic Task
```yaml
- id: "api-call"
  task: "Create Notion page"
  command: |
    curl -X POST https://api.notion.com/v1/pages \
      -H "Authorization: Bearer {{NOTION_TOKEN}}" \
      -H "Content-Type: application/json" \
      -d '{"parent": {"database_id": "xyz"}}'
  verify: 'curl -s -o /dev/null -w "%{http_code}" https://api.notion.com/v1/pages'
  success_condition: "200"
  fail_message: "❌ Notion page creation failed"
```

### Delegation to Bruno
```yaml
- id: "local-build"
  task: "Build application locally"
  agent: executor
  command: "npm run build"
  delegate_to: "bruno"
  verify: "test -d build"
  success_condition: "0"
  comparison_type: "numeric"
```

## 🔐 Secret Management

### Secret Injection
Use `{{SECRET_NAME}}` placeholders in commands:
```yaml
command: 'curl -H "Authorization: Bearer {{GITHUB_TOKEN}}" https://api.github.com/user'
```

### Automatic Redaction
Secrets are automatically redacted in logs:
```
▶ Executing: curl -H "Authorization: Bearer [GITHUB_TOKEN]" https://api.github.com/user
```

### Available Secrets
- `{{NOTION_TOKEN}}` - Notion API token
- `{{VERCEL_TOKEN}}` - Vercel deployment token
- `{{GITHUB_TOKEN}}` - GitHub API token
- `{{SLACK_TOKEN}}` - Slack bot token
- `{{OPENAI_API_KEY}}` - OpenAI API key
- And many more... (see `.clodrep.env.example`)

## 🔄 Delegation System

### Automatic Delegation
Tasks are automatically delegated to Bruno when they involve:
- Local file operations (`cp`, `mv`, `mkdir`)
- Package management (`npm install`, `npm run`)
- Git operations (`git add`, `git commit`)
- Docker builds (without external URLs)

### Manual Delegation
Force delegation with:
```yaml
agent: executor
delegate_to: "bruno"
```

### Why Delegate?
- **Bruno handles local operations** securely
- **Secure Executor handles APIs** with secret injection
- **Prevents token exposure** to local filesystem operations
- **Optimizes execution** by using the right tool for each task

## ✅ Verification Types

### Command Verification
```yaml
verify: 'curl -s -o /dev/null -w "%{http_code}" https://api.example.com'
success_condition: "200"
```

### Comparison Types
- `exact` - Exact string match (default)
- `contains` - String contains expected text
- `numeric` - Numeric equality
- `numeric_gt` - Greater than comparison
- `regex` - Regular expression match

### Examples
```yaml
# HTTP status check
verify: 'curl -s -o /dev/null -w "%{http_code}" https://myapp.com'
success_condition: "200"

# Numeric comparison
verify: 'ls build/ | wc -l'
success_condition: "5"
comparison_type: "numeric_gt"

# Contains check
verify: 'git status'
success_condition: "clean"
comparison_type: "contains"
```

## 🛡️ Security Features

### 1. Secret Isolation
- Secrets never appear in logs
- Commands are sanitized automatically
- Tokens injected only at execution time

### 2. Verification Required
- Every operation must include verification
- No "success" claims without proof
- Real-world condition checking

### 3. Delegation Security
- Local operations delegated to Bruno
- API operations handled by Secure Executor
- Clear separation of concerns

### 4. Audit Trail
- All executions logged with timestamps
- Success/failure tracking
- Execution reports available

## 📊 Examples

### Complete Deployment Workflow
```yaml
# Deploy to Vercel
- id: vercel-deploy
  command: |
    curl -X POST https://api.vercel.com/v13/deployments \
      -H "Authorization: Bearer {{VERCEL_TOKEN}}" \
      -d '{"name": "my-app", "gitSource": {"repo": "user/repo"}}'
  verify: 'curl -s "https://my-app.vercel.app/health"'
  success_condition: "200"

# Update Notion
- id: notion-log
  command: |
    curl -X POST https://api.notion.com/v1/pages \
      -H "Authorization: Bearer {{NOTION_TOKEN}}" \
      -d '{"parent": {"database_id": "abc"}, "properties": {...}}'
  verify: 'curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer {{NOTION_TOKEN}}" https://api.notion.com/v1/databases/abc'
  success_condition: "200"

# Notify team
- id: slack-notify
  command: |
    curl -X POST https://slack.com/api/chat.postMessage \
      -H "Authorization: Bearer {{SLACK_TOKEN}}" \
      -d '{"channel": "#deploy", "text": "🚀 Deployment complete!"}'
  verify: 'curl -s -H "Authorization: Bearer {{SLACK_TOKEN}}" https://slack.com/api/auth.test | jq -r ".ok"'
  success_condition: "true"
```

## 🚨 Error Handling

### Task Failures
- Failed tasks stop execution by default
- Use `stop_on_failure: false` to continue
- Detailed error messages with context

### Missing Secrets
- Clear error messages for missing tokens
- Lists available secrets for debugging
- Fails fast with helpful guidance

### Verification Failures
- Shows expected vs actual results
- Includes verification command output
- Never claims success on verification failure

## 📈 Monitoring

### Check Execution Reports
```bash
ls temp/  # View delegation files
cat execution-report.yaml  # Detailed execution log
```

### Secret Status
```bash
./clodrep secrets  # Show loaded secrets (with preview)
```

### Verbose Mode
```bash
./clodrep run tasks.yaml --verbose  # Detailed execution logs
```

## 🔗 Integration

### With Bruno Multi-Agent System
The Secure Executor integrates seamlessly with Bruno's delegation system:
1. **Claude.ai** plans the workflow
2. **Secure Executor** handles API operations with secrets
3. **Bruno** executes local file/build operations
4. **MCP File Server** provides secure file access

### With Existing CI/CD
```bash
# In your CI pipeline
./clodrep run deploy-tasks.yaml
```

### With Development Workflow
```bash
# Local development
./clodrep run local-tasks.yaml --verbose
```

## 🔄 Best Practices

1. **Always include verification** - Never trust command exit codes alone
2. **Use specific success conditions** - Be explicit about what success means
3. **Keep secrets in .clodrep.env** - Never hardcode tokens
4. **Test with dry-run first** - Preview before executing
5. **Monitor execution logs** - Review results for security
6. **Delegate appropriately** - Let Bruno handle local ops

The Secure Executor ensures that your automation workflows are both powerful and secure, with proper secret management and verification at every step.