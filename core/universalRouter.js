import chalk from 'chalk';
import { CloudMastery } from './cloudMastery.js';
import { FrontendEngine } from './frontendEngine.js';
import { DatabaseExpert } from './databaseExpert.js';
import { IoTEdgeEngine } from './iotEdgeEngine.js';
import { VisualArtistEngine } from './visualArtistEngine.js';
import { AdvancedPatternsEngine } from './advancedPatternsEngine.js';
import { OllamaClient } from './ollamaClient.js';

export class UniversalRouter {
  constructor(config) {
    this.config = config;
    this.ollamaClient = new OllamaClient(config);
    this.cloudMastery = new CloudMastery();
    this.frontendEngine = new FrontendEngine();
    this.databaseExpert = new DatabaseExpert();
    this.iotEdgeEngine = new IoTEdgeEngine();
    this.visualArtistEngine = new VisualArtistEngine();
    this.advancedPatternsEngine = new AdvancedPatternsEngine(config);
    
    // Command patterns for routing
    this.patterns = {
      cloud: [
        /\b(azure|az|vercel|supabase|aws|gcp|gcloud)\b/i,
        /\b(deploy|deployment|hosting|cloud)\s+(to|on|with|using)\b/i,
        /\bdeploy\s+\w+\s+to\s+(vercel|azure|aws|gcp|supabase)\b/i
      ],
      frontend: [
        /\b(react|typescript|tailwind|vite|component|tsx|jsx)\b/i,
        /\b(shadcn|ui|frontend|css|style)\b/i
      ],
      database: [
        /\b(postgres|mysql|mongo|database|db|sql|query)\b/i,
        /\b(migration|schema|table|collection)\b/i
      ],
      system: [
        /\b(install|setup|config|configure|init)\b/i,
        /\b(npm|yarn|pnpm|node|git)\b/i
      ],
      iot: [
        /\b(iot|edge|device|sensor|camera|gateway)\b/i,
        /\b(pipeline|etl|ingestion|realtime|batch)\b/i,
        /\b(telemetry|monitoring|analytics)\b/i
      ],
      artist: [
        /\b(artist|visual|creative|portfolio|art)\b/i,
        /\b(dashboard|tracking|visualization|prompt)\b/i,
        /\b(midjourney|dalle|stable.?diffusion|ai.?art)\b/i
      ],
      meta: [
        /how (does|do) (bruno|you) work/i,
        /what (is|are) (bruno|your) (purpose|function|capabilities)/i,
        /who (made|built|created) (bruno|you)/i,
        /tell me about bruno/i,
        /bruno v\d+/i,
        /bruno (features|patterns|architecture)/i
      ],
      general: [
        /what (is|are) (ai|artificial intelligence|machine learning|ml|deep learning)/i,
        /explain\s+\w+/i,
        /how (does|do)\s+\w+\s+work/i,
        /give.*use cases/i,
        /list.*examples/i
      ]
    };
  }

  parseInput(input) {
    // Clean and normalize input
    const cleaned = input.toLowerCase()
      .replace(/\b(2|to)\b/g, 'to')
      .replace(/\b(w|with)\b/g, 'with')
      .replace(/\b(dploy|deploi)\b/g, 'deploy')
      .replace(/\b(imptve|improve)\b/g, 'improve')
      .replace(/\b(blu|blue)\b/g, 'blue')
      .replace(/\b(wif|wit)\b/g, 'with')
      .replace(/\b(whyu|why u)\b/g, 'why')
      .replace(/\b(concersationa|conversationa)\b/g, 'conversational')
      .replace(/\b(nlp|natual language)\b/g, 'natural language processing')
      .replace(/\b(supabase|supabsae|supabaes)\b/g, 'supabase')
      .replace(/\b(sql|SQL)\b/g, 'sql')
      .replace(/\b(ypu|yuop)\b/g, 'you')
      .replace(/\b(unde|undre)\b/g, 'understand');

    return {
      original: input,
      cleaned: cleaned,
      intent: this.detectIntent(cleaned),
      urgency: this.detectUrgency(cleaned),
      typos: input !== cleaned
    };
  }

