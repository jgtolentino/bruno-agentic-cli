# AppGenie

An AI-native mobile app generator using Claude and modular agent workflows.

## Overview

AppGenie is a Pulser-powered platform that enables rapid creation of mobile applications from natural language prompts. It uses a modular agent architecture to handle each part of the app generation process, from understanding the user's intent to deploying the finished product.

## Key Features

- **Natural Language to App Creation**: Turn plain English descriptions into functional mobile apps
- **Drag-and-Drop Editor**: Visually customize your app without coding
- **Real-Time Preview**: See your app in device frames as you build it
- **Multi-Platform Deployment**: Deploy as PWA, Expo app, or native iOS/Android app
- **AI-Powered Design**: Get intelligent suggestions for UI, UX, and features
- **Modular Architecture**: Extensible system built on MCP (Model Context Protocol)

## Architecture

AppGenie is built on a modular agent architecture using Pulser's MCP system:

1. **nlp-parser**: Converts natural language prompts into structured app schema
2. **template-manager**: Applies UI templates and generates base code
3. **ui-editor**: Provides drag-and-drop interface for customizing screens
4. **preview-engine**: Renders real-time previews in device frames
5. **deployer**: Handles deployment to various platforms

## Workflow

```
User Input → NLP Parser → Template Manager → UI Editor → Preview Engine → Deployer
```

1. User describes the app they want to build
2. NLP Parser converts this description into a structured app schema
3. Template Manager applies UI templates and generates base code
4. UI Editor allows visual customization of the app
5. Preview Engine shows how the app will look on real devices
6. Deployer packages and publishes the app to the chosen platform

## Usage

### CLI

```bash
# Initialize an app
:appgenie init "Build a habit tracker app"

# Edit the app UI
:appgenie edit habit-tracker

# Preview the app
:appgenie preview habit-tracker --device=iphone

# Deploy the app
:appgenie deploy habit-tracker --target=pwa
```

### UI Modes

AppGenie supports three UI modes:

- **Deck Mode**: Presentation-style interface for quick overviews
- **Web IDE**: Replit-style interface for detailed editing
- **Mobile View**: Mobile-optimized interface for on-the-go edits

## Installation

```bash
# Clone the repository
git clone https://github.com/user/appgenie.git

# Install dependencies
cd appgenie
npm install

# Set up development environment
npm run setup

# Start development server
npm run dev
```

## Requirements

- Node.js 14+
- React 17+
- Expo CLI (for mobile deployment)
- Claude API access

## Project Structure

```
appgenie/
├── agents/               # Agent YAML definitions
│   ├── nlp-parser.yaml   # Natural language processing agent
│   ├── template-manager.yaml # Template application agent
│   ├── ui-editor.yaml    # UI editing agent
│   ├── preview-engine.yaml # Preview rendering agent
│   └── deployer.yaml     # Deployment agent
├── public/               # Public assets
│   └── device-frames/    # Device frame images
├── src/                  # Source code
│   ├── components/       # React components
│   └── pages/            # Page components
├── utils/                # Utility functions
├── slides/               # Presentation slides for deck mode
├── .claude-cli/          # Claude CLI configuration
└── README.md             # Documentation
```

## Development

### Running Locally

```bash
# Start development server
npm run dev

# Run in deck mode
npm run dev:deck

# Run in mobile mode
npm run dev:mobile
```

### Adding New Templates

Templates are defined in `agents/template-manager.yaml` and can be extended by adding new template definitions.

### Creating Custom Agents

New agents can be added to extend AppGenie's capabilities. See the [Agent Development Guide](docs/agent-development.md) for details.

## License

MIT