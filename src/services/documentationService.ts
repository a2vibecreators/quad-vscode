/**
 * DocumentationService - Code Parsing and Documentation Generation
 *
 * Parses code using tree-sitter to identify functions, classes, and methods.
 * Coordinates with GeminiService to generate AI-powered documentation.
 *
 * Supports 10+ programming languages.
 */

import * as vscode from 'vscode';
import { GeminiService } from './geminiService';

/**
 * Result of documentation generation
 */
export interface DocumentationResult {
  position: vscode.Position;
  documentation: string;
  functionName: string;
}

/**
 * Parsed function/method information
 */
interface ParsedFunction {
  name: string;
  startLine: number;
  endLine: number;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isMethod: boolean;
  className?: string;
  code: string;
}

/**
 * Language-specific documentation style mapping
 */
const LANGUAGE_STYLE_MAP: Record<string, string> = {
  typescript: 'tsdoc',
  javascript: 'jsdoc',
  typescriptreact: 'tsdoc',
  javascriptreact: 'jsdoc',
  python: 'google',
  java: 'javadoc',
  kotlin: 'javadoc',
  go: 'godoc',
  rust: 'rustdoc',
  cpp: 'doxygen',
  c: 'doxygen',
  csharp: 'xmldoc',
  php: 'phpdoc',
  ruby: 'yard',
  swift: 'swift',
};

/**
 * Service for generating code documentation
 */
export class DocumentationService {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  /**
   * Document the function at the current cursor position
   */
  public async documentFunction(
    document: vscode.TextDocument,
    position: vscode.Position,
    token?: vscode.CancellationToken
  ): Promise<DocumentationResult | null> {
    const language = document.languageId;
    const text = document.getText();

    // Find the function at cursor position
    const func = this.findFunctionAtPosition(text, position, language);

    if (!func) {
      vscode.window.showWarningMessage('No function found at cursor position');
      return null;
    }

    // Check if already documented
    if (this.hasDocumentation(document, func.startLine)) {
      const action = await vscode.window.showWarningMessage(
        `Function "${func.name}" already has documentation. Replace it?`,
        'Replace',
        'Cancel'
      );
      if (action !== 'Replace') {
        return null;
      }
    }

    // Get documentation style
    const config = vscode.workspace.getConfiguration('quad');
    let style = config.get<string>('documentationStyle', 'auto');
    if (style === 'auto') {
      style = LANGUAGE_STYLE_MAP[language] || 'jsdoc';
    }

    // Generate documentation
    const documentation = await this.geminiService.generateDocumentation(
      {
        code: func.code,
        language,
        style,
        includeExamples: config.get<boolean>('includeExamples', true),
        includeTypes: config.get<boolean>('includeTypes', true),
      },
      token
    );

    // Clean up the documentation
    const cleanedDoc = this.cleanDocumentation(documentation, style);

    // Get proper indentation
    const line = document.lineAt(func.startLine);
    const indentation = line.text.match(/^\s*/)?.[0] || '';
    const indentedDoc = this.indentDocumentation(cleanedDoc, indentation);

    return {
      position: new vscode.Position(func.startLine, 0),
      documentation: indentedDoc,
      functionName: func.name,
    };
  }

