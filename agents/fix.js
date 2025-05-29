function generatePrompt(code) {
  return `You are an expert code reviewer and debugger. Please analyze the following code for bugs, issues, and improvements.

Focus on:
- Syntax errors or logical bugs
- Performance improvements
- Security vulnerabilities
- Code smell and refactoring opportunities
- Error handling improvements

Code to analyze:
\`\`\`
${code}
\`\`\`

Provide the corrected code with explanations for each fix:`;
}

module.exports = { generatePrompt };