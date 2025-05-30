# Multi-Agent Task Planning Request

## User Request
build and test my application

## Context
{}

## Required Output
Please provide an execution plan in YAML format with the following structure:

```yaml
id: unique-plan-id
userRequest: "build and test my application"
steps:
  - id: step-1
    type: analysis|implementation|testing|documentation
    description: "What this step accomplishes"
    agent: claude-code|bruno
    inputs: ["input-dependencies"]
    outputs: ["output-artifacts"]
    estimatedDuration: "time-estimate"
metadata:
  estimatedDuration: "total-time"
  complexity: low|medium|high
  requiredTools: ["tool-list"]
```

The plan should be optimized for the multi-agent workflow where:
- Claude Code CLI handles analysis, planning, and orchestration
- Bruno handles execution, implementation, and testing
- All agents can access files via the MCP file server
