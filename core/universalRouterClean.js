import { OllamaClient } from './ollamaClient.js';

export class UniversalRouterClean {
  constructor(config) {
    this.config = config;
    this.ollamaClient = new OllamaClient(config);
  }

  async route(input) {
    // Directly send the input to the LLM and return the response
    return await this.ollamaClient.generateCompletion(input);
  }
} 