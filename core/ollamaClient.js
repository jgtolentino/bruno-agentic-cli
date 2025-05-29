import axios from 'axios';
import chalk from 'chalk';

export class OllamaClient {
  constructor(config) {
    this.baseURL = config.ollama_url || 'http://127.0.0.1:11434';
    this.model = config.local_model || 'deepseek-coder:6.7b';
    this.timeout = config.timeout || 30000;
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`);
      const models = response.data.models || [];
      const hasModel = models.some(m => m.name === this.model);
      
      if (!hasModel) {
        console.log(chalk.yellow(`⚠️  Model ${this.model} not found. Available models:`));
        models.forEach(m => console.log(chalk.gray(`  - ${m.name}`)));
        console.log(chalk.cyan(`\nInstall with: ollama pull ${this.model}`));
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(chalk.red('❌ Ollama not running!'));
      console.log(chalk.cyan('Start with: ollama serve'));
      return false;
    }
  }

  async generate(prompt, options = {}) {
    const response = await axios.post(`${this.baseURL}/api/generate`, {
      model: this.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 0.9,
        max_tokens: options.max_tokens || 2048
      }
    }, {
      timeout: this.timeout
    });

    return response.data.response;
  }

  async generateStream(prompt, onChunk, options = {}) {
    const response = await axios.post(`${this.baseURL}/api/generate`, {
      model: this.model,
      prompt: prompt,
      stream: true,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 0.9,
        max_tokens: options.max_tokens || 2048
      }
    }, {
      responseType: 'stream',
      timeout: this.timeout
    });

    return new Promise((resolve, reject) => {
      let fullResponse = '';
      
      response.data.on('data', (chunk) => {
        try {
          const lines = chunk.toString().split('\n').filter(line => line.trim());
          for (const line of lines) {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
              onChunk(data.response);
            }
            if (data.done) {
              resolve(fullResponse);
            }
          }
        } catch (error) {
          // Ignore JSON parse errors from partial chunks
        }
      });

      response.data.on('error', reject);
    });
  }
}