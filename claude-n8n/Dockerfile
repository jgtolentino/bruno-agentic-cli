FROM node:18-alpine

# Install dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S claude && \
    adduser -S claude -u 1001 -G claude

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/data/workflows \
    /app/data/executions \
    /app/data/credentials \
    /app/data/logs \
    /app/data/temp \
    /home/claude/sync && \
    chown -R claude:claude /app /home/claude

# Create Claude sync files
RUN touch /home/claude/sync/claude-output.txt \
    /home/claude/sync/claude-input.md \
    /home/claude/sync/claude-suggestions.json && \
    chown claude:claude /home/claude/sync/*

# Switch to non-root user
USER claude

# Expose port
EXPOSE 5678

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5678/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["node", "server.js"]