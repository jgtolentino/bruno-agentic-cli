const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class BrunoRunner {
    constructor(brunoPath, config, outputChannel) {
        this.brunoPath = brunoPath;
        this.config = config;
        this.outputChannel = outputChannel;
        this.currentSession = null;
    }
    
    updateConfig(newConfig) {
        this.config = newConfig;
    }
    
    async execute(prompt, options = {}) {
        return new Promise((resolve, reject) => {
            const args = [
                this.brunoPath,
                '-p',
                prompt,
                '--model', this.config.get('model') || 'deepseek-coder:6.7b'
            ];
            
            if (options.sessionId) {
                args.push('--resume', options.sessionId);
            }
            
            const brunoProcess = spawn('node', args, {
                cwd: path.dirname(this.brunoPath),
                env: {
                    ...process.env,
                    OLLAMA_URL: this.config.get('ollamaUrl') || 'http://127.0.0.1:11434'
                }
            });
            
            let output = '';
            let error = '';
            
            brunoProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            brunoProcess.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            brunoProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(error || `Bruno exited with code ${code}`));
                } else {
                    // Parse and clean the output
                    const cleanedOutput = this.parseOutput(output);
                    resolve(cleanedOutput);
                }
            });
            
            brunoProcess.on('error', (err) => {
                reject(new Error(`Failed to start Bruno: ${err.message}`));
            });
        });
    }
    
    parseOutput(rawOutput) {
        // Remove ANSI color codes
        let cleaned = rawOutput.replace(/\x1b\[[0-9;]*m/g, '');
        
        // Extract the actual response content
        const lines = cleaned.split('\n');
        const responseStart = lines.findIndex(line => 
            line.includes('Result:') || 
            line.includes('explanation:') ||
            line.includes('Bruno:')
        );
        
        if (responseStart !== -1) {
            // Get everything after the response marker
            cleaned = lines.slice(responseStart + 1).join('\n').trim();
            
            // Try to parse JSON response
            try {
                const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.explanation) {
                        return parsed.explanation;
                    } else if (parsed.solution) {
                        return parsed.solution;
                    } else if (parsed.code) {
                        return `\`\`\`${parsed.language || ''}\n${parsed.code}\n\`\`\``;
                    }
                }
            } catch (e) {
                // Not JSON, return as is
            }
        }
        
        return cleaned || rawOutput;
    }
    
    async getSessions() {
        const memoryPath = path.join(path.dirname(this.brunoPath), '..', 'memory');
        
        try {
            const files = await fs.promises.readdir(memoryPath);
            const sessions = [];
            
            for (const file of files) {
                if (file.endsWith('.json') && file !== 'memory.json') {
                    const sessionPath = path.join(memoryPath, file);
                    const data = await fs.promises.readFile(sessionPath, 'utf-8');
                    const session = JSON.parse(data);
                    sessions.push({
                        id: file.replace('.json', ''),
                        timestamp: session.timestamp || new Date(fs.statSync(sessionPath).mtime),
                        model: session.model
                    });
                }
            }
            
            return sessions.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Failed to load sessions:', error);
            return [];
        }
    }
    
    async loadSession(sessionId) {
        this.currentSession = sessionId;
        return true;
    }
    
    async continueLastSession() {
        const sessions = await this.getSessions();
        if (sessions.length > 0) {
            this.currentSession = sessions[0].id;
            return true;
        }
        return false;
    }
    
    async executeInSession(prompt) {
        const options = this.currentSession ? { sessionId: this.currentSession } : {};
        return this.execute(prompt, options);
    }
}

module.exports = { BrunoRunner };