  detectIntent(input) {
    const scores = {};
    
    // Score each category based on pattern matches
    for (const [category, patterns] of Object.entries(this.patterns)) {
      scores[category] = patterns.reduce((score, pattern) => {
        return score + (pattern.test(input) ? 1 : 0);
      }, 0);
    }

    // Find highest scoring category
    const maxScore = Math.max(...Object.values(scores));
    const primaryIntent = Object.keys(scores).find(key => scores[key] === maxScore);

    return {
      primary: primaryIntent || 'general',
      scores: scores,
      confidence: maxScore > 0 ? maxScore / this.patterns[primaryIntent]?.length || 1 : 0
    };
  }

  detectUrgency(input) {
    const urgentWords = ['urgent', 'asap', 'now', 'quick', 'fast', 'emergency', 'fix', 'broken'];
    return urgentWords.some(word => input.includes(word)) ? 'high' : 'normal';
  }

  async route(input) {
    const parsed = this.parseInput(input);
    
    // More subtle routing feedback
    if (parsed.typos) {
      console.log(chalk.yellow(`✏️  Auto-corrected: ${parsed.cleaned}`));
    }
    
    // Only show routing details in debug mode
    if (process.env.DEBUG || process.env.BRUNO_DEBUG) {
      console.log(chalk.gray(`🔍 Intent: ${parsed.intent.primary} (${Math.round(parsed.intent.confidence * 100)}%)`));
    }

    // PHASE 1: Fast pattern matching
    const quickResponse = await this.tryQuickPatternMatch(parsed);
    
    // PHASE 2: Confidence-based routing decision
    if (quickResponse.confidence >= 0.8) {
      // High confidence - use pattern match silently
      return quickResponse.response;
    } else if (quickResponse.confidence >= 0.5) {
      // Medium confidence - enhance with LLM
      return await this.enhanceWithLocalLLM(parsed, quickResponse);
    } else {
      // Low confidence - deep analysis
      return await this.deepLocalAnalysis(parsed);
    }
  }

  async tryQuickPatternMatch(parsed) {
    try {
      // Check if advanced patterns should be applied first
      const analysis = await this.advancedPatternsEngine.analyzeRequest(parsed);
      if (analysis.patterns.length > 0) {
        const response = await this.advancedPatternsEngine.generateAdvancedSolution(parsed, analysis);
        return { confidence: 0.9, response, source: 'advanced_patterns' };
      }

      // Try standard routing patterns
      let response;
      switch (parsed.intent.primary) {
        case 'cloud':
          response = await this.handleCloudCommand(parsed);
          break;
        case 'frontend':
          response = await this.handleFrontendCommand(parsed);
          break;
        case 'database':
          response = await this.handleDatabaseCommand(parsed);
          break;
        case 'system':
          response = await this.handleSystemCommand(parsed);
          break;
        case 'iot':
          response = await this.handleIoTCommand(parsed);
          break;
        case 'artist':
          response = await this.handleArtistCommand(parsed);
          break;
        case 'meta':
          response = await this.handleMetaCommand(parsed);
          break;
        default:
          return { confidence: 0.2, response: null, source: 'no_pattern_match' };
      }

      return { 
        confidence: parsed.intent.confidence, 
        response, 
        source: `pattern_${parsed.intent.primary}` 
      };

    } catch (error) {
      console.error(chalk.red(`❌ Pattern matching error: ${error.message}`));
      return { confidence: 0.0, response: null, source: 'error' };
    }
  }

  async handleCloudCommand(parsed) {
    console.log(chalk.cyan('☁️  Cloud command detected'));
    
    const intent = this.cloudMastery.detectIntent(parsed.cleaned);
    const command = this.cloudMastery.generateCommand(intent, parsed.cleaned);
    
    return {
      type: 'cloud',
      service: intent.service,
      command: command,
      explanation: this.generateExplanation('cloud', intent.service, command),
      followUp: this.generateFollowUp('cloud', intent.service)
    };
  }

