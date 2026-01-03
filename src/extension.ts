/**
 * QUAD Doc Generator - VS Code Extension
 *
 * AI-powered code documentation generator using Google Gemini.
 * Supports 10+ programming languages with multilingual explanations.
 *
 * @author A2Vibe Creators LLC
 * @license MIT
 * @see https://quadframe.work
 */

import * as vscode from 'vscode';
import { GeminiService } from './services/geminiService';
import { DocumentationService } from './services/documentationService';
import { LanguageDetector } from './utils/languageDetector';

let geminiService: GeminiService;
let documentationService: DocumentationService;

/**
 * Extension activation - called when extension is first activated
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('QUAD Doc Generator is now active!');

  // Initialize services
  geminiService = new GeminiService(context);
  documentationService = new DocumentationService(geminiService);

  // Register all commands
  const commands = [
    vscode.commands.registerCommand('quad.documentFunction', () => documentFunction()),
    vscode.commands.registerCommand('quad.documentFile', () => documentFile()),
    vscode.commands.registerCommand('quad.documentSelection', () => documentSelection()),
    vscode.commands.registerCommand('quad.explainCode', () => explainCode()),
    vscode.commands.registerCommand('quad.improveCode', () => improveCode()),
    vscode.commands.registerCommand('quad.setApiKey', () => setApiKey()),
    vscode.commands.registerCommand('quad.setLanguage', () => setLanguage()),
    vscode.commands.registerCommand('quad.showUsage', () => showUsage()),
  ];

  // Add all commands to subscriptions
  commands.forEach(cmd => context.subscriptions.push(cmd));

  // Show welcome message on first activation
  const hasShownWelcome = context.globalState.get('quad.hasShownWelcome');
  if (!hasShownWelcome) {
    showWelcomeMessage();
    context.globalState.update('quad.hasShownWelcome', true);
  }
}

/**
 * Document the function/method at cursor position
 */
async function documentFunction(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor found');
    return;
  }

  const document = editor.document;
  const position = editor.selection.active;

  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'QUAD: Generating documentation...',
      cancellable: true
    }, async (progress, token) => {
      const result = await documentationService.documentFunction(document, position, token);

      if (result && !token.isCancellationRequested) {
        await applyDocumentation(editor, result);
      }
    });
  } catch (error) {
    handleError(error, 'Failed to generate documentation');
  }
}

/**
 * Document all functions in the current file
 */
async function documentFile(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor found');
    return;
  }

  const document = editor.document;

  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'QUAD: Documenting entire file...',
      cancellable: true
    }, async (progress, token) => {
      const results = await documentationService.documentFile(document, progress, token);

      if (results && results.length > 0 && !token.isCancellationRequested) {
        // Apply all documentation changes
        const edit = new vscode.WorkspaceEdit();
        for (const result of results) {
          edit.insert(document.uri, result.position, result.documentation + '\n');
        }
        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`QUAD: Documented ${results.length} functions/methods`);
      }
    });
  } catch (error) {
    handleError(error, 'Failed to document file');
  }
}

/**
 * Document selected code
 */
async function documentSelection(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor found');
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showWarningMessage('Please select code to document');
    return;
  }

  const selectedText = editor.document.getText(selection);

  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'QUAD: Generating documentation for selection...',
      cancellable: true
    }, async (progress, token) => {
      const result = await documentationService.documentSelection(
        editor.document,
        selectedText,
        selection.start,
        token
      );

      if (result && !token.isCancellationRequested) {
        await applyDocumentation(editor, result);
      }
    });
  } catch (error) {
    handleError(error, 'Failed to document selection');
  }
}

/**
 * Explain selected code in user's preferred language
 */
