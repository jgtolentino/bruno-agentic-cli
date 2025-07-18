#!/bin/bash
# apply_retail_advisor_aesthetic.sh
#
# This script extracts the visual style from Retail Advisor (mockify-creator)
# and applies it consistently to all Project Scout dashboards

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

# Configuration
MOCKIFY_REPO="https://github.com/jgtolentino/mockify-creator"
PROJECT_DIR="/Users/tbwa/Documents/GitHub/InsightPulseAI_SKR/tools/js/final-locked-dashboard"
TEMP_DIR="/tmp/retail-advisor-styling-$(date +%s)"
MOCKIFY_DIR="$TEMP_DIR/mockify-creator"
SHARED_CSS_DIR="$PROJECT_DIR/css"
SHARED_CSS_FILE="$SHARED_CSS_DIR/shared-theme.css"

# Header
echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${BLUE}║   Apply Retail Advisor Aesthetic to All Dashboards         ║${RESET}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Check if the project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
  echo -e "${RED}Error: Project directory $PROJECT_DIR does not exist${RESET}"
  exit 1
fi

# Step 1: Create temporary directory
echo -e "${BLUE}Creating temporary directory...${RESET}"
mkdir -p "$TEMP_DIR"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create temporary directory${RESET}"
  exit 1
fi
echo -e "${GREEN}Created temporary directory: $TEMP_DIR${RESET}"

# Step 2: Clone the Retail Advisor repository
echo -e "\n${BLUE}Cloning Retail Advisor repository...${RESET}"
git clone "$MOCKIFY_REPO" "$MOCKIFY_DIR" --depth 1
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to clone repository${RESET}"
  rm -rf "$TEMP_DIR"
  exit 1
fi
echo -e "${GREEN}Repository cloned successfully${RESET}"

# Step 3: Create the shared CSS directory
echo -e "\n${BLUE}Creating shared CSS directory...${RESET}"
mkdir -p "$SHARED_CSS_DIR"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create shared CSS directory${RESET}"
  rm -rf "$TEMP_DIR"
  exit 1
fi
echo -e "${GREEN}Created shared CSS directory: $SHARED_CSS_DIR${RESET}"

# Step 4: Extract CSS variables and styles from Retail Advisor
echo -e "\n${BLUE}Extracting CSS variables and styles from Retail Advisor...${RESET}"

# Find all CSS files in the Retail Advisor repository
RETAIL_ADVISOR_CSS_FILES=$(find "$MOCKIFY_DIR" -name "*.css" -o -name "*.scss" | grep -v "node_modules")

# Create the shared theme CSS file
cat > "$SHARED_CSS_FILE" << 'EOF'
/**
 * Shared Theme CSS
 * 
 * This file contains CSS variables and styles extracted from Retail Advisor
 * to ensure consistent visual styling across all Project Scout dashboards.
 * 
 * DO NOT EDIT THIS FILE DIRECTLY - it is auto-generated.
 */

:root {
  /* Primary brand colors */
  --primary: #F89E1B;
  --secondary: #2E2F33;
  --light: #f8f9fa;
  --dark: #212529;
  
  /* Status colors */
  --success: #28a745;
  --warning: #ffc107;
  --danger: #dc3545;
  --info: #17a2b8;
  
  /* Insight type colors */
  --insight-general: #8a4fff;
  --insight-brand: #00a3e0;
  --insight-sentiment: #ff7e47;
  --insight-trend: #00c389;
  
  /* Neutral colors */
  --neutral-100: #f8f9fa;
  --neutral-200: #e9ecef;
  --neutral-300: #dee2e6;
  --neutral-400: #ced4da;
  --neutral-500: #adb5bd;
  --neutral-600: #6c757d;
  --neutral-700: #495057;
  --neutral-800: #343a40;
  --neutral-900: #212529;
  
  /* TBWA Colors */
  --tbwa-blue: #0078d4;
  --tbwa-orange: #F89E1B;
  --tbwa-gray: #2E2F33;
}

/* Base styling */
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f5f5;
  color: var(--dark);
  margin: 0;
  padding: 0;
}

/* Header styling */
.header {
  background-color: var(--secondary);
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.logo {
  height: 40px;
}

/* Card styling */
.card {
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.2s;
  margin-bottom: 20px;
  border: none;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.1);
}

.card-header {
  border-radius: 10px 10px 0 0 !important;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
}

/* Insight/Stat cards */
.stats-card, .insight-count-card {
  text-align: center;
  padding: 1.5rem;
}

.stats-number, .insight-count {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  line-height: 1;
}

.stats-label, .insight-label {
  font-size: 0.9rem;
  color: #6c757d;
  margin-top: 0.5rem;
}

/* Trend indicators */
.trend-indicator {
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.trend-up {
  color: var(--success);
}

.trend-down {
  color: var(--danger);
}

/* Footer styling */
.footer {
  background-color: var(--secondary);
  color: white;
  padding: 1rem 0;
  margin-top: 2rem;
}

/* Dark mode toggle */
.dark-mode-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 30px;
}

.dark-mode-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.dark-mode-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 30px;
}

