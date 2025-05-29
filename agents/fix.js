import { FileSystemHandler } from '../core/fsHandler.js';
import chalk from 'chalk';

export async function run({ file, issue }) {
  const fsHandler = new FileSystemHandler();
  
  try {
    const result = await fsHandler.readFile(file);
    if (!result.success) {
      return chalk.red(`Error reading file: ${result.error}`);
    }
    
    const fixes = await detectAndFix(result.content, issue);
    
    return formatFixes(fixes, file, result);
  } catch (error) {
    return chalk.red(`Error: ${error.message}`);
  }
}

async function detectAndFix(code, specificIssue) {
  const issues = [];
  
  // Basic linting checks (placeholder for Claude integration)
  if (code.includes('console.log')) {
    issues.push({
      type: 'warning',
      line: getLineNumber(code, 'console.log'),
      message: 'Remove console.log statements in production',
      fix: 'Replace with proper logging framework'
    });
  }
  
  if (code.includes('var ')) {
    issues.push({
      type: 'style',
      line: getLineNumber(code, 'var '),
      message: 'Use let or const instead of var',
      fix: 'Replace var with const/let based on usage'
    });
  }
  
  if (specificIssue) {
    issues.unshift({
      type: 'custom',
      message: `Analyzing specific issue: ${specificIssue}`,
      fix: 'Pending Claude analysis'
    });
  }
  
  return issues;
}

function getLineNumber(code, search) {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(search)) {
      return i + 1;
    }
  }
  return 0;
}

function formatFixes(issues, file, fileResult) {
  if (issues.length === 0) {
    return chalk.green(`✓ No issues found in ${file}`);
  }
  
  let output = `${chalk.bold.cyan('Code Fixes:')} ${file}\n`;
  output += chalk.gray(`Size: ${fileResult.size} bytes | Modified: ${fileResult.modified.toLocaleString()}\n\n`);
  
  issues.forEach((issue, index) => {
    const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : '💡';
    output += `${icon} ${chalk.yellow(`Issue ${index + 1}:`)} ${issue.message}\n`;
    if (issue.line) {
      output += `   ${chalk.gray(`Line ${issue.line}`)}\n`;
    }
    output += `   ${chalk.green('Fix:')} ${issue.fix}\n\n`;
  });
  
  return output;
}