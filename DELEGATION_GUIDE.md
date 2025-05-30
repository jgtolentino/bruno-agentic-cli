# Bruno Delegation System

## 🎯 Overview

Bruno's delegation system intelligently recognizes when tasks exceed local execution capabilities and automatically delegates them to Claude Code CLI. This prevents Bruno from attempting tasks it cannot properly execute or verify.

## 🚫 When Bruno Cannot Execute Tasks

Bruno will **automatically delegate** tasks that require:

### 🌐 External API Calls
- **Complex authentication** (OAuth, JWT, API keys)
- **Dynamic payload generation** requiring LLM reasoning
- **Retry logic** and exponential backoff
- **Rate limiting** and throttling
- **Multi-step API workflows**

### 🔐 Security & Secrets
- **Token management** (Bruno shouldn't see secrets directly)
- **Authentication flows**
- **Secret rotation** or key management

### 🧠 AI-Powered Processing
- **Dynamic JSON construction** based on context
- **API response interpretation** requiring reasoning
- **Content generation** for notifications/emails
- **Complex data transformation**

### 🔗 Third-Party Integrations
- **Zapier** webhooks with complex payloads
- **Notion** page creation with rich content
- **Slack** notifications with dynamic formatting
- **JIRA** ticket management workflows
- **Email** composition and sending

## 🔄 Delegation Flow

```
1. Task Analysis
   ├── Pattern Matching (API URLs, auth headers, etc.)
   ├── Complexity Assessment (confidence scoring)
   └── Capability Check (can Bruno handle this?)

2. Decision
   ├── Can Execute Locally → Continue with Bruno
   └── Needs Delegation → Route to Claude Code CLI

3. Delegation
   ├── Create delegation prompt
   ├── Queue task for Claude Code CLI
   ├── Execute via Claude Code CLI
   └── Return verified results
```

## 📋 Task Structure for Delegation

### Explicit Delegation
```yaml
- id: "complex-api-task"
  task: "Create dynamic Notion page"
  command: "echo 'Placeholder - needs Claude Code CLI'"
  requires_delegation: true
  delegate_to: "claude-code"
  reason: "Requires dynamic JSON payload generation"
```

### Automatic Detection
```yaml
- id: "api-call"
  task: "Send Slack notification"
  command: |
    curl -X POST https://hooks.slack.com/api/chat.postMessage \
      -H "Authorization: Bearer $SLACK_TOKEN" \
      -d '{"channel": "#deploy", "text": "Deploy complete"}'
  # Bruno will detect API call patterns and delegate automatically
```

## 🛡️ Security Benefits

1. **Token Isolation**: Bruno never handles sensitive API tokens
2. **Verified Execution**: Delegated tasks return verification results
3. **Audit Trail**: All delegations are logged and trackable
4. **Fallback Safety**: Failed delegations don't claim false success

## 📊 Delegation Patterns

### High Confidence Delegation (80-100%)
- External API URLs (`https://api.*`)
- Authentication headers (`Authorization: Bearer`)
- Complex JSON payloads with variables
- Third-party service integrations

### Medium Confidence Delegation (40-79%)
- Network operations with retry logic
- Dynamic content generation
- Multi-step workflows
- Complex verification requirements

### Local Execution (0-39%)
- File system operations
- Local command execution
- Simple verification tasks
- Git operations

## 🔧 Configuration

### Enable/Disable Delegation
```yaml
# Bruno config
verification:
  delegation_enabled: true
  strict_mode: true

agents:
  claude_code:
    enabled: true
    command: "claude"
```

### Custom Delegation Patterns
```javascript
// Add custom patterns for delegation detection
delegationPatterns: {
  custom_api: [
    /your-api\.com/i,
    /custom-auth-header/i
  ]
}
```

## 📈 Monitoring Delegation

### Check Delegation Queue
```bash
bruno-verify --delegation-status
```

### View Delegation History
```bash
ls ~/.bruno-workspace/delegation-queue/
```

### Delegation Metrics
```bash
# Show success rates and common delegation reasons
bruno-delegate status --detailed
```

## 🧪 Testing Delegation

### Test Delegation Detection
```bash
# Analyze if tasks would be delegated
bruno-delegate analyze examples/delegation-examples.yaml --verbose
```

### Test Full Delegation Flow
```bash
# Process tasks with actual delegation
bruno-delegate process examples/delegation-examples.yaml
```

### Test Local-Only Tasks
```bash
# Verify these tasks stay local
bruno verify examples/local-only-examples.yaml --verbose
```

## 📚 Examples

### ✅ Local Task (Bruno Executes)
```yaml
- id: "build-project"
  task: "Build React application"
  command: "npm run build"
  verify: "test -d build"
  success_condition: "0"
```

### 🛑 Delegated Task (Claude Code CLI Executes)
```yaml
- id: "notion-page"
  task: "Create deployment summary in Notion"
  command: |
    curl -X POST https://api.notion.com/v1/pages \
      -H "Authorization: Bearer $NOTION_TOKEN" \
      -d '${DYNAMIC_JSON_PAYLOAD}'
  # Automatically delegated due to API + auth + dynamic payload
```

## 🚀 Getting Started

1. **Install** the delegation system:
   ```bash
   ./install-bruno-agentic.sh
   ```

2. **Test** delegation detection:
   ```bash
   bruno-delegate test --verbose
   ```

3. **Run** example delegations:
   ```bash
   bruno verify examples/delegation-examples.yaml
   ```

4. **Monitor** delegation queue:
   ```bash
   bruno-delegate status
   ```

## 🔍 Troubleshooting

### Delegation Failed
- Check if Claude Code CLI is installed and accessible
- Verify workspace permissions
- Check delegation queue for error details

### Task Incorrectly Delegated
- Review delegation patterns in config
- Add task to local-only whitelist
- Adjust confidence thresholds

### Delegation Not Triggered
- Check if task matches delegation patterns
- Verify delegation is enabled in config
- Use explicit `requires_delegation: true`

## 🎯 Best Practices

1. **Use explicit delegation** for critical API tasks
2. **Test delegation patterns** before production use
3. **Monitor delegation queue** regularly
4. **Keep secrets in Claude Code CLI** environment only
5. **Verify delegated results** match expectations

The delegation system ensures Bruno never attempts tasks beyond its capabilities while maintaining the security and verification benefits of the multi-agent architecture.