#!/bin/bash

# Bruno VS Code Extension Build Script

set -e

echo "🚀 Building Bruno VS Code Extension v3.1.0"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in vscode-bruno directory${NC}"
    exit 1
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Install vsce if not already installed
if ! command -v vsce &> /dev/null; then
    echo -e "${BLUE}📦 Installing vsce...${NC}"
    npm install -g @vscode/vsce
fi

# Create a simple PNG icon if ImageMagick is available
if command -v convert &> /dev/null; then
    echo -e "${BLUE}🎨 Creating PNG icon...${NC}"
    convert -background none -size 128x128 \
        -fill '#1E1E1E' -draw 'roundrectangle 0,0 128,128 24,24' \
        -fill '#0066CC' -draw 'circle 64,64 64,16' \
        -fill white -font Arial -pointsize 64 -gravity center \
        -annotate +0+0 'B' \
        media/bruno-icon.png 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Could not create PNG icon, using SVG only${NC}"
    }
else
    # Create a simple placeholder PNG using base64
    echo -e "${BLUE}🎨 Creating placeholder PNG icon...${NC}"
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 -d > media/bruno-icon.png
fi

# Package the extension
echo -e "${BLUE}📦 Packaging extension...${NC}"
vsce package --no-dependencies

# Check if packaging succeeded
if [ -f "bruno-vscode-3.1.0.vsix" ]; then
    echo -e "${GREEN}✅ Extension packaged successfully!${NC}"
    echo ""
    echo -e "${BLUE}📝 Extension details:${NC}"
    echo "  Name: bruno-vscode-3.1.0.vsix"
    echo "  Size: $(ls -lh bruno-vscode-3.1.0.vsix | awk '{print $5}')"
    echo ""
    echo -e "${BLUE}🚀 Installation instructions:${NC}"
    echo "  1. Install locally:"
    echo "     code --install-extension bruno-vscode-3.1.0.vsix"
    echo ""
    echo "  2. Or install from VS Code:"
    echo "     - Open VS Code"
    echo "     - Go to Extensions (Cmd+Shift+X)"
    echo "     - Click '...' menu → 'Install from VSIX...'"
    echo "     - Select bruno-vscode-3.1.0.vsix"
    echo ""
    echo -e "${BLUE}⚙️ Prerequisites:${NC}"
    echo "  - Ollama must be running: ollama serve"
    echo "  - DeepSeek model installed: ollama pull deepseek-coder:6.7b"
    echo ""
    echo -e "${GREEN}🎉 Bruno VS Code Extension is ready to use!${NC}"
else
    echo -e "${RED}❌ Failed to package extension${NC}"
    exit 1
fi