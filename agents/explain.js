function generatePrompt(code) {
  return `You are a senior software engineer. Please analyze and explain the following code in detail. 

Focus on:
- What the code does
- How it works
- Any potential issues or improvements
- Best practices being used or missing

Code to explain:
\`\`\`
${code}
\`\`\`

Provide a clear, comprehensive explanation:`;
}

module.exports = { generatePrompt };