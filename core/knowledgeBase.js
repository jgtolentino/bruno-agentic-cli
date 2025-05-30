import chalk from 'chalk';

export class KnowledgeBase {
  constructor() {
    // Consolidated best practices from all system prompts
    this.patterns = {
      cursor: {
        name: 'Cursor IDE Patterns',
        tools: {
          codebase_search: {
            description: 'Semantic search for code understanding',
            bestPractice: 'Use semantic search heavily before grep/file search',
            example: 'Search for "authentication logic" rather than specific function names'
          },
          read_file: {
            description: 'Read file contents with context',
            bestPractice: 'Read larger sections (up to 250 lines) at once',
            example: 'Read entire class definitions rather than individual methods'
          },
          edit_file: {
            description: 'Edit files with context preservation',
            bestPractice: 'Group ALL edits to same file in one operation',
            pattern: '// ... existing code ...',
            antiPattern: 'Never use placeholders like "rest of code remains same"'
          }
        },
        principles: [
          'Always read before editing unless appending small changes',
          'Create dependency files (package.json) with versions',
          'Build beautiful UIs with best UX practices',
          'Fix linter errors max 3 times then stop',
          'If reasonable edit wasn\'t applied, try reapplying'
        ]
      },
      
      windsurf: {
        name: 'Windsurf Cascade Patterns',
        aiFlow: {
          paradigm: 'Independent and collaborative work',
          steps: [
            'Analyze user needs and current state',
            'Select tools based on task requirements',
            'Execute asynchronously when possible',
            'Monitor and adapt to results',
            'Explain reasoning before tool use'
          ]
        },
        tools: {
          grep_search: {
            description: 'Fast ripgrep-based text search',
            bestPractice: 'Use for exact pattern matches, cap at 50 results',
            flags: 'Case-insensitive, match per line options'
          },
          find_by_name: {
            description: 'File search with glob patterns',
            bestPractice: 'Use -ipath style patterns for flexible matching'
          }
        },
        communication: [
          'Be concise and avoid repetition',
          'Be conversational but professional',
          'Format responses in markdown',
          'Never lie or make things up',
          'Don\'t apologize repeatedly'
        ]
      },
      
      bolt: {
        name: 'Bolt.new Patterns',
        webContainer: {
          environment: 'In-browser Node.js runtime',
          limitations: [
            'No native binaries (browser environment)',
            'Python limited to standard library',
            'No pip, no C++ compiler',
            'Prefer Vite over custom servers',
            'Git not available'
          ],
          preferences: [
            'Node.js scripts over shell scripts',
            'libsql/sqlite over native databases',
            'Use --yes flag with npx'
          ]
        },
        artifact: {
          principles: [
            'Think HOLISTICALLY before creating',
            'Consider ALL files and dependencies',
            'Order of actions is VERY important',
            'Install dependencies FIRST',
            'Provide FULL content, no placeholders',
            'Split into small modules'
          ],
          structure: [
            'Single comprehensive artifact per project',
            'Include all shell commands',
            'Include all file contents',
            'Wrap in <boltArtifact> tags',
            'Use <boltAction> for each step'
          ]
        }
      },
      
      manus: {
        name: 'Manus AI Patterns',
        agentLoop: [
          'Analyze Events - understand needs from event stream',
          'Select Tools - one tool per iteration',
          'Wait for Execution - observe results',
          'Iterate - repeat until complete',
          'Submit Results - with attachments',
          'Enter Standby - wait for new tasks'
        ],
        modules: {
          planner: 'Task planning with numbered pseudocode',
          knowledge: 'Best practices with scope conditions',
          datasource: 'Authoritative APIs over web search'
        },
        rules: {
          todo: [
            'Create todo.md based on task planning',
            'Update immediately after completing items',
            'Rebuild when plans change significantly'
          ],
          files: [
            'Use file tools to avoid escape issues',
            'Save intermediate results separately',
            'Append mode for merging files'
          ],
          writing: [
            'Continuous paragraphs by default',
            'Avoid lists unless requested',
            'Minimum several thousand words',
            'Cite sources with URLs'
          ]
        }
      }
    };

    // Command examples and templates
    this.templates = {
      cloud: {
        vercel: {
          deploy: 'vercel deploy --prod',
          env: 'vercel env add',
          logs: 'vercel logs --follow'
        },
        supabase: {
          init: 'supabase init',
          start: 'supabase start',
          migrate: 'supabase db push'
        },
        azure: {
          login: 'az login',
          deploy: 'az webapp up --name {name}',
          list: 'az resource list'
        }
      },
      frontend: {
        react: {
          create: 'npm create vite@latest {name} -- --template react-ts',
          component: this.getReactComponentTemplate(),
          hook: this.getReactHookTemplate()
        },
        tailwind: {
          install: 'npm install -D tailwindcss postcss autoprefixer',
          init: 'npx tailwindcss init -p',
          config: this.getTailwindConfig()
        },
        shadcn: {
          init: 'npx shadcn-ui@latest init',
          add: 'npx shadcn-ui@latest add {component}'
        }
      },
      database: {
        postgres: {
          create: 'CREATE DATABASE {name};',
          table: this.getPostgresTableTemplate(),
          index: 'CREATE INDEX idx_{table}_{column} ON {table}({column});'
        },
        supabase: {
          client: this.getSupabaseClientTemplate(),
          rls: 'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;',
          policy: this.getRLSPolicyTemplate()
        }
      }
    };

    // Error patterns and solutions
    this.errorPatterns = {
      'Cannot find module': {
        likely: 'Missing dependency',
        solutions: [
          'Check package.json for the module',
          'Run npm install or npm install {module}',
          'Verify import path is correct'
        ]
      },
      'Permission denied': {
        likely: 'File permissions issue',
        solutions: [
          'Check file ownership with ls -la',
          'Use sudo if appropriate',
          'Ensure write permissions on directory'
        ]
      },
      'Port already in use': {
        likely: 'Another process using the port',
        solutions: [
          'Find process: lsof -i :{port}',
          'Kill process: kill -9 {pid}',
          'Use different port in configuration'
        ]
      }
    };
  }

