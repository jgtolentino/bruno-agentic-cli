#!/bin/bash
# load_insights_to_db.sh - Script to load AI insights into the database
# This script takes SQL files generated by fabricate_ai_insights.py and loads them into the database

set -e

# Configuration
LOG_DIR="logs"
OUTPUT_DIR="output"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/db_load_${TIMESTAMP}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log function
log() {
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" | tee -a "$LOG_FILE"
}

# Check if Databricks CLI is installed
if ! command -v databricks &> /dev/null; then
  log "ERROR: databricks CLI is not installed. Please install it first."
  exit 1
fi

# Check if required environment variables are set
if [ -z "$DATABRICKS_HOST" ] || [ -z "$DATABRICKS_TOKEN" ]; then
  log "ERROR: Required environment variables DATABRICKS_HOST and DATABRICKS_TOKEN are not set."
  exit 1
fi

log "Starting AI insights database load process"

# Find the most recent SQL file
LATEST_SQL_FILE=$(find "$OUTPUT_DIR" -name "ai_insights_*.sql" -type f -printf "%T@ %p\n" | sort -nr | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST_SQL_FILE" ]; then
  log "ERROR: No SQL files found in ${OUTPUT_DIR}"
  exit 1
fi

log "Found SQL file: ${LATEST_SQL_FILE}"

# Extract the SQL commands and execute them
log "Executing SQL commands..."

# Option 1: Using Databricks CLI
# databricks sql query --file "$LATEST_SQL_FILE" > /dev/null 2>&1
# if [ $? -eq 0 ]; then
#   log "SQL execution completed successfully"
# else
#   log "ERROR: SQL execution failed"
#   exit 1
# fi

# Option 2: Using Databricks SQL Connector (preferred for production)
python - <<EOF >> "$LOG_FILE" 2>&1
import os
import sys
import time
import logging
from databricks import sql

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("db_loader")

def execute_sql_file(file_path):
    """Execute SQL file on Databricks SQL warehouse."""
    connection = None
    try:
        # Read SQL file
        with open(file_path, 'r') as f:
            sql_content = f.read()

        # Connect to Databricks SQL
        connection = sql.connect(
            server_hostname=os.environ["DATABRICKS_HOST"],
            http_path=os.environ["DATABRICKS_HTTP_PATH"],
            access_token=os.environ["DATABRICKS_TOKEN"]
        )
        
        cursor = connection.cursor()
        
        # Split SQL content by GO statements if present
        sql_commands = sql_content.split("GO")
        if len(sql_commands) == 1:
            # Try splitting by semicolon if no GO statements
            sql_commands = sql_content.split(";")
        
        # Execute each SQL command
        success_count = 0
        for i, cmd in enumerate(sql_commands):
            cmd = cmd.strip()
            if cmd:
                try:
                    cursor.execute(cmd)
                    success_count += 1
                except Exception as e:
                    logger.error(f"Error executing SQL command {i+1}: {e}")
                    logger.error(f"Command was: {cmd[:100]}...")
        
        logger.info(f"Executed {success_count} out of {len(sql_commands)} SQL commands")
        return success_count > 0
        
    except Exception as e:
        logger.error(f"Error: {e}")
        return False
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    if execute_sql_file("${LATEST_SQL_FILE}"):
        logger.info("SQL execution completed successfully")
        sys.exit(0)
    else:
        logger.error("SQL execution failed")
        sys.exit(1)
EOF

if [ $? -eq 0 ]; then
  log "SQL execution completed successfully"
else
  log "ERROR: SQL execution failed"
  exit 1
fi

# Update last run timestamp
echo "$TIMESTAMP" > "${OUTPUT_DIR}/last_db_load.txt"

log "AI insights database load process completed"

exit 0