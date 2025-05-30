const vscode = require('vscode');
const { BrunoRunner } = require('./bruno-runner');
const { BrunoSidebarProvider } = require('./src/sidebarProvider');
const path = require('path');

let brunoRunner;
let sidebarProvider;
let outputChannel;

function activate(context) {
    console.log('Bruno VS Code Extension is activating...');
    
    // Create output channel for Bruno responses
    outputChannel = vscode.window.createOutputChannel('Bruno AI');
    
    // Initialize Bruno runner with config
    const config = vscode.workspace.getConfiguration('bruno');
    brunoRunner = new BrunoRunner(getBrunoPath(), config, outputChannel);
    
    // Initialize sidebar
    sidebarProvider = new BrunoSidebarProvider(context.extensionUri, brunoRunner);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('brunoSidebar', sidebarProvider)
    );
    
    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('bruno.explainFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active file to explain');
                return;
            }
            
            const filePath = editor.document.fileName;
            const content = editor.document.getText();
            const language = editor.document.languageId;
            
            await runBrunoWithProgress(
                `Explain this ${language} file: ${path.basename(filePath)}\n\n${content}`,
                'Explaining file...'
            );
        }),
        
        vscode.commands.registerCommand('bruno.fixFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active file to fix');
                return;
            }
            
            const filePath = editor.document.fileName;
            const content = editor.document.getText();
            const language = editor.document.languageId;
            
            const result = await runBrunoWithProgress(
                `Fix any issues in this ${language} file: ${path.basename(filePath)}\n\n${content}`,
                'Analyzing and fixing issues...'
            );
            
            // Offer to apply fixes
            if (result && result.includes('```')) {
                const action = await vscode.window.showInformationMessage(
                    'Bruno found fixes. Apply them?',
                    'Apply', 'Show Diff', 'Cancel'
                );
                
                if (action === 'Apply') {
                    await applyFixes(editor, result);
                } else if (action === 'Show Diff') {
                    await showDiff(editor, result);
                }
            }
        }),
        
        vscode.commands.registerCommand('bruno.generateTests', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active file to generate tests for');
                return;
            }
            
            const filePath = editor.document.fileName;
            const content = editor.document.getText();
            const language = editor.document.languageId;
            
            await runBrunoWithProgress(
                `Generate unit tests for this ${language} file: ${path.basename(filePath)}\n\n${content}`,
                'Generating tests...'
            );
        }),
        
        vscode.commands.registerCommand('bruno.refactorCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || !editor.selection) {
                vscode.window.showWarningMessage('No code selected to refactor');
                return;
            }
            
            const selection = editor.document.getText(editor.selection);
            const language = editor.document.languageId;
            
            const result = await runBrunoWithProgress(
                `Refactor this ${language} code for better readability and performance:\n\n${selection}`,
                'Refactoring code...'
            );
            
            if (result && result.includes('```')) {
                const action = await vscode.window.showInformationMessage(
                    'Apply refactored code?',
                    'Apply', 'Cancel'
                );
                
                if (action === 'Apply') {
                    await editor.edit(editBuilder => {
                        editBuilder.replace(editor.selection, extractCode(result));
                    });
                }
            }
        }),
        
        vscode.commands.registerCommand('bruno.askPrompt', async () => {
            const prompt = await vscode.window.showInputBox({
                prompt: 'Ask Bruno anything...',
                placeHolder: 'e.g., How do I optimize this React component?',
                ignoreFocusOut: true
            });
            
            if (prompt) {
                // Add context if there's an active file
                const editor = vscode.window.activeTextEditor;
                let contextualPrompt = prompt;
                
                if (editor) {
                    const filePath = editor.document.fileName;
                    contextualPrompt = `Context: Working in ${path.basename(filePath)}\n\n${prompt}`;
                }
                
                await runBrunoWithProgress(contextualPrompt, 'Thinking...');
            }
        }),
        
        vscode.commands.registerCommand('bruno.showSessions', async () => {
            const sessions = await brunoRunner.getSessions();
            if (sessions.length === 0) {
                vscode.window.showInformationMessage('No previous sessions found');
                return;
            }
            
            const quickPick = vscode.window.createQuickPick();
            quickPick.items = sessions.map(session => ({
                label: `Session ${session.id}`,
                description: new Date(session.timestamp).toLocaleString(),
                detail: `Model: ${session.model || 'default'}`,
                session: session
            }));
            
            quickPick.onDidChangeSelection(selection => {
                if (selection[0]) {
                    brunoRunner.loadSession(selection[0].session.id);
                    vscode.window.showInformationMessage(`Loaded session ${selection[0].session.id}`);
                }
                quickPick.hide();
            });
            
            quickPick.show();
        }),
        
        vscode.commands.registerCommand('bruno.continueSession', async () => {
            const continued = await brunoRunner.continueLastSession();
            if (continued) {
                vscode.window.showInformationMessage('Continuing last conversation...');
                outputChannel.show();
            } else {
                vscode.window.showInformationMessage('No previous session to continue');
            }
        })
    );
    
    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('bruno')) {
                const newConfig = vscode.workspace.getConfiguration('bruno');
                brunoRunner.updateConfig(newConfig);
            }
        })
    );
    
    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(hubot) Bruno';
    statusBarItem.tooltip = 'Bruno AI Assistant';
    statusBarItem.command = 'bruno.askPrompt';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    
    console.log('Bruno VS Code Extension activated!');
}

