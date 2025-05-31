import chalk from 'chalk';
import { EventEmitter } from 'events';
import ora from 'ora';
import cliProgress from 'cli-progress';

export class ProgressVisualization extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      style: 'modern', // modern, classic, simple
      colors: true,
      concurrent: false,
      updateInterval: 100,
      showETA: true,
      showPercentage: true,
      showValue: true,
      showSpeed: false,
      ...options
    };
    
    this.tasks = new Map();
    this.activeSpinners = new Map();
    this.progressBars = new Map();
    this.isActive = false;
    this.startTime = null;
  }

  createTask(id, options = {}) {
    const task = {
      id,
      title: options.title || id,
      total: options.total || 100,
      current: 0,
      status: 'pending',
      startTime: null,
      endTime: null,
      subtasks: new Map(),
      spinner: null,
      progressBar: null,
      type: options.type || 'progress', // progress, spinner, steps
      ...options
    };
    
    this.tasks.set(id, task);
    this.emit('taskCreated', task);
    
    return task;
  }

  startTask(id, message = null) {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }
    
    task.status = 'running';
    task.startTime = Date.now();
    
    if (message) {
      task.title = message;
    }
    
    if (task.type === 'spinner') {
      this.createSpinner(task);
    } else if (task.type === 'progress') {
      this.createProgressBar(task);
    }
    
    this.emit('taskStarted', task);
    return task;
  }

  updateTask(id, current, message = null) {
    const task = this.tasks.get(id);
    if (!task) return;
    
    task.current = Math.min(current, task.total);
    
    if (message) {
      task.title = message;
    }
    
    if (task.progressBar) {
      task.progressBar.update(task.current, { message: task.title });
    } else if (task.spinner) {
      task.spinner.text = `${task.title} (${task.current}/${task.total})`;
    }
    
    this.emit('taskUpdated', task);
  }

  completeTask(id, message = null) {
    const task = this.tasks.get(id);
    if (!task) return;
    
    task.status = 'completed';
    task.endTime = Date.now();
    task.current = task.total;
    
    if (message) {
      task.title = message;
    }
    
    if (task.progressBar) {
      task.progressBar.update(task.total);
      task.progressBar.stop();
    }
    
    if (task.spinner) {
      task.spinner.succeed(task.title);
    }
    
    this.emit('taskCompleted', task);
  }

  failTask(id, error = null) {
    const task = this.tasks.get(id);
    if (!task) return;
    
    task.status = 'failed';
    task.endTime = Date.now();
    task.error = error;
    
    if (task.progressBar) {
      task.progressBar.stop();
    }
    
    if (task.spinner) {
      task.spinner.fail(task.title + (error ? `: ${error}` : ''));
    }
    
    this.emit('taskFailed', task);
  }

  createSpinner(task) {
    const spinner = ora({
      text: task.title,
      color: this.getColorForTask(task),
      spinner: this.getSpinnerStyle()
    });
    
    task.spinner = spinner;
    this.activeSpinners.set(task.id, spinner);
    
    spinner.start();
    return spinner;
  }

  createProgressBar(task) {
    const bar = new cliProgress.SingleBar({
      format: this.getProgressFormat(task),
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: true,
      ...this.getProgressBarOptions()
    }, cliProgress.Presets.shades_classic);
    
    task.progressBar = bar;
    this.progressBars.set(task.id, bar);
    
    bar.start(task.total, task.current, { message: task.title });
    return bar;
  }

  createMultiProgress() {
    const multibar = new cliProgress.MultiBar({
      format: this.getMultiProgressFormat(),
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: false,
      ...this.getProgressBarOptions()
    }, cliProgress.Presets.shades_grey);
    
    return multibar;
  }

  getProgressFormat(task) {
    let format = '';
    
    if (this.options.showPercentage) {
      format += '{percentage}% ';
    }
    
    format += '|{bar}|';
    
    if (this.options.showValue) {
      format += ' {value}/{total}';
    }
    
    if (this.options.showETA) {
      format += ' | ETA: {eta}s';
    }
    
    if (this.options.showSpeed) {
      format += ' | Speed: {speed}';
    }
    
    format += ' | {message}';
    
    return format;
  }

  getMultiProgressFormat() {
    return '{percentage}% |{bar}| {value}/{total} | {duration}s | {message}';
  }

  getProgressBarOptions() {
    return {
      barsize: 30,
      synchronousUpdate: false,
      noTTYOutput: !process.stdout.isTTY,
      notTTYSchedule: 2000
    };
  }

  getSpinnerStyle() {
    const styles = {
      modern: 'dots12',
      classic: 'line',
      simple: 'dots'
    };
    
    return styles[this.options.style] || 'dots12';
  }

  getColorForTask(task) {
    const colors = {
      pending: 'gray',
      running: 'blue',
      completed: 'green',
      failed: 'red'
    };
    
    return colors[task.status] || 'blue';
  }

  // Step-based progress for complex workflows
  createStepProgress(id, steps, options = {}) {
    const task = this.createTask(id, {
      type: 'steps',
      total: steps.length,
      steps,
      currentStep: 0,
      ...options
    });
    
    return task;
  }

  nextStep(id, message = null) {
    const task = this.tasks.get(id);
    if (!task || task.type !== 'steps') return;
    
    if (task.currentStep < task.steps.length) {
      const step = task.steps[task.currentStep];
      
      if (task.currentStep > 0) {
        // Complete previous step
        console.log(chalk.green(`✓ ${task.steps[task.currentStep - 1]}`));
      }
      
      // Start current step
      console.log(chalk.blue(`▶ ${step}${message ? ` - ${message}` : ''}`));
      
      task.currentStep++;
      task.current = task.currentStep;
      
      this.emit('stepProgressed', task);
    }
  }

  completeStepProgress(id, message = null) {
    const task = this.tasks.get(id);
    if (!task || task.type !== 'steps') return;
    
    // Complete final step
    if (task.currentStep > 0) {
      console.log(chalk.green(`✓ ${task.steps[task.currentStep - 1]}`));
    }
    
    console.log(chalk.bold.green(`✅ All steps completed${message ? `: ${message}` : ''}`));
    
    task.status = 'completed';
    task.endTime = Date.now();
    
    this.emit('taskCompleted', task);
  }

  // Dashboard-style progress display
  showDashboard() {
    if (!process.stdout.isTTY) return;
    
    console.clear();
    
    const activeTasks = Array.from(this.tasks.values()).filter(t => 
      t.status === 'running' || t.status === 'pending'
    );
    
    if (activeTasks.length === 0) {
      console.log(chalk.green('✅ All tasks completed'));
      return;
    }
    
    console.log(chalk.bold.cyan('📊 Task Dashboard\n'));
    
    activeTasks.forEach(task => {
      const progress = Math.round((task.current / task.total) * 100);
      const bar = this.createSimpleProgressBar(progress, 30);
      const status = this.getStatusIcon(task.status);
      const duration = task.startTime ? this.formatDuration(Date.now() - task.startTime) : '';
      
      console.log(`${status} ${task.title}`);
      console.log(`   ${bar} ${progress}% ${duration ? `(${duration})` : ''}`);
      
      if (task.subtasks.size > 0) {
        task.subtasks.forEach(subtask => {
          const subProgress = Math.round((subtask.current / subtask.total) * 100);
          const subBar = this.createSimpleProgressBar(subProgress, 20);
          console.log(`     └─ ${subtask.title}: ${subBar} ${subProgress}%`);
        });
      }
      
      console.log('');
    });
    
    const overall = this.calculateOverallProgress();
    console.log(chalk.bold(`Overall Progress: ${overall.percentage}% (${overall.completed}/${overall.total} tasks)`));
  }

  createSimpleProgressBar(percentage, width = 20) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    const filledBar = chalk.green('█'.repeat(filled));
    const emptyBar = chalk.gray('░'.repeat(empty));
    
    return `[${filledBar}${emptyBar}]`;
  }

  getStatusIcon(status) {
    const icons = {
      pending: chalk.gray('⏳'),
      running: chalk.blue('🔄'),
      completed: chalk.green('✅'),
      failed: chalk.red('❌')
    };
    
    return icons[status] || chalk.gray('?');
  }

  calculateOverallProgress() {
    const tasks = Array.from(this.tasks.values());
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  // Real-time updates
  startRealTimeUpdates(interval = 1000) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      if (this.hasActiveTasks()) {
        this.showDashboard();
      }
    }, interval);
  }

  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  hasActiveTasks() {
    return Array.from(this.tasks.values()).some(t => 
      t.status === 'running' || t.status === 'pending'
    );
  }

  // Cleanup
  cleanup() {
    this.stopRealTimeUpdates();
    
    // Stop all active spinners
    this.activeSpinners.forEach(spinner => {
      if (spinner.isSpinning) {
        spinner.stop();
      }
    });
    
    // Stop all progress bars
    this.progressBars.forEach(bar => {
      bar.stop();
    });
    
    this.tasks.clear();
    this.activeSpinners.clear();
    this.progressBars.clear();
  }

  // Subtask management
  addSubtask(parentId, subtaskId, options = {}) {
    const parent = this.tasks.get(parentId);
    if (!parent) {
      throw new Error(`Parent task ${parentId} not found`);
    }
    
    const subtask = {
      id: subtaskId,
      title: options.title || subtaskId,
      total: options.total || 100,
      current: 0,
      status: 'pending',
      parent: parentId,
      ...options
    };
    
    parent.subtasks.set(subtaskId, subtask);
    this.emit('subtaskAdded', { parent, subtask });
    
    return subtask;
  }

  updateSubtask(parentId, subtaskId, current, message = null) {
    const parent = this.tasks.get(parentId);
    if (!parent) return;
    
    const subtask = parent.subtasks.get(subtaskId);
    if (!subtask) return;
    
    subtask.current = Math.min(current, subtask.total);
    
    if (message) {
      subtask.title = message;
    }
    
    // Update parent progress based on subtasks
    const totalSubtaskProgress = Array.from(parent.subtasks.values())
      .reduce((sum, st) => sum + (st.current / st.total), 0);
    
    const avgProgress = totalSubtaskProgress / parent.subtasks.size;
    this.updateTask(parentId, Math.round(avgProgress * parent.total));
    
    this.emit('subtaskUpdated', { parent, subtask });
  }

  // Export progress data
  exportProgress() {
    return {
      tasks: Array.from(this.tasks.values()).map(task => ({
        ...task,
        subtasks: Array.from(task.subtasks.values())
      })),
      overall: this.calculateOverallProgress(),
      timestamp: new Date().toISOString()
    };
  }

  // Import progress data
  importProgress(data) {
    this.cleanup();
    
    data.tasks.forEach(taskData => {
      const task = this.createTask(taskData.id, taskData);
      
      if (taskData.subtasks) {
        taskData.subtasks.forEach(subtaskData => {
          this.addSubtask(task.id, subtaskData.id, subtaskData);
        });
      }
    });
  }
}

// Convenience functions
export function createProgressManager(options = {}) {
  return new ProgressVisualization(options);
}

export function showProgress(taskName, total = 100, options = {}) {
  const manager = new ProgressVisualization(options);
  return manager.createTask(taskName, { total, ...options });
}

export function createSpinner(message, options = {}) {
  const manager = new ProgressVisualization(options);
  const task = manager.createTask('spinner', { 
    type: 'spinner', 
    title: message,
    ...options 
  });
  manager.startTask('spinner');
  return {
    update: (msg) => manager.updateTask('spinner', 0, msg),
    succeed: (msg) => manager.completeTask('spinner', msg),
    fail: (msg) => manager.failTask('spinner', msg),
    stop: () => manager.cleanup()
  };
}

export function createSteps(steps, options = {}) {
  const manager = new ProgressVisualization(options);
  const task = manager.createStepProgress('steps', steps, options);
  manager.startTask('steps');
  
  return {
    next: (msg) => manager.nextStep('steps', msg),
    complete: (msg) => manager.completeStepProgress('steps', msg),
    fail: (msg) => manager.failTask('steps', msg)
  };
}