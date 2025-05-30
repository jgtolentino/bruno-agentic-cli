import chalk from 'chalk';
import { OllamaClient } from './ollamaClient.js';

export class AdvancedPatternsEngine {
  constructor(config) {
    this.config = config;
    this.ollamaClient = new OllamaClient(config);
    
    // Patterns from Cursor IDE
    this.cursorPatterns = {
      tools: {
        codebase_search: {
          semantic: true,
          description: 'Find snippets of code from the codebase most relevant to the search query',
          usage: 'Prefer semantic search tool to grep search when doing broad searches'
        },
        read_file: {
          chunked: true,
          maxLines: 250,
          description: 'Read the contents of a file with line number context',
          usage: 'Prefer to read larger sections of the file at once over multiple smaller calls'
        },
        edit_file: {
          contextPreserving: true,
          description: 'Edit files using the // ... existing code ... pattern',
          usage: 'Group together edits to the same file in a single call'
        },
        diff_history: {
          description: 'Retrieve the history of recent changes made to files',
          usage: 'Use when you need context about recent modifications'
        }
      },
      principles: [
        'Always group edits to the same file in a single tool call',
        'Create appropriate dependency management files (package.json, requirements.txt)',
        'Build beautiful and modern UIs with best UX practices',
        'Never generate extremely long hashes or binary content',
        'Read file contents before editing unless appending small changes',
        'Fix linter errors but don\'t loop more than 3 times on the same file'
      ]
    };

    // Patterns from Windsurf Cascade
    this.windsurfPatterns = {
      aiFlow: {
        paradigm: 'Revolutionary AI Flow - work independently and collaboratively',
        steps: [
          'Analyze current state and user needs',
          'Select appropriate tools based on task',
          'Execute tools asynchronously when possible',
          'Monitor execution and adapt as needed',
          'Provide clear explanations before each tool use'
        ]
      },
      tools: {
        grep_search: {
          engine: 'ripgrep',
          maxMatches: 50,
          description: 'Fast text-based search using ripgrep',
          usage: 'Use for exact pattern matches within files'
        },
        find_by_name: {
          description: 'Search for files using glob patterns',
          usage: 'Similar to Linux find command with -ipath'
        },
        command_status: {
          description: 'Get status of previously executed commands',
          usage: 'Monitor long-running processes'
        }
      },
      communication: [
        'Be concise and avoid repetition',
        'Be conversational but professional',
        'Format responses in markdown',
        'Never lie or make things up',
        'Never output code unless requested',
        'Refrain from apologizing for unexpected results'
      ]
    };

    // Patterns from Bolt.new
    this.boltPatterns = {
      webContainer: {
        environment: 'In-browser Node.js runtime',
        limitations: [
          'Cannot run native binaries',
          'Python limited to standard library only',
          'No pip support',
          'No C/C++ compiler',
          'Prefer Vite over custom web servers',
          'Git is NOT available'
        ],
        bestPractices: [
          'Prefer Node.js scripts over shell scripts',
          'Use libsql/sqlite for databases (no native code)',
          'Always use --yes flag with npx',
          'Never re-run dev server after dependency updates'
        ]
      },
      artifact: {
        structure: {
          holistic: 'Think holistically before creating artifacts',
          comprehensive: 'Include ALL necessary steps and components',
          ordered: 'Order of actions is VERY important',
          complete: 'Always provide FULL content, never use placeholders'
        },
        rules: [
          'Install dependencies FIRST',
          'Split functionality into smaller modules',
          'Keep files as small as possible',
          'Use imports to connect modules effectively',
          'Ensure code is clean, readable, and maintainable'
        ]
      }
    };

    // Patterns from Manus
    this.manusPatterns = {
      agentLoop: {
        steps: [
          'Analyze Events - understand user needs and current state',
          'Select Tools - choose based on planning and knowledge',
          'Wait for Execution - let sandbox execute with observations',
          'Iterate - one tool call per iteration, repeat until complete',
          'Submit Results - provide deliverables with attachments',
          'Enter Standby - wait for new tasks when complete'
        ]
      },
      modules: {
        planner: 'Overall task planning with numbered pseudocode',
        knowledge: 'Best practice references with scope conditions',
        datasource: 'Authoritative data APIs over public internet'
      },
      principles: [
        'Create todo.md as checklist based on task planning',
        'Update markers immediately after completing items',
        'Use file tools to avoid string escape issues',
        'Save intermediate results in separate files',
        'Information priority: datasource API > web search > internal knowledge',
        'Write in continuous paragraphs, avoid lists unless requested',
        'Minimum several thousand words unless specified otherwise'
      ]
    };

    // Integrated best practices
    this.bestPractices = {
      codeGeneration: [
        ...this.cursorPatterns.principles,
        ...this.boltPatterns.artifact.rules,
        'Use semantic search for broad code exploration',
        'Prefer reading full file sections over small chunks',
        'Group related edits together',
        'Create dependency files early',
        'Split large files into modules'
      ],
      communication: [
        ...this.windsurfPatterns.communication,
        'Explain tool usage before execution',
        'Provide progress updates proactively',
        'Be ultra concise unless detail requested',
        'Format as markdown with proper code blocks'
      ],
      taskManagement: [
        ...this.manusPatterns.agentLoop.steps,
        'Create todo.md for complex tasks',
        'Think holistically before starting',
        'Prioritize authoritative data sources',
        'Save all intermediate results'
      ],
      errorHandling: [
        'Fix linter errors up to 3 attempts',
        'Try alternative approaches when stuck',
        'Report failures clearly with reasons',
        'Adapt plans based on execution results'
      ]
    };
  }

