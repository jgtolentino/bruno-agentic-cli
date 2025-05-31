#!/bin/bash

# Bruno Orchestration Architecture Test Runner
# Comprehensive testing script for the three-agent model

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_TIMEOUT=300  # 5 minutes default timeout
PARALLEL_TESTS=false
CLEANUP_ON_EXIT=true

# Default test selection
RUN_MCP_TESTS=true
RUN_BRUNO_TESTS=true
RUN_GDOCS_TESTS=true
RUN_ASANA_TESTS=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --help|-h)
      cat << EOF
Usage: $0 [options]

Test Selection:
  --mcp-only           Run only MCP Bridge tests
  --bruno-only         Run only Bruno Executor tests
  --gdocs-only         Run only Google Docs integration tests
  --asana-only         Run only Asana integration tests
  --skip-mcp           Skip MCP Bridge tests
  --skip-bruno         Skip Bruno Executor tests
  --skip-gdocs         Skip Google Docs tests
  --skip-asana         Skip Asana tests

Options:
  --parallel           Run test suites in parallel
  --timeout SECONDS    Set test timeout (default: 300)
  --no-cleanup         Don't cleanup test resources on exit
  --debug              Enable debug output
  --report-only        Generate reports from existing results
  --setup-only         Only run setup checks, don't run tests
  --quick              Run quick smoke tests only

Environment:
  ASANA_ACCESS_TOKEN   Asana API token
  GOOGLE_CREDENTIALS_PATH  Google service account credentials
  DEBUG               Debug logging level

Examples:
  $0                          # Run all tests
  $0 --mcp-only              # Run only MCP tests
  $0 --parallel --debug      # Run in parallel with debug output
  $0 --timeout 600           # Run with 10-minute timeout

EOF
      exit 0
      ;;
    --mcp-only)
      RUN_BRUNO_TESTS=false
      RUN_GDOCS_TESTS=false
      RUN_ASANA_TESTS=false
      shift
      ;;
    --bruno-only)
      RUN_MCP_TESTS=false
      RUN_GDOCS_TESTS=false
      RUN_ASANA_TESTS=false
      shift
      ;;
    --gdocs-only)
      RUN_MCP_TESTS=false
      RUN_BRUNO_TESTS=false
      RUN_ASANA_TESTS=false
      shift
      ;;
    --asana-only)
      RUN_MCP_TESTS=false
      RUN_BRUNO_TESTS=false
      RUN_GDOCS_TESTS=false
      shift
      ;;
    --skip-mcp)
      RUN_MCP_TESTS=false
      shift
      ;;
    --skip-bruno)
      RUN_BRUNO_TESTS=false
      shift
      ;;
    --skip-gdocs)
      RUN_GDOCS_TESTS=false
      shift
      ;;
    --skip-asana)
      RUN_ASANA_TESTS=false
      shift
      ;;
    --parallel)
      PARALLEL_TESTS=true
      shift
      ;;
    --timeout)
      TEST_TIMEOUT="$2"
      shift 2
      ;;
    --no-cleanup)
      CLEANUP_ON_EXIT=false
      shift
      ;;
    --debug)
      export DEBUG="bruno:*"
      shift
      ;;
    --report-only)
      REPORT_ONLY=true
      shift
      ;;
    --setup-only)
      SETUP_ONLY=true
      shift
      ;;
    --quick)
      QUICK_TESTS=true
      TEST_TIMEOUT=60
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function
cleanup() {
  if [[ "$CLEANUP_ON_EXIT" == "true" ]]; then
    log_info "Cleaning up test resources..."
    
    # Kill any running processes
    pkill -f "mcp-bridge" 2>/dev/null || true
    pkill -f "bruno-test" 2>/dev/null || true
    
    # Clean temporary files
    rm -rf /tmp/bruno-test-* 2>/dev/null || true
    
    log_success "Cleanup completed"
  fi
}

# Set up cleanup trap
trap cleanup EXIT

# Environment check function
check_environment() {
  log_info "Checking environment..."
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
  fi
  
  local node_version=$(node --version | cut -d'v' -f2)
  local major_version=$(echo $node_version | cut -d'.' -f1)
  
  if [[ $major_version -lt 14 ]]; then
    log_error "Node.js version 14 or higher is required (found: $node_version)"
    exit 1
  fi
  
  log_success "Node.js version: $node_version"
  
  # Check npm packages
  cd "$SCRIPT_DIR"
  if [[ ! -d "node_modules" ]]; then
    log_info "Installing test dependencies..."
    npm install
  fi
  
  # Check optional environment variables
  if [[ -n "$ASANA_ACCESS_TOKEN" ]]; then
    log_success "Asana access token found"
  else
    log_warning "ASANA_ACCESS_TOKEN not set - Asana tests will be skipped"
  fi
  
  if [[ -n "$GOOGLE_CREDENTIALS_PATH" && -f "$GOOGLE_CREDENTIALS_PATH" ]]; then
    log_success "Google credentials found"
  else
    log_warning "GOOGLE_CREDENTIALS_PATH not set or file not found - Google Docs tests will be skipped"
  fi
  
  # Check port availability
  if lsof -i :3002 &>/dev/null; then
    log_warning "Port 3002 is in use - MCP Bridge tests may fail"
  fi
  
  log_success "Environment check completed"
}

