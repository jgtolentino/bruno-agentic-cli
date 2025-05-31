# Bruno Orchestration Architecture Test Suite

## Overview

This comprehensive test suite validates the three-agent orchestration model:
- **Claude Code CLI** (Master Orchestrator)
- **Claude Desktop** (Planner & Validator)
- **Bruno CLI** (Local Executor)

## Test Categories

### 1. MCP Bridge Integration Tests

#### Test 1.1: Basic Server Health Check
```bash
# Start MCP Bridge server
cd bruno-agentic-cli/claude-mcp-bridge
npm start

# Test endpoint
curl http://localhost:3002/health
```
**Expected Result:** Server responds with health status

#### Test 1.2: Multi-Service Coordination
```javascript
// Test payload
{
  "command": "Create project documentation",
  "services": ["google-docs", "asana"],
  "tasks": [
    {
      "service": "google-docs",
      "action": "create",
      "data": {
        "title": "Project Blueprint",
        "content": "# Project Overview\n\nTest content"
      }
    },
    {
      "service": "asana",
      "action": "create-task",
      "data": {
        "name": "Review documentation",
        "project": "Test Project"
      }
    }
  ]
}
```

#### Test 1.3: Batch Operations
```bash
# Test batch task processing
curl -X POST http://localhost:3002/batch \
  -H "Content-Type: application/json" \
  -d @test-batch-tasks.json
```

### 2. Bruno Task Execution Tests

#### Test 2.1: Local Execution Capability
```javascript
// Test: Bruno handles local operations
const testTasks = [
  {
    type: "file-operation",
    action: "create",
    path: "./test-output.txt",
    content: "Bruno local execution test"
  },
  {
    type: "shell-command",
    command: "echo 'Bruno executing locally'",
    options: { cwd: "." }
  }
];
```

#### Test 2.2: Delegation Decision Making
```javascript
// Test: Bruno correctly delegates to Claude
const delegationTests = [
  {
    task: "Call OpenAI API with dynamic payload",
    shouldDelegate: true,
    reason: "External API with authentication"
  },
  {
    task: "Read local file",
    shouldDelegate: false,
    reason: "Local operation within Bruno's capability"
  },
  {
    task: "OAuth flow with Google",
    shouldDelegate: true,
    reason: "Authentication flow"
  }
];
```

#### Test 2.3: Streaming Output
```bash
# Test real-time output streaming
bruno exec --stream "npm install && npm test"
```

### 3. Three-Agent Communication Tests

#### Test 3.1: Full Orchestration Flow
```yaml
test_name: "End-to-End Marketing Campaign"
flow:
  1_claude_code_cli:
    input: "Create a marketing campaign with documentation and tasks"
    
  2_claude_desktop:
    plans:
      - Create campaign structure
      - Generate documentation
      - Set up tracking tasks
      
  3_bruno_execution:
    - Create local files
    - Initialize project structure
    
  4_delegation_to_claude:
    - Create Google Doc
    - Create Asana tasks
    
  5_validation:
    - Claude Desktop validates results
```

#### Test 3.2: Error Handling & Recovery
```javascript
// Test error scenarios
const errorScenarios = [
  {
    scenario: "Network failure during Google Docs creation",
    recovery: "Retry with exponential backoff"
  },
  {
    scenario: "Bruno execution timeout",
    recovery: "Delegate to Claude Code CLI"
  },
  {
    scenario: "Invalid task format",
    recovery: "Request clarification from Claude Desktop"
  }
];
```

### 4. Integration Point Tests

#### Test 4.1: Google Docs Integration
```javascript
// Test Google Docs operations
const googleDocsTests = [
  {
    test: "Create Document",
    operation: "POST /docs/create",
    payload: {
      title: "Test Document",
      content: "# Test Content\n\nAutomated test"
    }
  },
  {
    test: "Update Document",
    operation: "PUT /docs/{docId}",
    payload: {
      updates: [
        { insertText: { text: "Updated content", index: 0 } }
      ]
    }
  }
];
```

#### Test 4.2: Asana Integration
```javascript
// Test Asana operations
const asanaTests = [
  {
    test: "Create Task",
    endpoint: "/tasks",
    data: {
      name: "Test Task",
      notes: "Created by orchestration test",
      projects: ["<project_gid>"]
    }
  },
  {
    test: "Update Task Status",
    endpoint: "/tasks/{task_gid}",
    data: {
      completed: true
    }
  }
];
```

