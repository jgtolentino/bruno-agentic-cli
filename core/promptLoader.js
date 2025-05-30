import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadPrompt() {
  // Try Claude 4 enhanced prompt first
  const claude4Path = path.join(__dirname, '../prompts/claude4_system_prompt.txt');
  if (fs.existsSync(claude4Path)) {
    try {
      return fs.readFileSync(claude4Path, 'utf-8');
    } catch (error) {
      console.error('Failed to load Claude 4 prompt:', error.message);
    }
  }
  
  // Fallback to original prompt
  const promptPath = path.join(__dirname, '../prompts/bruno_prompt.txt');
  try {
    return fs.readFileSync(promptPath, 'utf-8');
  } catch (error) {
    console.error('Failed to load system prompt:', error.message);
    return getDefaultPrompt();
  }
}

export function loadToolSchema() {
  const schemaPath = path.join(__dirname, '../prompts/tool_schema.json');
  try {
    return JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  } catch (error) {
    console.error('Failed to load tool schema:', error.message);
    return getDefaultToolSchema();
  }
}

function getDefaultPrompt() {
  return `You are Bruno, an advanced AI assistant powered by Claude. 
You help developers with code analysis, debugging, and testing.
You have access to tools for fixing code, explaining concepts, and generating tests.
Always be helpful, concise, and accurate.`;
}

function getDefaultToolSchema() {
  return {
    tools: [
      {
        name: "fix",
        description: "Fix code issues and bugs",
        parameters: {
          file: "string",
          issue: "string"
        }
      },
      {
        name: "explain",
        description: "Explain code functionality",
        parameters: {
          file: "string",
          focus: "string (optional)"
        }
      },
      {
        name: "test",
        description: "Generate test cases",
        parameters: {
          file: "string",
          framework: "string (optional)"
        }
      }
    ]
  };
}