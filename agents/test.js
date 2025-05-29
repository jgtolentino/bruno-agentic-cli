import fs from 'fs/promises';
import chalk from 'chalk';
import path from 'path';

export async function run({ file, framework = 'jest' }) {
  try {
    const code = await fs.readFile(file, 'utf-8');
    const testCases = generateTestCases(code, framework);
    
    return formatTests(testCases, file, framework);
  } catch (error) {
    return chalk.red(`Error generating tests: ${error.message}`);
  }
}

function generateTestCases(code, framework) {
  // Extract function names for test generation
  const functionNames = extractFunctions(code);
  
  const testCases = functionNames.map(func => ({
    name: func,
    tests: [
      {
        scenario: 'should handle valid input',
        type: 'positive'
      },
      {
        scenario: 'should handle invalid input',
        type: 'negative'
      },
      {
        scenario: 'should handle edge cases',
        type: 'edge'
      }
    ]
  }));
  
  return testCases;
}

function extractFunctions(code) {
  const functionPattern = /(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:\([^)]*\)|async)/g;
  const matches = [...code.matchAll(functionPattern)];
  return matches.map(match => match[1]);
}

function formatTests(testCases, file, framework) {
  const basename = path.basename(file, path.extname(file));
  
  let output = `${chalk.bold.cyan('Generated Tests:')} ${file}\n`;
  output += `${chalk.gray(`Framework: ${framework}`)}\n\n`;
  
  // Generate test template
  if (framework === 'jest') {
    output += generateJestTests(testCases, basename);
  } else if (framework === 'mocha') {
    output += generateMochaTests(testCases, basename);
  } else {
    output += generateGenericTests(testCases);
  }
  
  return output;
}

function generateJestTests(testCases, moduleName) {
  let tests = `import { ${testCases.map(tc => tc.name).join(', ')} } from './${moduleName}';\n\n`;
  
  testCases.forEach(testCase => {
    tests += `describe('${testCase.name}', () => {\n`;
    testCase.tests.forEach(test => {
      tests += `  test('${test.scenario}', () => {\n`;
      tests += `    // TODO: Implement test for ${test.type} case\n`;
      tests += `    expect(true).toBe(true);\n`;
      tests += `  });\n\n`;
    });
    tests += `});\n\n`;
  });
  
  return tests;
}

function generateMochaTests(testCases, moduleName) {
  let tests = `const { ${testCases.map(tc => tc.name).join(', ')} } = require('./${moduleName}');\n`;
  tests += `const { expect } = require('chai');\n\n`;
  
  testCases.forEach(testCase => {
    tests += `describe('${testCase.name}', () => {\n`;
    testCase.tests.forEach(test => {
      tests += `  it('${test.scenario}', () => {\n`;
      tests += `    // TODO: Implement test for ${test.type} case\n`;
      tests += `    expect(true).to.equal(true);\n`;
      tests += `  });\n\n`;
    });
    tests += `});\n\n`;
  });
  
  return tests;
}

function generateGenericTests(testCases) {
  let tests = chalk.yellow('Test Structure:\n\n');
  
  testCases.forEach(testCase => {
    tests += `${chalk.bold(testCase.name)}:\n`;
    testCase.tests.forEach(test => {
      tests += `  - ${test.scenario}\n`;
    });
    tests += '\n';
  });
  
  return tests;
}