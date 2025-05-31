# Visual Workflow Guide: Claude Code CLI vs Bruno CLI

## Input → Processing → Output Flow Diagrams

### Claude Code CLI Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INPUT LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Natural Language  │  Code/Scripts  │  Multi-line  │  Images  │  Files  │
└──────────┬─────────┴───────┬────────┴──────┬───────┴────┬─────┴────┬────┘
           │                 │               │             │         │
           └─────────────────┴───────────────┴─────────────┴─────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLAUDE AI ORCHESTRATOR                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Intent    │  │   Context    │  │   Planning   │  │ Validation  │ │
│  │ Recognition │─▶│  Analysis    │─▶│   Engine     │─▶│   System    │ │
│  └─────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                ┌─────────────────────┴─────────────────────┐
                ▼                                           ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│      EXECUTION LAYER          │       │     MONITORING LAYER          │
├───────────────────────────────┤       ├───────────────────────────────┤
│  • MCP File Server           │       │  • Real-time Progress         │
│  • MCP Shell Server          │       │  • Error Detection            │
│  • Git Operations            │       │  • Success Validation         │
│  • Network Requests          │       │  • Adaptive Correction        │
└───────────────┬───────────────┘       └───────────────┬───────────────┘
                │                                       │
                └───────────────┬───────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          OUTPUT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Conversational Text │ Syntax-Highlighted Code │ Progress Updates │ UI │
└─────────────────────────────────────────────────────────────────────────┘
```

### Bruno CLI Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INPUT LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Natural Language  │  Commands  │  Multi-line (--claude)  │  Scripts   │
└──────────┬─────────┴─────┬──────┴────────────┬────────────┴──────┬─────┘
           │               │                   │                    │
           └───────────────┴───────────────────┴────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      ROUTING & PROCESSING LAYER                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Arg Parser │  │  Universal   │  │    Local     │  │   Pattern   │ │
│  │   & Mode    │─▶│   Router     │─▶│  Ollama LLM  │─▶│  Matching   │ │
│  └─────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                ┌─────────────────────┴─────────────────────┐
                ▼                                           ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│    SANDBOXED EXECUTION        │       │      TOOL ROUTING             │
├───────────────────────────────┤       ├───────────────────────────────┤
│  • Shell Sandbox              │       │  • File System Handler        │
│  • FS Handler (restricted)    │       │  • Knowledge Base             │
│  • Local-only operations      │       │  • Advanced Patterns          │
│  • No network by default      │       │  • Agent Chain                │
└───────────────┬───────────────┘       └───────────────┬───────────────┘
                │                                       │
                └───────────────┬───────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          OUTPUT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Structured Text │ Basic Code Display │ Status Updates │ Error Messages │
└─────────────────────────────────────────────────────────────────────────┘
```

## Detailed Input Processing Comparison

### Claude Code CLI Input Processing

```
User Types: "Create a React dashboard with user authentication"
                            │
                            ▼
┌─────────────────────────────────────────┐
│         INPUT DETECTION PHASE            │
├─────────────────────────────────────────┤
│  • Detect natural language request      │
│  • No special commands needed           │
│  • Context from conversation history    │
└────────────────────┬────────────────────┘
                     ▼
┌─────────────────────────────────────────┐
│         CLOUD AI PROCESSING              │
├─────────────────────────────────────────┤
│  1. Parse intent: "create React app"    │
│  2. Extract requirements:               │
│     - Dashboard UI                      │
│     - User authentication              │
│  3. Generate execution plan             │
│  4. Validate feasibility                │
└────────────────────┬────────────────────┘
                     ▼
┌─────────────────────────────────────────┐
│         PLAN PRESENTATION                │
├─────────────────────────────────────────┤
│  "I'll help you create a React         │
│   dashboard with authentication.        │
│   Here's what I'll do:                 │
│   1. Set up React project              │
│   2. Install auth dependencies         │
│   3. Create dashboard components       │
│   4. Implement auth flow"              │
└─────────────────────────────────────────┘
```

### Bruno CLI Input Processing

```
User Types: "Create a React dashboard with user authentication"
                            │
                            ▼
┌─────────────────────────────────────────┐
│         INPUT PARSING PHASE              │
├─────────────────────────────────────────┤
│  • Parse arguments and flags            │
│  • Detect mode (interactive/command)    │
│  • Extract command tokens               │
└────────────────────┬────────────────────┘
                     ▼
┌─────────────────────────────────────────┐
│         LOCAL ROUTING                    │
├─────────────────────────────────────────┤
│  1. Universal Router pattern match:     │
│     - "create" → Creation patterns      │
│     - "React" → Frontend engine         │
│  2. Route to appropriate handler        │
│  3. Check local templates               │
└────────────────────┬────────────────────┘
                     ▼
┌─────────────────────────────────────────┐
│         OLLAMA ENHANCEMENT               │
├─────────────────────────────────────────┤
│  • Send to local LLM for refinement    │
│  • Generate specific implementation     │
│  • Use predefined patterns              │
│  • Return structured plan               │
└─────────────────────────────────────────┘
```

## Execution Flow Comparison

### Claude Code CLI Execution

