#!/usr/bin/env node

// Interactive test script for Bruno memory and context validation

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Bruno Interactive Test Suite');
console.log('==============================\n');

const brunoPath = path.join(__dirname, '..', 'bin', 'bruno.js');
const logFile = path.join(__dirname, 'session.log');
const logStream = fs.createWriteStream(logFile);

// Test scenarios
const testScenarios = [
    {
        name: 'Memory Storage',
        input: 'remember: My name is Jake and I work at InsightPulse',
        expectedPattern: /stored|remembered|got it|okay/i,
        delay: 2000
    },
    {
        name: 'Memory Recall',
        input: 'What is my name?',
        expectedPattern: /Jake/i,
        delay: 2000
    },
    {
        name: 'Context Recall',
        input: 'Where do I work?',
        expectedPattern: /InsightPulse/i,
        delay: 2000
    },
    {
        name: 'Code Explanation',
        input: 'explain what a JavaScript closure is with a simple example',
        expectedPattern: /function|scope|variable|example/i,
        delay: 5000
    },
    {
        name: 'Exit',
        input: 'exit',
        expectedPattern: /bye|goodbye/i,
        delay: 1000
    }
];

let currentScenario = 0;
let testResults = [];

// Start Bruno
console.log('Starting Bruno...\n');
const bruno = spawn('node', [brunoPath], {
    stdio: ['pipe', 'pipe', 'pipe']
});

// Handle stdout
bruno.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    logStream.write(`[STDOUT] ${output}`);
    
    // Check if Bruno is ready
    if (output.includes('Ready') && currentScenario === 0) {
        runNextScenario();
    }
    
    // Check test expectations
    if (currentScenario > 0 && currentScenario <= testScenarios.length) {
        const scenario = testScenarios[currentScenario - 1];
        if (scenario.expectedPattern.test(output)) {
            testResults.push({
                name: scenario.name,
                passed: true,
                output: output.trim()
            });
            console.log(`\n✅ Test "${scenario.name}" PASSED\n`);
            
            if (currentScenario < testScenarios.length) {
                setTimeout(runNextScenario, scenario.delay);
            }
        }
    }
});

// Handle stderr
bruno.stderr.on('data', (data) => {
    const error = data.toString();
    process.stderr.write(error);
    logStream.write(`[STDERR] ${error}`);
});

// Handle close
bruno.on('close', (code) => {
    console.log('\n\nTest Results Summary');
    console.log('===================');
    
    let passed = 0;
    let failed = 0;
    
    testScenarios.forEach((scenario, index) => {
        if (scenario.name === 'Exit') return;
        
        const result = testResults.find(r => r.name === scenario.name);
        if (result && result.passed) {
            console.log(`✅ ${scenario.name}: PASSED`);
            passed++;
        } else {
            console.log(`❌ ${scenario.name}: FAILED`);
            failed++;
        }
    });
    
    console.log(`\nTotal: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);
    console.log(`\nSession log saved to: ${logFile}`);
    
    logStream.end();
    process.exit(failed > 0 ? 1 : 0);
});

// Run test scenarios
function runNextScenario() {
    if (currentScenario >= testScenarios.length) {
        return;
    }
    
    const scenario = testScenarios[currentScenario];
    console.log(`\n🔍 Running test: ${scenario.name}`);
    console.log(`Input: ${scenario.input}\n`);
    
    bruno.stdin.write(scenario.input + '\n');
    currentScenario++;
}

// Timeout handler
setTimeout(() => {
    console.log('\n⚠️  Test timeout reached');
    bruno.kill();
}, 60000);