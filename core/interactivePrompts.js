import inquirer from 'inquirer';
import autocompletePrompt from 'inquirer-autocomplete-prompt';
import fuzzy from 'fuzzy';
import chalk from 'chalk';
import { EventEmitter } from 'events';

// Register custom prompts
inquirer.registerPrompt('autocomplete', autocompletePrompt);

export class InteractivePrompts extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      fuzzySearch: true,
      showHelp: true,
      theme: 'default',
      ...options
    };
    
    this.history = new Map();
    this.setupTheme();
  }

  setupTheme() {
    this.theme = {
      prefix: chalk.green('?'),
      message: chalk.bold,
      submitted: chalk.green,
      answer: chalk.cyan,
      highlight: chalk.yellow,
      help: chalk.gray,
      error: chalk.red
    };
  }

  async selectOption(message, choices, options = {}) {
    const {
      multiSelect = false,
      fuzzySearch = this.options.fuzzySearch,
      pageSize = 10,
      defaultValue = null,
      helpText = null,
      allowCustom = false
    } = options;

    // Store in history for autocomplete
    const historyKey = `select_${message}`;
    this.updateHistory(historyKey, choices);

    if (fuzzySearch && !multiSelect) {
      return this.fuzzySelectPrompt(message, choices, {
        defaultValue,
        helpText,
        allowCustom
      });
    }

    const promptConfig = {
      type: multiSelect ? 'checkbox' : 'list',
      name: 'selection',
      message: this.formatMessage(message, helpText),
      choices: this.formatChoices(choices),
      pageSize,
      default: defaultValue
    };

    if (multiSelect) {
      promptConfig.validate = (answer) => {
        if (answer.length === 0) {
          return 'Please select at least one option.';
        }
        return true;
      };
    }

    const result = await inquirer.prompt([promptConfig]);
    return multiSelect ? result.selection : result.selection;
  }

  async fuzzySelectPrompt(message, choices, options = {}) {
    const { defaultValue, helpText, allowCustom } = options;

    return inquirer.prompt([{
      type: 'autocomplete',
      name: 'selection',
      message: this.formatMessage(message, helpText),
      source: (answersSoFar, input) => {
        return new Promise((resolve) => {
          const searchInput = input || '';
          
          let results;
          if (searchInput === '') {
            results = choices;
          } else {
            const fuzzyResults = fuzzy.filter(searchInput, choices, {
              extract: (choice) => typeof choice === 'string' ? choice : choice.name || choice.value
            });
            results = fuzzyResults.map(result => result.original);
          }

          // Add custom option if allowed
          if (allowCustom && searchInput && !results.some(r => 
            (typeof r === 'string' ? r : r.value) === searchInput
          )) {
            results.unshift({
              name: chalk.italic(`Create new: "${searchInput}"`),
              value: searchInput,
              custom: true
            });
          }

          resolve(results);
        });
      },
      pageSize: 10,
      default: defaultValue
    }]).then(result => result.selection);
  }

  async confirm(message, options = {}) {
    const {
      defaultValue = true,
      helpText = null,
      yesLabel = 'Yes',
      noLabel = 'No'
    } = options;

    const result = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: this.formatMessage(message, helpText),
      default: defaultValue,
      transformer: (value) => value ? chalk.green(yesLabel) : chalk.red(noLabel)
    }]);

    return result.confirmed;
  }

  async input(message, options = {}) {
    const {
      defaultValue = null,
      placeholder = null,
      validate = null,
      transform = null,
      helpText = null,
      mask = false,
      multiline = false,
      autocomplete = []
    } = options;

    let promptType = 'input';
    if (mask) promptType = 'password';
    if (multiline) promptType = 'editor';

    const promptConfig = {
      type: promptType,
      name: 'value',
      message: this.formatMessage(message, helpText),
      default: defaultValue,
      validate: validate || ((input) => input.trim() !== '' || 'Input cannot be empty'),
      transformer: transform
    };

    if (placeholder) {
      promptConfig.suffix = chalk.gray(` (${placeholder})`);
    }

    if (autocomplete.length > 0) {
      promptConfig.type = 'autocomplete';
      promptConfig.source = (answersSoFar, input) => {
        return Promise.resolve(
          fuzzy.filter(input || '', autocomplete).map(result => result.original)
        );
      };
    }

    const result = await inquirer.prompt([promptConfig]);
    
    // Store in history
    const historyKey = `input_${message}`;
    this.updateHistory(historyKey, [result.value]);
    
    return result.value;
  }

  async multiInput(fields) {
    const questions = fields.map(field => ({
      type: field.type || 'input',
      name: field.name,
      message: this.formatMessage(field.message, field.helpText),
      default: field.default,
      validate: field.validate || ((input) => input.trim() !== '' || `${field.name} cannot be empty`),
      when: field.when,
      choices: field.choices,
      transformer: field.transform
    }));

    return inquirer.prompt(questions);
  }

  async number(message, options = {}) {
    const {
      defaultValue = null,
      min = null,
      max = null,
      helpText = null
    } = options;

    const validate = (input) => {
      const num = parseFloat(input);
      if (isNaN(num)) {
        return 'Please enter a valid number.';
      }
      if (min !== null && num < min) {
        return `Number must be at least ${min}.`;
      }
      if (max !== null && num > max) {
        return `Number must be at most ${max}.`;
      }
      return true;
    };

    const result = await inquirer.prompt([{
      type: 'number',
      name: 'value',
      message: this.formatMessage(message, helpText),
      default: defaultValue,
      validate
    }]);

    return result.value;
  }

  async password(message, options = {}) {
    const { confirmPassword = false, helpText = null } = options;

    if (!confirmPassword) {
      const result = await inquirer.prompt([{
        type: 'password',
        name: 'password',
        message: this.formatMessage(message, helpText),
        mask: '*',
        validate: (input) => input.length > 0 || 'Password cannot be empty'
      }]);
      return result.password;
    }

    // Password confirmation flow
    const questions = [
      {
        type: 'password',
        name: 'password',
        message: this.formatMessage(message, helpText),
        mask: '*',
        validate: (input) => input.length > 0 || 'Password cannot be empty'
      },
      {
        type: 'password',
        name: 'confirmPassword',
        message: 'Confirm password:',
        mask: '*',
        validate: (input, answers) => {
          if (input !== answers.password) {
            return 'Passwords do not match.';
          }
          return true;
        }
      }
    ];

    const result = await inquirer.prompt(questions);
    return result.password;
  }

  async fileSelect(message, options = {}) {
    const {
      basePath = process.cwd(),
      fileTypes = [],
      showHidden = false,
      multiSelect = false
    } = options;

    // Import fs dynamically to avoid issues
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const files = await fs.readdir(basePath);
      const validFiles = [];

      for (const file of files) {
        if (!showHidden && file.startsWith('.')) continue;
        
        const fullPath = path.join(basePath, file);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          validFiles.push({
            name: chalk.blue(`📁 ${file}/`),
            value: fullPath,
            type: 'directory'
          });
        } else {
          const ext = path.extname(file);
          if (fileTypes.length === 0 || fileTypes.includes(ext)) {
            validFiles.push({
              name: `📄 ${file}`,
              value: fullPath,
              type: 'file'
            });
          }
        }
      }

      // Add navigation options
      if (basePath !== '/') {
        validFiles.unshift({
          name: chalk.gray('📁 ../'),
          value: path.dirname(basePath),
          type: 'parent'
        });
      }

      return this.selectOption(message, validFiles, { multiSelect, fuzzySearch: true });
    } catch (error) {
      throw new Error(`Failed to read directory: ${error.message}`);
    }
  }

  async progressiveForm(title, steps) {
    console.log(chalk.bold.cyan(`\n${title}\n${'='.repeat(title.length)}\n`));
    
    const results = {};
    const totalSteps = steps.length;

    for (let i = 0; i < totalSteps; i++) {
      const step = steps[i];
      const stepNumber = i + 1;
      
      console.log(chalk.yellow(`Step ${stepNumber}/${totalSteps}: ${step.title}`));
      
      if (step.description) {
        console.log(chalk.gray(step.description));
      }
      
      let stepResult;
      
      switch (step.type) {
        case 'input':
          stepResult = await this.input(step.message, step.options);
          break;
        case 'select':
          stepResult = await this.selectOption(step.message, step.choices, step.options);
          break;
        case 'confirm':
          stepResult = await this.confirm(step.message, step.options);
          break;
        case 'number':
          stepResult = await this.number(step.message, step.options);
          break;
        case 'password':
          stepResult = await this.password(step.message, step.options);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
      
      results[step.name] = stepResult;
      
      // Show progress
      const progress = Math.round((stepNumber / totalSteps) * 100);
      console.log(chalk.green(`✓ Step ${stepNumber} completed (${progress}%)\n`));
    }
    
    console.log(chalk.bold.green('Form completed successfully!\n'));
    return results;
  }

  async menu(title, options, menuOptions = {}) {
    const { showBack = false, allowExit = true } = menuOptions;
    
    const choices = [...options];
    
    if (showBack) {
      choices.push({
        name: chalk.gray('← Back'),
        value: '__back__'
      });
    }
    
    if (allowExit) {
      choices.push({
        name: chalk.red('✕ Exit'),
        value: '__exit__'
      });
    }

    console.log(chalk.bold.cyan(`\n${title}`));
    
    const selection = await this.selectOption('Select an option:', choices, {
      fuzzySearch: true
    });

    return selection;
  }

  // Utility methods
  formatMessage(message, helpText) {
    if (helpText) {
      return `${message}\n${chalk.gray(`  ${helpText}`)}`;
    }
    return message;
  }

  formatChoices(choices) {
    return choices.map(choice => {
      if (typeof choice === 'string') {
        return choice;
      }
      
      if (choice.disabled) {
        return {
          ...choice,
          name: chalk.gray(choice.name),
          disabled: chalk.red('(disabled)')
        };
      }
      
      return choice;
    });
  }

  updateHistory(key, values) {
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    
    const history = this.history.get(key);
    values.forEach(value => {
      if (!history.includes(value)) {
        history.unshift(value);
        // Keep only last 10 items
        if (history.length > 10) {
          history.pop();
        }
      }
    });
  }

  getHistory(key) {
    return this.history.get(key) || [];
  }

  clearHistory(key = null) {
    if (key) {
      this.history.delete(key);
    } else {
      this.history.clear();
    }
  }

  setTheme(theme) {
    this.setupTheme();
    // Apply theme to inquirer
    inquirer.theme = this.theme;
  }
}

// Export convenience functions
export async function select(message, choices, options = {}) {
  const prompts = new InteractivePrompts();
  return prompts.selectOption(message, choices, options);
}

export async function confirm(message, defaultValue = true) {
  const prompts = new InteractivePrompts();
  return prompts.confirm(message, { defaultValue });
}

export async function input(message, options = {}) {
  const prompts = new InteractivePrompts();
  return prompts.input(message, options);
}

export async function password(message, confirmPassword = false) {
  const prompts = new InteractivePrompts();
  return prompts.password(message, { confirmPassword });
}

export async function number(message, options = {}) {
  const prompts = new InteractivePrompts();
  return prompts.number(message, options);
}

export async function fileSelect(message, options = {}) {
  const prompts = new InteractivePrompts();
  return prompts.fileSelect(message, options);
}

export async function menu(title, options, menuOptions = {}) {
  const prompts = new InteractivePrompts();
  return prompts.menu(title, options, menuOptions);
}