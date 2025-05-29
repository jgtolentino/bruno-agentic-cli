#!/usr/bin/env node

const inquirer = require('inquirer').default;
const fs = require('fs-extra');
const path = require('path');

// Bruno modules
const SlashCommandParser = require('./lib/slash-commands.js');
const WorkspaceMemory = require('./lib/workspace-memory.js');
const AgentRouter = require('./lib/router.js');
const StreamingResponse = require('./lib/streaming.js');

// Load configuration
let config;
try {
  config = JSON.parse(fs.readFileSync('./.brunorc', 'utf8'));
} catch (error) {
  config = {
    model: 'deepseek-coder:6.7b-instruct-q4_K_M',
    ollama_host: 'http://localhost:11434',
    temperature: 0.1
  };
}

const slashParser = new SlashCommandParser();
const workspace = new WorkspaceMemory();
const router = new AgentRouter();
const streaming = new StreamingResponse(config.ollama_host);

async function main() {
  console.log('🤖 Bruno Agentic CLI - Enhanced Local Claude Replacement');
  console.log('💡 Type /help for slash commands or use interactive mode\n');

  // Load workspace context in background
  workspace.loadWorkspaceContext();

  const { inputMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'inputMode',
      message: 'Choose input mode:',
      choices: [
        'Interactive Mode (guided prompts)',
        'Command Mode (slash commands)',
        'Free Prompt Mode'
      ]
    }
  ]);

  if (inputMode === 'Command Mode (slash commands)') {
    await handleCommandMode();
  } else if (inputMode === 'Interactive Mode (guided prompts)') {
    await handleInteractiveMode();
  } else {
    await handleFreePromptMode();
  }
}

async function handleCommandMode() {
  const { command } = await inquirer.prompt([
    {
      type: 'input',
      name: 'command',
      message: 'Enter command (e.g., /explain src/utils.js):',
      validate: (input) => input.trim().length > 0
    }
  ]);

  const parsed = slashParser.parse(command);
  await executeCommand(parsed);
}

async function handleInteractiveMode() {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Select mode:',
      choices: [
        'Explain Code',
        'Fix Code', 
        'Generate Tests',
        'Smart Route (AI decides)'
      ]
    }
  ]);

  if (mode === 'Smart Route (AI decides)') {
    await handleSmartRoute();
  } else {
    await handleSpecificMode(mode);
  }
}

async function handleSpecificMode(mode) {
  const { filePath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'filePath',
      message: 'Path to input code file:',
      validate: (input) => {
        if (fs.existsSync(input)) {
          return true;
        }
        return 'File does not exist';
      }
    }
  ]);

  const agentMap = {
    'Explain Code': 'explain',
    'Fix Code': 'fix',
    'Generate Tests': 'test'
  };

  const command = {
    type: 'agent',
    agent: agentMap[mode],
    filePath: filePath
  };

  await executeCommand(command);
}

async function handleSmartRoute() {
  const { description } = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'Describe what you want to do:'
    }
  ]);

  const { filePath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'filePath',
      message: 'Path to code file (optional):',
      validate: (input) => {
        if (!input.trim()) return true; // Allow empty
        if (fs.existsSync(input)) return true;
        return 'File does not exist';
      }
    }
  ]);

  const routingResult = router.routeRequest(description, filePath);
  
  console.log(`🎯 Selected ${routingResult.agent} agent (${routingResult.confidence.toFixed(0)}% confidence)`);
  console.log(`💭 Reasoning: ${routingResult.reasoning}\n`);

  const command = {
    type: 'agent',
    agent: routingResult.agent,
    filePath: filePath || null,
    customPrompt: description
  };

  await executeCommand(command);
}

async function handleFreePromptMode() {
  const { userPrompt } = await inquirer.prompt([
    {
      type: 'input',
      name: 'userPrompt',
      message: 'Enter your prompt:'
    }
  ]);

  await processWithAI(userPrompt);
}

async function executeCommand(command) {
  switch (command.type) {
    case 'error':
      console.log('❌', command.message);
      break;
      
    case 'help':
      console.log(command.content);
      break;
      
    case 'context':
      const contextSummary = workspace.getContextSummary();
      console.log('📁 Workspace Context:\n');
      console.log(contextSummary || 'No context loaded yet');
      break;
      
    case 'agent':
      await executeAgentCommand(command);
      break;
      
    case 'freeform':
      await processWithAI(command.content);
      break;
      
    default:
      console.log('❌ Unknown command type');
  }
}

async function executeAgentCommand(command) {
  let codeContent = '';
  let prompt = '';

  if (command.filePath) {
    try {
      codeContent = await fs.readFile(command.filePath, 'utf-8');
    } catch (error) {
      console.log('❌ Error reading file:', error.message);
      return;
    }
  }

  // Get agent and generate prompt
  const agentMap = {
    explain: require('./agents/explain.js'),
    fix: require('./agents/fix.js'),
    test: require('./agents/test.js')
  };

  const agent = agentMap[command.agent];
  if (!agent) {
    console.log('❌ Unknown agent:', command.agent);
    return;
  }

  if (command.customPrompt) {
    prompt = `${command.customPrompt}\n\nCode:\n\`\`\`\n${codeContent}\n\`\`\``;
  } else {
    prompt = agent.generatePrompt(codeContent);
  }

  // Add workspace context if available
  const contextSummary = workspace.getContextSummary();
  if (contextSummary) {
    prompt = `Context: ${contextSummary}\n\n${prompt}`;
  }

  await processWithAI(prompt);
}

async function processWithAI(prompt) {
  try {
    // Use streaming for better UX
    await streaming.generateWithProgress(config.model, prompt);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure Ollama is running with: ollama run deepseek-coder:6.7b');
    
    // Fallback to non-streaming
    try {
      console.log('\n🔄 Trying non-streaming mode...');
      const response = await streaming.generateNonStreaming(config.model, prompt);
      console.log('📝 Response:\n');
      console.log(response);
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}