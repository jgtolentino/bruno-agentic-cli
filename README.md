# 🧠 Bruno CLI – Claude Code-Compatible Local AI CLI

> Minimal, offline Claude-style command line interface using local LLMs like DeepSeek via Ollama.

---

## ✨ Features

* ✅ Claude Code CLI parity (clean output, print-first UX)
* 🧼 No banners, no REPL distractions
* 💻 Local-first LLM completions (via `OllamaClient`)
* 📦 Full print mode (`-p` / `--print`) + auto mode when prompt is passed
* 🔁 Works with piping, scripting, and automation
* 🔗 Optional: Middleware Bridge for Google Docs + FS I/O

---

## 🚀 Usage

```bash
# Claude-style prompt
bruno "explain transformers in NLP"

# With explicit print mode
bruno -p "explain multi-agent reinforcement learning"
```

### Example Output:

```
Transformers are a type of deep learning model introduced in "Attention Is All You Need"...
```

---

## 📦 Install

```bash
git clone https://github.com/YOUR_ORG/bruno-agentic-cli.git
cd bruno-agentic-cli
npm install
npm link   # Optional: use `bruno` globally
```

---

## 🛠 Dev & Test Scripts

```bash
npm run test:claude-parity   # Assert Claude-style output parity
npm run test:main            # Clean interface test
npm run dev                  # Watch and run bruno-clean.js
```

---

## ⚙️ GitHub Actions: Auto-Publish/Test

Place this under `.github/workflows/cli-test.yml`:

```yaml
name: Bruno CLI Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node
      uses: actions/setup-node@v3
      with:
        node-version: 20
    - run: npm install
    - run: npm run test:claude-parity
```

To auto-publish to npm:

```yaml
    - run: npm publish
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 🔌 Claude Middleware Bridge (Submodule)

Included under `claude-mcp-bridge/`:

* Watches Claude output
* Executes `:write`, `:read`, `:edit google`, etc.
* Google Docs + file system I/O

To use:

```bash
cd claude-mcp-bridge
npm install
node index.js
```

Service runs at: `http://localhost:3141`

---

## 🧪 Model Compatibility

Works with any local LLM (Ollama):

```bash
ollama pull deepseek-coder:6.7b
ollama serve
```

---

## 🧾 License

MIT © InsightPulseAI

---

**Maintained by [@jgtolentino](https://github.com/jgtolentino)**