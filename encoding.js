/**
 * Subtitle encoding detection and fixing utilities.
 * Handles various encodings including UTF-8, UTF-16, legacy codepages, and double-encoded text.
 */

const chardet = require('chardet');
const iconv = require('iconv-lite');

// Sample size for chardet detection (1KB is enough for accurate detection)
const CHARDET_SAMPLE_SIZE = 1024;

/**
 * Map OpenSubtitles 3-letter codes to ISO 639-1 2-letter codes.
 * Used for encoding detection - maps API language codes to script detection codes.
 */
const ISO639_3_TO_1 = {
  // Major world languages
  'ara': 'ar', 'chi': 'zh', 'zho': 'zh', 'eng': 'en',
  'fre': 'fr', 'fra': 'fr', 'ger': 'de', 'deu': 'de',
  'hin': 'hi', 'ita': 'it', 'jpn': 'ja', 'kor': 'ko',
  'por': 'pt', 'rus': 'ru', 'spa': 'es', 'tur': 'tr',
  
  // European languages
  'alb': 'sq', 'sqi': 'sq', 'arm': 'hy', 'hye': 'hy',
  'aze': 'az', 'baq': 'eu', 'eus': 'eu', 'bel': 'be',
  'bos': 'bs', 'bul': 'bg', 'cat': 'ca', 'cze': 'cs',
  'ces': 'cs', 'dan': 'da', 'dut': 'nl', 'nld': 'nl',
  'ell': 'el', 'gre': 'el', 'est': 'et', 'fin': 'fi',
  'geo': 'ka', 'kat': 'ka', 'hrv': 'hr', 'hun': 'hu',
  'ice': 'is', 'isl': 'is', 'lav': 'lv', 'lit': 'lt',
  'mac': 'mk', 'mkd': 'mk', 'nor': 'no', 'nob': 'no',
  'pol': 'pl', 'rum': 'ro', 'ron': 'ro', 'scc': 'sr',
  'srp': 'sr', 'slo': 'sk', 'slk': 'sk', 'slv': 'sl',
  'swe': 'sv', 'ukr': 'uk', 'wel': 'cy', 'cym': 'cy',
  
  // Middle Eastern
  'heb': 'he', 'per': 'fa', 'fas': 'fa', 'urd': 'ur',
  
  // Asian languages
  'ben': 'bn', 'tha': 'th', 'vie': 'vi', 'ind': 'id',
  'may': 'ms', 'msa': 'ms', 'tgl': 'tl',
  
  // Chinese variants
  'zht': 'zh', 'zhc': 'zh',
  
  // Portuguese/Spanish variants
  'pob': 'pt', 'pom': 'pt', 'spl': 'es', 'spn': 'es',
};

/**
 * Language code aliases - maps between different code variants.
 */
const LANGUAGE_ALIASES = {
  'alb': ['alb', 'sqi'],
  'sqi': ['sqi', 'alb'],
  'chi': ['chi', 'zho'],
  'zho': ['zho', 'chi'],
  'cze': ['cze', 'ces'],
  'ces': ['ces', 'cze'],
  'dut': ['dut', 'nld'],
  'nld': ['nld', 'dut'],
  'fre': ['fre', 'fra'],
  'fra': ['fra', 'fre'],
  'ger': ['ger', 'deu'],
  'deu': ['deu', 'ger'],
  'gre': ['gre', 'ell'],
  'ell': ['ell', 'gre'],
  'rum': ['rum', 'ron'],
  'ron': ['ron', 'rum'],
  'slo': ['slo', 'slk'],
  'slk': ['slk', 'slo'],
  'per': ['per', 'fas'],
  'fas': ['fas', 'per'],
  'mac': ['mac', 'mkd'],
  'mkd': ['mkd', 'mac'],
  'ice': ['ice', 'isl'],
  'isl': ['isl', 'ice'],
  'scc': ['scc', 'srp'],
  'srp': ['srp', 'scc'],
};

/**
 * Get all equivalent language codes for a given code.
 * @param {string} languageCode - A 3-letter language code
 * @returns {string[]} Array of equivalent codes
 */
function getLanguageAliases(languageCode) {
  return LANGUAGE_ALIASES[languageCode] || [languageCode];
}

/**
 * Convert 3-letter language code to 2-letter.
 * @param {string} lang - Language code (2 or 3 letter)
 * @returns {string|null} 2-letter code or null
 */
function normalizeLanguageCode(lang) {
  if (!lang) return null;
  const lower = lang.toLowerCase();
  if (lower.length === 2) return lower;
  return ISO639_3_TO_1[lower] || null;
}

/**
 * Language-to-encoding mapping for legacy subtitle files.
 */