function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
}

async function runBrunoWithProgress(prompt, message) {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Bruno AI',
        cancellable: false
    }, async (progress) => {
        progress.report({ message: message });
        
        try {
            const result = await brunoRunner.execute(prompt);
            
            // Show in output channel
            outputChannel.clear();
            outputChannel.appendLine('🤖 Bruno Response:\n');
            outputChannel.appendLine(result);
            outputChannel.show();
            
            // Also show notification if enabled
            const config = vscode.workspace.getConfiguration('bruno');
            if (config.get('showNotifications')) {
                const preview = result.substring(0, 100) + '...';
                vscode.window.showInformationMessage(`Bruno: ${preview}`, 'Show Full').then(action => {
                    if (action === 'Show Full') {
                        outputChannel.show();
                    }
                });
            }
            
            return result;
        } catch (error) {
            vscode.window.showErrorMessage(`Bruno Error: ${error.message}`);
            console.error('Bruno execution error:', error);
            return null;
        }
    });
}

function extractCode(response) {
    // Extract code from markdown code blocks
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
    const matches = [...response.matchAll(codeBlockRegex)];
    
    if (matches.length > 0) {
        return matches[0][1].trim();
    }
    
    return response;
}

async function applyFixes(editor, response) {
    const fixedCode = extractCode(response);
    await editor.edit(editBuilder => {
        const fullRange = new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(editor.document.getText().length)
        );
        editBuilder.replace(fullRange, fixedCode);
    });
    
    vscode.window.showInformationMessage('Bruno fixes applied!');
}

async function showDiff(editor, response) {
    const fixedCode = extractCode(response);
    const uri = editor.document.uri;
    
    // Create a virtual document with the fixed content
    const fixedUri = vscode.Uri.parse(`bruno-fix:${uri.path}`);
    
    // Show diff editor
    await vscode.commands.executeCommand('vscode.diff', uri, fixedUri, 'Original ↔ Bruno Fixed');
}

function getBrunoPath() {
    // Try to find Bruno installation
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    if (workspacePath) {
        const localBruno = path.join(workspacePath, 'node_modules', '.bin', 'bruno31');
        if (require('fs').existsSync(localBruno)) {
            return localBruno;
        }
    }
    
    // Default to the bruno-agentic-cli path
    return path.join(__dirname, '..', 'bin', 'bruno-v31.js');
}

module.exports = {
    activate,
    deactivate
};