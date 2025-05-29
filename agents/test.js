function generatePrompt(code) {
  return `You are a test automation engineer. Please generate comprehensive tests for the following code.

Focus on:
- Unit tests covering all functions/methods
- Edge cases and error conditions
- Mocking external dependencies
- Test structure following best practices

Code to test:
\`\`\`
${code}
\`\`\`

Generate Jest-style tests with clear descriptions and comprehensive coverage:`;
}

module.exports = { generatePrompt };