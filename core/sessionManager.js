import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class SessionManager {
  constructor(config = {}) {
    this.sessionDir = config.sessionDir || path.join(process.env.HOME || process.env.USERPROFILE, '.bruno', 'sessions');
    this.maxSessions = config.maxSessions || 50;
    this.sessionFile = path.join(this.sessionDir, 'sessions.json');
    this.currentSessionId = null;
  }

  async initialize() {
    try {
      await fs.mkdir(this.sessionDir, { recursive: true });
      
      // Ensure sessions index exists
      try {
        await fs.access(this.sessionFile);
      } catch {
        await this.saveSessionsIndex({});
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize session manager:'), error.message);
    }
  }

  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `bruno_${timestamp}_${random}`;
  }

  async createSession(initialContext = {}) {
    await this.initialize();
    
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      created: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      messages: [],
      context: {
        workingDirectory: process.cwd(),
        ...initialContext
      },
      metadata: {
        totalMessages: 0,
        model: 'deepseek-coder:6.7b',
        version: '3.0'
      }
    };

    await this.saveSession(session);
    this.currentSessionId = sessionId;
    
    console.log(chalk.cyan(`📝 Started new session: ${sessionId}`));
    return sessionId;
  }

  async continueLastSession() {
    await this.initialize();
    
    const sessions = await this.loadSessionsIndex();
    const sessionIds = Object.keys(sessions);
    
    if (sessionIds.length === 0) {
      console.log(chalk.yellow('📝 No previous sessions found, starting new session'));
      return await this.createSession();
    }

    // Get most recently accessed session
    const sortedSessions = sessionIds
      .map(id => ({ id, ...sessions[id] }))
      .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
    
    const lastSession = sortedSessions[0];
    this.currentSessionId = lastSession.id;
    
    // Update last accessed time
    await this.updateSessionAccess(lastSession.id);
    
    console.log(chalk.green(`🔄 Continuing session: ${lastSession.id}`));
    console.log(chalk.gray(`   Created: ${new Date(lastSession.created).toLocaleString()}`));
    console.log(chalk.gray(`   Messages: ${lastSession.totalMessages}`));
    
    return lastSession.id;
  }

  async resumeSession(sessionId) {
    await this.initialize();
    
    if (!sessionId) {
      return await this.selectSessionInteractively();
    }

    const session = await this.loadSession(sessionId);
    if (!session) {
      console.log(chalk.red(`❌ Session ${sessionId} not found`));
      return null;
    }

    this.currentSessionId = sessionId;
    await this.updateSessionAccess(sessionId);
    
    console.log(chalk.green(`🔄 Resumed session: ${sessionId}`));
    console.log(chalk.gray(`   Created: ${new Date(session.created).toLocaleString()}`));
    console.log(chalk.gray(`   Messages: ${session.metadata.totalMessages}`));
    
    return sessionId;
  }

  async selectSessionInteractively() {
    const sessions = await this.loadSessionsIndex();
    const sessionIds = Object.keys(sessions);
    
    if (sessionIds.length === 0) {
      console.log(chalk.yellow('📝 No sessions found, starting new session'));
      return await this.createSession();
    }

    console.log(chalk.cyan('\n📋 Available Sessions:'));
    const sortedSessions = sessionIds
      .map(id => ({ id, ...sessions[id] }))
      .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));

    sortedSessions.slice(0, 10).forEach((session, index) => {
      const date = new Date(session.lastAccessed).toLocaleDateString();
      const time = new Date(session.lastAccessed).toLocaleTimeString();
      console.log(chalk.gray(`${index + 1}. ${session.id} (${date} ${time}) - ${session.totalMessages} messages`));
    });

    console.log(chalk.yellow('\nMost recent session will be resumed automatically.'));
    console.log(chalk.gray('Use: bruno -r <session_id> to resume a specific session'));
    
    // Auto-select most recent
    const mostRecent = sortedSessions[0];
    return await this.resumeSession(mostRecent.id);
  }

  async addMessage(sessionId, message, response) {
    if (!sessionId) sessionId = this.currentSessionId;
    if (!sessionId) return;

    const session = await this.loadSession(sessionId);
    if (!session) return;

    const messageEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      input: message,
      output: response,
      type: 'interaction'
    };

    session.messages.push(messageEntry);
    session.lastAccessed = new Date().toISOString();
    session.metadata.totalMessages = session.messages.length;

    await this.saveSession(session);
  }

  async getSessionHistory(sessionId, limit = 10) {
    if (!sessionId) sessionId = this.currentSessionId;
    if (!sessionId) return [];

    const session = await this.loadSession(sessionId);
    if (!session) return [];

    return session.messages.slice(-limit);
  }

  async getSessionContext(sessionId) {
    if (!sessionId) sessionId = this.currentSessionId;
    if (!sessionId) return {};

    const session = await this.loadSession(sessionId);
    if (!session) return {};

    return {
      workingDirectory: session.context.workingDirectory,
      recentMessages: session.messages.slice(-5),
      metadata: session.metadata
    };
  }

  async listSessions(limit = 20) {
    await this.initialize();
    
    const sessions = await this.loadSessionsIndex();
    const sessionIds = Object.keys(sessions);
    
    if (sessionIds.length === 0) {
      console.log(chalk.yellow('📝 No sessions found'));
      return [];
    }

    const sortedSessions = sessionIds
      .map(id => ({ id, ...sessions[id] }))
      .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed))
      .slice(0, limit);

    console.log(chalk.cyan(`\n📋 Sessions (${sortedSessions.length} of ${sessionIds.length}):`));
    
    sortedSessions.forEach((session, index) => {
      const isActive = session.id === this.currentSessionId;
      const marker = isActive ? chalk.green('→') : ' ';
      const date = new Date(session.lastAccessed).toLocaleDateString();
      const time = new Date(session.lastAccessed).toLocaleTimeString();
      
      console.log(`${marker} ${chalk.cyan(session.id)}`);
      console.log(`   ${chalk.gray(`${date} ${time} - ${session.totalMessages} messages`)}`);
    });

    return sortedSessions;
  }

  async deleteSession(sessionId) {
    await this.initialize();
    
    const sessions = await this.loadSessionsIndex();
    if (!sessions[sessionId]) {
      console.log(chalk.red(`❌ Session ${sessionId} not found`));
      return false;
    }

    // Delete session file
    const sessionPath = path.join(this.sessionDir, `${sessionId}.json`);
    try {
      await fs.unlink(sessionPath);
    } catch (error) {
      // File might not exist, that's okay
    }

    // Remove from index
    delete sessions[sessionId];
    await this.saveSessionsIndex(sessions);
    
    console.log(chalk.green(`✅ Deleted session: ${sessionId}`));
    
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
    
    return true;
  }

  async cleanupOldSessions() {
    await this.initialize();
    
    const sessions = await this.loadSessionsIndex();
    const sessionIds = Object.keys(sessions);
    
    if (sessionIds.length <= this.maxSessions) {
      return;
    }

    // Sort by lastAccessed and remove oldest
    const sortedSessions = sessionIds
      .map(id => ({ id, ...sessions[id] }))
      .sort((a, b) => new Date(a.lastAccessed) - new Date(b.lastAccessed));

    const toDelete = sortedSessions.slice(0, sessionIds.length - this.maxSessions);
    
    console.log(chalk.yellow(`🧹 Cleaning up ${toDelete.length} old sessions`));
    
    for (const session of toDelete) {
      await this.deleteSession(session.id);
    }
  }

  async saveSession(session) {
    const sessionPath = path.join(this.sessionDir, `${session.id}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
    
    // Update sessions index
    const sessions = await this.loadSessionsIndex();
    sessions[session.id] = {
      created: session.created,
      lastAccessed: session.lastAccessed,
      totalMessages: session.metadata.totalMessages,
      workingDirectory: session.context.workingDirectory
    };
    
    await this.saveSessionsIndex(sessions);
  }

  async loadSession(sessionId) {
    try {
      const sessionPath = path.join(this.sessionDir, `${sessionId}.json`);
      const data = await fs.readFile(sessionPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async loadSessionsIndex() {
    try {
      const data = await fs.readFile(this.sessionFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  async saveSessionsIndex(sessions) {
    await fs.writeFile(this.sessionFile, JSON.stringify(sessions, null, 2));
  }

  async updateSessionAccess(sessionId) {
    const session = await this.loadSession(sessionId);
    if (session) {
      session.lastAccessed = new Date().toISOString();
      await this.saveSession(session);
    }
  }

  getCurrentSessionId() {
    return this.currentSessionId;
  }

  async getStats() {
    await this.initialize();
    
    const sessions = await this.loadSessionsIndex();
    const sessionIds = Object.keys(sessions);
    
    if (sessionIds.length === 0) {
      return { totalSessions: 0, totalMessages: 0 };
    }

    const totalMessages = Object.values(sessions)
      .reduce((sum, session) => sum + (session.totalMessages || 0), 0);

    return {
      totalSessions: sessionIds.length,
      totalMessages,
      currentSession: this.currentSessionId,
      oldestSession: Math.min(...Object.values(sessions).map(s => new Date(s.created))),
      newestSession: Math.max(...Object.values(sessions).map(s => new Date(s.lastAccessed)))
    };
  }
}