const LANGUAGE_ENCODINGS = {
  // Cyrillic languages
  'ru': ['win1251', 'koi8-r'],
  'uk': ['win1251', 'koi8-u'],
  'bg': ['win1251'],
  'sr': ['win1251'],
  'mk': ['win1251'],
  'be': ['win1251'],
  
  // Greek
  'el': ['win1253', 'iso88597'],
  
  // Turkish
  'tr': ['win1254', 'iso88599'],
  
  // Hebrew
  'he': ['win1255', 'iso88598'],
  
  // Arabic
  'ar': ['win1256', 'iso88596'],
  
  // Thai
  'th': ['win874', 'tis620'],
  
  // Vietnamese
  'vi': ['win1258'],
  
  // Central/Eastern European
  'pl': ['win1250', 'iso88592'],
  'cs': ['win1250', 'iso88592'],
  'sk': ['win1250', 'iso88592'],
  'hu': ['win1250', 'iso88592'],
  'ro': ['win1250', 'iso88592'],
  'hr': ['win1250', 'iso88592'],
  'sl': ['win1250', 'iso88592'],
  
  // Baltic
  'lt': ['win1257'],
  'lv': ['win1257'],
  'et': ['win1257'],
  
  // Western European
  'de': ['win1252', 'iso88591'],
  'fr': ['win1252', 'iso88591'],
  'es': ['win1252', 'iso88591'],
  'it': ['win1252', 'iso88591'],
  'pt': ['win1252', 'iso88591'],
  
  // CJK
  'zh': ['gbk', 'gb2312', 'big5'],
  'ja': ['shift_jis', 'euc-jp'],
  'ko': ['euc-kr', 'cp949'],
};

/**
 * Build a prioritized list of codepage encodings to try.
 * @param {string|null} languageHint - 2-letter ISO language code
 * @returns {Array<{name: string, desc: string}>} Prioritized list
 */
function buildCodepageList(languageHint = null) {
  const defaultCodepages = [
    { name: 'win1252', desc: 'Windows-1252 (Western)' },
    { name: 'win1251', desc: 'Windows-1251 (Cyrillic)' },
    { name: 'win1253', desc: 'Windows-1253 (Greek)' },
    { name: 'win1254', desc: 'Windows-1254 (Turkish)' },
    { name: 'win1250', desc: 'Windows-1250 (Central European)' },
    { name: 'win1255', desc: 'Windows-1255 (Hebrew)' },
    { name: 'win1256', desc: 'Windows-1256 (Arabic)' },
    { name: 'win874', desc: 'Windows-874 (Thai)' },
    { name: 'win1258', desc: 'Windows-1258 (Vietnamese)' },
    { name: 'win1257', desc: 'Windows-1257 (Baltic)' },
  ];

  if (!languageHint) return defaultCodepages;

  const langEncodings = LANGUAGE_ENCODINGS[languageHint.toLowerCase()];
  if (!langEncodings || langEncodings.length === 0) return defaultCodepages;

  const descMap = {
    'win1250': 'Windows-1250 (Central European)',
    'win1251': 'Windows-1251 (Cyrillic)',
    'win1252': 'Windows-1252 (Western)',
    'win1253': 'Windows-1253 (Greek)',
    'win1254': 'Windows-1254 (Turkish)',
    'win1255': 'Windows-1255 (Hebrew)',
    'win1256': 'Windows-1256 (Arabic)',
    'win1257': 'Windows-1257 (Baltic)',
    'win1258': 'Windows-1258 (Vietnamese)',
    'win874': 'Windows-874 (Thai)',
    'koi8-r': 'KOI8-R (Russian)',
    'koi8-u': 'KOI8-U (Ukrainian)',
  };

  const prioritized = [];
  const usedNames = new Set();

  for (const encoding of langEncodings) {
    const name = encoding.toLowerCase();
    prioritized.push({
      name,
      desc: descMap[name] || `${encoding.toUpperCase()}`
    });
    usedNames.add(name);
  }

  for (const cp of defaultCodepages) {
    if (!usedNames.has(cp.name)) {
      prioritized.push(cp);
    }
  }

  return prioritized;
}

/**
 * Fix double-encoded UTF-8 or misencoded legacy codepage text.
 * @param {string} text - The text to fix
 * @param {string|null} languageHint - Language code for encoding hints
 * @returns {string} The fixed text
 */
