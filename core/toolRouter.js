import { UniversalRouter } from './universalRouter.js';

let universalRouter = null;

function getUniversalRouter(config) {
  if (!universalRouter) {
    universalRouter = new UniversalRouter(config);
  }
  return universalRouter;
}

export async function handleTool(toolName, input, config = {}) {
  const tools = {
    fix: () => import('../agents/fix.js').then(m => m.run(input)),
    explain: () => import('../agents/explain.js').then(m => m.run(input)),
    test: () => import('../agents/test.js').then(m => m.run(input)),
    universal: () => getUniversalRouter(config).route(input)
  };

  const handler = tools[toolName];
  if (!handler) {
    // Try universal router for unrecognized commands
    return await getUniversalRouter(config).route(input);
  }

  return await handler();
}

export function parseToolCall(message) {
  // Parse Claude-style tool calls from message
  const toolPattern = /\[Tool:\s*(\w+)\s*\((.*?)\)\]/g;
  const matches = [...message.matchAll(toolPattern)];
  
  return matches.map(match => ({
    tool: match[1],
    args: parseArgs(match[2])
  }));
}

function parseArgs(argsString) {
  // Simple argument parser
  const args = {};
  const pairs = argsString.split(',').map(s => s.trim());
  
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(s => s.trim());
    if (key && value) {
      args[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  
  return args;
}