  async handleFrontendCommand(parsed) {
    console.log(chalk.magenta('🎨 Frontend command detected'));
    
    const result = await this.frontendEngine.generate(parsed);
    
    return {
      type: 'frontend',
      framework: result.framework,
      code: result.code,
      dependencies: result.dependencies,
      explanation: result.explanation,
      followUp: result.followUp
    };
  }

  async handleDatabaseCommand(parsed) {
    console.log(chalk.green('🗄️  Database command detected'));
    
    const result = this.databaseExpert.generateQuery(parsed);
    
    return {
      type: 'database',
      dbType: result.dbType,
      query: result.query,
      explanation: result.explanation,
      safety: result.safety
    };
  }

  async handleSystemCommand(parsed) {
    console.log(chalk.yellow('⚙️  System command detected'));
    
    return {
      type: 'system',
      commands: this.generateSystemCommands(parsed.cleaned),
      explanation: 'System configuration and setup commands',
      safety: this.generateSafetyCheck(parsed.cleaned)
    };
  }

  async handleIoTCommand(parsed) {
    console.log(chalk.blue('🔌 IoT/Edge command detected'));
    
    const result = await this.iotEdgeEngine.generatePipeline(parsed);
    
    return {
      type: 'iot',
      deviceType: result.deviceType,
      pipelineType: result.pipelineType,
      architecture: result.architecture,
      code: result.ingestion,
      deployment: result.deployment,
      monitoring: result.monitoring,
      optimizations: result.optimizations,
      explanation: `Generated ${result.pipelineType} IoT pipeline for ${result.deviceType} devices with Supabase backend`
    };
  }

  async handleArtistCommand(parsed) {
    console.log(chalk.magenta('🎨 Visual Artist platform detected'));
    
    const result = await this.visualArtistEngine.generatePlatform(parsed);
    
    return {
      type: 'artist',
      platformType: result.platformType,
      features: result.features,
      code: result.code,
      styles: result.styles,
      scripts: result.scripts,
      integrations: result.integrations,
      deployment: result.deployment,
      explanation: `Generated ${result.platformType} platform with data visualization and AI prompt studio`
    };
  }

  async handleMetaCommand(parsed) {
    console.log(chalk.cyan('🤖 Meta question about Bruno detected'));
    
    // Analyze what the user is asking about Bruno
    const question = parsed.cleaned;
    
    if (question.includes('why') && question.includes('conversational')) {
      return {
        type: 'meta',
        explanation: `Great question! Bruno v3.0 actually combines BOTH structured responses AND conversational AI:

🎯 **Structured Responses** (what you just saw):
- Organized, scannable output with clear sections
- Perfect for technical commands and specific tasks
- Includes relevant commands, code snippets, and next steps

💬 **Conversational AI** (when you need it):
- Try asking general questions like "explain this to me" 
- Use natural language for complex discussions
- Bruno adapts its response style to your input

🔄 **Best of Both Worlds**:
- Quick structured answers for "how to deploy to vercel"
- Conversational explanations for "help me understand React hooks"
- You can always ask "explain this more conversationally" for any response

Bruno uses advanced patterns from Cursor, Windsurf, Bolt & Manus to give you the most appropriate response format. Want me to explain something more conversationally? Just ask!`
      };
    }
    
    // Fallback for other meta questions
    return {
      type: 'meta',
      explanation: `I'd be happy to explain how Bruno works! Bruno v3.0 is an advanced local-first AI CLI that combines:

🧠 **Advanced AI Patterns**: Integrated from Cursor, Windsurf, Bolt, and Manus
🏠 **100% Local**: All processing happens on your machine via Ollama
🎯 **Intelligent Routing**: Automatically detects intent and applies appropriate patterns
🛡️ **Privacy First**: No telemetry, no cloud dependencies, no data collection

What specifically would you like to know more about?`
    };
  }

