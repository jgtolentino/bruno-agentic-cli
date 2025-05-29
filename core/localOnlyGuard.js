import chalk from 'chalk';

export class LocalOnlyGuard {
  constructor(config) {
    this.config = config;
    this.allowedProviders = ['local', 'ollama', 'lmstudio'];
  }

  validateProvider() {
    if (!this.allowedProviders.includes(this.config.llm_provider)) {
      throw new Error(
        chalk.red(`❌ Cloud provider "${this.config.llm_provider}" blocked by local-first policy.`) +
        chalk.yellow('\n\nTo use cloud providers, explicitly set in config:\n') +
        chalk.gray('llm_provider: anthropic\nallow_cloud: true')
      );
    }
  }

  validateNoTelemetry() {
    // Block any telemetry endpoints
    const telemetryPatterns = [
      /analytics/i,
      /telemetry/i,
      /tracking/i,
      /sentry/i,
      /datadog/i
    ];

    // Intercept fetch/axios to block telemetry
    if (global.fetch) {
      const originalFetch = global.fetch;
      global.fetch = (...args) => {
        const url = args[0]?.toString() || '';
        if (telemetryPatterns.some(pattern => pattern.test(url))) {
          console.warn(chalk.yellow('⚠️  Telemetry blocked:', url));
          return Promise.resolve(new Response('{}', { status: 200 }));
        }
        return originalFetch(...args);
      };
    }
  }

  enforceLocalFirst() {
    this.validateProvider();
    this.validateNoTelemetry();
    
    console.log(chalk.green('✓ Local-first mode active'));
    console.log(chalk.gray(`  Provider: ${this.config.llm_provider}`));
    console.log(chalk.gray(`  Model: ${this.config.local_model}`));
  }
}