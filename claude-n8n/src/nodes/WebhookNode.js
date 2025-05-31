class WebhookNode {
  constructor(parameters = {}, logger) {
    this.parameters = parameters;
    this.logger = logger;
    this.type = 'webhook';
    this.displayName = 'Webhook';
    this.description = 'Receive HTTP webhooks';
  }

  async execute(inputData, executionContext) {
    const input = inputData.main?.[0] || {};
    
    return {
      method: input.method || 'POST',
      body: input.body || {},
      headers: input.headers || {},
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = WebhookNode;