  async enhanceWithLocalLLM(parsed, quickResponse) {
    // Enhance pattern response with local LLM (silent unless debug)
    
    // Create enhanced prompt for local LLM
    const enhancementPrompt = this.buildEnhancementPrompt(parsed, quickResponse);
    
    try {
      // Get LLM enhancement while preserving pattern structure
      const llmEnhancement = await this.ollamaClient.generateCompletion(enhancementPrompt);
      
      // Merge pattern response with LLM insights
      if (quickResponse.response && typeof quickResponse.response === 'object') {
        return {
          ...quickResponse.response,
          explanation: llmEnhancement.trim(),
          enhanced: true,
          routing_method: 'hybrid_enhanced'
        };
      } else {
        return {
          type: 'enhanced',
          explanation: llmEnhancement.trim(),
          fallback_pattern: quickResponse.source,
          routing_method: 'hybrid_enhanced'
        };
      }
    } catch (error) {
      console.log(chalk.red(`❌ LLM enhancement failed: ${error.message}`));
      // Fallback to pattern response
      return quickResponse.response || this.generateFallbackResponse(parsed);
    }
  }

  async deepLocalAnalysis(parsed) {
    // Perform deep local LLM analysis (silent unless debug)
    
    // Create comprehensive prompt for deep analysis
    const deepPrompt = this.buildDeepAnalysisPrompt(parsed);
    
    try {
      const analysis = await this.ollamaClient.generateCompletion(deepPrompt);
      
      return {
        type: 'deep_analysis',
        explanation: analysis.trim(),
        routing_method: 'deep_local_llm',
        confidence_boost: true
      };
    } catch (error) {
      console.log(chalk.red(`❌ Deep analysis failed: ${error.message}`));
      return await this.handleGeneralCommand(parsed);
    }
  }

  buildEnhancementPrompt(parsed, quickResponse) {
    return `You are Bruno, a local-first AI assistant. Enhance this response with more conversational, helpful context.

Original request: "${parsed.original}"
Cleaned request: "${parsed.cleaned}"
Pattern response type: ${quickResponse.source}

Current pattern provided: ${JSON.stringify(quickResponse.response, null, 2)}

Task: Provide a conversational enhancement that:
1. Explains the context better
2. Adds helpful next steps
3. Anticipates follow-up questions
4. Maintains technical accuracy
5. Uses local development best practices

Keep response under 300 words and be genuinely helpful:`;
  }

  buildDeepAnalysisPrompt(parsed) {
    return `You are Bruno, a local-first AI assistant with patterns from Cursor, Windsurf, Bolt, and Manus. 

Request: "${parsed.original}"
Cleaned: "${parsed.cleaned}"
Intent detected: ${parsed.intent.primary} (${Math.round(parsed.intent.confidence * 100)}% confidence)

No clear pattern match found. Provide a helpful response that:

1. Understands the user's intent completely
2. Provides specific, actionable guidance
3. Uses local development best practices
4. Suggests concrete next steps
5. Maintains Bruno's local-first philosophy

Available context:
- User is working locally with Ollama/DeepSeek
- Prefers structured, scannable responses
- Values privacy and offline operation
- Has access to standard development tools

Respond conversationally but with clear structure:`;
  }

  generateFallbackResponse(parsed) {
    return {
      type: 'fallback',
      explanation: `I understand you're asking about "${parsed.cleaned}". While I don't have a specific pattern for this, I'm here to help with local development tasks. Could you provide a bit more context about what you're trying to accomplish?`,
      suggestions: [
        'Try being more specific about the technology or task',
        'Use commands like "help" to see what I can assist with',
        'Ask about specific development tasks I specialize in'
      ],
      routing_method: 'fallback'
    };
  }

