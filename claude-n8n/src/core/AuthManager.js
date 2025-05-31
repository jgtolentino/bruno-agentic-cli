/**
 * AuthManager - Handles authentication and authorization
 * Simple auth system for the Claude N8N instance
 */

const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class AuthManager {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.usersFile = path.join(dataDir, 'credentials', 'users.json');
    this.sessionsFile = path.join(dataDir, 'credentials', 'sessions.json');
    this.jwtSecret = process.env.JWT_SECRET || 'claude-n8n-default-secret-change-in-production';
    this.users = new Map();
    this.sessions = new Map();
    
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      // Ensure credentials directory exists
      await fs.ensureDir(path.dirname(this.usersFile));
      
      // Load existing users
      await this.loadUsers();
      
      // Create default admin user if no users exist
      if (this.users.size === 0) {
        await this.createDefaultAdmin();
      }
      
      // Load existing sessions
      await this.loadSessions();
      
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }

  async loadUsers() {
    try {
      if (await fs.pathExists(this.usersFile)) {
        const usersData = await fs.readJson(this.usersFile);
        this.users = new Map(Object.entries(usersData));
      }
    } catch (error) {
      console.warn('Failed to load users:', error);
    }
  }

  async saveUsers() {
    try {
      const usersData = Object.fromEntries(this.users);
      await fs.writeJson(this.usersFile, usersData, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save users:', error);
    }
  }

  async loadSessions() {
    try {
      if (await fs.pathExists(this.sessionsFile)) {
        const sessionsData = await fs.readJson(this.sessionsFile);
        this.sessions = new Map(Object.entries(sessionsData));
      }
    } catch (error) {
      console.warn('Failed to load sessions:', error);
    }
  }

  async saveSessions() {
    try {
      const sessionsData = Object.fromEntries(this.sessions);
      await fs.writeJson(this.sessionsFile, sessionsData, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  }

  async createDefaultAdmin() {
    const defaultAdmin = {
      id: 'admin',
      username: 'admin',
      email: 'admin@claude-n8n.local',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'admin',
      permissions: ['*'],
      createdAt: new Date().toISOString(),
      lastLogin: null,
      active: true
    };

    this.users.set('admin', defaultAdmin);
    await this.saveUsers();
    
    console.log('Created default admin user: admin/admin123');
    console.log('⚠️  Please change the default password after first login');
  }

  async createUser(userData) {
    const userId = userData.id || uuidv4();
    
    // Check if username already exists
    const existingUser = Array.from(this.users.values())
      .find(u => u.username === userData.username);
    
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const user = {
      id: userId,
      username: userData.username,
      email: userData.email,
      passwordHash: await bcrypt.hash(userData.password, 10),
      role: userData.role || 'user',
      permissions: userData.permissions || ['read'],
      createdAt: new Date().toISOString(),
      lastLogin: null,
      active: true,
      ...userData
    };

    delete user.password; // Remove plain password

    this.users.set(userId, user);
    await this.saveUsers();
    
    return this.sanitizeUser(user);
  }

  async authenticateUser(username, password) {
    const user = Array.from(this.users.values())
      .find(u => u.username === username && u.active);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    this.users.set(user.id, user);
    await this.saveUsers();

    // Create session
    const sessionToken = this.generateSessionToken(user);
    
    return {
      user: this.sanitizeUser(user),
      token: sessionToken
    };
  }

  generateSessionToken(user) {
    const sessionData = {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      createdAt: new Date().toISOString()
    };

    const token = jwt.sign(sessionData, this.jwtSecret, { 
      expiresIn: '24h' 
    });

    // Store session
    this.sessions.set(token, {
      ...sessionData,
      token: token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
    
    this.saveSessions(); // Fire and forget
    
    return token;
  }

  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const session = this.sessions.get(token);
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        this.sessions.delete(token);
        this.saveSessions();
        throw new Error('Session expired');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async revokeToken(token) {
    this.sessions.delete(token);
    await this.saveSessions();
  }

  async revokeAllUserTokens(userId) {
    const userTokens = Array.from(this.sessions.entries())
      .filter(([token, session]) => session.userId === userId)
      .map(([token]) => token);
    
    for (const token of userTokens) {
      this.sessions.delete(token);
    }
    
    await this.saveSessions();
    return userTokens.length;
  }

  sanitizeUser(user) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  async updateUser(userId, updates) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = { ...user, ...updates };
    
    // Hash password if provided
    if (updates.password) {
      updatedUser.passwordHash = await bcrypt.hash(updates.password, 10);
      delete updatedUser.password;
    }

    this.users.set(userId, updatedUser);
    await this.saveUsers();
    
    return this.sanitizeUser(updatedUser);
  }

  async deleteUser(userId) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow deleting the last admin
    const adminUsers = Array.from(this.users.values())
      .filter(u => u.role === 'admin' && u.active);
    
    if (user.role === 'admin' && adminUsers.length === 1) {
      throw new Error('Cannot delete the last admin user');
    }

    this.users.delete(userId);
    await this.saveUsers();
    
    // Revoke all user tokens
    await this.revokeAllUserTokens(userId);
    
    return true;
  }

  getAllUsers() {
    return Array.from(this.users.values()).map(u => this.sanitizeUser(u));
  }

  getUser(userId) {
    const user = this.users.get(userId);
    return user ? this.sanitizeUser(user) : null;
  }

  hasPermission(user, permission) {
    if (user.permissions.includes('*')) {
      return true;
    }
    
    return user.permissions.includes(permission);
  }

  // Middleware factory
  requireAuth() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = await this.validateToken(token);
        
        req.user = decoded;
        req.token = token;
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    };
  }

  requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!this.hasPermission(req.user, permission)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  }

  // Development mode - skip auth for local development
  isDevelopmentMode() {
    return process.env.NODE_ENV === 'development' && 
           process.env.SKIP_AUTH === 'true';
  }

  optionalAuth() {
    return async (req, res, next) => {
      if (this.isDevelopmentMode()) {
        req.user = {
          userId: 'dev-user',
          username: 'developer',
          role: 'admin',
          permissions: ['*']
        };
        return next();
      }

      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded = await this.validateToken(token);
          req.user = decoded;
          req.token = token;
        }
      } catch (error) {
        // Continue without auth
      }

      next();
    };
  }

  // Session management
  getActiveSessions() {
    return Array.from(this.sessions.values())
      .filter(session => new Date() <= new Date(session.expiresAt))
      .map(session => ({
        token: session.token.substring(0, 10) + '...',
        userId: session.userId,
        username: session.username,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      }));
  }

  async cleanupExpiredSessions() {
    const now = new Date();
    let cleaned = 0;
    
    for (const [token, session] of this.sessions.entries()) {
      if (now > new Date(session.expiresAt)) {
        this.sessions.delete(token);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      await this.saveSessions();
    }
    
    return cleaned;
  }
}

module.exports = AuthManager;