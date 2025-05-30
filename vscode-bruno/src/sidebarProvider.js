const vscode = require('vscode');

class BrunoSidebarProvider {
    constructor(extensionUri, brunoRunner) {
        this._extensionUri = extensionUri;
        this._brunoRunner = brunoRunner;
        this._view = undefined;
    }
    
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'prompt':
                    await this._handlePrompt(data.value);
                    break;
                case 'command':
                    await this._handleCommand(data.value);
                    break;
                case 'loadSession':
                    await this._handleLoadSession(data.value);
                    break;
            }
        });
    }
    
    async _handlePrompt(prompt) {
        if (!prompt) return;
        
        try {
            // Show loading state
            this._view.webview.postMessage({ 
                type: 'loading', 
                value: true 
            });
            
            // Execute Bruno command
            const result = await this._brunoRunner.executeInSession(prompt);
            
            // Send result back to webview
            this._view.webview.postMessage({
                type: 'response',
                value: {
                    prompt: prompt,
                    response: result,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            this._view.webview.postMessage({
                type: 'error',
                value: error.message
            });
        } finally {
            this._view.webview.postMessage({ 
                type: 'loading', 
                value: false 
            });
        }
    }
    
    async _handleCommand(command) {
        switch (command) {
            case 'clear':
                this._view.webview.postMessage({ type: 'clear' });
                break;
            case 'sessions':
                const sessions = await this._brunoRunner.getSessions();
                this._view.webview.postMessage({
                    type: 'sessions',
                    value: sessions
                });
                break;
        }
    }
    
    async _handleLoadSession(sessionId) {
        await this._brunoRunner.loadSession(sessionId);
        vscode.window.showInformationMessage(`Loaded session: ${sessionId}`);
    }
    
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bruno AI Assistant</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-sideBar-background);
                    padding: 0;
                    margin: 0;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                
                .header {
                    padding: 10px;
                    background-color: var(--vscode-sideBarSectionHeader-background);
                    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
                }
                
                .header h2 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .conversation {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                }
                
                .message {
                    margin-bottom: 15px;
                    padding: 8px 12px;
                    border-radius: 6px;
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                }
                
                .message.user {
                    background-color: var(--vscode-inputOption-activeBackground);
                }
                
                .message-header {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 4px;
                }
                
                .message-content {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-size: 13px;
                }
                
                .input-area {
                    padding: 10px;
                    border-top: 1px solid var(--vscode-widget-border);
                    background-color: var(--vscode-sideBar-background);
                }
                
                .input-wrapper {
                    display: flex;
                    gap: 8px;
                }
                
                input {
                    flex: 1;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 6px 8px;
                    border-radius: 4px;
                    font-size: 13px;
                }
                
                input:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder);
                }
                
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                }
                
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                }
                
                .action-button {
                    background-color: var(--vscode-editorWidget-background);
                    color: var(--vscode-foreground);
                    border: 1px solid var(--vscode-widget-border);
                    padding: 4px 8px;
                    font-size: 12px;
                }
                
                .action-button:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                
                .loading {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .spinner {
                    width: 14px;
                    height: 14px;
                    border: 2px solid var(--vscode-progressBar-background);
                    border-top-color: var(--vscode-focusBorder);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                code {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: var(--vscode-editor-font-family);
                    font-size: 12px;
                }
                
                pre {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 8px;
                    border-radius: 4px;
                    overflow-x: auto;
                }
                
                pre code {
                    background-color: transparent;
                    padding: 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🤖 Bruno AI Assistant</h2>
            </div>
            
            <div class="conversation" id="conversation">
                <div class="message">
                    <div class="message-header">Bruno</div>
                    <div class="message-content">Hi! I'm Bruno, your local AI assistant. I can help you understand code, fix bugs, generate tests, and more. Just ask me anything!</div>
                </div>
            </div>
            
            <div class="loading" id="loading" style="display: none;">
                <div class="spinner"></div>
                <span>Bruno is thinking...</span>
            </div>
            
            <div class="input-area">
                <div class="input-wrapper">
                    <input 
                        type="text" 
                        id="prompt-input" 
                        placeholder="Ask Bruno anything..."
                        onkeypress="handleKeyPress(event)"
                    />
                    <button onclick="sendPrompt()" id="send-button">Send</button>
                </div>
                <div class="actions">
                    <button class="action-button" onclick="clearConversation()">Clear</button>
                    <button class="action-button" onclick="showSessions()">Sessions</button>
                    <button class="action-button" onclick="showHelp()">Help</button>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                const conversation = document.getElementById('conversation');
                const promptInput = document.getElementById('prompt-input');
                const sendButton = document.getElementById('send-button');
                const loading = document.getElementById('loading');
                
                function handleKeyPress(event) {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        sendPrompt();
                    }
                }
                
                function sendPrompt() {
                    const prompt = promptInput.value.trim();
                    if (!prompt) return;
                    
                    // Add user message to conversation
                    addMessage('You', prompt, true);
                    
                    // Send to extension
                    vscode.postMessage({
                        type: 'prompt',
                        value: prompt
                    });
                    
                    // Clear input
                    promptInput.value = '';
                    promptInput.focus();
                }
                
                function addMessage(sender, content, isUser = false) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message' + (isUser ? ' user' : '');
                    
                    const headerDiv = document.createElement('div');
                    headerDiv.className = 'message-header';
                    headerDiv.textContent = sender;
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'message-content';
                    
                    // Parse markdown-like content
                    content = content.replace(/\`\`\`(\w+)?\n([\s\S]*?)\`\`\`/g, 
                        (match, lang, code) => '<pre><code>' + escapeHtml(code) + '</code></pre>'
                    );
                    content = content.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
                    
                    contentDiv.innerHTML = content;
                    
                    messageDiv.appendChild(headerDiv);
                    messageDiv.appendChild(contentDiv);
                    conversation.appendChild(messageDiv);
                    
                    // Scroll to bottom
                    conversation.scrollTop = conversation.scrollHeight;
                }
                
                function escapeHtml(text) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }
                
                function clearConversation() {
                    conversation.innerHTML = '';
                    addMessage('Bruno', 'Conversation cleared. How can I help you?');
                    vscode.postMessage({ type: 'command', value: 'clear' });
                }
                
                function showSessions() {
                    vscode.postMessage({ type: 'command', value: 'sessions' });
                }
                
                function showHelp() {
                    const helpText = \`Available commands:
• Explain code - I'll analyze and explain any code
• Fix bugs - I'll identify and fix issues
• Generate tests - I'll create unit tests
• Refactor code - I'll improve code quality
• Ask anything - I'm here to help!

Slash commands:
• /help - Show this help
• /sessions - List previous sessions
• /clear - Clear conversation\`;
                    
                    addMessage('Bruno', helpText);
                }
                
                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.type) {
                        case 'response':
                            loading.style.display = 'none';
                            sendButton.disabled = false;
                            addMessage('Bruno', message.value.response);
                            break;
                            
                        case 'loading':
                            loading.style.display = message.value ? 'flex' : 'none';
                            sendButton.disabled = message.value;
                            break;
                            
                        case 'error':
                            loading.style.display = 'none';
                            sendButton.disabled = false;
                            addMessage('Bruno', '❌ Error: ' + message.value);
                            break;
                            
                        case 'clear':
                            conversation.innerHTML = '';
                            break;
                            
                        case 'sessions':
                            const sessionList = message.value.map(s => 
                                \`• Session \${s.id} - \${new Date(s.timestamp).toLocaleString()}\`
                            ).join('\\n');
                            addMessage('Bruno', 'Previous sessions:\\n' + (sessionList || 'No sessions found'));
                            break;
                    }
                });
                
                // Focus input on load
                promptInput.focus();
            </script>
        </body>
        </html>`;
    }
}

module.exports = { BrunoSidebarProvider };