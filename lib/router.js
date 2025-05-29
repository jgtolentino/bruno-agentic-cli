const explainAgent = require('../agents/explain.js');
const fixAgent = require('../agents/fix.js');
const testAgent = require('../agents/test.js');

class AgentRouter {
  constructor() {
    this.agents = {
      explain: explainAgent,
      fix: fixAgent,
      test: testAgent
    };
    
    this.keywords = {
      explain: ['explain', 'describe', 'what does', 'how does', 'analyze', 'understand'],
      fix: ['fix', 'bug', 'error', 'issue', 'problem', 'broken', 'debug'],
      test: ['test', 'testing', 'unit test', 'spec', 'jest', 'mocha', 'coverage']
    };
  }

  routeRequest(input, filePath = null) {
    // If we have a file path, try to infer intent from file extension and content
    if (filePath) {
      const extension = filePath.split('.').pop();
      
      // Test files are usually for testing
      if (filePath.includes('test') || filePath.includes('spec') || 
          extension === 'test.js' || extension === 'spec.js') {
        return this.createAgentResponse('test', input, filePath);
      }
    }

    // Analyze the input text for keywords
    const lowerInput = input.toLowerCase();
    
    // Score each agent based on keyword matches
    const scores = {};
    for (const [agentName, keywords] of Object.entries(this.keywords)) {
      scores[agentName] = 0;
      for (const keyword of keywords) {
        if (lowerInput.includes(keyword)) {
          scores[agentName] += keyword.length; // Longer keywords get higher scores
        }
      }
    }

    // Find the agent with the highest score
    const bestAgent = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );

    // If no clear winner or score is too low, default to explain
    const maxScore = Math.max(...Object.values(scores));
    const selectedAgent = maxScore > 2 ? bestAgent : 'explain';

    return this.createAgentResponse(selectedAgent, input, filePath);
  }

  createAgentResponse(agentName, input, filePath) {
    const agent = this.agents[agentName];
    
    if (!agent) {
      throw new Error(`Unknown agent: ${agentName}`);
    }

    return {
      agent: agentName,
      generatePrompt: agent.generatePrompt,
      confidence: this.calculateConfidence(agentName, input),
      reasoning: `Selected ${agentName} agent based on content analysis`
    };
  }

  calculateConfidence(agentName, input) {
    const keywords = this.keywords[agentName] || [];
    const lowerInput = input.toLowerCase();
    
    let matches = 0;
    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        matches++;
      }
    }
    
    // Return confidence as percentage
    return Math.min(100, (matches / keywords.length) * 100 + 30);
  }

  getAvailableAgents() {
    return Object.keys(this.agents);
  }

  describeAgent(agentName) {
    const descriptions = {
      explain: 'Analyzes and explains code functionality, structure, and best practices',
      fix: 'Identifies bugs, security issues, and provides corrected code',
      test: 'Generates comprehensive unit tests with edge cases and mocking'
    };
    
    return descriptions[agentName] || 'Unknown agent';
  }
}

module.exports = AgentRouter;