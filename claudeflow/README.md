# ClaudeFlow Middleware System

A production-ready middleware system for orchestrating Claude AI → Google Docs pipelines with FastAPI, async operations, and YAML-based flow definitions.

## 🚀 Features

- **Async FastAPI Server**: High-performance async web server with automatic API documentation
- **Claude AI Integration**: Full Claude API support with streaming, batching, and retry logic
- **Google Docs Automation**: Create, update, and format Google Docs with rich content
- **YAML Flow Definitions**: Define complex workflows using simple YAML configuration
- **Template System**: Dynamic variable replacement in prompts and content
- **Error Handling**: Comprehensive error handling with retries and logging
- **Production Ready**: Rate limiting, monitoring, and security features

## 📁 Project Structure

```
claudeflow/
├── main.py                 # FastAPI server and flow orchestration
├── claudeflow.yaml         # Main flow definitions
├── .env                    # Environment configuration
├── requirements.txt        # Python dependencies
├── services/
│   ├── claude_executor.py  # Claude AI service
│   └── google_docs.py      # Google Docs service
├── flows/                  # Additional YAML flow files
├── modules/                # Custom flow modules
└── agents/                 # AI agent configurations
```

## ⚡ Quick Start

### 1. Installation

```bash
# Clone or create the project directory
cd claudeflow

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

#### Environment Variables
Copy `.env` template and configure:

```bash
cp .env .env.local
```

Edit `.env.local` with your credentials:

```env
CLAUDE_API_KEY=your_claude_api_key_here
GOOGLE_CREDENTIALS_PATH=./credentials.json
```

#### Google Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Docs API and Google Drive API
4. Create a Service Account:
   - Go to IAM & Admin → Service Accounts
   - Click "Create Service Account"
   - Download JSON credentials file
   - Save as `credentials.json` in project root

#### Claude API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create API key
3. Add to your `.env.local` file

### 3. Run the Server

```bash
# Development mode
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will start at `http://localhost:8000`

### 4. API Documentation

Visit `http://localhost:8000/docs` for interactive API documentation.

## 📖 Usage Examples

### Basic Blog Post Generation

```bash
curl -X POST "http://localhost:8000/run" \
  -H "Content-Type: application/json" \
  -d '{
    "flow_name": "blog_post_generator",
    "variables": {
      "topic": "AI in Healthcare",
      "word_count": 1000,
      "style": "professional",
      "audience": "healthcare professionals"
    }
  }'
```

### Meeting Summary Processing

```bash
curl -X POST "http://localhost:8000/run" \
  -H "Content-Type: application/json" \
  -d '{
    "flow_name": "meeting_summary_flow",
    "variables": {
      "meeting_notes": "Discussion about Q4 goals...",
      "meeting_title": "Q4 Planning Meeting",
      "attendees": "John, Sarah, Mike",
      "date": "2024-01-15"
    }
  }'
```

### Async Execution

```bash
curl -X POST "http://localhost:8000/run" \
  -H "Content-Type: application/json" \
  -d '{
    "flow_name": "content_research_and_write",
    "variables": {
      "research_topic": "Quantum Computing",
      "content_type": "technical guide",
      "depth": "comprehensive"
    },
    "async_execution": true
  }'
```

## 🔧 Configuration

### Flow Definition

Create custom flows in `claudeflow.yaml`:

```yaml
flows:
  my_custom_flow:
    description: "Custom content generation flow"
    variables:
      input_text: "Source text to process"
      output_format: "Desired output format"
    steps:
      process_content:
        type: claude
        model: "claude-3-opus-20240229"
        prompt: "Transform this text: {{input_text}} into {{output_format}}"
      
      save_to_docs:
        type: google_docs
        action: create
        title: "Processed Content"
        content_key: content
```

### Available Step Types

#### Claude Steps
```yaml
claude_step:
  type: claude
  model: "claude-3-opus-20240229"  # or claude-3-sonnet-20240229
  max_tokens: 4096
  temperature: 0.7
  system_prompt: "You are a helpful assistant"
  prompt: "Process this: {{variable_name}}"
```