async function explainCode(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor found');
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showWarningMessage('Please select code to explain');
    return;
  }

  const selectedText = editor.document.getText(selection);
  const config = vscode.workspace.getConfiguration('quad');
  const responseLanguage = config.get<string>('responseLanguage', 'english');

  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'QUAD: Analyzing code...',
      cancellable: true
    }, async (progress, token) => {
      const explanation = await geminiService.explainCode(
        selectedText,
        editor.document.languageId,
        responseLanguage,
        token
      );

      if (explanation && !token.isCancellationRequested) {
        // Show explanation in a new panel
        const panel = vscode.window.createWebviewPanel(
          'quadExplanation',
          'QUAD: Code Explanation',
          vscode.ViewColumn.Beside,
          { enableScripts: false }
        );

        panel.webview.html = getExplanationHtml(explanation, responseLanguage);
      }
    });
  } catch (error) {
    handleError(error, 'Failed to explain code');
  }
}

/**
 * Suggest improvements for selected code
 */
async function improveCode(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor found');
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showWarningMessage('Please select code to improve');
    return;
  }

  const selectedText = editor.document.getText(selection);

  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'QUAD: Analyzing for improvements...',
      cancellable: true
    }, async (progress, token) => {
      const suggestions = await geminiService.suggestImprovements(
        selectedText,
        editor.document.languageId,
        token
      );

      if (suggestions && !token.isCancellationRequested) {
        // Show suggestions in a new panel
        const panel = vscode.window.createWebviewPanel(
          'quadSuggestions',
          'QUAD: Code Improvements',
          vscode.ViewColumn.Beside,
          { enableScripts: false }
        );

        panel.webview.html = getSuggestionsHtml(suggestions);
      }
    });
  } catch (error) {
    handleError(error, 'Failed to analyze code');
  }
}

/**
 * Set or update Gemini API key
 */
async function setApiKey(): Promise<void> {
  const config = vscode.workspace.getConfiguration('quad');
  const currentKey = config.get<string>('geminiApiKey', '');

  const apiKey = await vscode.window.showInputBox({
    prompt: 'Enter your Google Gemini API key',
    placeHolder: 'AIza...',
    password: true,
    value: currentKey ? '••••••••' : '',
    validateInput: (value) => {
      if (!value || value === '••••••••') {
        return 'API key is required';
      }
      if (!value.startsWith('AIza')) {
        return 'Invalid API key format (should start with AIza)';
      }
      return null;
    }
  });

  if (apiKey && apiKey !== '••••••••') {
    await config.update('geminiApiKey', apiKey, vscode.ConfigurationTarget.Global);
    geminiService.updateApiKey(apiKey);
    vscode.window.showInformationMessage('QUAD: API key saved successfully!');
  }
}

/**
 * Set preferred response language
 */
async function setLanguage(): Promise<void> {
  const languages = [
    { label: 'English', value: 'english' },
    { label: 'తెలుగు (Telugu)', value: 'telugu' },
    { label: 'हिन्दी (Hindi)', value: 'hindi' },
    { label: 'தமிழ் (Tamil)', value: 'tamil' },
    { label: 'ಕನ್ನಡ (Kannada)', value: 'kannada' },
    { label: 'മലയാളം (Malayalam)', value: 'malayalam' },
    { label: 'मराठी (Marathi)', value: 'marathi' },
    { label: 'বাংলা (Bengali)', value: 'bengali' },
    { label: 'ગુજરાતી (Gujarati)', value: 'gujarati' },
    { label: 'ਪੰਜਾਬੀ (Punjabi)', value: 'punjabi' },
    { label: 'Español (Spanish)', value: 'spanish' },
    { label: 'Français (French)', value: 'french' },
    { label: 'Deutsch (German)', value: 'german' },
    { label: 'Auto-detect', value: 'auto' },
  ];

  const selected = await vscode.window.showQuickPick(languages, {
    placeHolder: 'Select your preferred language for explanations',
    title: 'QUAD: Response Language'
  });

  if (selected) {
    const config = vscode.workspace.getConfiguration('quad');
    await config.update('responseLanguage', selected.value, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`QUAD: Response language set to ${selected.label}`);
  }
}

