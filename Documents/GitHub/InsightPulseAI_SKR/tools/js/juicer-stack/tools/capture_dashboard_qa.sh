#!/bin/bash
# Quick dashboard screenshot capture for QA purposes
# Usage: ./capture_dashboard_qa.sh [url] [output-path]

# Set default values
URL=${1:-"http://localhost:3000/insights_dashboard.html"}
OUTPUT=${2:-"$(date +%Y%m%d_%H%M%S)_dashboard_qa.png"}
DOCS_DIR="../docs/images"

# Ensure docs directory exists
mkdir -p "$DOCS_DIR"

# Install dependencies if needed
if ! npm list puppeteer >/dev/null 2>&1; then
  echo "Installing puppeteer..."
  npm install --no-save puppeteer
fi

# Check if we need to start our own server
if [[ "$URL" == *"localhost:3000"* ]]; then
  # Find dashboard HTML file
  DASHBOARD_FILE="../dashboards/insights_dashboard.html"
  if [ ! -f "$DASHBOARD_FILE" ]; then
    echo "Looking for dashboard file..."
    DASHBOARD_FILE=$(find ../../ -name "insights_dashboard.html" | head -1)
    if [ -z "$DASHBOARD_FILE" ]; then
      echo "Could not find insights_dashboard.html"
      exit 1
    fi
  fi

  DASHBOARD_DIR=$(dirname "$DASHBOARD_FILE")
  echo "Found dashboard at $DASHBOARD_DIR"

  # Run the server
  echo "Starting server in $DASHBOARD_DIR..."
  cd "$DASHBOARD_DIR" || exit 1
  npx serve . -p 3000 &
  SERVER_PID=$!

  # Return to original directory
  cd - > /dev/null || exit 1

  # Give the server a moment to start
  echo "Waiting for server to start..."
  sleep 5
else
  SERVER_PID=""
fi

echo "Capturing screenshot..."
node qa_screenshot.js "$URL" "$DOCS_DIR/$OUTPUT"
RESULT=$?

# Kill the server if we started one
if [ -n "$SERVER_PID" ]; then
  echo "Stopping server..."
  kill $SERVER_PID 2>/dev/null
fi

# Generate thumbnail if successful
if [ $RESULT -eq 0 ]; then
  echo "Screenshot saved to $DOCS_DIR/$OUTPUT"
  
  # Generate thumbnail
  THUMB_DIR="$DOCS_DIR/thumbnails"
  mkdir -p "$THUMB_DIR"
  THUMB_NAME="${OUTPUT%.*}_thumb.png"
  
  # Use ImageMagick if available
  if command -v convert >/dev/null 2>&1; then
    convert "$DOCS_DIR/$OUTPUT" -resize 300x -quality 90 "$THUMB_DIR/$THUMB_NAME"
    echo "Thumbnail saved to $THUMB_DIR/$THUMB_NAME"
  else
    echo "ImageMagick not found. Thumbnail not created."
  fi
  
  echo "✅ QA screenshot capture complete"
else
  echo "❌ Error capturing screenshot"
fi