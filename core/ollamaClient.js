import axios from 'axios';
import chalk from 'chalk';

export class OllamaClient {
  constructor(config) {
    this.baseURL = config.ollama_url || 'http://127.0.0.1:11434';
    this.model = config.local_model || 'deepseek-coder:6.7b-instruct-q4_K_M';
    this.timeout = config.timeout || 30000; // 30 seconds max
    
    // Local caching configuration for reducing repeated computations
    this.cacheConfig = {
      enabled: config.enableLocalCaching !== false, // Default to enabled
      maxCacheSize: config.maxCacheSize || 100, // Max cached responses
      cacheTTL: config.cacheTTL || 300000, // 5 minutes
      systemPromptCaching: true,
      contextCaching: true
    };
    
    // In-memory cache for responses (for local models)
    this.responseCache = new Map();
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
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
    // Check cache first
    if (this.cacheConfig.enabled) {
      const cacheKey = this.generateCacheKey(prompt, options);
      const cached = this.getCachedResponse(cacheKey);
      
      if (cached) {
        this.cacheMetrics.hits++;
        console.log(chalk.green('💾 Cache hit - using cached response'));
        return cached.response;
      }
      this.cacheMetrics.misses++;
    }

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

    const result = response.data.response;
    
    // Cache the response if enabled
    if (this.cacheConfig.enabled && this.shouldCacheResponse(prompt, result, options)) {
      const cacheKey = this.generateCacheKey(prompt, options);
      this.setCachedResponse(cacheKey, result);
    }

    return result;
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

  // Alias for generateCompletion to match UniversalRouter usage
  async generateCompletion(prompt, options = {}) {
    return await this.generate(prompt, options);
  }
  
  /**
   * Generate a cache key for the prompt and options
   */
  generateCacheKey(prompt, options) {
    const keyData = {
      prompt: prompt.substring(0, 500), // Use first 500 chars for key
      model: this.model,
      temperature: options.temperature || 0.7,
      systemContext: options.systemContext || null
    };
    
    // Create a simple hash-like key
    return JSON.stringify(keyData);
  }
  
  /**
   * Get cached response if available and not expired
   */
  getCachedResponse(cacheKey) {
    const cached = this.responseCache.get(cacheKey);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.cacheConfig.cacheTTL) {
      this.responseCache.delete(cacheKey);
      return null;
    }
    
    return cached;
  }
  
  /**
   * Cache a response
   */
  setCachedResponse(cacheKey, response) {
    // Clean up cache if it's getting too large
    if (this.responseCache.size >= this.cacheConfig.maxCacheSize) {
      this.evictOldestCacheEntries();
    }
    
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
  }
  
  /**
   * Determine if a response should be cached
   */
  shouldCacheResponse(prompt, response, options) {
    // Don't cache if response is too short (likely an error)
    if (response.length < 20) return false;
    
    // Cache system prompts and context-heavy queries
    if (this.cacheConfig.systemPromptCaching && 
        (options.systemContext || prompt.includes('Context:') || prompt.includes('Schema:'))) {
      return true;
    }
    
    // Cache substantial prompts that are likely to be reused
    if (prompt.length > 200) return true;
    
    return false;
  }
  
  /**
   * Evict oldest cache entries to make room
   */
  evictOldestCacheEntries() {
    const entries = Array.from(this.responseCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.responseCache.delete(entries[i][0]);
      this.cacheMetrics.evictions++;
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    const totalRequests = this.cacheMetrics.hits + this.cacheMetrics.misses;
    const hitRate = totalRequests > 0 ? (this.cacheMetrics.hits / totalRequests * 100).toFixed(1) : 0;
    
    return {
      ...this.cacheMetrics,
      hitRate: parseFloat(hitRate),
      cacheSize: this.responseCache.size,
      maxCacheSize: this.cacheConfig.maxCacheSize
    };
  }
  
  /**
   * Clear the cache
   */
  clearCache() {
    this.responseCache.clear();
    this.cacheMetrics = { hits: 0, misses: 0, evictions: 0 };
    console.log(chalk.yellow('🧹 Local cache cleared'));
  }
  
  /**
   * Configure caching
   */
  configureCaching(config) {
    this.cacheConfig = { ...this.cacheConfig, ...config };
    console.log(chalk.green('✓ Local caching configuration updated'));
  }
}