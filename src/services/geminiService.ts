/**
 * GeminiService - Google Gemini AI Integration
 *
 * Handles all AI-powered features:
 * - Code documentation generation
 * - Code explanation with multilingual support
 * - Code improvement suggestions
 *
 * Supports both user's own API key and QUAD Pool (shared).
 */

import * as vscode from 'vscode';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

interface UsageStats {
  todayRequests: number;
  totalRequests: number;
  dailyLimit: number;
  hasOwnKey: boolean;
  poolRemaining: number;
}

interface DocumentationRequest {
  code: string;
  language: string;
  style: string;
  includeExamples: boolean;
  includeTypes: boolean;
}

/**
 * Service for interacting with Google Gemini AI
 */
export class GeminiService {
  private context: vscode.ExtensionContext;
  private model: GenerativeModel | null = null;
  private apiKey: string = '';
  private isUsingPool: boolean = false;

  // QUAD Pool API key (shared, limited usage)
  private static readonly QUAD_POOL_KEY = 'QUAD_POOL_PLACEHOLDER'; // Replaced at build time
  private static readonly DAILY_POOL_LIMIT = 20;
  private static readonly DAILY_OWN_KEY_LIMIT = 1500;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.initializeApiKey();
  }

  /**
   * Initialize API key from settings or pool
   */
  private initializeApiKey(): void {
    const config = vscode.workspace.getConfiguration('quad');
    const userKey = config.get<string>('geminiApiKey', '');
    const usePool = config.get<boolean>('useQuadPool', true);

    if (userKey && userKey.length > 0) {
      this.apiKey = userKey;
      this.isUsingPool = false;
    } else if (usePool) {
      this.apiKey = GeminiService.QUAD_POOL_KEY;
      this.isUsingPool = true;
    }

    if (this.apiKey && this.apiKey !== 'QUAD_POOL_PLACEHOLDER') {
      this.initializeModel();
    }
  }

  /**
   * Initialize Gemini model
   */
  private initializeModel(): void {
    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    } catch (error) {
      console.error('Failed to initialize Gemini model:', error);
      this.model = null;
    }
  }

  /**
   * Update API key at runtime
   */
  public updateApiKey(newKey: string): void {
    this.apiKey = newKey;
    this.isUsingPool = false;
    this.initializeModel();
  }

  /**
   * Check if service is ready
   */
  public isReady(): boolean {
    return this.model !== null;
  }

  /**
   * Generate documentation for code
   */
  public async generateDocumentation(
    request: DocumentationRequest,
    token?: vscode.CancellationToken
  ): Promise<string> {
    if (!this.model) {
      throw new Error('API_KEY: Gemini API key not configured');
    }

    if (!this.checkQuota()) {
      throw new Error('QUOTA: Daily request limit exceeded');
    }

    const prompt = this.buildDocumentationPrompt(request);

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      this.incrementUsage();
      return text;
    } catch (error) {
      if (error instanceof Error && error.message.includes('429')) {
        throw new Error('QUOTA: Rate limit exceeded. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Explain code in user's preferred language
   */
  public async explainCode(
    code: string,
    programmingLanguage: string,
    responseLanguage: string,
    token?: vscode.CancellationToken
  ): Promise<string> {
    if (!this.model) {
      throw new Error('API_KEY: Gemini API key not configured');
    }

    if (!this.checkQuota()) {
      throw new Error('QUOTA: Daily request limit exceeded');
    }

    const languageInstruction = this.getLanguageInstruction(responseLanguage);

    const prompt = `You are an expert programmer and teacher.

Analyze this ${programmingLanguage} code and explain what it does.

${languageInstruction}

Code to explain:
\`\`\`${programmingLanguage}
${code}
\`\`\`

Provide:
1. A brief summary of what the code does
2. Line-by-line explanation of key parts
3. Any potential issues or improvements
4. Example use cases

${responseLanguage !== 'english' ? `IMPORTANT: Respond entirely in ${responseLanguage}. Technical terms can remain in English.` : ''}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      this.incrementUsage();
      return text;
    } catch (error) {
      if (error instanceof Error && error.message.includes('429')) {
        throw new Error('QUOTA: Rate limit exceeded. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Suggest improvements for code
   */
  public async suggestImprovements(
    code: string,
    programmingLanguage: string,
    token?: vscode.CancellationToken
  ): Promise<string> {
    if (!this.model) {
      throw new Error('API_KEY: Gemini API key not configured');
    }

    if (!this.checkQuota()) {
      throw new Error('QUOTA: Daily request limit exceeded');
    }

    const prompt = `You are a senior software engineer conducting a code review.

Analyze this ${programmingLanguage} code and suggest improvements.

Code to review:
\`\`\`${programmingLanguage}
${code}
\`\`\`

Provide suggestions in these categories:
1. **Performance**: Any performance optimizations
2. **Readability**: Code clarity improvements
3. **Best Practices**: Language-specific best practices
4. **Security**: Any security concerns
5. **Maintainability**: Long-term maintenance considerations

For each suggestion:
- Explain why it's an improvement
- Show the improved code snippet

Be specific and actionable. Only suggest improvements that add real value.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      this.incrementUsage();
      return text;
    } catch (error) {
      if (error instanceof Error && error.message.includes('429')) {
        throw new Error('QUOTA: Rate limit exceeded. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Detect language from text (for auto-detect mode)
   */
  public async detectLanguage(text: string): Promise<string> {
    if (!this.model) {
      return 'english';
    }

    const prompt = `Detect the language of this text and respond with ONLY the language name in lowercase (e.g., "telugu", "hindi", "english"):

"${text.substring(0, 100)}"`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const detected = response.text().trim().toLowerCase();

      // Validate response
      const validLanguages = [
        'english', 'telugu', 'hindi', 'tamil', 'kannada', 'malayalam',
        'marathi', 'bengali', 'gujarati', 'punjabi', 'spanish', 'french',
        'german', 'portuguese', 'chinese', 'japanese', 'korean', 'arabic', 'russian'
      ];

      return validLanguages.includes(detected) ? detected : 'english';
    } catch {
      return 'english';
    }
  }

  /**
   * Build documentation generation prompt
   */
  private buildDocumentationPrompt(request: DocumentationRequest): string {
    const styleGuide = this.getStyleGuide(request.style, request.language);

    let prompt = `You are an expert technical writer specializing in code documentation.

Generate documentation for this ${request.language} code using ${request.style} style.

${styleGuide}

Code to document:
\`\`\`${request.language}
${request.code}
\`\`\`

Requirements:
- Follow the exact ${request.style} format
- Be concise but complete
- Use proper grammar`;

    if (request.includeTypes) {
      prompt += '\n- Include type annotations for all parameters and return values';
    }

    if (request.includeExamples) {
      prompt += '\n- Include a practical usage example';
    }

    prompt += '\n\nRespond ONLY with the documentation comment. No additional text.';

    return prompt;
  }

  /**
   * Get style-specific documentation guide
   */
  private getStyleGuide(style: string, language: string): string {
    const guides: Record<string, string> = {
      jsdoc: `JSDoc format:
/**
 * Brief description.
 * @param {type} name - Parameter description
 * @returns {type} Return description
 * @example
 * // Usage example
 */`,

      tsdoc: `TSDoc format:
/**
 * Brief description.
 * @param name - Parameter description
 * @returns Return description
 * @example
 * // Usage example
 */`,

      javadoc: `Javadoc format:
/**
 * Brief description.
 *
 * @param name parameter description
 * @return return description
 * @throws ExceptionType when exception occurs
 */`,

      google: `Google Python style:
"""Brief description.

Args:
    name: Parameter description.

Returns:
    Return description.

Raises:
    ExceptionType: When exception occurs.

Example:
    >>> example_usage()
"""`,

      numpy: `NumPy style:
"""Brief description.

Parameters
----------
name : type
    Parameter description.

Returns
-------
type
    Return description.

Examples
--------
>>> example_usage()
"""`,

      rustdoc: `Rustdoc format:
/// Brief description.
///
/// # Arguments
///
/// * \`name\` - Parameter description
///
/// # Returns
///
/// Return description
///
/// # Examples
///
/// \`\`\`
/// example_usage();
/// \`\`\``,

      godoc: `GoDoc format (comment block before function):
// FunctionName does something.
//
// It takes name parameter and returns result.
// Returns error if something fails.`,

      xmldoc: `C# XML documentation:
/// <summary>
/// Brief description.
/// </summary>
/// <param name="name">Parameter description.</param>
/// <returns>Return description.</returns>
/// <exception cref="ExceptionType">When exception occurs.</exception>
/// <example>
/// <code>
/// ExampleUsage();
/// </code>
/// </example>`,
    };

    return guides[style] || guides.jsdoc;
  }

  /**
   * Get language-specific instruction for multilingual responses
   */
  private getLanguageInstruction(language: string): string {
    const instructions: Record<string, string> = {
      telugu: 'మీ వివరణను తెలుగులో అందించండి. తెలుగులో వివరించండి.',
      hindi: 'अपना स्पष्टीकरण हिंदी में दें।',
      tamil: 'உங்கள் விளக்கத்தை தமிழில் கொடுங்கள்.',
      kannada: 'ನಿಮ್ಮ ವಿವರಣೆಯನ್ನು ಕನ್ನಡದಲ್ಲಿ ನೀಡಿ.',
      malayalam: 'നിങ്ങളുടെ വിശദീകരണം മലയാളത്തിൽ നൽകുക.',
      marathi: 'तुमचे स्पष्टीकरण मराठीत द्या.',
      bengali: 'আপনার ব্যাখ্যা বাংলায় দিন।',
      gujarati: 'તમારી સમજૂતી ગુજરાતીમાં આપો.',
      punjabi: 'ਆਪਣੀ ਵਿਆਖਿਆ ਪੰਜਾਬੀ ਵਿੱਚ ਦਿਓ।',
      spanish: 'Proporcione su explicación en español.',
      french: 'Fournissez votre explication en français.',
      german: 'Geben Sie Ihre Erklärung auf Deutsch.',
      chinese: '请用中文提供您的解释。',
      japanese: '日本語で説明してください。',
      korean: '한국어로 설명해 주세요.',
      arabic: 'قدم شرحك باللغة العربية.',
      russian: 'Дайте объяснение на русском языке.',
    };

    return instructions[language] || '';
  }

  /**
   * Check if user has quota remaining
   */
  private checkQuota(): boolean {
    const today = new Date().toDateString();
    const lastDate = this.context.globalState.get<string>('quad.lastUsageDate', '');
    const todayCount = this.context.globalState.get<number>('quad.todayUsage', 0);

    // Reset if new day
    if (lastDate !== today) {
      this.context.globalState.update('quad.lastUsageDate', today);
      this.context.globalState.update('quad.todayUsage', 0);
      return true;
    }

    const limit = this.isUsingPool
      ? GeminiService.DAILY_POOL_LIMIT
      : GeminiService.DAILY_OWN_KEY_LIMIT;

    return todayCount < limit;
  }

  /**
   * Increment usage counter
   */
  private incrementUsage(): void {
    const todayCount = this.context.globalState.get<number>('quad.todayUsage', 0);
    const totalCount = this.context.globalState.get<number>('quad.totalUsage', 0);

    this.context.globalState.update('quad.todayUsage', todayCount + 1);
    this.context.globalState.update('quad.totalUsage', totalCount + 1);
  }

  /**
   * Get usage statistics
   */
  public getUsageStats(): UsageStats {
    const today = new Date().toDateString();
    const lastDate = this.context.globalState.get<string>('quad.lastUsageDate', '');
    let todayRequests = this.context.globalState.get<number>('quad.todayUsage', 0);

    // Reset if new day
    if (lastDate !== today) {
      todayRequests = 0;
    }

    const totalRequests = this.context.globalState.get<number>('quad.totalUsage', 0);
    const dailyLimit = this.isUsingPool
      ? GeminiService.DAILY_POOL_LIMIT
      : GeminiService.DAILY_OWN_KEY_LIMIT;

    return {
      todayRequests,
      totalRequests,
      dailyLimit,
      hasOwnKey: !this.isUsingPool,
      poolRemaining: this.isUsingPool
        ? Math.max(0, GeminiService.DAILY_POOL_LIMIT - todayRequests)
        : 0,
    };
  }
}
