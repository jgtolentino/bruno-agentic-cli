import fs from 'fs/promises';
import chalk from 'chalk';

export async function run({ file, issue }) {
  try {
    const code = await fs.readFile(file, 'utf-8');
    const fixes = await detectAndFix(code, issue);
    
    return formatFixes(fixes, file);
  } catch (error) {
    return chalk.red(`Error processing file: ${error.message}`);
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

function formatFixes(issues, file) {
  if (issues.length === 0) {
    return chalk.green(`✓ No issues found in ${file}`);
  }
  
  let output = `${chalk.bold.cyan('Code Fixes:')} ${file}\n\n`;
  
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