```
┌──────────────────────────────────────────────────────────────┐
│                    EXECUTION PHASE                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  AI: "Setting up React project..."                          │
│  $ npx create-react-app dashboard  ──────┐                  │
│                                           ▼                  │
│                                    ┌─────────────┐           │
│                                    │ MCP Server  │           │
│                                    │  Executes   │           │
│                                    └──────┬──────┘           │
│                                           ▼                  │
│  [Real-time output streams to UI] ◀──────┘                  │
│                                                              │
│  AI: "Installing authentication packages..."                 │
│  $ npm install firebase react-router-dom ────┐              │
│                                               ▼              │
│                                    ┌─────────────┐           │
│                                    │ Monitor &   │           │
│                                    │  Validate   │           │
│                                    └──────┬──────┘           │
│                                           ▼                  │
│  AI: "Creating dashboard component..."       │              │
│  📝 Writing src/Dashboard.jsx ◀──────────────┘              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Bruno CLI Execution

```
┌──────────────────────────────────────────────────────────────┐
│                    EXECUTION PHASE                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🤖 Executing React template...                             │
│  $ npx create-react-app dashboard  ──────┐                  │
│                                           ▼                  │
│                                    ┌─────────────┐           │
│                                    │   Shell     │           │
│                                    │  Sandbox    │           │
│                                    └──────┬──────┘           │
│                                           ▼                  │
│  [Output streams if --claude mode] ◀──────┘                 │
│                                                              │
│  📦 Installing dependencies...                              │
│  $ npm install react-router-dom axios ───┐                  │
│                                           ▼                  │
│                                    ┌─────────────┐           │
│                                    │ Exit Code   │           │
│                                    │   Check     │           │
│                                    └──────┬──────┘           │
│                                           ▼                  │
│  ✅ Dependencies installed            ◀────┘                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Output & UI/UX Flow

### Claude Code CLI Output

```
┌─────────────────────────────────────────────────────────────┐
│                   OUTPUT FORMATTING                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │  🤔 Understanding your request...        │ ← Thinking    │
│  └─────────────────────────────────────────┘   indicator   │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │  I'll help you create a React dashboard │ ← Natural     │
│  │  with authentication. Here's the plan:   │   language   │
│  │                                          │   response   │
│  │  1. ✓ Set up React project              │               │
│  │  2. ✓ Install dependencies              │ ← Progress    │
│  │  3. → Creating components...            │   tracking   │
│  │  4. ○ Implement auth flow               │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │  $ npm install firebase                  │ ← Command    │
│  │  added 125 packages in 5.432s           │   output     │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │  ```jsx                                  │               │
│  │  import React from 'react';             │ ← Syntax     │
│  │  import { auth } from './firebase';     │   highlighted│
│  │  ```                                     │   code       │
│  └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Bruno CLI Output

```
┌─────────────────────────────────────────────────────────────┐
│                   OUTPUT FORMATTING                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │  🤖 Bruno v3.1 - Processing request...  │ ← Status     │
│  └─────────────────────────────────────────┘   header     │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │  📊 Task Analysis:                      │               │
│  │  Type: Frontend Creation                │ ← Structured │
│  │  Pattern: React Dashboard               │   analysis   │
│  │  Enhancement: Auth Module               │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │  🔧 Executing:                          │               │
│  │  $ npx create-react-app dashboard       │ ← Command    │
│  │  [=====>              ] 25%             │   progress   │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │  📝 Generated Files:                    │               │
│  │  - src/Dashboard.jsx                    │ ← File       │
│  │  - src/components/Auth.jsx              │   listing    │
│  │  - src/firebase.config.js               │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │  ✅ Task completed successfully         │ ← Status     │
│  └─────────────────────────────────────────┘   message    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow Comparison

### Claude Code CLI Error Recovery

```
Error Detected: "npm ERR! peer dep missing"
                     │
                     ▼
┌────────────────────────────────────┐
│      AI ERROR ANALYSIS             │
├────────────────────────────────────┤
│  1. Parse error message            │
│  2. Understand root cause          │
│  3. Generate solutions             │
└─────────────┬──────────────────────┘
              ▼
┌────────────────────────────────────┐
│      INTELLIGENT RECOVERY          │
├────────────────────────────────────┤
│  "I see there's a peer dependency  │
│   conflict. Let me fix this..."    │
│                                    │
│  Trying solution 1:                │
│  $ npm install --legacy-peer-deps  │
│  ✓ Success!                        │
└────────────────────────────────────┘
```

### Bruno CLI Error Handling

```
Error Detected: "npm ERR! peer dep missing"
                     │
                     ▼
┌────────────────────────────────────┐
│      ERROR DISPLAY                 │
├────────────────────────────────────┤
│  ❌ Command failed with exit: 1    │
│  npm ERR! peer dep missing...      │
└─────────────┬──────────────────────┘
              ▼
┌────────────────────────────────────┐
│      FALLBACK SUGGESTIONS          │
├────────────────────────────────────┤
│  💡 Suggestions:                   │
│  • Try: npm install --force        │
│  • Try: npm install --legacy-deps  │
│  • Check package.json versions     │
└────────────────────────────────────┘
```

## Key UI/UX Differences Summary

| Aspect | Claude Code CLI | Bruno CLI |
|--------|-----------------|-----------|
| **Input Feel** | Conversational, natural | Command-oriented |
| **Feedback** | Continuous, explanatory | Status-based |
| **Progress** | Inline with context | Separate indicators |
| **Errors** | Explained & auto-fixed | Displayed with suggestions |
| **Output** | Rich, formatted | Structured, technical |
| **Learning** | Teaches as it works | Shows what it does |

This visual guide illustrates the fundamental differences in how Claude Code CLI and Bruno CLI process inputs, execute tasks, and present outputs to users.