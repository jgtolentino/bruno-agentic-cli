import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { EventEmitter } from 'events';
import chalk from 'chalk';

export class RichTerminalUI extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      title: 'Bruno CLI',
      theme: 'default',
      mouse: true,
      fullUnicode: true,
      ...options
    };
    
    this.screen = null;
    this.components = new Map();
    this.layouts = new Map();
    this.activeLayout = null;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;

    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: this.options.fullUnicode,
      title: this.options.title,
      mouse: this.options.mouse,
      debug: process.env.DEBUG_UI === 'true'
    });

    this.setupKeyBindings();
    this.registerDefaultLayouts();
    this.isInitialized = true;
    
    this.emit('initialized');
  }

  setupKeyBindings() {
    // Global key bindings
    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.cleanup();
      process.exit(0);
    });

    this.screen.key(['f1'], () => {
      this.showHelp();
    });

    this.screen.key(['f2'], () => {
      this.toggleLayout();
    });

    this.screen.key(['f5'], () => {
      this.refresh();
    });
  }

  registerDefaultLayouts() {
    // Default layout
    this.registerLayout('default', () => this.createDefaultLayout());
    
    // Progress layout
    this.registerLayout('progress', () => this.createProgressLayout());
    
    // Debug layout
    this.registerLayout('debug', () => this.createDebugLayout());
    
    // Split layout
    this.registerLayout('split', () => this.createSplitLayout());
    
    // Dashboard layout
    this.registerLayout('dashboard', () => this.createDashboardLayout());
  }

  registerLayout(name, factory) {
    this.layouts.set(name, factory);
  }

  switchLayout(name) {
    if (this.activeLayout) {
      this.clearLayout();
    }

    const factory = this.layouts.get(name);
    if (!factory) {
      throw new Error(`Layout '${name}' not found`);
    }

    const layout = factory();
    this.activeLayout = { name, layout };
    this.render();
    
    this.emit('layoutChanged', name);
  }

  clearLayout() {
    if (this.activeLayout) {
      // Remove all children
      this.screen.children.forEach(child => {
        child.detach();
      });
      this.components.clear();
    }
  }

  createDefaultLayout() {
    const container = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: {
        bg: 'black'
      }
    });

    // Header
    const header = blessed.box({
      parent: container,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: this.createHeader(),
      style: {
        bg: 'blue',
        fg: 'white',
        bold: true
      },
      border: {
        type: 'line',
        fg: 'cyan'
      }
    });

    // Main output area
    const output = blessed.log({
      parent: container,
      top: 3,
      left: 0,
      width: '100%',
      height: '80%-3',
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true,
      style: {
        bg: 'black',
        fg: 'white'
      },
      border: {
        type: 'line',
        fg: 'gray'
      },
      label: ' Output '
    });

    // Status bar
    const statusBar = blessed.box({
      parent: container,
      bottom: 3,
      left: 0,
      width: '100%',
      height: 1,
      content: 'Ready',
      style: {
        bg: 'green',
        fg: 'black'
      }
    });

    // Input area
    const input = blessed.textbox({
      parent: container,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      inputOnFocus: true,
      style: {
        bg: 'black',
        fg: 'white'
      },
      border: {
        type: 'line',
        fg: 'green'
      },
      label: ' Input (Enter to submit, Esc to cancel) '
    });

    // Store components
    this.components.set('header', header);
    this.components.set('output', output);
    this.components.set('statusBar', statusBar);
    this.components.set('input', input);

    // Setup input handling
    this.setupInputHandling(input, output);

    return { container, header, output, statusBar, input };
  }

  createProgressLayout() {
    const container = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });

    // Header
    const header = blessed.box({
      parent: container,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: this.createHeader(),
      style: {
        bg: 'blue',
        fg: 'white'
      },
      border: { type: 'line' }
    });

    // Progress area
    const progressContainer = blessed.box({
      parent: container,
      top: 3,
      left: 0,
      width: '100%',
      height: '50%-3',
      border: {
        type: 'line',
        fg: 'cyan'
      },
      label: ' Progress '
    });

    // Output area
    const output = blessed.log({
      parent: container,
      top: '50%',
      left: 0,
      width: '100%',
      height: '50%',
      scrollable: true,
      border: {
        type: 'line',
        fg: 'gray'
      },
      label: ' Output '
    });

    this.components.set('header', header);
    this.components.set('progressContainer', progressContainer);
    this.components.set('output', output);

    return { container, header, progressContainer, output };
  }

  createDebugLayout() {
    const container = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });

    // Split into 3 columns
    const leftPanel = blessed.box({
      parent: container,
      top: 0,
      left: 0,
      width: '33%',
      height: '100%',
      border: { type: 'line' },
      label: ' Variables '
    });

    const centerPanel = blessed.log({
      parent: container,
      top: 0,
      left: '33%',
      width: '34%',
      height: '100%',
      scrollable: true,
      border: { type: 'line' },
      label: ' Output '
    });

    const rightPanel = blessed.log({
      parent: container,
      top: 0,
      left: '67%',
      width: '33%',
      height: '100%',
      scrollable: true,
      border: { type: 'line' },
      label: ' Debug Info '
    });

    this.components.set('variables', leftPanel);
    this.components.set('output', centerPanel);
    this.components.set('debug', rightPanel);

    return { container, leftPanel, centerPanel, rightPanel };
  }

  createSplitLayout() {
    const container = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });

    // Left side - file tree or commands
    const leftPanel = blessed.box({
      parent: container,
      top: 0,
      left: 0,
      width: '50%',
      height: '100%',
      border: { type: 'line' },
      label: ' Commands '
    });

    // Right side - output
    const rightPanel = blessed.log({
      parent: container,
      top: 0,
      left: '50%',
      width: '50%',
      height: '100%',
      scrollable: true,
      border: { type: 'line' },
      label: ' Output '
    });

    this.components.set('commands', leftPanel);
    this.components.set('output', rightPanel);

    return { container, leftPanel, rightPanel };
  }

  createDashboardLayout() {
    const container = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    });

    // Metrics grid (top half)
    const metricsContainer = blessed.box({
      parent: container,
      top: 0,
      left: 0,
      width: '100%',
      height: '50%'
    });

    // CPU gauge
    const cpuGauge = contrib.gauge({
      parent: metricsContainer,
      top: 0,
      left: 0,
      width: '25%',
      height: '100%',
      label: 'CPU',
      stroke: 'green',
      fill: 'white'
    });

    // Memory gauge
    const memoryGauge = contrib.gauge({
      parent: metricsContainer,
      top: 0,
      left: '25%',
      width: '25%',
      height: '100%',
      label: 'Memory',
      stroke: 'cyan',
      fill: 'white'
    });

    // Tasks list
    const tasksList = blessed.list({
      parent: metricsContainer,
      top: 0,
      left: '50%',
      width: '25%',
      height: '100%',
      border: { type: 'line' },
      label: ' Tasks ',
      keys: true,
      vi: true
    });

    // Status indicators
    const statusPanel = blessed.box({
      parent: metricsContainer,
      top: 0,
      left: '75%',
      width: '25%',
      height: '100%',
      border: { type: 'line' },
      label: ' Status '
    });

    // Log area (bottom half)
    const logArea = blessed.log({
      parent: container,
      top: '50%',
      left: 0,
      width: '100%',
      height: '50%',
      scrollable: true,
      border: { type: 'line' },
      label: ' Activity Log '
    });

    this.components.set('cpuGauge', cpuGauge);
    this.components.set('memoryGauge', memoryGauge);
    this.components.set('tasksList', tasksList);
    this.components.set('statusPanel', statusPanel);
    this.components.set('logArea', logArea);

    return { container, cpuGauge, memoryGauge, tasksList, statusPanel, logArea };
  }

  setupInputHandling(input, output) {
    input.on('submit', (text) => {
      if (text.trim()) {
        this.emit('command', text.trim());
        output.log(`> ${text}`);
        input.clearValue();
      }
    });

    input.on('cancel', () => {
      input.clearValue();
    });

    // Focus input by default
    input.focus();
  }

  createHeader() {
    const now = new Date().toLocaleTimeString();
    return ` Bruno CLI v3.1 - Claude Code Parity Mode                    ${now} `;
  }

  // Public interface methods
  log(message, component = 'output') {
    const comp = this.components.get(component);
    if (comp && comp.log) {
      comp.log(message);
      this.render();
    }
  }

  updateStatus(message) {
    const statusBar = this.components.get('statusBar');
    if (statusBar) {
      statusBar.setContent(message);
      this.render();
    }
  }

  updateProgress(taskId, progress, label) {
    const progressContainer = this.components.get('progressContainer');
    if (progressContainer) {
      // Create or update progress bar
      let progressBar = this.components.get(`progress_${taskId}`);
      
      if (!progressBar) {
        progressBar = contrib.gauge({
          parent: progressContainer,
          top: Object.keys(this.components.keys()).filter(k => k.startsWith('progress_')).length * 4,
          left: 0,
          width: '100%',
          height: 4,
          label: label || taskId,
          stroke: 'green',
          fill: 'white'
        });
        
        this.components.set(`progress_${taskId}`, progressBar);
      }
      
      progressBar.setPercent(progress);
      this.render();
    }
  }

  addTask(task) {
    const tasksList = this.components.get('tasksList');
    if (tasksList) {
      tasksList.addItem(task);
      this.render();
    }
  }

  updateGauge(gaugeName, value) {
    const gauge = this.components.get(gaugeName);
    if (gauge) {
      gauge.setPercent(value);
      this.render();
    }
  }

  showNotification(message, type = 'info') {
    const notification = blessed.message({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 'shrink',
      border: { type: 'line' },
      style: {
        bg: type === 'error' ? 'red' : type === 'warning' ? 'yellow' : 'blue',
        fg: 'white'
      }
    });

    notification.display(message, 3, () => {
      notification.destroy();
      this.render();
    });
  }

  showHelp() {
    const help = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      content: this.getHelpContent(),
      border: { type: 'line' },
      style: {
        bg: 'black',
        fg: 'white'
      },
      scrollable: true,
      keys: true,
      vi: true
    });

    help.key(['escape', 'q'], () => {
      help.destroy();
      this.render();
    });

    help.focus();
    this.render();
  }

  getHelpContent() {
    return `
BRUNO CLI - HELP

Keyboard Shortcuts:
  F1          - Show this help
  F2          - Toggle layout
  F5          - Refresh screen
  Escape/Q    - Exit
  Ctrl+C      - Force exit

Layouts:
  default     - Standard input/output view
  progress    - Progress tracking view
  debug       - Multi-panel debug view
  split       - Side-by-side view
  dashboard   - Metrics dashboard

Commands:
  Type commands in the input area and press Enter
  Use 'layout <name>' to switch layouts
  Use 'clear' to clear output
  Use 'help' for command help

Press Escape or Q to close this help
    `;
  }

  toggleLayout() {
    const layouts = Array.from(this.layouts.keys());
    const current = this.activeLayout?.name || 'default';
    const currentIndex = layouts.indexOf(current);
    const nextIndex = (currentIndex + 1) % layouts.length;
    const nextLayout = layouts[nextIndex];
    
    this.switchLayout(nextLayout);
    this.showNotification(`Switched to ${nextLayout} layout`);
  }

  refresh() {
    this.screen.realloc();
    this.render();
  }

  render() {
    if (this.screen) {
      this.screen.render();
    }
  }

  cleanup() {
    if (this.screen) {
      this.screen.destroy();
    }
  }

  // Utility methods
  setTheme(theme) {
    // Implement theme switching
    this.options.theme = theme;
    // Would need to update all component styles
  }

  getComponent(name) {
    return this.components.get(name);
  }

  getAllComponents() {
    return this.components;
  }
}

// Export helper functions
export function createSimpleProgressBar(current, total, width = 30) {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage}%`;
}

export function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function getSystemMetrics() {
  const used = process.memoryUsage();
  return {
    memory: {
      rss: formatBytes(used.rss),
      heapTotal: formatBytes(used.heapTotal),
      heapUsed: formatBytes(used.heapUsed),
      external: formatBytes(used.external)
    },
    uptime: process.uptime(),
    pid: process.pid
  };
}