  // Get relevant knowledge for a specific task
  getRelevantKnowledge(taskType, context) {
    const knowledge = [];
    
    // Add pattern-specific knowledge
    if (taskType.includes('code') || taskType.includes('search')) {
      knowledge.push({
        source: 'cursor',
        tips: this.patterns.cursor.principles,
        tools: Object.keys(this.patterns.cursor.tools)
      });
    }
    
    if (taskType.includes('web') || taskType.includes('deploy')) {
      knowledge.push({
        source: 'bolt',
        tips: this.patterns.bolt.artifact.principles,
        warnings: this.patterns.bolt.webContainer.limitations
      });
    }
    
    if (taskType.includes('complex') || taskType.includes('multi')) {
      knowledge.push({
        source: 'manus',
        workflow: this.patterns.manus.agentLoop,
        rules: this.patterns.manus.rules.todo
      });
    }
    
    return knowledge;
  }

  // Get best practices for specific action
  getBestPractices(action) {
    const practices = [];
    
    switch (action) {
      case 'search':
        practices.push('Use semantic search for broad understanding');
        practices.push('Use grep/ripgrep for exact patterns');
        practices.push('Read multiple sources for validation');
        break;
        
      case 'edit':
        practices.push('Read file first unless appending small changes');
        practices.push('Group all edits to same file together');
        practices.push('Use // ... existing code ... for unchanged parts');
        break;
        
      case 'create':
        practices.push('Think holistically about entire structure');
        practices.push('Install all dependencies first');
        practices.push('Split into small, focused modules');
        break;
        
      case 'deploy':
        practices.push('Test locally before deployment');
        practices.push('Set up environment variables');
        practices.push('Verify build process completes');
        break;
    }
    
    return practices;
  }

  // Template generators
  getReactComponentTemplate() {
    return `import React from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export function Component({ className, children }: ComponentProps) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
}`;
  }

  getReactHookTemplate() {
    return `import { useState, useEffect } from 'react';

export function useCustomHook() {
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Effect logic here
  }, []);
  
  return { state };
}`;
  }

  getTailwindConfig() {
    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
  }

  getPostgresTableTemplate() {
    return `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;
  }

  getSupabaseClientTemplate() {
    return `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)`;
  }

  getRLSPolicyTemplate() {
    return `CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);`;
  }

  // Get command suggestions based on context
  getCommandSuggestions(context) {
    const suggestions = [];
    const input = context.toLowerCase();
    
    if (input.includes('deploy')) {
      if (input.includes('vercel')) {
        suggestions.push(...Object.values(this.templates.cloud.vercel));
      }
      if (input.includes('supabase')) {
        suggestions.push(...Object.values(this.templates.cloud.supabase));
      }
    }
    
    if (input.includes('react') || input.includes('component')) {
      suggestions.push(this.templates.frontend.react.create);
      suggestions.push('Create a new React component with TypeScript');
    }
    
    if (input.includes('database') || input.includes('postgres')) {
      suggestions.push(...Object.values(this.templates.database.postgres));
    }
    
    return suggestions;
  }

  // Analyze error and provide solutions
  analyzeError(error) {
    for (const [pattern, solution] of Object.entries(this.errorPatterns)) {
      if (error.includes(pattern)) {
        return solution;
      }
    }
    
    return {
      likely: 'Unknown error',
      solutions: [
        'Check the full error message',
        'Search for the error online',
        'Try a different approach'
      ]
    };
  }

  // Get workflow for complex tasks
  getWorkflow(taskType) {
    if (taskType.includes('fullstack')) {
      return [
        'Set up project structure',
        'Initialize backend (Node.js/Express)',
        'Set up database (PostgreSQL/Supabase)',
        'Create frontend (React/Next.js)',
        'Implement authentication',
        'Build core features',
        'Add error handling',
        'Set up deployment',
        'Configure environment variables',
        'Deploy to production'
      ];
    }
    
    if (taskType.includes('api')) {
      return [
        'Define API structure',
        'Set up routing',
        'Implement controllers',
        'Add middleware',
        'Set up database models',
        'Add validation',
        'Implement error handling',
        'Add authentication',
        'Write tests',
        'Document endpoints'
      ];
    }
    
    return this.patterns.manus.agentLoop;
  }
}