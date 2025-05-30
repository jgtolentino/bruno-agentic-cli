# Bruno Agentic CLI

🤖 **Multi-agent AI automation system** with verification-first execution and secure credential management.

## 🎯 Overview

Bruno Agentic CLI is a complete multi-agent system that orchestrates tasks between:

- **Claude.ai** (Planner) - High-level planning and task validation
- **Claude Code CLI** (Orchestrator) - API operations with secure credential injection
- **Bruno** (Executor) - Local operations with mandatory verification

## 🛡️ Key Security Features

- **🔒 Verification-First Execution** - No success claims without proof
- **🔑 Secure Credential Injection** - Automatic secret management with log sanitization
- **📤 Intelligent Delegation** - Tasks routed to appropriate agents automatically
- **📊 Complete Audit Trail** - All operations logged with timestamps
- **🚫 False Success Prevention** - Bruno will NEVER echo hallucinated success

## 🚀 Quick Start

### 1. Install the Complete System
```bash
git clone <repo-url>
cd bruno-agentic-cli
./install-bruno-agentic.sh
```

### 2. Test Installation
```bash
./test-installation.sh
```

### 3. Initialize Components
```bash
# Initialize secure executor with API credentials
~/.bruno/init-secure-executor.sh

# Initialize sample verification tasks
~/.bruno/init-sample-tasks.sh

# Start MCP file server
~/.bruno/start-mcp-server.sh
```

### 4. Test the System
```bash
# Test Bruno verification
bruno-verify-global simple-test.yaml --verbose

# Test secure executor
clodrep-global test --verbose

# Test multi-agent orchestration
bruno-agent-global "build and test my application"
```

## 🔧 Components

### 🤖 Bruno (Verification-First Executor)
```bash
# Execute tasks with mandatory verification
bruno verify deployment-tasks.yaml --verbose

# Single command with verification
bruno --verify-task "npm run build && npm test"

# Interactive mode with verification
bruno-global
```

**Key Features:**
- Mandatory verification for all operations
- Automatic delegation to secure executor for API tasks
- Complete audit logging
- No false success claims

### 🔐 Secure Executor (Claude Code CLI Automation)
```bash
# Run API automation tasks
clodrep-global run sample-tasks.yaml --verbose

# Preview mode (dry run)
clodrep-global dry-run deploy-tasks.yaml

# Check loaded credentials
clodrep-global secrets
```

**Key Features:**
- Automatic secret injection using `{{TOKEN_NAME}}` placeholders
- Command sanitization in logs
- Real-world verification (HTTP status, API responses)
- Integration with 25+ services (GitHub, Notion, Vercel, Slack, etc.)

### 🎼 Agent Router (Multi-Agent Orchestration)
```bash
# Orchestrate complex workflows
bruno-agent-global "deploy my app and notify the team"

# Execute plans from YAML
bruno-agent-global --plan-file deployment-plan.yaml
```

**Key Features:**
- Intelligent task routing between agents
- Shared `.plan.yaml` format for agent communication
- Execution monitoring and reporting
- Failure handling and retry logic

## 📋 Task Examples

### Simple Verification Task
```yaml
- id: "build-app"
  task: "Build React application"
  command: "npm run build"
  verify: "test -d build && test -f build/index.html"
  success_condition: "0"
  comparison_type: "numeric"
  fail_message: "❌ Build failed or output missing"
```

### API Task with Secret Injection
```yaml
- id: "notify-slack"
  task: "Send Slack deployment notification"
  command: |
    curl -X POST https://slack.com/api/chat.postMessage \
      -H "Authorization: Bearer {{SLACK_TOKEN}}" \
      -H "Content-Type: application/json" \
      -d '{"channel": "#deploy", "text": "🚀 Deployment complete!"}'
  verify: 'curl -s -H "Authorization: Bearer {{SLACK_TOKEN}}" "https://slack.com/api/auth.test" | jq -r ".ok"'
  success_condition: "true"
  fail_message: "❌ Slack notification failed"
```

### Delegated Task
```yaml
- id: "local-operations"
  task: "Run local build and tests"
  agent: executor
  command: "npm run build && npm test"
  delegate_to: "bruno"
  verify: "test -d build && npm run test:verify"
  success_condition: "0"
  comparison_type: "numeric"
```

## 🔄 Multi-Agent Workflow

```
1. Claude.ai (Planner)
   ├── Analyzes user request
   ├── Creates execution plan
   └── Defines verification requirements

2. Claude Code CLI (Orchestrator)
   ├── Handles API operations
   ├── Injects secrets securely
   ├── Manages complex auth flows
   └── Delegates local tasks to Bruno

3. Bruno (Executor)
   ├── Executes local operations
   ├── Verifies all results
   ├── Reports actual success/failure
   └── Maintains audit trail
```

## 🔐 Security Architecture

### Secret Management
- **Storage**: Secrets in `.clodrep.env` (never committed)
- **Injection**: Automatic `{{TOKEN_NAME}}` replacement
- **Logging**: All secrets automatically redacted
- **Isolation**: API operations separated from local operations

### Verification System
- **Mandatory**: Every operation must include verification
- **Real-World**: Check actual conditions (HTTP status, file existence)
- **Comparison Types**: Exact, contains, numeric, regex
- **Failure Handling**: Clear error messages with context

