import { FileSystemHandler } from '../core/fsHandler.js';
import chalk from 'chalk';

export async function run({ file, focus }) {
  const fsHandler = new FileSystemHandler();
  
  try {
    const result = await fsHandler.readFile(file);
    if (!result.success) {
      return chalk.red(`Error reading file: ${result.error}`);
    }
    
    const analysis = analyzeCode(result.content, focus);
    analysis.fileInfo = {
      size: result.size,
      modified: result.modified,
      path: result.path
    };
    
    return formatExplanation(analysis, file);
  } catch (error) {
    return chalk.red(`Error: ${error.message}`);
  }
}

function analyzeCode(code, focus) {
  const lines = code.split('\n');
  const analysis = {
    overview: "Code analysis pending Claude integration",
    structure: detectStructure(code),
    complexity: calculateComplexity(lines),
    suggestions: []
  };

  if (focus) {
    analysis.focusArea = `Focused analysis on: ${focus}`;
  }

  return analysis;
}

function detectStructure(code) {
  const structure = {
    functions: (code.match(/function\s+\w+/g) || []).length,
    classes: (code.match(/class\s+\w+/g) || []).length,
    imports: (code.match(/import\s+.+from/g) || []).length,
    exports: (code.match(/export\s+/g) || []).length
  };

  return structure;
}

function calculateComplexity(lines) {
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  return {
    totalLines: lines.length,
    codeLines: nonEmptyLines.length,
    complexity: "Low" // Placeholder
  };
}

function formatExplanation(analysis, file) {
  return `
${chalk.bold.cyan('Code Explanation:')} ${file}

${analysis.fileInfo ? chalk.gray(`Size: ${analysis.fileInfo.size} bytes | Modified: ${analysis.fileInfo.modified.toLocaleString()}`) + '\n' : ''}

${chalk.yellow('Overview:')}
${analysis.overview}

${chalk.yellow('Structure:')}
- Functions: ${analysis.structure.functions}
- Classes: ${analysis.structure.classes}
- Imports: ${analysis.structure.imports}
- Exports: ${analysis.structure.exports}

${chalk.yellow('Metrics:')}
- Total Lines: ${analysis.complexity.totalLines}
- Code Lines: ${analysis.complexity.codeLines}
- Complexity: ${analysis.complexity.complexity}

${analysis.focusArea ? chalk.yellow('Focus Area:') + '\n' + analysis.focusArea : ''}
`;
}