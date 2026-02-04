/**
 * Language configuration and utilities for the dual subtitles addon.
 * Contains language maps, browser language detection, and helper functions.
 */

// Full language map: ISO 639-3 code -> Language name
const languageMap = {
  'afr': 'Afrikaans',
  'alb': 'Albanian',
  'ara': 'Arabic',
  'arm': 'Armenian',
  'aze': 'Azerbaijani',
  'baq': 'Basque',
  'bel': 'Belarusian',
  'ben': 'Bengali',
  'bos': 'Bosnian',
  'bre': 'Breton',
  'bul': 'Bulgarian',
  'bur': 'Burmese',
  'cat': 'Catalan',
  'chi': 'Chinese (Simplified)',
  'zht': 'Chinese (Traditional)',
  'hrv': 'Croatian',
  'cze': 'Czech',
  'dan': 'Danish',
  'dut': 'Dutch',
  'eng': 'English',
  'epo': 'Esperanto',
  'est': 'Estonian',
  'fin': 'Finnish',
  'fre': 'French',
  'geo': 'Georgian',
  'ger': 'German',
  'ell': 'Greek',
  'heb': 'Hebrew',
  'hin': 'Hindi',
  'hun': 'Hungarian',
  'ice': 'Icelandic',
  'ind': 'Indonesian',
  'gle': 'Irish',
  'ita': 'Italian',
  'jpn': 'Japanese',
  'kan': 'Kannada',
  'kaz': 'Kazakh',
  'khm': 'Khmer',
  'kor': 'Korean',
  'kur': 'Kurdish',
  'lav': 'Latvian',
  'lit': 'Lithuanian',
  'ltz': 'Luxembourgish',
  'mac': 'Macedonian',
  'may': 'Malay',
  'mal': 'Malayalam',
  'mlt': 'Maltese',
  'mar': 'Marathi',
  'mon': 'Mongolian',
  'nep': 'Nepali',
  'nor': 'Norwegian',
  'per': 'Persian',
  'pol': 'Polish',
  'por': 'Portuguese',
  'pob': 'Portuguese (Brazil)',
  'rum': 'Romanian',
  'rus': 'Russian',
  'scc': 'Serbian',
  'sin': 'Sinhala',
  'slo': 'Slovak',
  'slv': 'Slovenian',
  'som': 'Somali',
  'spa': 'Spanish',
  'spl': 'Spanish (Latin America)',
  'swa': 'Swahili',
  'swe': 'Swedish',
  'tgl': 'Tagalog',
  'tam': 'Tamil',
  'tel': 'Telugu',
  'tha': 'Thai',
  'tur': 'Turkish',
  'ukr': 'Ukrainian',
  'urd': 'Urdu',
  'uzb': 'Uzbek',
  'vie': 'Vietnamese',
  'wel': 'Welsh',
};

// Map ISO 639-1 (browser) codes to ISO 639-3 (our system) codes
const browserLanguageMap = {
  'en': 'eng', 'es': 'spa', 'fr': 'fre', 'de': 'ger', 'it': 'ita',
  'pt': 'por', 'pt-br': 'pob', 'ru': 'rus', 'ja': 'jpn', 'ko': 'kor',
  'zh': 'chi', 'zh-cn': 'chi', 'zh-tw': 'zht', 'ar': 'ara', 'hi': 'hin',
  'bn': 'ben', 'te': 'tel', 'mr': 'mar', 'ta': 'tam', 'kn': 'kan',
  'ml': 'mal', 'pl': 'pol', 'uk': 'ukr', 'tr': 'tur', 'hu': 'hun',
  'cs': 'cze', 'ro': 'rum', 'nl': 'dut', 'sv': 'swe', 'da': 'dan',
  'no': 'nor', 'fi': 'fin', 'el': 'ell', 'th': 'tha', 'vi': 'vie',
  'id': 'ind', 'ms': 'may', 'fil': 'tgl', 'he': 'heb', 'fa': 'per',
  'ur': 'urd', 'sq': 'alb', 'hr': 'hrv', 'sr': 'scc', 'bg': 'bul',
  'sk': 'slo', 'sl': 'slv', 'et': 'est', 'lv': 'lav', 'lt': 'lit',
  'ca': 'cat', 'eu': 'baq', 'gl': 'glg', 'mk': 'mac', 'is': 'ice',
  'cy': 'wel', 'ga': 'gle', 'az': 'aze', 'ka': 'geo', 'hy': 'arm',
  'be': 'bel', 'bs': 'bos', 'km': 'khm', 'my': 'bur', 'ne': 'nep',
  'si': 'sin', 'sw': 'swa', 'uz': 'uzb', 'kk': 'kaz', 'mn': 'mon',
};