# Setup function
setup_tests() {
  log_info "Setting up test environment..."
  
  # Create reports directory
  mkdir -p "$SCRIPT_DIR/reports"
  
  # Create test data directory
  mkdir -p "$SCRIPT_DIR/test-data"
  
  # Generate test configuration
  cat > "$SCRIPT_DIR/.env" << EOF
# Auto-generated test configuration
TEST_TIMEOUT=$TEST_TIMEOUT
PARALLEL_TESTS=$PARALLEL_TESTS
SCRIPT_DIR=$SCRIPT_DIR
PROJECT_ROOT=$PROJECT_ROOT
EOF
  
  log_success "Test setup completed"
}

# Individual test runner functions
run_mcp_tests() {
  if [[ "$RUN_MCP_TESTS" == "true" ]]; then
    log_info "Running MCP Bridge integration tests..."
    timeout $TEST_TIMEOUT node "$SCRIPT_DIR/test-mcp-bridge.js"
    return $?
  fi
  return 0
}

run_bruno_tests() {
  if [[ "$RUN_BRUNO_TESTS" == "true" ]]; then
    log_info "Running Bruno Executor tests..."
    timeout $TEST_TIMEOUT node "$SCRIPT_DIR/test-bruno-executor.js"
    return $?
  fi
  return 0
}

run_gdocs_tests() {
  if [[ "$RUN_GDOCS_TESTS" == "true" ]]; then
    log_info "Running Google Docs integration tests..."
    timeout $TEST_TIMEOUT node "$SCRIPT_DIR/test-google-docs-integration.js"
    return $?
  fi
  return 0
}

run_asana_tests() {
  if [[ "$RUN_ASANA_TESTS" == "true" ]]; then
    log_info "Running Asana integration tests..."
    timeout $TEST_TIMEOUT node "$SCRIPT_DIR/test-asana-integration.js"
    return $?
  fi
  return 0
}

# Main test execution function
run_tests() {
  local start_time=$(date +%s)
  local test_results=()
  local failed_tests=()
  
  log_info "Starting Bruno Orchestration Architecture tests..."
  
  if [[ "$PARALLEL_TESTS" == "true" ]]; then
    log_info "Running tests in parallel..."
    
    # Run tests in background
    local pids=()
    
    if [[ "$RUN_MCP_TESTS" == "true" ]]; then
      run_mcp_tests &
      pids+=($!)
    fi
    
    if [[ "$RUN_BRUNO_TESTS" == "true" ]]; then
      run_bruno_tests &
      pids+=($!)
    fi
    
    if [[ "$RUN_GDOCS_TESTS" == "true" ]]; then
      run_gdocs_tests &
      pids+=($!)
    fi
    
    if [[ "$RUN_ASANA_TESTS" == "true" ]]; then
      run_asana_tests &
      pids+=($!)
    fi
    
    # Wait for all tests to complete
    for pid in "${pids[@]}"; do
      if wait $pid; then
        test_results+=("PASS")
      else
        test_results+=("FAIL")
      fi
    done
    
  else
    log_info "Running tests sequentially..."
    
    # Run tests sequentially
    if ! run_mcp_tests; then
      failed_tests+=("MCP Bridge")
      test_results+=("FAIL")
    else
      test_results+=("PASS")
    fi
    
    if ! run_bruno_tests; then
      failed_tests+=("Bruno Executor")
      test_results+=("FAIL")
    else
      test_results+=("PASS")
    fi
    
    if ! run_gdocs_tests; then
      failed_tests+=("Google Docs")
      test_results+=("FAIL")
    else
      test_results+=("PASS")
    fi
    
    if ! run_asana_tests; then
      failed_tests+=("Asana")
      test_results+=("FAIL")
    else
      test_results+=("PASS")
    fi
  fi
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  # Print summary
  echo
  echo "=========================================="
  echo "🎯 TEST EXECUTION SUMMARY"
  echo "=========================================="
  echo "⏱️  Duration: ${duration}s"
  echo "📊 Results:"
  
  local passed_count=0
  local total_count=0
  
  for result in "${test_results[@]}"; do
    total_count=$((total_count + 1))
    if [[ "$result" == "PASS" ]]; then
      passed_count=$((passed_count + 1))
    fi
  done
  
  echo "   Total: $total_count"
  echo "   Passed: $passed_count"
  echo "   Failed: $((total_count - passed_count))"
  
  if [[ ${#failed_tests[@]} -eq 0 ]]; then
    log_success "All test suites passed! 🎉"
    return 0
  else
    log_error "Failed test suites: ${failed_tests[*]}"
    return 1
  fi
}

# Generate comprehensive report
generate_report() {
  log_info "Generating comprehensive test report..."
  
  if [[ -f "$SCRIPT_DIR/run-all-tests.js" ]]; then
    timeout $TEST_TIMEOUT node "$SCRIPT_DIR/run-all-tests.js"
  else
    log_warning "Comprehensive test runner not found, skipping detailed report"
  fi
}

# Main function
main() {
  echo "🧪 Bruno Orchestration Architecture Test Suite"
  echo "==============================================="
  echo
  
  # Check if we only want to generate reports
  if [[ "$REPORT_ONLY" == "true" ]]; then
    generate_report
    return $?
  fi
  
  # Run environment checks
  check_environment
  
  # Set up test environment
  setup_tests
  
  # Check if we only want to run setup
  if [[ "$SETUP_ONLY" == "true" ]]; then
    log_success "Setup completed successfully"
    return 0
  fi
  
  # Change to test directory
  cd "$SCRIPT_DIR"
  
  # Run the tests
  if run_tests; then
    log_success "All tests completed successfully"
    
    # Generate comprehensive report
    generate_report
    
    return 0
  else
    log_error "Some tests failed"
    return 1
  fi
}

# Execute main function
main "$@"