  async analyzeRequest(parsed) {
    // Determine which patterns to apply based on request
    const analysis = {
      patterns: [],
      approach: null,
      tools: [],
      warnings: []
    };

    // Handle both v3 (with cleaned property) and v4 (with normalized property) formats
    const input = typeof parsed === 'string' 
      ? parsed 
      : (parsed.cleaned || parsed.normalized || parsed.original || '');

    // Detect code-related tasks
    if (input.includes('code') || input.includes('debug') || input.includes('fix')) {
      analysis.patterns.push('cursor');
      analysis.tools.push('codebase_search', 'read_file', 'edit_file');
      analysis.approach = 'semantic-first';
    }

    // Detect web/UI tasks
    if (input.includes('website') || input.includes('ui') || input.includes('frontend')) {
      analysis.patterns.push('bolt');
      analysis.warnings.push('Use Vite for web servers, avoid native binaries');
      analysis.approach = 'artifact-based';
    }

    // Detect complex multi-step tasks
    if (input.includes('create') || input.includes('build') || input.includes('implement')) {
      analysis.patterns.push('manus');
      analysis.tools.push('todo_management');
      analysis.approach = 'agent-loop';
    }

    // Detect search/research tasks
    if (input.includes('search') || input.includes('find') || input.includes('research')) {
      analysis.patterns.push('windsurf');
      analysis.tools.push('grep_search', 'find_by_name');
      analysis.approach = 'ai-flow';
    }

    return analysis;
  }

  generateEnhancedPrompt(basePrompt, analysis) {
    // Extract the actual prompt text if basePrompt is an object
    const promptText = typeof basePrompt === 'string' 
      ? basePrompt 
      : (basePrompt.original || basePrompt.normalized || String(basePrompt));
    
    let enhancedPrompt = promptText + '\n\n';

    // Add relevant patterns
    if (analysis.patterns.includes('cursor')) {
      enhancedPrompt += `### Code Assistant Patterns (Cursor-style)\n`;
      enhancedPrompt += `- Use semantic search before grep for broad exploration\n`;
      enhancedPrompt += `- Read larger file sections at once (up to 250 lines)\n`;
      enhancedPrompt += `- Group all edits to the same file together\n`;
      enhancedPrompt += `- Use // ... existing code ... for unchanged sections\n\n`;
    }

    if (analysis.patterns.includes('windsurf')) {
      enhancedPrompt += `### AI Flow Patterns (Windsurf-style)\n`;
      enhancedPrompt += `- Work independently on each step\n`;
      enhancedPrompt += `- Explain before each tool use\n`;
      enhancedPrompt += `- Be concise and professional\n`;
      enhancedPrompt += `- Use ripgrep for fast searches\n\n`;
    }

    if (analysis.patterns.includes('bolt')) {
      enhancedPrompt += `### WebContainer Patterns (Bolt-style)\n`;
      enhancedPrompt += `- Think holistically before creating\n`;
      enhancedPrompt += `- Install dependencies FIRST\n`;
      enhancedPrompt += `- Split into small modules\n`;
      enhancedPrompt += `- Provide FULL content, no placeholders\n\n`;
    }

    if (analysis.patterns.includes('manus')) {
      enhancedPrompt += `### Agent Loop Patterns (Manus-style)\n`;
      enhancedPrompt += `- Create todo.md for task tracking\n`;
      enhancedPrompt += `- Save intermediate results\n`;
      enhancedPrompt += `- One tool call per iteration\n`;
      enhancedPrompt += `- Prioritize data APIs over web search\n\n`;
    }

    // Add warnings
    if (analysis.warnings.length > 0) {
      enhancedPrompt += `### Important Warnings\n`;
      analysis.warnings.forEach(warning => {
        enhancedPrompt += `⚠️  ${warning}\n`;
      });
      enhancedPrompt += '\n';
    }

    return enhancedPrompt;
  }

  async generateAdvancedSolution(parsed, analysis) {
    // Handle both v3 and v4 input formats
    const originalPrompt = typeof parsed === 'string' 
      ? parsed 
      : (parsed.original || parsed.normalized || parsed.cleaned || '');
    
    const enhancedPrompt = this.generateEnhancedPrompt(originalPrompt, analysis);
    
    console.log(chalk.cyan('🧠 Applying advanced patterns:'), analysis.patterns.join(', '));
    console.log(chalk.blue('🎯 Approach:'), analysis.approach);
    
    // Generate solution using enhanced prompt
    const response = await this.ollamaClient.generate(enhancedPrompt);
    
    // Post-process based on patterns
    const processed = this.postProcessResponse(response, analysis);
    
    return {
      type: 'advanced',
      patterns: analysis.patterns,
      approach: analysis.approach,
      solution: processed,
      tools: analysis.tools,
      bestPractices: this.getRelevantBestPractices(analysis)
    };
  }

