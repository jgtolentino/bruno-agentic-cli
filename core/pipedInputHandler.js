import { EventEmitter } from 'events';
import mime from 'mime-types';
import fs from 'fs/promises';

export class PipedInputHandler extends EventEmitter {
  constructor() {
    super();
    this.buffer = '';
    this.isImage = false;
    this.encoding = 'utf8';
    this.metadata = {};
  }

  async readPipedInput() {
    return new Promise((resolve, reject) => {
      if (process.stdin.isTTY) {
        resolve(null);
        return;
      }

      const chunks = [];
      let totalLength = 0;

      process.stdin.on('data', (chunk) => {
        chunks.push(chunk);
        totalLength += chunk.length;
        this.emit('data', chunk);
      });

      process.stdin.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks, totalLength);
          const result = this.processBuffer(buffer);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      process.stdin.on('error', reject);

      // Set binary mode for potential image data
      process.stdin.setEncoding(null);
    });
  }

  processBuffer(buffer) {
    // Try to detect content type
    const contentType = this.detectContentType(buffer);
    
    switch (contentType.type) {
      case 'text':
        return this.processText(buffer.toString('utf8'));
      case 'image':
        return this.processImage(buffer, contentType.mimeType);
      case 'json':
        return this.processJSON(buffer.toString('utf8'));
      case 'csv':
        return this.processCSV(buffer.toString('utf8'));
      case 'binary':
        return this.processBinary(buffer);
      default:
        return this.processText(buffer.toString('utf8'));
    }
  }

  detectContentType(buffer) {
    // Check for image magic bytes
    if (this.isImageBuffer(buffer)) {
      const mimeType = this.getImageMimeType(buffer);
      return { type: 'image', mimeType };
    }

    // Try to parse as text
    try {
      const text = buffer.toString('utf8');
      
      // Check for JSON
      if (this.isJSON(text)) {
        return { type: 'json' };
      }
      
      // Check for CSV
      if (this.isCSV(text)) {
        return { type: 'csv' };
      }
      
      // Check if it's readable text
      if (this.isReadableText(text)) {
        return { type: 'text' };
      }
    } catch (error) {
      // Not valid text
    }

    return { type: 'binary' };
  }

  isImageBuffer(buffer) {
    if (buffer.length < 4) return false;
    
    // Check common image magic bytes
    const signatures = [
      [0xFF, 0xD8, 0xFF], // JPEG
      [0x89, 0x50, 0x4E, 0x47], // PNG
      [0x47, 0x49, 0x46], // GIF
      [0x42, 0x4D], // BMP
      [0x52, 0x49, 0x46, 0x46] // WEBP
    ];

    return signatures.some(sig => 
      sig.every((byte, i) => buffer[i] === byte)
    );
  }

  getImageMimeType(buffer) {
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) return 'image/bmp';
    if (buffer.slice(0, 4).toString() === 'RIFF') return 'image/webp';
    return 'image/unknown';
  }

  isJSON(text) {
    try {
      JSON.parse(text.trim());
      return true;
    } catch {
      return false;
    }
  }

  isCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return false;
    
    // Check if first few lines have consistent comma counts
    const firstLineCommas = (lines[0].match(/,/g) || []).length;
    return lines.slice(0, 3).every(line => 
      (line.match(/,/g) || []).length === firstLineCommas
    );
  }

  isReadableText(text) {
    // Check if text contains mostly printable characters
    const printableRatio = text.split('').filter(char => {
      const code = char.charCodeAt(0);
      return (code >= 32 && code <= 126) || char === '\n' || char === '\r' || char === '\t';
    }).length / text.length;
    
    return printableRatio > 0.8;
  }

  processText(text) {
    return {
      type: 'text',
      content: text.trim(),
      lineCount: text.split('\n').length,
      size: text.length,
      encoding: 'utf8'
    };
  }

  processImage(buffer, mimeType) {
    return {
      type: 'image',
      buffer,
      mimeType,
      size: buffer.length,
      requiresOCR: true,
      metadata: {
        width: null,
        height: null,
        extractedText: null
      }
    };
  }

  processJSON(text) {
    try {
      const data = JSON.parse(text);
      return {
        type: 'json',
        content: text.trim(),
        parsed: data,
        size: text.length,
        isArray: Array.isArray(data),
        keys: typeof data === 'object' ? Object.keys(data) : []
      };
    } catch (error) {
      return this.processText(text);
    }
  }

  processCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return {
      type: 'csv',
      content: text.trim(),
      headers,
      rowCount: lines.length - 1,
      columnCount: headers.length,
      preview: lines.slice(0, 5)
    };
  }

  processBinary(buffer) {
    return {
      type: 'binary',
      buffer,
      size: buffer.length,
      hexPreview: buffer.slice(0, 64).toString('hex'),
      requiresSpecialHandling: true
    };
  }

  async extractTextFromImage(imageData) {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker();
      
      const { data: { text } } = await worker.recognize(imageData.buffer);
      await worker.terminate();
      
      return text;
    } catch (error) {
      console.warn('OCR extraction failed:', error.message);
      return null;
    }
  }

  formatForDisplay(data) {
    switch (data.type) {
      case 'text':
        return `📄 Text input (${data.lineCount} lines, ${data.size} bytes)\n${data.content}`;
      
      case 'image':
        return `🖼️  Image input (${data.mimeType}, ${data.size} bytes)${data.metadata.extractedText ? '\n\nExtracted text:\n' + data.metadata.extractedText : ''}`;
      
      case 'json':
        return `📋 JSON input (${data.isArray ? 'array' : 'object'}, ${data.size} bytes)\nKeys: ${data.keys.join(', ')}\n\n${JSON.stringify(data.parsed, null, 2)}`;
      
      case 'csv':
        return `📊 CSV input (${data.rowCount} rows, ${data.columnCount} columns)\nHeaders: ${data.headers.join(', ')}\n\n${data.preview.join('\n')}`;
      
      case 'binary':
        return `📦 Binary input (${data.size} bytes)\nHex preview: ${data.hexPreview}`;
      
      default:
        return `❓ Unknown input type (${data.size} bytes)`;
    }
  }
}

export async function handlePipedInput() {
  const handler = new PipedInputHandler();
  
  try {
    const data = await handler.readPipedInput();
    
    if (!data) {
      return null; // No piped input
    }

    // Extract text from images if needed
    if (data.type === 'image' && data.requiresOCR) {
      data.metadata.extractedText = await handler.extractTextFromImage(data);
    }

    return {
      ...data,
      display: handler.formatForDisplay(data),
      handler
    };
  } catch (error) {
    throw new Error(`Failed to process piped input: ${error.message}`);
  }
}