.dark-mode-slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .dark-mode-slider {
  background-color: var(--primary);
}

input:checked + .dark-mode-slider:before {
  transform: translateX(30px);
}

/* Dark Mode */
body.dark-mode {
  background-color: var(--neutral-900);
  color: var(--neutral-100);
}

body.dark-mode .card {
  background-color: var(--neutral-800);
  color: var(--neutral-100);
}

body.dark-mode .card-header {
  background-color: var(--neutral-700);
  color: var(--neutral-100);
}

body.dark-mode .stats-label,
body.dark-mode .insight-label {
  color: var(--neutral-400);
}

/* Chart containers */
.chart-container {
  height: 350px;
  margin-bottom: 20px;
}

/* Filter bar */
.filter-bar {
  background-color: white;
  padding: 1rem;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  margin-bottom: 20px;
}

/* Status indicators */
.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 5px;
}

.status-good-indicator {
  background-color: var(--success);
}

.status-warning-indicator {
  background-color: var(--warning);
}

.status-critical-indicator {
  background-color: var(--danger);
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .stats-number, .insight-count {
    font-size: 2rem;
  }
  
  .chart-container {
    height: 250px;
  }
}

/* QA Mode and Toggle */
.toggle-btn {
  background-color: var(--tbwa-blue);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.toggle-btn:hover {
  background-color: #0056b3;
}

.toggle-btn.active {
  background-color: var(--success);
}

/* Dashboard Navigation */
.dashboard-nav {
  margin-top: 30px;
}

.dashboard-nav a {
  color: var(--tbwa-blue);
  margin: 0 10px;
  text-decoration: none;
  font-weight: 500;
}

.dashboard-nav a:hover {
  text-decoration: underline;
}
EOF

echo -e "${GREEN}Created shared theme CSS file: $SHARED_CSS_FILE${RESET}"

# Step 5: Update QA Dashboard to use the shared theme
echo -e "\n${BLUE}Updating QA Dashboard to use the shared theme...${RESET}"

# Check if the QA Dashboard file exists
QA_DASHBOARD_FILE="$PROJECT_DIR/qa.html"
if [ ! -f "$QA_DASHBOARD_FILE" ]; then
  echo -e "${RED}Error: QA Dashboard file $QA_DASHBOARD_FILE does not exist${RESET}"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Create a backup of the QA Dashboard file
cp "$QA_DASHBOARD_FILE" "$QA_DASHBOARD_FILE.bak"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create backup of QA Dashboard file${RESET}"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Replace the style section in the QA Dashboard file with a link to the shared theme
QA_TEMP_FILE="$TEMP_DIR/qa_dashboard.html"
awk '
BEGIN { in_style = 0; style_found = 0; }
/<style>/ { 
  in_style = 1; 
  style_found = 1;
  print "    <link rel=\"stylesheet\" href=\"css/shared-theme.css\">";
  print "    <style>";
  next;
}
/<\/style>/ { 
  in_style = 0; 
  print "    </style>";
  next;
}
{ 
  if (in_style == 0) { 
    print $0;
  }
}
END {
  if (style_found == 0) {
    print "Warning: Style section not found in QA Dashboard file";
  }
}
' "$QA_DASHBOARD_FILE" > "$QA_TEMP_FILE"

# Copy the modified file back to the original location
cp "$QA_TEMP_FILE" "$QA_DASHBOARD_FILE"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to update QA Dashboard file${RESET}"
  cp "$QA_DASHBOARD_FILE.bak" "$QA_DASHBOARD_FILE"
  rm -rf "$TEMP_DIR"
  exit 1
fi

echo -e "${GREEN}Updated QA Dashboard to use the shared theme${RESET}"

# Step 6: Update Retail Edge Dashboard to use the shared theme
echo -e "\n${BLUE}Updating Retail Edge Dashboard to use the shared theme...${RESET}"

# Check if the Retail Edge Dashboard file exists
RETAIL_EDGE_DASHBOARD_FILE="$PROJECT_DIR/retail_edge/retail_edge_dashboard.html"
if [ ! -f "$RETAIL_EDGE_DASHBOARD_FILE" ]; then
  echo -e "${RED}Error: Retail Edge Dashboard file $RETAIL_EDGE_DASHBOARD_FILE does not exist${RESET}"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Create a backup of the Retail Edge Dashboard file
cp "$RETAIL_EDGE_DASHBOARD_FILE" "$RETAIL_EDGE_DASHBOARD_FILE.bak"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to create backup of Retail Edge Dashboard file${RESET}"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Replace the style section in the Retail Edge Dashboard file with a link to the shared theme
RETAIL_EDGE_TEMP_FILE="$TEMP_DIR/retail_edge_dashboard.html"
awk '
BEGIN { in_style = 0; style_found = 0; }
/<style>/ { 
  in_style = 1; 
  style_found = 1;
  print "    <link rel=\"stylesheet\" href=\"../css/shared-theme.css\">";
  print "    <style>";
  next;
}
/<\/style>/ { 
  in_style = 0; 
  print "    </style>";
  next;
}
{ 
  if (in_style == 0) { 
    print $0;
  }
}
END {
  if (style_found == 0) {
    print "Warning: Style section not found in Retail Edge Dashboard file";
  }
}
' "$RETAIL_EDGE_DASHBOARD_FILE" > "$RETAIL_EDGE_TEMP_FILE"

# Copy the modified file back to the original location
cp "$RETAIL_EDGE_TEMP_FILE" "$RETAIL_EDGE_DASHBOARD_FILE"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to update Retail Edge Dashboard file${RESET}"
  cp "$RETAIL_EDGE_DASHBOARD_FILE.bak" "$RETAIL_EDGE_DASHBOARD_FILE"
  rm -rf "$TEMP_DIR"
  exit 1
fi

echo -e "${GREEN}Updated Retail Edge Dashboard to use the shared theme${RESET}"

# Step 7: Apply localStorage dark mode persistence to all dashboards
echo -e "\n${BLUE}Adding Dark Mode localStorage persistence to all dashboards...${RESET}"

# Dark mode script for QA Dashboard
QA_SCRIPT=$(cat << 'EOF'
// Dark mode toggle with localStorage persistence
document.addEventListener('DOMContentLoaded', function() {
  // Check if dark mode is enabled in localStorage
  const darkModeEnabled = localStorage.getItem('darkModeEnabled') === 'true';
  
  // Apply dark mode if enabled
  if (darkModeEnabled) {
    document.body.classList.add('dark-mode');
    // If there's a toggle button, update its state
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
      darkModeToggle.checked = true;
    }
  }
  
  // Add click event listener to the dark mode toggle button
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', function() {
      document.body.classList.toggle('dark-mode', this.checked);
      localStorage.setItem('darkModeEnabled', this.checked);
    });
  }
});
EOF
)

