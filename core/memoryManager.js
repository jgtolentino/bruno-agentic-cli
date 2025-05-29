export class MemoryManager {
  constructor() {
    this.shortTermMemory = [];
    this.maxMemorySize = 10;
    this.context = {};
  }

  addToMemory(entry) {
    this.shortTermMemory.push({
      timestamp: new Date().toISOString(),
      ...entry
    });

    // Keep only recent entries
    if (this.shortTermMemory.length > this.maxMemorySize) {
      this.shortTermMemory.shift();
    }
  }

  getRecentContext(n = 5) {
    return this.shortTermMemory.slice(-n);
  }

  setContext(key, value) {
    this.context[key] = value;
  }

  getContext(key) {
    return this.context[key];
  }

  clear() {
    this.shortTermMemory = [];
    this.context = {};
  }

  getSummary() {
    return {
      memoryCount: this.shortTermMemory.length,
      contextKeys: Object.keys(this.context),
      recentActions: this.shortTermMemory.slice(-3).map(m => m.action || m.type)
    };
  }
}