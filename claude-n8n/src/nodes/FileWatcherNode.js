const chokidar = require('chokidar');
const fs = require('fs-extra');

class FileWatcherNode {
  constructor(parameters = {}, logger) {
    this.parameters = parameters;
    this.logger = logger;
    this.type = 'fileWatcher';
    this.displayName = 'File Watcher';
    this.description = 'Watch files for changes';
  }

  async execute(inputData, executionContext) {
    const input = inputData.main?.[0] || {};
    const filePath = input.filePath || this.parameters.filePath;
    
    if (!filePath) {
      throw new Error('File path is required');
    }

    return new Promise((resolve, reject) => {
      const watcher = chokidar.watch(filePath);
      
      watcher.on('change', async (path) => {
        try {
          const content = await fs.readFile(path, 'utf8');
          watcher.close();
          resolve({
            filePath: path,
            content: content,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          watcher.close();
          reject(error);
        }
      });
      
      watcher.on('error', (error) => {
        watcher.close();
        reject(error);
      });
    });
  }
}

module.exports = FileWatcherNode;
