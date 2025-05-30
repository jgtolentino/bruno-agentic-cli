# Bruno E2E Test Suite

## 🧪 Overview

This directory contains comprehensive end-to-end tests for Bruno Agentic CLI, validating all core functionality in a local-first environment.

## 📁 Test Files

### Main Test Scripts

- **`bruno_e2e_test.sh`** - Automated test suite covering all Bruno capabilities
- **`interactive_test.js`** - Interactive session test for memory and context
- **`test-results.txt`** - Generated test results summary
- **`session.log`** - Captured interactive session logs

### Sample Test Files

- **`sample_files/broken_code.js`** - JavaScript with syntax errors for fix testing
- **`sample_files/utils.js`** - Well-documented utilities for explain testing

## 🚀 Running Tests

### Quick Start

```bash
# Run the complete E2E test suite
./bruno_e2e_test.sh

# Run interactive memory tests
node interactive_test.js
```

### Prerequisites

1. **Ollama must be running**:
   ```bash
   ollama serve
   ```

2. **Model must be installed**:
   ```bash
   ollama pull deepseek-coder:6.7b-instruct-q4_K_M
   ```

3. **Bruno must be built**:
   ```bash
   cd .. && npm install
   ```

## ✅ Test Coverage

### 1. Build and Setup
- NPM dependencies verification
- Binary existence and permissions
- Global installation check

### 2. Startup Verification
- Version command
- Help command
- Local-first mode confirmation

### 3. Tool Functionality
- **Explain**: Analyze code files
- **Fix**: Correct syntax errors
- **General AI**: Answer programming questions

### 4. Memory and Context
- Store information in session
- Recall stored information
- Context persistence

### 5. Filesystem Operations
- File creation
- Backup generation
- Permission validation

### 6. Shell Sandbox
- Safe command execution
- Restricted command blocking
- Command output capture

### 7. Privacy and Security
- No external API calls
- Local-only configuration
- Ollama endpoint validation

### 8. Error Handling
- Invalid command handling
- Timeout management
- Graceful failures

## 📊 Test Results

After running tests, check:

- `test-results.txt` - Detailed results for each test
- `session.log` - Complete interaction logs
- Console output - Real-time test progress

## 🔧 Troubleshooting

### Common Issues

1. **"Ollama not running"**
   - Start Ollama: `ollama serve`
   - Check port 11434 is available

2. **"Model not found"**
   - Install model: `ollama pull deepseek-coder:6.7b-instruct-q4_K_M`
   - Verify with: `ollama list`

3. **"Timeout errors"**
   - Increase timeout in test scripts
   - Check system resources
   - Try smaller model

4. **"Permission denied"**
   - Make scripts executable: `chmod +x *.sh`
   - Check file permissions

## 🎯 Success Criteria

All tests pass when:

✅ Bruno launches without errors  
✅ All tool commands execute successfully  
✅ Files are created/modified correctly  
✅ Shell commands are properly sandboxed  
✅ Memory recalls stored context  
✅ No external API calls are made  
✅ Error handling is graceful  

## 📝 Adding New Tests

To add new tests:

1. Add test case to `bruno_e2e_test.sh`:
   ```bash
   run_test "Test Name" \
       "command to run" \
       "expected pattern"
   ```

2. For interactive tests, add to `interactive_test.js`:
   ```javascript
   {
       name: 'Test Name',
       input: 'test input',
       expectedPattern: /expected output/i,
       delay: 2000
   }
   ```

## 🐛 Debugging

Enable debug mode:
```bash
export BRUNO_DEBUG=true
./bruno_e2e_test.sh
```

Check logs:
```bash
tail -f session.log
cat test-results.txt
```

## 📊 Metrics

Expected results:
- Test execution time: ~2-3 minutes
- Success rate: 100%
- Memory usage: < 500MB
- No network calls: 0

---

Last updated: $(date)