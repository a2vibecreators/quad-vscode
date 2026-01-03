/**
 * LanguageDetector - Natural Language Detection Utility
 *
 * Detects the human language of text input for multilingual support.
 * Uses character range analysis and common word patterns.
 */

/**
 * Detected language result
 */
export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  script: string;
}

/**
 * Unicode script ranges for Indian and common languages
 */
const SCRIPT_RANGES: Record<string, [number, number][]> = {
  telugu: [[0x0C00, 0x0C7F]],
  hindi: [[0x0900, 0x097F]], // Devanagari
  tamil: [[0x0B80, 0x0BFF]],
  kannada: [[0x0C80, 0x0CFF]],
  malayalam: [[0x0D00, 0x0D7F]],
  bengali: [[0x0980, 0x09FF]],
  gujarati: [[0x0A80, 0x0AFF]],
  punjabi: [[0x0A00, 0x0A7F]], // Gurmukhi
  marathi: [[0x0900, 0x097F]], // Uses Devanagari like Hindi
  arabic: [[0x0600, 0x06FF]],
  chinese: [[0x4E00, 0x9FFF], [0x3400, 0x4DBF]],
  japanese: [[0x3040, 0x309F], [0x30A0, 0x30FF], [0x4E00, 0x9FFF]],
  korean: [[0xAC00, 0xD7AF], [0x1100, 0x11FF]],
  russian: [[0x0400, 0x04FF]], // Cyrillic
};

/**
 * Common words for Latin-script languages
 */
const LATIN_LANGUAGE_MARKERS: Record<string, string[]> = {
  english: ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'been', 'will', 'would', 'could', 'should', 'this', 'that', 'function', 'return', 'class', 'import'],
  spanish: ['el', 'la', 'los', 'las', 'es', 'son', 'está', 'están', 'que', 'de', 'en', 'por', 'para', 'con', 'función', 'clase'],
  french: ['le', 'la', 'les', 'est', 'sont', 'que', 'qui', 'dans', 'pour', 'avec', 'fonction', 'classe', 'retour'],
  german: ['der', 'die', 'das', 'ist', 'sind', 'haben', 'wird', 'werden', 'mit', 'für', 'und', 'Funktion', 'Klasse'],
  portuguese: ['o', 'a', 'os', 'as', 'é', 'são', 'está', 'estão', 'que', 'de', 'em', 'para', 'com', 'função', 'classe'],
};

/**
 * Utility class for detecting human languages
 */
export class LanguageDetector {
  /**
   * Detect the language of given text
   */
  public static detect(text: string): LanguageDetectionResult {
    if (!text || text.trim().length === 0) {
      return { language: 'english', confidence: 0, script: 'latin' };
    }

    // First, check for non-Latin scripts
    const scriptResult = this.detectScript(text);
    if (scriptResult.confidence > 0.3) {
      return scriptResult;
    }

    // For Latin script, check common words
    const latinResult = this.detectLatinLanguage(text);
    return latinResult;
  }

  /**
   * Detect language based on Unicode script ranges
   */
  private static detectScript(text: string): LanguageDetectionResult {
    const charCounts: Record<string, number> = {};
    let totalNonSpace = 0;

    for (const char of text) {
      if (/\s/.test(char)) continue;
      totalNonSpace++;

      for (const [lang, ranges] of Object.entries(SCRIPT_RANGES)) {
        const code = char.charCodeAt(0);
        for (const [start, end] of ranges) {
          if (code >= start && code <= end) {
            charCounts[lang] = (charCounts[lang] || 0) + 1;
            break;
          }
        }
      }
    }

    if (totalNonSpace === 0) {
      return { language: 'english', confidence: 0, script: 'latin' };
    }

    // Find the dominant script
    let maxLang = 'english';
    let maxCount = 0;

    for (const [lang, count] of Object.entries(charCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxLang = lang;
      }
    }

    const confidence = maxCount / totalNonSpace;

    // Distinguish Hindi from Marathi (both use Devanagari)
    if (maxLang === 'hindi' || maxLang === 'marathi') {
      const marathiMarkers = ['आहे', 'नाही', 'हे', 'ते', 'मी', 'तुम्ही'];
      const hindiMarkers = ['है', 'हैं', 'था', 'थे', 'यह', 'वह', 'मैं', 'आप'];

      const marathiScore = marathiMarkers.filter(m => text.includes(m)).length;
      const hindiScore = hindiMarkers.filter(m => text.includes(m)).length;

      maxLang = marathiScore > hindiScore ? 'marathi' : 'hindi';
    }

    return {
      language: maxLang,
      confidence,
      script: this.getScriptName(maxLang),
    };
  }

  /**
   * Detect language for Latin-script text
   */
  private static detectLatinLanguage(text: string): LanguageDetectionResult {
    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};

    for (const [lang, markers] of Object.entries(LATIN_LANGUAGE_MARKERS)) {
      scores[lang] = words.filter(w => markers.includes(w)).length;
    }

    let maxLang = 'english';
    let maxScore = 0;

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxLang = lang;
      }
    }

    const confidence = words.length > 0 ? Math.min(maxScore / words.length, 1) : 0;

    return {
      language: maxLang,
      confidence: Math.max(confidence, 0.5), // Default to at least 50% for Latin text
      script: 'latin',
    };
  }

  /**
   * Get script name for a language
   */
  private static getScriptName(language: string): string {
    const scripts: Record<string, string> = {
      telugu: 'Telugu',
      hindi: 'Devanagari',
      marathi: 'Devanagari',
      tamil: 'Tamil',
      kannada: 'Kannada',
      malayalam: 'Malayalam',
      bengali: 'Bengali',
      gujarati: 'Gujarati',
      punjabi: 'Gurmukhi',
      arabic: 'Arabic',
      chinese: 'Han',
      japanese: 'Japanese',
      korean: 'Hangul',
      russian: 'Cyrillic',
    };

    return scripts[language] || 'Latin';
  }

  /**
   * Check if text contains any non-Latin characters
   */
  public static hasNonLatinCharacters(text: string): boolean {
    // Basic Latin + Latin Extended
    const latinPattern = /^[\u0000-\u024F\s\d\p{P}]+$/u;
    return !latinPattern.test(text);
  }

  /**
   * Get display name for a language code
   */
  public static getDisplayName(languageCode: string): string {
    const names: Record<string, string> = {
      english: 'English',
      telugu: 'తెలుగు (Telugu)',
      hindi: 'हिन्दी (Hindi)',
      tamil: 'தமிழ் (Tamil)',
      kannada: 'ಕನ್ನಡ (Kannada)',
      malayalam: 'മലയാളം (Malayalam)',
      bengali: 'বাংলা (Bengali)',
      gujarati: 'ગુજરાતી (Gujarati)',
      punjabi: 'ਪੰਜਾਬੀ (Punjabi)',
      marathi: 'मराठी (Marathi)',
      spanish: 'Español (Spanish)',
      french: 'Français (French)',
      german: 'Deutsch (German)',
      portuguese: 'Português (Portuguese)',
      chinese: '中文 (Chinese)',
      japanese: '日本語 (Japanese)',
      korean: '한국어 (Korean)',
      arabic: 'العربية (Arabic)',
      russian: 'Русский (Russian)',
    };

    return names[languageCode] || languageCode;
  }
}