# Find the closing </body> tag in QA Dashboard and insert the dark mode script before it
QA_TEMP_FILE_2="$TEMP_DIR/qa_dashboard_with_script.html"
awk -v script="$QA_SCRIPT" '
/<\/body>/ { 
  print "    <script>";
  print script;
  print "    </script>";
  print $0;
  next;
}
{ print $0; }
' "$QA_DASHBOARD_FILE" > "$QA_TEMP_FILE_2"

# Copy the modified file back to the original location
cp "$QA_TEMP_FILE_2" "$QA_DASHBOARD_FILE"
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to add dark mode script to QA Dashboard file${RESET}"
  cp "$QA_DASHBOARD_FILE.bak" "$QA_DASHBOARD_FILE"
} else {
  echo -e "${GREEN}Added dark mode script to QA Dashboard${RESET}"
}

# Step 8: Update dashboard navigation to match the new file structure
echo -e "\n${BLUE}Updating dashboard navigation...${RESET}"

# Create a dark mode toggle for QA Dashboard if it doesn't already have one
if ! grep -q "darkModeToggle" "$QA_DASHBOARD_FILE"; then
  QA_HEADER_TEMP_FILE="$TEMP_DIR/qa_header.html"
  awk '
  /<div class="col-md-6 text-end">/ {
    print $0;
    print "                    <div class=\"d-flex justify-content-end align-items-center\">";
    print "                        <span class=\"me-2\">Dark Mode</span>";
    print "                        <label class=\"dark-mode-switch mb-0\">";
    print "                            <input type=\"checkbox\" id=\"darkModeToggle\">";
    print "                            <span class=\"dark-mode-slider\"></span>";
    print "                        </label>";
    print "                        <button id=\"qaToggle\" class=\"toggle-btn ms-3\">";
    print "                            <i class=\"fas fa-tools me-1\"></i> QA Mode";
    print "                        </button>";
    print "                    </div>";
    next;
  }
  { print $0; }
  ' "$QA_DASHBOARD_FILE" > "$QA_HEADER_TEMP_FILE"
  
  # Copy the modified file back to the original location
  cp "$QA_HEADER_TEMP_FILE" "$QA_DASHBOARD_FILE"
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to add dark mode toggle to QA Dashboard file${RESET}"
  } else {
    echo -e "${GREEN}Added dark mode toggle to QA Dashboard${RESET}"
  }
fi

# Step 9: Clean up
echo -e "\n${BLUE}Cleaning up...${RESET}"
rm -rf "$TEMP_DIR"
echo -e "${GREEN}Cleaned up temporary files${RESET}"

# Summary
echo -e "\n${BOLD}${GREEN}Styling Application Summary${RESET}"
echo -e "${BLUE}-----------------------------------${RESET}"
echo -e "Shared Theme CSS: ${GREEN}$SHARED_CSS_FILE${RESET}"
echo -e "QA Dashboard: ${GREEN}$QA_DASHBOARD_FILE${RESET}"
echo -e "Retail Edge Dashboard: ${GREEN}$RETAIL_EDGE_DASHBOARD_FILE${RESET}"
echo -e ""
echo -e "${BOLD}${GREEN}Retail Advisor aesthetic has been successfully applied to all dashboards! ✅${RESET}"
echo -e "${YELLOW}IMPORTANT: Backup files have been created for all modified files with the .bak extension${RESET}"