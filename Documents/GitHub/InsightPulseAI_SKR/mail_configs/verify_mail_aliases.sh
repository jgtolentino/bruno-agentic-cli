#!/bin/bash
# Email Alias Verification Script
# Author: Enrico, InsightPulseAI

# Configuration
DOMAIN="insightpulseai.com"
FROM_EMAIL="jake.tolentino@${DOMAIN}"
TEST_SUBJECT="InsightPulseAI Email Alias Verification [$(date +"%Y-%m-%d %H:%M:%S")]"
TEST_BODY="This is an automated test email sent by Enrico to verify proper routing of email aliases. If you received this message, the alias is working correctly."
LOG_FILE="/tmp/email_verification_$(date +"%Y%m%d_%H%M%S").log"

# Aliases to test
ALIASES=(
  "info@${DOMAIN}"
  "business@${DOMAIN}"
  "ceo@${DOMAIN}"
  "team@${DOMAIN}"
)

echo "InsightPulseAI Email Alias Verification" | tee -a "${LOG_FILE}"
echo "Started at: $(date)" | tee -a "${LOG_FILE}"
echo "----------------------------------------" | tee -a "${LOG_FILE}"

for alias in "${ALIASES[@]}"; do
  echo "Testing alias: ${alias}" | tee -a "${LOG_FILE}"
  
  # Using mail command available on macOS (without -r flag)
  echo "${TEST_BODY}" | mail -s "${TEST_SUBJECT} - ${alias}" "${alias}"
  
  if [ $? -eq 0 ]; then
    echo "✓ Test email sent to ${alias}" | tee -a "${LOG_FILE}"
  else
    echo "✗ Failed to send test email to ${alias}" | tee -a "${LOG_FILE}"
  fi
  
  sleep 2
done