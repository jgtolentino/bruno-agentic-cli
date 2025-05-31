import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import sharp from 'sharp';
import Jimp from 'jimp';
import { createWorker } from 'tesseract.js';
import fetch from 'node-fetch';
import mime from 'mime-types';
import { EventEmitter } from 'events';

export class MultiModalInputProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      supportedImageTypes: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff'],
      supportedVideoTypes: ['mp4', 'avi', 'mov', 'wmv', 'webm'],
      supportedAudioTypes: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
      supportedDocTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'],
      ocrLanguages: ['eng'],
      cacheEnabled: true,
      cacheDir: path.join(process.cwd(), '.bruno-cache'),
      ...options
    };
    
    this.cache = new Map();
    this.workers = new Map();
    this.setupCache();
  }

  async setupCache() {
    if (this.options.cacheEnabled) {
      try {
        await fs.mkdir(this.options.cacheDir, { recursive: true });
      } catch (error) {
        console.warn('Failed to create cache directory:', error.message);
        this.options.cacheEnabled = false;
      }
    }
  }

  async processInput(input) {
    try {
      const inputType = await this.detectInputType(input);
      
      this.emit('inputDetected', { type: inputType, input });
      
      switch (inputType.category) {
        case 'text':
          return this.processText(input, inputType);
        case 'file':
          return this.processFile(input, inputType);
        case 'url':
          return this.processURL(input, inputType);
        case 'image':
          return this.processImage(input, inputType);
        case 'video':
          return this.processVideo(input, inputType);
        case 'audio':
          return this.processAudio(input, inputType);
        case 'document':
          return this.processDocument(input, inputType);
        default:
          return this.processUnknown(input, inputType);
      }
    } catch (error) {
      this.emit('processingError', { input, error });
      throw new Error(`Failed to process input: ${error.message}`);
    }
  }

  async detectInputType(input) {
    // URL detection
    if (this.isURL(input)) {
      const urlType = await this.analyzeURL(input);
      return { category: 'url', subtype: urlType, original: input };
    }
    
    // File path detection
    if (this.isFilePath(input)) {
      const exists = await this.fileExists(input);
      if (exists) {
        const ext = path.extname(input).toLowerCase().slice(1);
        const category = this.categorizeFileExtension(ext);
        return { category, subtype: ext, path: input, original: input };
      }
    }
    
    // Base64 data detection
    if (this.isBase64Data(input)) {
      const dataType = this.parseBase64DataType(input);
      return { category: 'image', subtype: dataType, base64: true, original: input };
    }
    
    // JSON detection
    if (this.isJSON(input)) {
      return { category: 'text', subtype: 'json', original: input };
    }
    
    // Code detection
    if (this.isCode(input)) {
      const language = this.detectCodeLanguage(input);
      return { category: 'text', subtype: 'code', language, original: input };
    }
    
    // Default to plain text
    return { category: 'text', subtype: 'plain', original: input };
  }

  async processText(input, inputType) {
    const result = {
      type: 'text',
      subtype: inputType.subtype,
      content: input,
      metadata: {
        length: input.length,
        lines: input.split('\n').length,
        words: input.split(/\s+/).length
      }
    };

    if (inputType.subtype === 'json') {
      try {
        result.parsed = JSON.parse(input);
        result.metadata.valid = true;
      } catch (error) {
        result.metadata.valid = false;
        result.metadata.parseError = error.message;
      }
    }

    if (inputType.subtype === 'code') {
      result.metadata.language = inputType.language;
      result.metadata.syntaxHighlighted = await this.highlightCode(input, inputType.language);
    }

    this.emit('textProcessed', result);
    return result;
  }

  async processFile(input, inputType) {
    const filePath = inputType.path;
    const stats = await fs.stat(filePath);
    
    if (stats.size > this.options.maxFileSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${this.options.maxFileSize})`);
    }

    const result = {
      type: 'file',
      subtype: inputType.subtype,
      path: filePath,
      metadata: {
        size: stats.size,
        modified: stats.mtime,
        extension: inputType.subtype
      }
    };

    // Route to specific processor based on file type
    switch (inputType.category) {
      case 'image':
        return this.processImageFile(filePath, result);
      case 'video':
        return this.processVideoFile(filePath, result);
      case 'audio':
        return this.processAudioFile(filePath, result);
      case 'document':
        return this.processDocumentFile(filePath, result);
      default:
        // Read as text
        result.content = await fs.readFile(filePath, 'utf8');
        break;
    }

    this.emit('fileProcessed', result);
    return result;
  }

  async processURL(input, inputType) {
    const cacheKey = `url_${Buffer.from(input).toString('base64')}`;
    
    if (this.options.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(input, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Bruno CLI Multi-Modal Processor'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const result = {
        type: 'url',
        url: input,
        contentType,
        metadata: {
          status: response.status,
          headers: Object.fromEntries(response.headers),
          size: parseInt(response.headers.get('content-length') || '0')
        }
      };

      if (contentType.startsWith('text/') || contentType.includes('json')) {
        result.content = await response.text();
        result.subtype = 'text';
      } else if (contentType.startsWith('image/')) {
        result.buffer = await response.buffer();
        result.subtype = 'image';
        // Process image
        const imageResult = await this.processImageBuffer(result.buffer);
        Object.assign(result, imageResult);
      } else {
        result.buffer = await response.buffer();
        result.subtype = 'binary';
      }

      if (this.options.cacheEnabled) {
        this.cache.set(cacheKey, result);
      }

      this.emit('urlProcessed', result);
      return result;
    } catch (error) {
      throw new Error(`Failed to fetch URL: ${error.message}`);
    }
  }

  async processImage(input, inputType) {
    let buffer;
    
    if (inputType.base64) {
      buffer = Buffer.from(input.split(',')[1], 'base64');
    } else if (inputType.path) {
      buffer = await fs.readFile(inputType.path);
    } else {
      throw new Error('Invalid image input');
    }

    return this.processImageBuffer(buffer);
  }

  async processImageBuffer(buffer) {
    const result = {
      type: 'image',
      buffer,
      metadata: {}
    };

    try {
      // Get image metadata using sharp
      const metadata = await sharp(buffer).metadata();
      result.metadata = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        density: metadata.density,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha
      };

      // Generate thumbnail
      result.thumbnail = await sharp(buffer)
        .resize(200, 200, { fit: 'inside' })
        .png()
        .toBuffer();

      // Extract text using OCR
      result.ocrText = await this.extractTextFromImage(buffer);

      // Analyze image content (basic)
      result.analysis = await this.analyzeImageContent(buffer, result.metadata);

      this.emit('imageProcessed', result);
      return result;
    } catch (error) {
      console.warn('Image processing failed:', error.message);
      result.error = error.message;
      return result;
    }
  }

  async processImageFile(filePath, baseResult) {
    const buffer = await fs.readFile(filePath);
    const imageResult = await this.processImageBuffer(buffer);
    
    return {
      ...baseResult,
      ...imageResult,
      path: filePath
    };
  }

  async extractTextFromImage(buffer) {
    try {
      const cacheKey = `ocr_${Buffer.from(buffer).toString('base64', 0, 32)}`;
      
      if (this.options.cacheEnabled && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      let worker = this.workers.get('ocr');
      if (!worker) {
        worker = await createWorker();
        await worker.loadLanguage(this.options.ocrLanguages.join('+'));
        await worker.initialize(this.options.ocrLanguages.join('+'));
        this.workers.set('ocr', worker);
      }

      const { data: { text, confidence } } = await worker.recognize(buffer);
      
      const result = {
        text: text.trim(),
        confidence,
        timestamp: new Date().toISOString()
      };

      if (this.options.cacheEnabled) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.warn('OCR extraction failed:', error.message);
      return { text: '', confidence: 0, error: error.message };
    }
  }

  async analyzeImageContent(buffer, metadata) {
    try {
      // Basic image analysis
      const analysis = {
        type: 'unknown',
        features: [],
        colors: [],
        dimensions: {
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.width / metadata.height
        }
      };

      // Determine image type based on aspect ratio and size
      if (analysis.dimensions.aspectRatio > 2) {
        analysis.type = 'banner';
      } else if (analysis.dimensions.aspectRatio < 0.8) {
        analysis.type = 'portrait';
      } else {
        analysis.type = 'landscape';
      }

      // Extract dominant colors
      const image = await Jimp.read(buffer);
      const resized = image.resize(50, 50);
      
      const colorMap = new Map();
      resized.scan(0, 0, resized.bitmap.width, resized.bitmap.height, function (x, y, idx) {
        const red = this.bitmap.data[idx + 0];
        const green = this.bitmap.data[idx + 1];
        const blue = this.bitmap.data[idx + 2];
        const alpha = this.bitmap.data[idx + 3];
        
        if (alpha > 128) { // Only consider non-transparent pixels
          const color = `rgb(${red},${green},${blue})`;
          colorMap.set(color, (colorMap.get(color) || 0) + 1);
        }
      });

      // Get top 5 colors
      analysis.colors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color, count]) => ({ color, count }));

      return analysis;
    } catch (error) {
      return { error: error.message };
    }
  }

  async processVideo(input, inputType) {
    // Video processing would require ffmpeg or similar
    // For now, return basic metadata
    return {
      type: 'video',
      path: inputType.path,
      metadata: {
        extension: inputType.subtype,
        note: 'Video processing not implemented'
      }
    };
  }

  async processAudio(input, inputType) {
    // Audio processing would require ffmpeg or similar
    // For now, return basic metadata
    return {
      type: 'audio',
      path: inputType.path,
      metadata: {
        extension: inputType.subtype,
        note: 'Audio processing not implemented'
      }
    };
  }

  async processDocument(input, inputType) {
    if (inputType.subtype === 'pdf') {
      // PDF processing would require pdf-parse or similar
      return {
        type: 'document',
        path: inputType.path,
        metadata: {
          extension: 'pdf',
          note: 'PDF processing not implemented'
        }
      };
    }
    
    // For other document types, try to read as text
    try {
      const content = await fs.readFile(inputType.path, 'utf8');
      return {
        type: 'document',
        path: inputType.path,
        content,
        metadata: {
          extension: inputType.subtype,
          length: content.length,
          lines: content.split('\n').length
        }
      };
    } catch (error) {
      return {
        type: 'document',
        path: inputType.path,
        error: error.message,
        metadata: {
          extension: inputType.subtype
        }
      };
    }
  }

  async processUnknown(input, inputType) {
    return {
      type: 'unknown',
      original: input,
      inputType,
      metadata: {
        note: 'Unknown input type, treated as plain text'
      }
    };
  }

  // Utility methods
  isURL(input) {
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  }

  async analyzeURL(url) {
    try {
      const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.startsWith('image/')) return 'image';
      if (contentType.startsWith('video/')) return 'video';
      if (contentType.startsWith('audio/')) return 'audio';
      if (contentType.includes('pdf')) return 'document';
      return 'webpage';
    } catch {
      return 'unknown';
    }
  }

  isFilePath(input) {
    return typeof input === 'string' && 
           (input.includes('/') || input.includes('\\') || input.includes('.'));
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  isBase64Data(input) {
    return typeof input === 'string' && 
           input.startsWith('data:') && 
           input.includes('base64,');
  }

  parseBase64DataType(input) {
    const match = input.match(/data:([^;]+);base64,/);
    return match ? match[1].split('/')[1] : 'unknown';
  }

  isJSON(input) {
    try {
      JSON.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  isCode(input) {
    const codeIndicators = [
      'function ', 'class ', 'import ', 'export ',
      'const ', 'let ', 'var ', 'def ', 'public ',
      'private ', 'protected ', '#include', 'using namespace'
    ];
    
    return codeIndicators.some(indicator => input.includes(indicator));
  }

  detectCodeLanguage(input) {
    const patterns = {
      javascript: /\b(function|const|let|var|=>|console\.log)\b/,
      python: /\b(def|import|from|print|if __name__|class)\b/,
      java: /\b(public|private|protected|class|import|package)\b/,
      cpp: /\b(#include|using namespace|std::|int main)\b/,
      css: /\{[^}]*\}/,
      html: /<[^>]+>/,
      sql: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\b/i
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(input)) {
        return lang;
      }
    }

    return 'unknown';
  }

  categorizeFileExtension(ext) {
    if (this.options.supportedImageTypes.includes(ext)) return 'image';
    if (this.options.supportedVideoTypes.includes(ext)) return 'video';
    if (this.options.supportedAudioTypes.includes(ext)) return 'audio';
    if (this.options.supportedDocTypes.includes(ext)) return 'document';
    return 'file';
  }

  async highlightCode(code, language) {
    try {
      const { highlightCode } = await import('./syntaxHighlighter.js');
      return highlightCode(code, language);
    } catch {
      return code; // Fallback to plain text
    }
  }

  // Cleanup resources
  async cleanup() {
    for (const [name, worker] of this.workers) {
      try {
        await worker.terminate();
      } catch (error) {
        console.warn(`Failed to terminate ${name} worker:`, error.message);
      }
    }
    
    this.workers.clear();
    this.cache.clear();
  }

  // Configuration methods
  setMaxFileSize(size) {
    this.options.maxFileSize = size;
  }

  addSupportedType(category, extension) {
    const typeArray = this.options[`supported${category}Types`];
    if (typeArray && !typeArray.includes(extension)) {
      typeArray.push(extension);
    }
  }

  setCacheEnabled(enabled) {
    this.options.cacheEnabled = enabled;
  }
}

// Export convenience functions
export async function processMultiModalInput(input, options = {}) {
  const processor = new MultiModalInputProcessor(options);
  try {
    return await processor.processInput(input);
  } finally {
    await processor.cleanup();
  }
}

export function createMultiModalProcessor(options = {}) {
  return new MultiModalInputProcessor(options);
}