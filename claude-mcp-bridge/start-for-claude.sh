#!/bin/bash
# Claude.ai Integration Launcher

echo "🚀 Starting Claude MCP Bridge for Claude.ai Integration..."

# Kill any existing processes
pkill -f "node src/server.js" 2>/dev/null
pkill -f "ngrok http" 2>/dev/null

# Start the server
echo "📡 Starting MCP Bridge server..."
cd /Users/tbwa/Documents/GitHub/bruno-agentic-cli/claude-mcp-bridge
node src/server.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test server
if curl -s http://localhost:3002/health > /dev/null; then
    echo "✅ Server running on localhost:3002"
else
    echo "❌ Server failed to start"
    exit 1
fi

# Start ngrok tunnel
echo "🌐 Starting ngrok tunnel..."
ngrok http 3002 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 5

# Get tunnel URL
TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data['tunnels']:
        print(data['tunnels'][0]['public_url'])
    else:
        print('No tunnels found')
except:
    print('Error getting tunnel URL')
" 2>/dev/null)

if [[ $TUNNEL_URL == https://* ]]; then
    echo "🎉 SUCCESS! Your Claude MCP Bridge is ready!"
    echo ""
    echo "🔗 Tunnel URL: $TUNNEL_URL"
    echo ""
    echo "📋 Use this in Claude.ai:"
    echo ""
    echo "POST $TUNNEL_URL/api/process"
    echo "Content-Type: application/json"
    echo ""
    echo '{'
    echo '  "service": "asana",'
    echo '  "action": "createTaskBatch",'
    echo '  "data": "# Your Tasks\\n- Task 1\\n- Task 2"'
    echo '}'
    echo ""
    echo "🎯 Test endpoint: $TUNNEL_URL/health"
    echo ""
    echo "Press Ctrl+C to stop"
    
    # Keep running
    wait
else
    echo "❌ Failed to get tunnel URL. Try running manually:"
    echo "1. node src/server.js &"
    echo "2. ngrok http 3002"
    kill $SERVER_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
fi