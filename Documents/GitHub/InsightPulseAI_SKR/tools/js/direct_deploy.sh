#!/bin/bash
# Direct deployment of a simple HTML page to the Azure Static Web App
# To fix the empty page issue

set -e

echo "🚀 Direct deployment to fix empty page issue"
echo "=========================================="

# Configuration
RESOURCE_GROUP="RG-TBWA-ProjectScout-Juicer"
APP_NAME="tbwa-juicer-insights-dashboard"
DEPLOY_DIR="direct-deploy"

# Clean up any previous attempts
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo "1️⃣ Creating simple working dashboard..."

# Create a simple dashboard page that definitely works
cat > "$DEPLOY_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mockify Dashboard</title>
    <style>
        :root {
            --primary: #9333EA;
            --primary-light: #F3E8FF;
            --secondary: #6B21A8;
            --bg: #F9FAFB;
            --card: #FFFFFF;
            --text: #111827;
            --text-muted: #6B7280;
            --border: #E5E7EB;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        body {
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }
        
        .title {
            font-size: 24px;
            font-weight: 600;
            color: var(--primary);
        }
        
        .subtitle {
            font-size: 16px;
            color: var(--text-muted);
            margin-bottom: 20px;
        }
        
        .card {
            background-color: var(--card);
            border-radius: 8px;
            border: 1px solid var(--border);
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .card-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--primary);
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .grid-item {
            background-color: var(--card);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--border);
            display: flex;
            flex-direction: column;
        }
        
        .metric {
            font-size: 32px;
            font-weight: 700;
            margin: 10px 0;
            color: var(--primary);
        }
        
        .metric-label {
            font-size: 14px;
            color: var(--text-muted);
        }
        
        .metric-description {
            font-size: 14px;
            color: var(--text-muted);
            margin-top: auto;
            padding-top: 10px;
        }
        
        .footer {
            text-align: center;
            color: var(--text-muted);
            font-size: 14px;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Mockify Dashboard</h1>
            <div>
                <div id="date" style="color: var(--text-muted); font-size: 14px;"></div>
            </div>
        </div>
        
        <p class="subtitle">Your design-to-dashboard solution with simulated retail insights.</p>
        
        <div class="card">
            <h2 class="card-title">Overview</h2>
            <p>This dashboard represents a minimal deployment of the mockify-creator codebase. It shows key performance metrics for retail operations and brand performance.</p>
        </div>
        
        <div class="grid">
            <div class="grid-item">
                <div class="metric-label">Brand Score</div>
                <div class="metric">84/100</div>
                <div class="metric-description">Brand performance across all channels</div>
            </div>
            
            <div class="grid-item">
                <div class="metric-label">Market Share</div>
                <div class="metric">27.5%</div>
                <div class="metric-description">Percentage of total market for category</div>
            </div>
            
            <div class="grid-item">
                <div class="metric-label">Revenue</div>
                <div class="metric">$1.4M</div>
                <div class="metric-description">Total revenue in current quarter</div>
            </div>
            
            <div class="grid-item">
                <div class="metric-label">Customer Satisfaction</div>
                <div class="metric">4.8/5</div>
                <div class="metric-description">Average rating across all touchpoints</div>
            </div>
        </div>
        
        <div class="card">
            <h2 class="card-title">AI Insights</h2>
            <ul style="padding-left: 20px;">
                <li>Brand sentiment is trending positive in urban markets (+12% MoM)</li>
                <li>Competitor analysis shows market share vulnerability in mid-tier segments</li>
                <li>Customer retention has improved following loyalty program update</li>
                <li>Social media engagement increased 23% with sustainability campaign</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>© 2025 Mockify Platform | Powered by InsightPulseAI</p>
        </div>
    </div>
    
    <script>
        // Set current date
        const dateElement = document.getElementById('date');
        const now = new Date();
        dateElement.textContent = 'Data as of: ' + now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    </script>
</body>
</html>
EOF

# Create a proper routes configuration
cat > "$DEPLOY_DIR/staticwebapp.config.json" << 'EOF'
{
  "routes": [
    {
      "route": "/*",
      "serve": "/index.html"
    }
  ]
}
EOF

echo "2️⃣ Getting deployment token..."
DEPLOY_TOKEN=$(az staticwebapp secrets list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.apiKey" -o tsv)

echo "3️⃣ Deploying to Azure Static Web App..."
swa deploy "$DEPLOY_DIR" \
  --deployment-token "$DEPLOY_TOKEN" \
  --app-name "$APP_NAME" \
  --env production

echo "✅ Direct deployment complete!"
echo "🌐 Dashboard URL: https://$(az staticwebapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "defaultHostname" -o tsv)"