// Popular languages for quick selection (in display order)
const popularLanguages = [
  'eng', 'spa', 'fre', 'ger', 'ita', 'por', 'pob', 'rus', 'tur',
  'ara', 'jpn', 'kor', 'chi', 'zht', 'hin', 'dut', 'pol', 'swe',
  'dan', 'nor', 'fin', 'ell', 'cze', 'hun', 'rum', 'ukr', 'vie',
  'tha', 'ind', 'heb', 'per', 'bul', 'hrv', 'scc', 'slo', 'slv',
];

/**
 * Get language options for addon configuration.
 * @returns {string[]} Array of "Language Name [code]" strings
 */
function getLanguageOptions() {
  // Sort by language name, but keep popular ones at top
  const entries = Object.entries(languageMap);
  
  const popular = [];
  const others = [];
  
  for (const [code, name] of entries) {
    if (popularLanguages.includes(code)) {
      popular.push([code, name]);
    } else {
      others.push([code, name]);
    }
  }
  
  // Sort popular by their order in popularLanguages
  popular.sort((a, b) => popularLanguages.indexOf(a[0]) - popularLanguages.indexOf(b[0]));
  
  // Sort others alphabetically by name
  others.sort((a, b) => a[1].localeCompare(b[1]));
  
  return [...popular, ...others].map(([code, name]) => `${name} [${code}]`);
}

/**
 * Extract language code from Accept-Language header.
 * @param {string} acceptLanguageHeader - The Accept-Language header value
 * @returns {string} ISO 639-3 language code (default: 'eng')
 */
function extractBrowserLanguage(acceptLanguageHeader) {
  if (!acceptLanguageHeader) return 'eng';

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,fr;q=0.8")
  const languages = acceptLanguageHeader
    .split(',')
    .map(lang => lang.trim().split(';')[0].toLowerCase())
    .filter(lang => lang.length > 0);

  for (const lang of languages) {
    // Try full code first (e.g., "pt-br")
    if (browserLanguageMap[lang]) {
      return browserLanguageMap[lang];
    }
    // Try base code (e.g., "pt" from "pt-br")
    const baseLang = lang.split('-')[0];
    if (browserLanguageMap[baseLang]) {
      return browserLanguageMap[baseLang];
    }
  }

  return 'eng';
}

/**
 * Parse language code from config value.
 * Extracts code from "Language Name [code]" format.
 * @param {string} lang - The config value
 * @returns {string} The language code
 */
function parseLangCode(lang) {
  if (!lang) return lang;
  
  const match = lang.match(/\[([^\]]+)\]$/);
  if (match) {
    return match[1];
  }
  
  return lang;
}

/**
 * Get language name by code.
 * @param {string} code - ISO 639-3 language code
 * @returns {string} Language name or the code if not found
 */
function getLanguageName(code) {
  return languageMap[code] || code;
}

/**
 * Get formatted language option by code.
 * @param {string} code - ISO 639-3 language code
 * @returns {string} Formatted option "Language Name [code]"
 */
function getLanguageOption(code) {
  const name = languageMap[code] || code;
  return `${name} [${code}]`;
}

module.exports = {
  languageMap,
  browserLanguageMap,
  popularLanguages,
  getLanguageOptions,
  extractBrowserLanguage,
  parseLangCode,
  getLanguageName,
  getLanguageOption,
};