  async handleGeneralCommand(parsed) {
    console.log(chalk.gray('💬 General command detected'));
    
    // Try advanced patterns for general commands
    const analysis = await this.advancedPatternsEngine.analyzeRequest(parsed);
    if (analysis.patterns.length > 0) {
      return await this.advancedPatternsEngine.generateAdvancedSolution(parsed, analysis);
    }
    
    return {
      type: 'general',
      suggestion: 'Please be more specific about what you want to accomplish',
      examples: [
        'Deploy to Vercel: "deploy my react app to vercel"',
        'Create component: "create login form with tailwind"',
        'Database query: "select users from postgres"',
        'IoT pipeline: "create camera device pipeline with supabase"',
        'Artist platform: "create visual artist dashboard with analytics"'
      ]
    };
  }

  generateSystemCommands(input) {
    const commands = [];
    
    if (input.includes('react') && input.includes('typescript')) {
      commands.push('npm create vite@latest my-app -- --template react-ts');
      commands.push('cd my-app && npm install');
    }
    
    if (input.includes('tailwind')) {
      commands.push('npm install -D tailwindcss postcss autoprefixer');
      commands.push('npx tailwindcss init -p');
    }
    
    if (input.includes('shadcn')) {
      commands.push('npx shadcn-ui@latest init');
    }
    
    if (input.includes('supabase')) {
      commands.push('npm install @supabase/supabase-js');
      commands.push('supabase init');
    }
    
    return commands;
  }

  generateExplanation(type, service, command) {
    switch (type) {
      case 'cloud':
        return `This ${service} command will help you manage your cloud resources efficiently.`;
      case 'frontend':
        return 'Generated modern React component with TypeScript and Tailwind CSS styling.';
      case 'database':
        return 'Database query optimized for performance and security.';
      default:
        return 'Command generated based on best practices.';
    }
  }

  generateFollowUp(type, service) {
    const followUps = {
      cloud: {
        vercel: ['vercel env ls', 'vercel logs'],
        supabase: ['supabase status', 'supabase gen types typescript'],
        azure: ['az account show', 'az resource list']
      },
      frontend: [
        'Add error boundaries',
        'Implement loading states',
        'Add responsive design'
      ]
    };

    return followUps[type]?.[service] || followUps[type] || [];
  }

  generateSafetyCheck(input) {
    const dangerousPatterns = [
      /rm\s+-rf/i,
      /drop\s+database/i,
      /delete\s+from.*where/i,
      /sudo\s+rm/i
    ];

    const isDangerous = dangerousPatterns.some(pattern => pattern.test(input));
    
    return {
      level: isDangerous ? 'high' : 'low',
      warnings: isDangerous ? ['This command may be destructive. Please confirm before executing.'] : [],
      recommendations: isDangerous ? ['Test in development environment first', 'Create backups'] : []
    };
  }

  generateErrorResponse(error, parsed) {
    return {
      type: 'error',
      message: 'Unable to process command',
      suggestions: [
        'Try being more specific',
        'Check for typos',
        'Use supported service names (vercel, supabase, azure, etc.)'
      ],
      parsed: parsed
    };
  }

  // Adaptive learning methods
  recordSuccess(input, output) {
    // In a real implementation, this would update the knowledge base
    console.log(chalk.green(`✅ Successful command logged: ${input}`));
  }

  recordFailure(input, error) {
    // In a real implementation, this would help improve future responses
    console.log(chalk.red(`❌ Failed command logged: ${input} - ${error}`));
  }

  getStats() {
    return {
      totalCommands: 0,
      successRate: 0,
      topServices: ['vercel', 'supabase', 'react'],
      recentPatterns: [],
      advancedTools: this.advancedPatternsEngine.getAdvancedTools()
    };
  }

  // Generate a comprehensive task plan using advanced patterns
  async generateTaskPlan(input) {
    const parsed = this.parseInput(input);
    return await this.advancedPatternsEngine.generateTaskPlan(parsed);
  }
}