### Delegation Rules
Tasks are automatically delegated based on:
- **External APIs**: Require secure executor
- **Authentication**: OAuth, JWT, API keys
- **Dynamic Payloads**: LLM-generated JSON
- **Local Operations**: File system, git, builds → Bruno

## 📚 Documentation

- **[Delegation Guide](DELEGATION_GUIDE.md)** - Task delegation patterns and security
- **[Secure Executor Guide](clodrep/README.md)** - API automation with credentials
- **[Plan Schema](schemas/plan-schema.yaml)** - Multi-agent communication format
- **[Examples](examples/)** - Sample tasks and workflows

## 🧪 Testing

### Installation Test
```bash
./test-installation.sh  # Validates complete installation
```

### Component Tests
```bash
# Test Bruno verification
bruno verify examples/local-only-examples.yaml --verbose

# Test secure executor
clodrep-global test --verbose

# Test delegation patterns
bruno-delegate analyze examples/delegation-examples.yaml
```

### End-to-End Test
```bash
# Complete workflow test
bruno-agent-global "test the complete system with verification"
```

## 🔧 Configuration

### Main Configuration (`~/.bruno/config.yaml`)
```yaml
verification:
  enabled: true
  strict_mode: true
  delegation_enabled: true

agents:
  claude_code:
    secure_executor: "~/.bruno/clodrep/clodrep"
  bruno:
    verification: true

mcp:
  enabled: true
  port: 8001
```

### Secure Executor Secrets (`~/.bruno/clodrep/.clodrep.env`)
```bash
GITHUB_TOKEN=ghp_your_token
NOTION_TOKEN=secret_token
VERCEL_TOKEN=vercel_token
SLACK_TOKEN=xoxb_token
# ... 25+ more services
```

## 🚨 Troubleshooting

### Common Issues

**Installation Failed**
```bash
# Check prerequisites
node --version  # Requires Node.js 16+
python3 --version  # Requires Python 3.8+
npm --version

# Retry installation
./install-bruno-agentic.sh
```

**Verification Failed**
```bash
# Check Bruno verifier
bruno verify simple-test.yaml --verbose

# Check delegation
bruno-delegate analyze task.yaml
```

**Secrets Not Working**
```bash
# Check secrets loaded
clodrep-global secrets

# Verify env file
ls ~/.bruno/clodrep/.clodrep.env
```

**Multi-Agent Not Working**
```bash
# Check MCP server
curl http://localhost:8001/health

# Test agent router
bruno-agent-global --test
```

## 🛡️ Security Best Practices

1. **Never commit `.clodrep.env`** to version control
2. **Use specific verification conditions** - be explicit about success
3. **Monitor execution logs** for security issues
4. **Rotate secrets regularly** using the env file
5. **Test with dry-run first** before production execution
6. **Review delegation patterns** for appropriate security boundaries

## 🎯 Use Cases

### DevOps Automation
- Automated deployments with verification
- Multi-service notifications
- Infrastructure provisioning
- Monitoring setup

### Content Management
- Notion page creation
- Documentation updates
- Knowledge base maintenance
- Team notifications

### Development Workflows
- CI/CD pipeline automation
- Code deployment
- Testing automation
- Release management

### Business Operations
- Customer notifications
- Data synchronization
- Report generation
- Workflow automation

## 📈 Monitoring

### Execution Reports
```bash
# View execution logs
ls ~/.bruno/logs/

# Check delegation queue
ls ~/.bruno-workspace/delegation-queue/

# Monitor MCP server
curl http://localhost:8001/audit
```

### Success Metrics
- **Verification Rate**: % of tasks with successful verification
- **Delegation Accuracy**: % of tasks routed to correct agent
- **Security Score**: % of operations with proper secret handling
- **Reliability**: % of real success vs claimed success

## 🌟 Key Benefits

- **🛡️ Security**: Proper credential management and verification
- **🔄 Reliability**: No false success claims, real-world verification
- **📈 Scalability**: Multi-agent architecture handles complex workflows
- **🎯 Flexibility**: Supports 25+ services out of the box
- **📊 Observability**: Complete audit trail and monitoring
- **🚀 Productivity**: Automated workflows with human oversight

Bruno Agentic CLI ensures your automation is both powerful and secure, with proper verification at every step and intelligent delegation between specialized agents.

---

## 🚀 Legacy Bruno v3.0 Features

Bruno also includes the original v3.0 features for local AI development:

### 🔐 Privacy-First Foundation
- **100% Local Processing**: All AI computation happens on your machine via Ollama
- **Zero Telemetry**: No data collection, tracking, or cloud dependencies
- **Offline Operation**: Works completely without internet connectivity

### 🧠 Advanced AI Patterns Integration
- **🎯 Cursor IDE Patterns**: Semantic code search, holistic editing
- **🌊 Windsurf AI Flow**: Independent task execution, professional communication
- **⚡ Bolt Artifact System**: Think-first holistic creation
- **🔄 Manus Agent Loop**: Multi-step task planning

### Interactive REPL
```bash
bruno  # Start interactive mode
```

### Direct Commands
```bash
bruno explain src/utils.js
bruno fix src/auth.js
bruno test src/calculator.js
```

📄 **License**: MIT