### 5. Security & Privacy Tests

#### Test 5.1: Environment Variable Handling
```bash
# Test secret injection
export TEST_API_KEY="secret-key-123"
bruno exec --env "echo $TEST_API_KEY" | grep -v "secret-key-123"
```

#### Test 5.2: Log Redaction
```javascript
// Test sensitive data redaction
const sensitiveDataTest = {
  apiKey: "sk-1234567890",
  password: "test-password",
  token: "bearer-token-xyz"
};
// Verify logs don't contain these values
```

### 6. Performance Tests

#### Test 6.1: Concurrent Task Execution
```javascript
// Test parallel execution
const concurrentTasks = Array(10).fill(null).map((_, i) => ({
  id: `task-${i}`,
  type: "file-operation",
  action: "create",
  path: `./test-${i}.txt`
}));
```

#### Test 6.2: Large Batch Processing
```bash
# Test with 100 tasks
bruno batch-exec --file large-batch-test.json --monitor
```

### 7. ClaudeFlow Integration Tests

#### Test 7.1: Workflow Execution
```python
# Test ClaudeFlow workflow
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "marketing_campaign",
    "inputs": {
      "campaign_name": "Test Campaign",
      "target_audience": "Developers"
    }
  }'
```

#### Test 7.2: Step-by-Step Validation
```yaml
workflow: test_workflow
steps:
  - name: claude_analysis
    type: claude
    prompt: "Analyze this test data"
    
  - name: create_doc
    type: google_docs
    action: create
    
  - name: validate
    type: claude
    prompt: "Validate the created document"
```

## Test Execution Plan

### Phase 1: Unit Tests (Local)
1. Bruno task runner tests
2. Delegation logic tests
3. Input handler tests
4. Router tests

### Phase 2: Integration Tests
1. MCP Bridge API tests
2. Service connector tests
3. Inter-agent communication tests

### Phase 3: End-to-End Tests
1. Complete workflow scenarios
2. Error recovery scenarios
3. Performance benchmarks

### Phase 4: Security Audit
1. Secret management tests
2. Sandboxing validation
3. Permission checks

## Test Automation

### Continuous Integration
```yaml
name: Orchestration Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Bruno Unit Tests
        run: npm test
        
  integration-tests:
    runs-on: ubuntu-latest
    services:
      mcp-bridge:
        image: bruno-mcp-bridge:latest
        ports:
          - 3002:3002
    steps:
      - name: Run Integration Tests
        run: npm run test:integration
        
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run E2E Orchestration Tests
        run: npm run test:e2e
```

## Validation Criteria

### Success Metrics
- ✅ All unit tests pass (100% coverage)
- ✅ Integration tests complete < 30s
- ✅ E2E workflows execute successfully
- ✅ No secrets exposed in logs
- ✅ Delegation decisions are correct
- ✅ Error recovery works as designed

### Performance Targets
- Response time < 100ms for local operations
- Delegation decision < 50ms
- Batch processing: 100 tasks < 5 minutes
- Memory usage < 500MB under load

## Test Data & Fixtures

### Sample Tasks
```json
{
  "test_tasks": [
    {
      "id": "local-1",
      "type": "file",
      "action": "create",
      "delegatable": false
    },
    {
      "id": "api-1",
      "type": "api_call",
      "service": "openai",
      "delegatable": true
    },
    {
      "id": "auth-1",
      "type": "oauth",
      "provider": "google",
      "delegatable": true
    }
  ]
}
```

### Mock Services
- Mock Google Docs API
- Mock Asana API
- Mock Claude responses
- Local file system sandbox

## Debugging & Troubleshooting

### Debug Mode
```bash
# Enable debug logging
export DEBUG=bruno:*
bruno exec --debug "test command"
```

### Common Issues
1. **Port conflicts**: Check if 3002 is available
2. **Missing credentials**: Verify .env setup
3. **Network timeouts**: Check firewall/proxy
4. **Permission errors**: Verify file permissions

## Reporting

Test results should include:
- Execution time
- Pass/fail status
- Error messages
- Performance metrics
- Coverage reports

Generate report:
```bash
npm run test:report
```