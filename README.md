# QUAD Doc Generator

**AI-powered code documentation generator for VS Code**

Generate professional documentation for your code using Google Gemini AI. Supports 10+ programming languages with multilingual explanations.

![QUAD Doc Generator](https://quadframe.work/images/vscode-plugin-demo.gif)

## Features

### 🚀 One-Click Documentation

Select any function and press `Cmd+Shift+D` (Mac) or `Ctrl+Shift+D` (Windows) to instantly generate documentation.

```typescript
// Before
function calculateTotal(price, taxRate, discount) {
  return (price * (1 + taxRate)) - discount;
}

// After (with QUAD)
/**
 * Calculates the final total price including tax and discount.
 *
 * @param price - The base price of the item
 * @param taxRate - Tax rate as a decimal (e.g., 0.08 for 8%)
 * @param discount - Discount amount to subtract
 * @returns The final price after tax and discount
 *
 * @example
 * calculateTotal(100, 0.08, 10) // Returns 98
 */
function calculateTotal(price, taxRate, discount) {
  return (price * (1 + taxRate)) - discount;
}
```

### 🌍 Multilingual Support

Get code explanations in your native language! QUAD supports:

- **Indian Languages**: Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi
- **World Languages**: English, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Arabic, Russian

Code and documentation stay in English (universal standard), but explanations come in your preferred language.

### 📚 10+ Languages Supported

| Language | Doc Style |
|----------|-----------|
| TypeScript/JavaScript | TSDoc/JSDoc |
| Python | Google/NumPy/Sphinx |
| Java/Kotlin | Javadoc |
| Go | GoDoc |
| Rust | Rustdoc |
| C# | XML Documentation |
| C/C++ | Doxygen |
| PHP | PHPDoc |
| Ruby | YARD |
| Swift | Swift Markup |

### 💡 Code Explanation

Select code and press `Cmd+Shift+E` to get a detailed explanation:

- What the code does
- How it works step by step
- Potential issues or improvements
- Usage examples

### ⚡ Free to Use

- **Free Gemini API**: Get your own key at [Google AI Studio](https://makersuite.google.com/app/apikey) (1,500 requests/day)
- **QUAD Pool**: Don't have a key? Use our shared pool (20 requests/day)
- **No subscription required**

## Installation

1. Open VS Code
2. Go to Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for "QUAD Doc Generator"
4. Click Install

Or install from command line:
```bash
code --install-extension a2vibecreators.quad-doc-generator
```

## Quick Start

1. **Set your API key** (optional but recommended):
   - Press `Cmd+Shift+P` → "QUAD: Set Gemini API Key"
   - Get your free key at [Google AI Studio](https://makersuite.google.com/app/apikey)

2. **Generate documentation**:
   - Place cursor on a function
   - Press `Cmd+Shift+D` (Mac) or `Ctrl+Shift+D` (Windows)

3. **Explain code**:
   - Select code
   - Press `Cmd+Shift+E` (Mac) or `Ctrl+Shift+E` (Windows)

## Commands

| Command | Shortcut (Mac) | Shortcut (Win) | Description |
|---------|----------------|----------------|-------------|
| Document Function | `Cmd+Shift+D` | `Ctrl+Shift+D` | Generate docs for function at cursor |
| Document Selection | `Cmd+Alt+D` | `Ctrl+Alt+D` | Generate docs for selected code |
| Document File | - | - | Document all functions in file |
| Explain Code | `Cmd+Shift+E` | `Ctrl+Shift+E` | Explain selected code |
| Suggest Improvements | - | - | Get code improvement suggestions |
| Set API Key | - | - | Configure Gemini API key |
| Set Language | - | - | Set response language |
| Show Usage | - | - | View API usage statistics |

## Configuration

Access settings via `Preferences > Settings > Extensions > QUAD Doc Generator`

| Setting | Default | Description |
|---------|---------|-------------|
| `quad.geminiApiKey` | - | Your Google Gemini API key |
| `quad.responseLanguage` | `english` | Language for code explanations |
| `quad.documentationStyle` | `auto` | Documentation style (auto-detect or specific) |
| `quad.includeExamples` | `true` | Include usage examples in docs |
| `quad.includeTypes` | `true` | Include type annotations |
| `quad.showInlinePreview` | `true` | Preview before inserting |
| `quad.useQuadPool` | `true` | Use shared pool when no API key |

## Get Your Free API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key
5. In VS Code: `Cmd+Shift+P` → "QUAD: Set Gemini API Key"

**Free tier includes 1,500 requests/day** - enough for most developers!

## FAQ

### Why Gemini instead of other AI providers?

Gemini offers a generous free tier (1,500 requests/day) with excellent code understanding capabilities. This means you can use QUAD Doc Generator at no cost.

### Can I use my own OpenAI/Claude key?

Not currently, but BYOK (Bring Your Own Key) for other providers is planned for a future update.

### Is my code sent to external servers?

Yes, code is sent to Google's Gemini API for analysis. If you're working with sensitive code, consider using a self-hosted solution or reviewing your organization's AI usage policies.

### Why are my requests failing?

Common reasons:
- Invalid API key - verify at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Rate limit exceeded - wait or get your own API key
- Network issues - check your connection

## About QUAD Framework

QUAD Doc Generator is part of the [QUAD Framework](https://quadframe.work) - a comprehensive project management and AI-assisted development platform.

**Other QUAD products:**
- **QUAD Web** - Full project management with AI assistance
- **QUAD API** - Integrate AI-powered features into your apps
- **QUAD Memory** - Hierarchical context management for AI

## Support

- 📖 [Documentation](https://quadframe.work/docs/vscode-plugin)
- 🐛 [Report Issues](https://github.com/a2vibecreators/quad-vscode-plugin/issues)
- 💬 [Community](https://discord.gg/quadframework)

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Made with ❤️ by [A2Vibe Creators](https://a2vibecreators.com)**

*Coding documentation, simplified.*