function fixCharacterEncodings(text, languageHint = null) {
  const langCode = normalizeLanguageCode(languageHint);

  // Patterns indicating misencoded text
  const patterns = {
    thaiCjk: /[\u00E0-\u00EF][\u0080-\u00BF]/g,
    accented: /\u00C3[\u0080-\u00BF]/g,
    special: /\u00C2[\u0080-\u00BF]/g,
    cyrillic: /[\u00D0-\u00D4][\u0080-\u00BF]/g,
    greek: /[\u00CC-\u00CF][\u0080-\u00BF]/g,
    hebrew: /\u00D7[\u0080-\u00BF]/g,
    arabic: /[\u00D8-\u00DB][\u0080-\u00BF]/g,
  };

  let totalMatches = 0;
  for (const pattern of Object.values(patterns)) {
    totalMatches += (text.match(pattern) || []).length;
  }

  if (totalMatches > 10) {
    const bytes = Buffer.from(text, 'latin1');

    // Try UTF-8 first (double-encoded UTF-8)
    const utf8Fixed = bytes.toString('utf8');
    if (!utf8Fixed.includes('\uFFFD')) {
      let fixedTotal = 0;
      for (const pattern of Object.values(patterns)) {
        fixedTotal += (utf8Fixed.match(pattern) || []).length;
      }
      if (fixedTotal < totalMatches * 0.2) {
        return utf8Fixed;
      }
    }

    // Try Windows codepages
    const codepages = buildCodepageList(langCode);
    for (const { name } of codepages) {
      try {
        const fixed = iconv.decode(bytes, name);
        if (fixed.includes('\uFFFD')) continue;

        let fixedTotal = 0;
        for (const pattern of Object.values(patterns)) {
          fixedTotal += (fixed.match(pattern) || []).length;
        }
        if (fixedTotal < totalMatches * 0.2) {
          return fixed;
        }
      } catch (e) {
        // Codepage not supported
      }
    }
  }

  return text;
}

/**
 * Normalize encoding name from chardet to iconv-lite compatible.
 * @param {string} encoding - The encoding name from chardet
 * @returns {string} Normalized encoding name
 */
function normalizeEncoding(encoding) {
  if (!encoding) return 'utf8';

  const normalized = encoding.toLowerCase();
  switch (normalized) {
    case 'windows-1254': return 'win1254';
    case 'windows-1251': return 'win1251';
    case 'windows-1252': return 'win1252';
    case 'iso-8859-9': return 'iso88599';
    case 'utf-16le': return 'utf16le';
    case 'utf-16be': return 'utf16be';
    case 'ascii':
    case 'us-ascii':
    case 'utf-8':
      return 'utf8';
    default:
      if (iconv.encodingExists(normalized)) {
        return normalized;
      }
      return 'utf8';
  }
}

/**
 * Decode a subtitle buffer, handling various encodings.
 * @param {Buffer} buffer - The raw subtitle file buffer
 * @param {string|null} languageHint - Language code for encoding hints
 * @returns {string|null} The decoded subtitle text
 */
function decodeSubtitleBuffer(buffer, languageHint = null) {
  const langCode = normalizeLanguageCode(languageHint);
  let subtitleText;

  // Check for double-encoded UTF-16 LE BOM
  if (buffer.length >= 4 && buffer[0] === 0xC3 && buffer[1] === 0xBF && 
      buffer[2] === 0xC3 && buffer[3] === 0xBE) {
    const undoubled = Buffer.from(buffer.toString('utf8'), 'latin1');
    subtitleText = undoubled.slice(2).toString('utf16le');
  }
  // Check for UTF-16 LE BOM
  else if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    subtitleText = buffer.slice(2).toString('utf16le');
  }
  // Check for UTF-16 BE BOM
  else if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    const swapped = Buffer.alloc(buffer.length - 2);
    for (let i = 2; i < buffer.length; i += 2) {
      if (i + 1 < buffer.length) {
        swapped[i - 2] = buffer[i + 1];
        swapped[i - 1] = buffer[i];
      }
    }
    subtitleText = swapped.toString('utf16le');
  }
  // Check for UTF-8 BOM
  else if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    subtitleText = buffer.slice(3).toString('utf8');
  }
  // No BOM - use chardet
  else {
    const sample = buffer.slice(0, Math.min(buffer.length, CHARDET_SAMPLE_SIZE));
    const detectedEncoding = chardet.detect(sample);
    const encoding = normalizeEncoding(detectedEncoding);

    if (encoding !== 'utf8') {
      try {
        subtitleText = iconv.decode(buffer, encoding);
      } catch (e) {
        subtitleText = buffer.toString('utf8');
      }
    } else {
      subtitleText = buffer.toString('utf8');
    }
  }

  // Apply text-level encoding fixes
  subtitleText = fixCharacterEncodings(subtitleText, langCode);

  // Strip any remaining BOM
  if (subtitleText.startsWith('\uFEFF')) {
    subtitleText = subtitleText.slice(1);
  }
  if (subtitleText.startsWith('ï»¿')) {
    subtitleText = subtitleText.slice(3);
  }

  return subtitleText;
}

module.exports = {
  decodeSubtitleBuffer,
  normalizeLanguageCode,
  getLanguageAliases,
  fixCharacterEncodings,
  ISO639_3_TO_1,
  LANGUAGE_ALIASES,
};