/**
 * Show API usage statistics
 */
async function showUsage(): Promise<void> {
  const usage = geminiService.getUsageStats();

  const message = `
QUAD API Usage:
─────────────────────────
Today: ${usage.todayRequests} / ${usage.dailyLimit} requests
Total: ${usage.totalRequests} requests
API Key: ${usage.hasOwnKey ? 'Your key' : 'QUAD Pool (${usage.poolRemaining}/20)'}
  `;

  vscode.window.showInformationMessage(message, 'Get API Key').then(selection => {
    if (selection === 'Get API Key') {
      vscode.env.openExternal(vscode.Uri.parse('https://makersuite.google.com/app/apikey'));
    }
  });
}

/**
 * Show welcome message on first activation
 */
function showWelcomeMessage(): void {
  vscode.window.showInformationMessage(
    'Welcome to QUAD Doc Generator! Get started with Cmd/Ctrl+Shift+D to document a function.',
    'Set API Key',
    'View Docs'
  ).then(selection => {
    if (selection === 'Set API Key') {
      setApiKey();
    } else if (selection === 'View Docs') {
      vscode.env.openExternal(vscode.Uri.parse('https://quadframe.work/docs/vscode-plugin'));
    }
  });
}

/**
 * Apply generated documentation to the editor
 */
async function applyDocumentation(
  editor: vscode.TextEditor,
  result: { position: vscode.Position; documentation: string }
): Promise<void> {
  const config = vscode.workspace.getConfiguration('quad');
  const showPreview = config.get<boolean>('showInlinePreview', true);

  if (showPreview) {
    // Show preview first
    const action = await vscode.window.showInformationMessage(
      'Documentation generated. Insert it?',
      'Insert',
      'Preview',
      'Cancel'
    );

    if (action === 'Insert') {
      await editor.edit(editBuilder => {
        editBuilder.insert(result.position, result.documentation + '\n');
      });
    } else if (action === 'Preview') {
      // Show in output channel
      const channel = vscode.window.createOutputChannel('QUAD Preview');
      channel.appendLine(result.documentation);
      channel.show();
    }
  } else {
    // Insert directly
    await editor.edit(editBuilder => {
      editBuilder.insert(result.position, result.documentation + '\n');
    });
  }
}

/**
 * Handle errors gracefully
 */
function handleError(error: unknown, context: string): void {
  console.error(`QUAD Error: ${context}`, error);

  let message = context;
  if (error instanceof Error) {
    if (error.message.includes('API_KEY')) {
      message = 'Invalid or missing API key. Please set your Gemini API key.';
      vscode.window.showErrorMessage(message, 'Set API Key').then(selection => {
        if (selection === 'Set API Key') {
          setApiKey();
        }
      });
      return;
    }
    if (error.message.includes('QUOTA')) {
      message = 'API quota exceeded. Try again tomorrow or use your own API key.';
    }
    message = `${context}: ${error.message}`;
  }

  vscode.window.showErrorMessage(`QUAD: ${message}`);
}

/**
 * Generate HTML for code explanation panel
 */
function getExplanationHtml(explanation: string, language: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      line-height: 1.6;
    }
    h1 {
      color: var(--vscode-editor-foreground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 10px;
    }
    .content {
      white-space: pre-wrap;
    }
    .language-badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <h1>Code Explanation <span class="language-badge">${language}</span></h1>
  <div class="content">${escapeHtml(explanation)}</div>
</body>
</html>
  `;
}

/**
 * Generate HTML for suggestions panel
 */
function getSuggestionsHtml(suggestions: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      line-height: 1.6;
    }
    h1 {
      color: var(--vscode-editor-foreground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 10px;
    }
    .content {
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <h1>Code Improvement Suggestions</h1>
  <div class="content">${escapeHtml(suggestions)}</div>
</body>
</html>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extension deactivation - cleanup
 */
export function deactivate(): void {
  console.log('QUAD Doc Generator has been deactivated');
}
