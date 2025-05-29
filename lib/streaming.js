const axios = require('axios');

class StreamingResponse {
  constructor(ollamaUrl = 'http://127.0.0.1:11434') {
    this.ollamaUrl = ollamaUrl;
  }

  async streamGenerate(model, prompt, onChunk, onComplete, onError) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: true
      }, {
        responseType: 'stream'
      });

      let buffer = '';
      
      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // Process complete JSON lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                onChunk(data.response);
              }
              
              if (data.done) {
                onComplete(data);
                return;
              }
            } catch (parseError) {
              // Ignore malformed JSON lines
            }
          }
        }
      });

      response.data.on('end', () => {
        onComplete({ done: true });
      });

      response.data.on('error', (error) => {
        onError(error);
      });

    } catch (error) {
      onError(error);
    }
  }

  async generateWithProgress(model, prompt) {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let dots = 0;
      
      console.log('🤖 Generating response');
      
      const progressInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        process.stdout.write(`\r🧠 Thinking${'.'.repeat(dots)}${' '.repeat(3 - dots)}`);
      }, 500);

      this.streamGenerate(
        model,
        prompt,
        (chunk) => {
          // Clear progress indicator
          if (progressInterval) {
            clearInterval(progressInterval);
            process.stdout.write('\r📝 Response:\n\n');
          }
          
          // Output chunk immediately
          process.stdout.write(chunk);
          fullResponse += chunk;
        },
        (data) => {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          console.log('\n');
          resolve(fullResponse);
        },
        (error) => {
          if (progressInterval) {
            clearInterval(progressInterval);
          }
          reject(error);
        }
      );
    });
  }

  async generateNonStreaming(model, prompt) {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: false
      });

      return response.data.response;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = StreamingResponse;