  postProcessResponse(response, analysis) {
    let processed = response;

    // Apply pattern-specific post-processing
    if (analysis.patterns.includes('cursor')) {
      // Ensure code edits use proper format
      processed = this.ensureProperEditFormat(processed);
    }

    if (analysis.patterns.includes('bolt')) {
      // Ensure artifacts are complete
      processed = this.ensureCompleteArtifacts(processed);
    }

    if (analysis.patterns.includes('manus')) {
      // Ensure todo.md format
      processed = this.ensureTodoFormat(processed);
    }

    return processed;
  }

  ensureProperEditFormat(response) {
    // Convert placeholder patterns to proper format
    return response
      .replace(/\.\.\.\s*rest of code/gi, '// ... existing code ...')
      .replace(/\.\.\.\s*unchanged/gi, '// ... existing code ...')
      .replace(/<-\s*leave original/gi, '// ... existing code ...');
  }

  ensureCompleteArtifacts(response) {
    // Check for incomplete artifacts
    if (response.includes('...') && !response.includes('// ... existing code ...')) {
      console.log(chalk.yellow('⚠️  Warning: Detected potential incomplete artifact'));
    }
    return response;
  }

  ensureTodoFormat(response) {
    // Ensure todo items have proper markdown format
    const todoPattern = /- \[ \]/g;
    if (!todoPattern.test(response) && response.includes('todo')) {
      response = response.replace(/^- /gm, '- [ ] ');
    }
    return response;
  }

  getRelevantBestPractices(analysis) {
    const practices = [];
    
    if (analysis.patterns.includes('cursor')) {
      practices.push(...this.bestPractices.codeGeneration.slice(0, 3));
    }
    
    if (analysis.patterns.includes('windsurf')) {
      practices.push(...this.bestPractices.communication.slice(0, 3));
    }
    
    if (analysis.patterns.includes('bolt')) {
      practices.push('Think holistically before creating artifacts');
      practices.push('Install dependencies FIRST');
    }
    
    if (analysis.patterns.includes('manus')) {
      practices.push('Create todo.md for complex tasks');
      practices.push('Save all intermediate results');
    }
    
    return practices;
  }

  // Tool definitions inspired by the system prompts
  getAdvancedTools() {
    return {
      cursor: {
        codebase_search: this.cursorPatterns.tools.codebase_search,
        read_file: this.cursorPatterns.tools.read_file,
        edit_file: this.cursorPatterns.tools.edit_file,
        diff_history: this.cursorPatterns.tools.diff_history
      },
      windsurf: {
        grep_search: this.windsurfPatterns.tools.grep_search,
        find_by_name: this.windsurfPatterns.tools.find_by_name,
        command_status: this.windsurfPatterns.tools.command_status
      },
      bolt: {
        webContainer: this.boltPatterns.webContainer,
        artifact: this.boltPatterns.artifact
      },
      manus: {
        agentLoop: this.manusPatterns.agentLoop,
        modules: this.manusPatterns.modules
      }
    };
  }

  // Generate a comprehensive task plan
  async generateTaskPlan(parsed) {
    const analysis = await this.analyzeRequest(parsed);
    
    const plan = {
      overview: `Task: ${parsed.original}`,
      approach: analysis.approach,
      patterns: analysis.patterns,
      steps: [],
      tools: analysis.tools,
      warnings: analysis.warnings
    };

    // Generate steps based on approach
    switch (analysis.approach) {
      case 'semantic-first':
        plan.steps = [
          '1. Search codebase semantically for relevant files',
          '2. Read full context of identified files',
          '3. Plan necessary changes holistically',
          '4. Apply all edits in grouped operations',
          '5. Verify changes and fix any issues'
        ];
        break;
        
      case 'artifact-based':
        plan.steps = [
          '1. Think holistically about entire project structure',
          '2. Create package.json with all dependencies',
          '3. Generate modular components',
          '4. Implement complete functionality',
          '5. Set up build and deployment'
        ];
        break;
        
      case 'agent-loop':
        plan.steps = [
          '1. Analyze requirements and create todo.md',
          '2. Break down into manageable subtasks',
          '3. Execute tasks iteratively',
          '4. Save intermediate results',
          '5. Compile final deliverables'
        ];
        break;
        
      case 'ai-flow':
        plan.steps = [
          '1. Perform initial search/discovery',
          '2. Analyze results independently',
          '3. Deep dive into relevant findings',
          '4. Cross-reference information',
          '5. Synthesize comprehensive answer'
        ];
        break;
        
      default:
        plan.steps = [
          '1. Understand the request',
          '2. Gather necessary information',
          '3. Plan the solution',
          '4. Implement step by step',
          '5. Verify and deliver results'
        ];
    }

    return plan;
  }
}