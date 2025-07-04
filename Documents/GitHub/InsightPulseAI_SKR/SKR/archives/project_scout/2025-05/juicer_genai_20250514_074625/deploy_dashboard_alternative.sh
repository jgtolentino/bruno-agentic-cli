#!/bin/bash
# deploy_dashboard_alternative.sh - Deploy dashboard to Static Web App for Juicer GenAI Insights using alternative method

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

# Configuration
RESOURCE_GROUP="RG-TBWA-ProjectScout-Juicer"
STATIC_WEB_APP_NAME="tbwa-juicer-insights-dashboard"
KEYVAULT_NAME="kv-tbwa-juicer-insights2"
DASHBOARD_SRC_DIR="/Users/tbwa/Documents/GitHub/InsightPulseAI_SKR/tools/js/juicer-stack/dashboards"
TEMP_DEPLOY_DIR="/tmp/juicer-dashboard-deploy"

# Header
echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${BLUE}║  Static Web App Dashboard Deployment for Juicer Insights   ║${RESET}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Check for Azure CLI
if ! command -v az &> /dev/null; then
  echo -e "${RED}Error: Azure CLI is not installed${RESET}"
  echo "Please install the Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
  exit 1
fi

# Check Azure CLI login
echo -e "${BLUE}Checking Azure CLI login...${RESET}"
ACCOUNT=$(az account show --query name -o tsv 2>/dev/null)
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}Not logged in to Azure CLI. Please log in:${RESET}"
  az login
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to log in to Azure CLI${RESET}"
    exit 1
  fi
fi
ACCOUNT=$(az account show --query name -o tsv)
echo -e "${GREEN}Logged in as: ${ACCOUNT}${RESET}"

# Prepare deployment directory
echo -e "\n${BLUE}Preparing deployment directory...${RESET}"
mkdir -p "${TEMP_DEPLOY_DIR}"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create temporary deployment directory${RESET}"
  exit 1
fi

# Check if dashboard source directory exists
if [ ! -d "${DASHBOARD_SRC_DIR}" ]; then
  echo -e "${RED}Dashboard source directory not found: ${DASHBOARD_SRC_DIR}${RESET}"
  exit 1
fi

# Copy dashboard files to deployment directory
echo -e "${BLUE}Copying dashboard files...${RESET}"
cp -r "${DASHBOARD_SRC_DIR}"/* "${TEMP_DEPLOY_DIR}/"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to copy dashboard files${RESET}"
  exit 1
fi
echo -e "${GREEN}Dashboard files copied successfully${RESET}"

# Create simple index.html if it doesn't exist
if [ ! -f "${TEMP_DEPLOY_DIR}/index.html" ]; then
  echo -e "${YELLOW}Creating simple index.html file...${RESET}"
  cat > "${TEMP_DEPLOY_DIR}/index.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Juicer GenAI Insights Dashboard</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            text-align: center; 
        }
        h1 { color: #002b49; }
        .dashboard-links {
            display: flex;
            flex-direction: column;
            max-width: 600px;
            margin: 30px auto;
        }
        .dashboard-link {
            margin: 10px 0;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
            text-decoration: none;
            color: #333;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        .dashboard-link:hover {
            background-color: #e0e0e0;
        }
    </style>
</head>
<body>
    <h1>Juicer GenAI Insights Dashboard</h1>
    <p>Access the available dashboards below:</p>
    
    <div class="dashboard-links">
        <a class="dashboard-link" href="insights_dashboard.html">Insights Dashboard</a>
        <a class="dashboard-link" href="agent_brand_heatmap.dbviz">Agent Brand Heatmap</a>
        <a class="dashboard-link" href="juicer_dash_shell.html">Juicer Dashboard Shell</a>
    </div>
</body>
</html>
EOF
  echo -e "${GREEN}Created index.html file${RESET}"
fi

# Get Static Web App URL
echo -e "\n${BLUE}Getting Static Web App URL...${RESET}"
STATIC_WEB_APP_URL=$(az staticwebapp show \
  --name "${STATIC_WEB_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query "defaultHostname" -o tsv)
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to get Static Web App URL${RESET}"
else
  echo -e "${GREEN}Static Web App URL: https://${STATIC_WEB_APP_URL}${RESET}"
fi

# Instead of direct deployment, use the GitHub workflow
echo -e "\n${BLUE}Setting up for GitHub Action-based deployment...${RESET}"
echo -e "${YELLOW}IMPORTANT: To complete the deployment, commit these files and use the GitHub workflow:${RESET}"
echo -e "${YELLOW}1. Commit the dashboard files to the repository${RESET}"
echo -e "${YELLOW}2. Push to GitHub${RESET}"
echo -e "${YELLOW}3. Run the GitHub Action 'deploy-insights.yml' to deploy to the Static Web App${RESET}"

# Show instructions for manual deployment
echo -e "\n${BLUE}Alternate manual deployment steps:${RESET}"
echo -e "1. Go to the Azure Portal: https://portal.azure.com"
echo -e "2. Navigate to the Static Web App: ${STATIC_WEB_APP_NAME}"
echo -e "3. Click on 'GitHub Actions' or 'Deployment'"
echo -e "4. Follow the instructions to connect your GitHub repository"
echo -e "5. Add the deploy-insights.yml workflow file to your repository"

# Summary
echo -e "\n${BLUE}${BOLD}Dashboard Deployment Preparation Summary${RESET}"
echo -e "-----------------------------------"
echo -e "Static Web App: ${GREEN}${STATIC_WEB_APP_NAME}${RESET}"
echo -e "Dashboard URL: ${GREEN}https://${STATIC_WEB_APP_URL}${RESET}"
echo -e "Dashboard files: ${GREEN}${TEMP_DEPLOY_DIR}${RESET}"
echo -e "GitHub workflow: ${GREEN}github_workflows/deploy-insights.yml${RESET}"

echo -e "\n${GREEN}Dashboard deployment preparation complete!${RESET}"
echo -e "${YELLOW}Note: The actual deployment requires GitHub Actions or manual Azure Portal steps.${RESET}"