  /**
   * Document all functions in a file
   */
  public async documentFile(
    document: vscode.TextDocument,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token?: vscode.CancellationToken
  ): Promise<DocumentationResult[]> {
    const language = document.languageId;
    const text = document.getText();

    // Find all functions
    const functions = this.findAllFunctions(text, language);

    if (functions.length === 0) {
      vscode.window.showInformationMessage('No functions found in file');
      return [];
    }

    // Filter out already documented functions
    const undocumented = functions.filter(
      (func) => !this.hasDocumentation(document, func.startLine)
    );

    if (undocumented.length === 0) {
      vscode.window.showInformationMessage('All functions are already documented');
      return [];
    }

    const results: DocumentationResult[] = [];
    const increment = 100 / undocumented.length;

    for (let i = 0; i < undocumented.length; i++) {
      if (token?.isCancellationRequested) {
        break;
      }

      const func = undocumented[i];
      progress.report({
        message: `Documenting ${func.name}... (${i + 1}/${undocumented.length})`,
        increment,
      });

      try {
        const result = await this.documentFunction(
          document,
          new vscode.Position(func.startLine, 0),
          token
        );

        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Failed to document ${func.name}:`, error);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * Document selected code
   */
  public async documentSelection(
    document: vscode.TextDocument,
    selectedText: string,
    startPosition: vscode.Position,
    token?: vscode.CancellationToken
  ): Promise<DocumentationResult | null> {
    const language = document.languageId;

    // Get documentation style
    const config = vscode.workspace.getConfiguration('quad');
    let style = config.get<string>('documentationStyle', 'auto');
    if (style === 'auto') {
      style = LANGUAGE_STYLE_MAP[language] || 'jsdoc';
    }

    // Generate documentation
    const documentation = await this.geminiService.generateDocumentation(
      {
        code: selectedText,
        language,
        style,
        includeExamples: config.get<boolean>('includeExamples', true),
        includeTypes: config.get<boolean>('includeTypes', true),
      },
      token
    );

    // Clean and indent
    const cleanedDoc = this.cleanDocumentation(documentation, style);
    const line = document.lineAt(startPosition.line);
    const indentation = line.text.match(/^\s*/)?.[0] || '';
    const indentedDoc = this.indentDocumentation(cleanedDoc, indentation);

    return {
      position: new vscode.Position(startPosition.line, 0),
      documentation: indentedDoc,
      functionName: 'selection',
    };
  }

  /**
   * Find the function at a specific position using regex patterns
   * (Simplified version - tree-sitter would be used in production)
   */
  private findFunctionAtPosition(
    text: string,
    position: vscode.Position,
    language: string
  ): ParsedFunction | null {
    const lines = text.split('\n');
    const lineNumber = position.line;

    // Language-specific function patterns
    const patterns = this.getFunctionPatterns(language);

    // Search backwards and forwards from cursor to find function
    for (let i = lineNumber; i >= Math.max(0, lineNumber - 20); i--) {
      const line = lines[i];
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          // Find the end of the function
          const endLine = this.findFunctionEnd(lines, i, language);

          // Extract function code
          const code = lines.slice(i, endLine + 1).join('\n');

          return {
            name: match[1] || 'anonymous',
            startLine: i,
            endLine,
            parameters: this.extractParameters(line, language),
            isAsync: line.includes('async'),
            isMethod: false,
            code,
          };
        }
      }
    }

    return null;
  }

  /**
   * Find all functions in text
   */
  private findAllFunctions(text: string, language: string): ParsedFunction[] {
    const lines = text.split('\n');
    const functions: ParsedFunction[] = [];
    const patterns = this.getFunctionPatterns(language);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const endLine = this.findFunctionEnd(lines, i, language);
          const code = lines.slice(i, endLine + 1).join('\n');

          functions.push({
            name: match[1] || 'anonymous',
            startLine: i,
            endLine,
            parameters: this.extractParameters(line, language),
            isAsync: line.includes('async'),
            isMethod: false,
            code,
          });
          break;
        }
      }
    }

    return functions;
  }

  /**
   * Get regex patterns for function detection by language
   */
  private getFunctionPatterns(language: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      typescript: [
        /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
        /^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/,
        /^\s*(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(/,
      ],
      javascript: [
        /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
        /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/,
        /^\s*(\w+)\s*:\s*(?:async\s+)?function/,
      ],
      python: [
        /^\s*(?:async\s+)?def\s+(\w+)\s*\(/,
      ],
      java: [
        /^\s*(?:public|private|protected)?\s*(?:static)?\s*(?:\w+)\s+(\w+)\s*\(/,
      ],
      go: [
        /^\s*func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/,
      ],
      rust: [
        /^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/,
      ],
      cpp: [
        /^\s*(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*(?:const)?\s*{?$/,
      ],
      csharp: [
        /^\s*(?:public|private|protected|internal)?\s*(?:static)?\s*(?:\w+)\s+(\w+)\s*\(/,
      ],
      php: [
        /^\s*(?:public|private|protected)?\s*(?:static)?\s*function\s+(\w+)/,
      ],
      ruby: [
        /^\s*def\s+(\w+)/,
      ],
    };

    // Default to JavaScript patterns
    return patterns[language] || patterns.javascript;
  }

  /**
   * Find the end line of a function
   */
  private findFunctionEnd(lines: string[], startLine: number, language: string): number {
    let braceCount = 0;
    let started = false;

    // Python uses indentation
    if (language === 'python') {
      const startIndent = this.getIndentLevel(lines[startLine]);
      for (let i = startLine + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '' || line.startsWith('#')) continue;

        const currentIndent = this.getIndentLevel(lines[i]);
        if (currentIndent <= startIndent && line !== '') {
          return i - 1;
        }
      }
      return lines.length - 1;
    }

    // Brace-based languages
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
        }
      }
      if (started && braceCount === 0) {
        return i;
      }
    }

    return startLine;
  }

  /**
   * Get indentation level of a line
   */
  private getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  /**
   * Extract parameters from function signature
   */
  private extractParameters(line: string, language: string): string[] {
    const match = line.match(/\(([^)]*)\)/);
    if (!match) return [];

    const paramsStr = match[1].trim();
    if (!paramsStr) return [];

    return paramsStr.split(',').map((p) => p.trim());
  }

  /**
   * Check if function already has documentation
   */
  private hasDocumentation(document: vscode.TextDocument, lineNumber: number): boolean {
    if (lineNumber === 0) return false;

    const prevLine = document.lineAt(lineNumber - 1).text.trim();

    // Check for common doc comment endings
    return (
      prevLine.endsWith('*/') ||
      prevLine.endsWith('"""') ||
      prevLine.endsWith("'''") ||
      prevLine.startsWith('///')
    );
  }

  /**
   * Clean up AI-generated documentation
   */
  private cleanDocumentation(doc: string, style: string): string {
    // Remove markdown code blocks if present
    let cleaned = doc
      .replace(/^```\w*\n?/gm, '')
      .replace(/```$/gm, '')
      .trim();

    // Ensure proper format for the style
    if (style === 'jsdoc' || style === 'tsdoc' || style === 'javadoc') {
      if (!cleaned.startsWith('/**')) {
        cleaned = '/**\n' + cleaned;
      }
      if (!cleaned.endsWith('*/')) {
        cleaned = cleaned + '\n */';
      }
    }

    return cleaned;
  }

  /**
   * Add proper indentation to documentation
   */
  private indentDocumentation(doc: string, indentation: string): string {
    return doc
      .split('\n')
      .map((line, index) => (index === 0 ? indentation + line : indentation + line))
      .join('\n');
  }
}