#### Google Docs Steps
```yaml
docs_step:
  type: google_docs
  action: create  # or update, create_from_template
  title: "Document Title"
  content_key: content
  folder_id: "optional_folder_id"
```

#### Transform Steps
```yaml
transform_step:
  type: transform
  transformations:
    output_var:
      type: template
      template: "Formatted: {{input_var}}"
```

## 🚀 Production Deployment

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t claudeflow .
docker run -p 8000:8000 --env-file .env.local claudeflow
```

### Docker Compose

```yaml
version: '3.8'
services:
  claudeflow:
    build: .
    ports:
      - "8000:8000"
    environment:
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - GOOGLE_CREDENTIALS_PATH=/app/credentials.json
    volumes:
      - ./credentials.json:/app/credentials.json:ro
    restart: unless-stopped
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### Environment Variables for Production

```env
# Production settings
DEBUG=false
LOG_LEVEL=INFO
SECRET_KEY=your_strong_secret_key

# Database for persistence
DATABASE_URL=postgresql://user:pass@localhost/claudeflow

# Redis for caching
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=your_sentry_dsn

# Rate limiting
CLAUDE_RATE_LIMIT=60
GOOGLE_RATE_LIMIT=100
```

## 🔒 Security Considerations

1. **API Keys**: Store securely using environment variables or secret management
2. **Google Credentials**: Use service accounts with minimal required permissions
3. **Rate Limiting**: Configure appropriate rate limits for your use case
4. **Input Validation**: All inputs are validated using Pydantic models
5. **Error Handling**: Sensitive information is not exposed in error messages

## 📊 Monitoring and Logging

### Structured Logging

The system uses structured logging for better observability:

```python
import logging
logger = logging.getLogger(__name__)

# Logs include context
logger.info("Flow executed", extra={
    "flow_name": "blog_post_generator",
    "execution_time": 5.2,
    "tokens_used": 1500
})
```

### Health Checks

Monitor system health:

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "claude": "ready",
    "google_docs": "ready"
  }
}
```

## 🧪 Testing

Run tests:

```bash
# Install test dependencies
pip install pytest pytest-asyncio pytest-cov

# Run tests
pytest

# With coverage
pytest --cov=. --cov-report=html
```

## 🔄 Advanced Features

### Batch Processing

Process multiple flows concurrently:

```python
from services.claude_executor import ClaudeExecutor

async with ClaudeExecutor() as claude:
    results = await claude.execute_batch([
        {"prompt": "Summarize: text1"},
        {"prompt": "Summarize: text2"},
        {"prompt": "Summarize: text3"}
    ])
```

### Streaming Responses

For real-time content generation:

```python
async def stream_handler(chunk):
    print(chunk, end='', flush=True)

await claude.stream_execute(
    prompt="Write a story...",
    on_chunk=stream_handler
)
```

### Custom Flow Modules

Create reusable flow components in `modules/`:

```python
# modules/custom_processor.py
async def process_data(data, config):
    # Custom processing logic
    return processed_data
```

## 🐛 Troubleshooting

### Common Issues

1. **Google API Authentication**
   ```bash
   # Verify credentials file
   cat credentials.json | python -m json.tool
   ```

2. **Claude API Rate Limits**
   ```bash
   # Check API usage in logs
   grep "rate_limit" logs/app.log
   ```

3. **Memory Issues with Large Documents**
   ```env
   # Increase limits
   DEFAULT_MAX_TOKENS=2048
   ```

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=DEBUG
DEBUG=true
```

## 📝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` endpoint when server is running
- **Issues**: Create an issue in the repository
- **Discord**: Join our community Discord server

## 🔮 Roadmap

- [ ] WebSocket support for real-time updates
- [ ] Database integration for flow history
- [ ] Multi-tenant support
- [ ] Plugin system for custom integrations
- [ ] Web UI for flow management
- [ ] Slack/Teams integrations
- [ ] Webhook triggers
- [ ] Scheduled flow execution