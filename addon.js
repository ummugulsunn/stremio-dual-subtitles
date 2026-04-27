/**
 * Stremio Dual Subtitles Addon
 * Fetches subtitles from OpenSubtitles and merges two languages into one file.
 * Perfect for language learners who want to see both original and translation.
 */

const path = require('path');
const { addonBuilder } = require('stremio-addon-sdk');
const axios = require('axios');
const pako = require('pako');
const sanitize = require('sanitize-html');
const { debugServer, sanitizeForLogging } = require('./lib/debug');
/**
 * Simple SRT parser (more reliable than external libraries)
 */
function parseSrtSimple(srtText) {
  const lines = srtText.trim().split('\n');
  const subtitles = [];
  let current = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      if (current && current.text) {
        subtitles.push(current);
        current = null;
      }
      continue;
    }
    
    // Check if it's a sequence number
    if (!current && /^\d+$/.test(line)) {
      current = { id: line, text: '' };
      continue;
    }
    
    // Check if it's a timestamp line
    if (current && !current.startTime && line.includes('-->')) {
      const [start, end] = line.split('-->').map(s => s.trim());
      current.startTime = start;
      current.endTime = end;
      continue;
    }
    
    // Otherwise it's text
    if (current && current.startTime) {
      if (current.text) current.text += '\n';
      current.text += line;
    }
  }
  
  // Add last subtitle if exists
  if (current && current.text) {
    subtitles.push(current);
  }
  
  return subtitles;
}

/**
 * Simple SRT formatter
 */
function formatSrtSimple(subtitles) {
  const lines = [];
  
  for (let i = 0; i < subtitles.length; i++) {
    const sub = subtitles[i];
    lines.push(String(i + 1));
    lines.push(`${sub.startTime} --> ${sub.endTime}`);
    lines.push(sub.text);
    lines.push('');
  }
  
  return lines.join('\n');
}

const { decodeSubtitleBuffer, getLanguageAliases, isCjkLanguage } = require('./encoding');
const {
  languageMap,
  getLanguageOptions,
  extractBrowserLanguage,
  parseLangCode,
  getLanguageName
} = require('./languages');
const { alignAndMatch } = require('./lib/syncEngine');
const { generateCandidatePairs } = require('./lib/sourceSelection');

// Match rate at or above this is considered "good enough" — we stop
// trying further candidate pairs. Empirically high-quality matches land
// 90-99%, decent ones 80-90%, mismatched ones 45-70%. We pick 0.85 so
// the gate trusts a clearly-high pair (1 attempt) but still spends a
// second fetch to triangulate when the first is only "okay".
const QUALITY_GATE_THRESHOLD = 0.85;
// Hard cap on how many pairs we'll fetch+merge before giving up. Three
// is enough to cover (best same-group, zipped-popularity, runner-up)
// while keeping the serverless cold path bounded.
const MAX_PAIR_ATTEMPTS = 3;

// Configuration
const ADDON_NAME = process.env.ADDON_NAME || 'Dual Subtitles';
const ADDON_VERSION = '1.0.0';



// Create addon manifest
const manifest = {
  id: 'community.dualsubtitles',
  version: ADDON_VERSION,
  name: ADDON_NAME,
  description: 'Watch movies and series with dual subtitles - see two languages simultaneously for better language learning!',
  resources: ['subtitles'],
  types: ['movie', 'series'],
  idPrefixes: ['tt'],
  catalogs: [],
  logo: '/logo.png',
  behaviorHints: {
    configurable: true,
    configurationRequired: true
  },
  stremioAddonsConfig: {
    issuer: 'https://stremio-addons.net',
    signature: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..0dhMmLAGB8GgrgR0k_QVag.QvSVlwg-SctRXOgQgdIhydZx55LSndygGe4uCb2VrwGzHfQm5hyH0j3BxQOMrMZWuBxFkMkVYt9QF4jNx6yyffbx1ub8KJCjnKl9SfBCkI9aFk9RrD7T0FbuPurxIbrd.OH-8gvJWWzw6O7QtreVs_w'
  },
  config: [
    {
      key: 'mainLang',
      type: 'select',
      title: 'Primary Language (Audio/Learning Language)',
      options: getLanguageOptions(),
      required: true,
      default: 'English [eng]'
    },
    {
      key: 'transLang',
      type: 'select',
      title: 'Secondary Language (Your Native Language)',
      options: getLanguageOptions(),
      required: true,
      default: 'Turkish [tur]'
    }
  ]
};

const builder = new addonBuilder(manifest);

async function fetchWithRetry(url, options = {}, retries = 2, backoffMs = 500) {
  try {
    return await axios.get(url, options);
  } catch (error) {
    const status = error && error.response ? error.response.status : null;
    if (retries > 0 && (status === 429 || status === 469 || status === 503 || status === 504)) {
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return fetchWithRetry(url, options, retries - 1, backoffMs * 2);
    }
    throw error;
  }
}

/**
 * Fetch all subtitles from OpenSubtitles API.
 */
async function fetchAllSubtitles(imdbId, type, season = null, episode = null, videoParams = {}) {
  let apiUrl = `https://opensubtitles-v3.strem.io/subtitles/${type}/tt${imdbId}`;

  if (type === 'series' && season && episode) {
    apiUrl += `:${season}:${episode}`;
  }

  // Add query params for better matching
  const queryParams = [];
  if (videoParams.filename) queryParams.push(`filename=${encodeURIComponent(videoParams.filename)}`);
  if (videoParams.videoSize) queryParams.push(`videoSize=${videoParams.videoSize}`);
  if (videoParams.videoHash) queryParams.push(`videoHash=${videoParams.videoHash}`);
  
  if (queryParams.length > 0) {
    apiUrl += `/${queryParams.join('&')}`;
  }
  
  apiUrl += '.json';

  try {
    const response = await fetchWithRetry(apiUrl, { timeout: 15000 });
    
    if (!response.data || !response.data.subtitles || response.data.subtitles.length === 0) {
      return null;
    }

    return response.data.subtitles;
  } catch (error) {
    debugServer.error('Error fetching subtitles:', sanitizeForLogging(error.message));
    return null;
  }
}

/**
 * Filter subtitles by language code.
 */
function filterSubtitlesByLanguage(allSubtitles, languageId) {
  if (!allSubtitles) return null;

  const codesToMatch = getLanguageAliases(languageId);
  const langSubs = allSubtitles.filter(sub => codesToMatch.includes(sub.lang));

  if (langSubs.length === 0) return null;

  // Sort by downloads (higher = better quality typically)
  langSubs.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));

  return langSubs.map((sub, idx) => ({
    id: sub.id,
    url: sub.url,
    lang: sub.lang,
    langName: languageMap[sub.lang] || sub.lang,
    downloads: sub.downloads || (langSubs.length - idx)
  }));
}

/**
 * Fetch and decode subtitle content from URL.
 */
async function fetchSubtitleContent(url, languageCode = null) {
  try {
    const response = await fetchWithRetry(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 5 * 1024 * 1024 // 5MB limit
    });

    // Skip forced subtitles — they only contain signs/songs, not full dialogue
    const disposition = response.headers && response.headers['content-disposition'];
    if (disposition && disposition.toLowerCase().includes('forced')) {
      return null;
    }

    let buffer = Buffer.from(response.data);

    // Handle gzip compressed files
    if (url.endsWith('.gz') || (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b)) {
      try {
        buffer = Buffer.from(pako.ungzip(buffer));
      } catch (e) {
        debugServer.error('Error decompressing gzip:', sanitizeForLogging(e.message));
        return null;
      }
    }

    const text = decodeSubtitleBuffer(buffer, languageCode);
    return text;
  } catch (error) {
    debugServer.error('Error fetching subtitle:', sanitizeForLogging(error.message));
    return null;
  }
}

/**
 * Parse SRT/VTT time format to milliseconds.
 * Accepts both comma (SRT: 00:01:23,456) and period (VTT: 00:01:23.456) separators.
 */
function parseTimeToMs(timeString) {
  if (!timeString) return 0;

  const match = timeString.match(/(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (!match) return 0;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const ms = match[4].padEnd(3, '0');
  const milliseconds = parseInt(ms, 10);
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
}

/**
 * Normalize VTT content to SRT-compatible format.
 * Strips WEBVTT header, style blocks, and adds numeric cue IDs if missing.
 */
function normalizeVttToSrt(text) {
  const lines = text.split('\n');
  const output = [];
  let cueIndex = 0;
  let inHeader = true;
  let inStyleBlock = false;
  let expectTimestamp = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (inHeader) {
      if (line === '' || line.startsWith('WEBVTT') || line.startsWith('Kind:') ||
          line.startsWith('Language:') || line.startsWith('NOTE')) {
        continue;
      }
      inHeader = false;
    }

    if (line.startsWith('STYLE') || line.startsWith('::cue')) {
      inStyleBlock = true;
      continue;
    }
    if (inStyleBlock) {
      if (line === '') inStyleBlock = false;
      continue;
    }

    if (line.includes('-->')) {
      cueIndex++;
      const normalized = line.replace(/\./g, ',');
      output.push('');
      output.push(String(cueIndex));
      output.push(normalized);
      expectTimestamp = false;
      continue;
    }

    // Skip VTT numeric cue identifiers (a number line right before a timestamp)
    if (/^\d+$/.test(line) && i + 1 < lines.length && lines[i + 1].includes('-->')) {
      continue;
    }

    output.push(line);
    expectTimestamp = false;
  }

  return output.join('\n');
}

/**
 * Parse SRT text into subtitle objects. Also handles VTT input.
 */
function parseSrt(srtText) {
  if (!srtText || typeof srtText !== 'string') return null;

  try {
    // Normalize line endings
    srtText = srtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remove BOM if present
    if (srtText.charCodeAt(0) === 0xFEFF) {
      srtText = srtText.substring(1);
    }

    // Detect and convert VTT format
    const trimmed = srtText.trimStart();
    if (trimmed.startsWith('WEBVTT')) {
      srtText = normalizeVttToSrt(srtText);
    }
    
    // Normalize period-separated timestamps to comma-separated for the parser
    srtText = srtText.replace(
      /(\d{1,2}:\d{2}:\d{2})\.(\d{1,3})/g,
      '$1,$2'
    );
    
    // Use simple parser
    const parsed = parseSrtSimple(srtText);
    
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    // Filter out ads
    const adKeywords = ['OpenSubtitles.org', 'OpenSubtitles.com', 'osdb.link', 'Advertise your'];
    const filtered = parsed.filter(sub => 
      !adKeywords.some(keyword => (sub.text || '').includes(keyword))
    );

    return filtered;
  } catch (error) {
    debugServer.error('Error parsing SRT:', sanitizeForLogging(error.message));
    return null;
  }
}

/**
 * Convert milliseconds to SRT time format.
 */
function msToSrtTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Join multi-line subtitle text into a single line.
 * For CJK languages, joins without spaces to avoid breaking character flow.
 */
function joinSubtitleLines(text, langCode) {
  if (!text) return '';
  const cjk = isCjkLanguage(langCode);
  return text.replace(/\r?\n|\r/g, cjk ? '' : ' ').trim();
}

/** Escape text embedded in SRT HTML tags (avoid breaking markup / injection). */
function htmlEncodeSrt(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Muted color for secondary line; players that ignore <font> still have <b> + › marker. */
const DUAL_SUB_TRANS_COLOR = '#94a3b8';

/**
 * Merge two subtitle arrays into one, aligning the secondary track to the
 * primary track's timebase before matching.
 *
 * The actual alignment work (global offset detection via cross-correlation,
 * affine drift correction, and overlap-based bipartite assignment) is in
 * lib/syncEngine.js. This function is a thin wrapper that converts SRT
 * timestamp strings to milliseconds, runs the engine, and renders the
 * dual-line SRT text.
 *
 * @param {Array} mainSubs - Primary language subtitles (SRT-time strings)
 * @param {Array} transSubs - Translation language subtitles (SRT-time strings)
 * @param {Object|number} options - Merge options (number = legacy threshold)
 * @param {string|null} [options.mainLang]  - For CJK-aware line joining
 * @param {string|null} [options.transLang] - For CJK-aware line joining
 * @param {number}      [options.matchThresholdMs=1500]
 * @param {boolean}     [options.allowMultiTrans=true]
 *        If true, several short trans cues may be concatenated into one
 *        primary cue (handles cue-boundary mismatches).
 * @param {boolean}     [options.enableOffset=true]
 * @param {boolean}     [options.enableDrift=true]
 */
function mergeSubtitles(mainSubs, transSubs, options = {}) {
  const opts = typeof options === 'number'
    ? { matchThresholdMs: Math.max(options, 1500) }
    : options;

  const {
    mainLang = null,
    transLang = null,
    matchThresholdMs = 1500,
    allowMultiTrans = true,
    enableOffset = true,
    enableDrift = true
  } = opts;

  const mainTimed = [];
  for (const s of mainSubs || []) {
    if (!s || !s.startTime || !s.endTime) continue;
    const startMs = parseTimeToMs(s.startTime);
    const endMs = parseTimeToMs(s.endTime);
    if (endMs <= startMs) continue;
    mainTimed.push({ ...s, startMs, endMs });
  }

  const transTimed = [];
  for (const s of transSubs || []) {
    if (!s || !s.startTime || !s.endTime) continue;
    const startMs = parseTimeToMs(s.startTime);
    const endMs = parseTimeToMs(s.endTime);
    if (endMs <= startMs) continue;
    transTimed.push({ ...s, startMs, endMs });
  }

  const alignment = alignAndMatch(mainTimed, transTimed, {
    enableOffset,
    enableDrift,
    matchThreshold: matchThresholdMs,
    allowMultiTrans,
    log: msg => debugServer.log(sanitizeForLogging(msg))
  });
  const { matches } = alignment;

  const transJoiner = isCjkLanguage(transLang) ? '' : ' ';
  const mergedSubs = [];

  for (let mi = 0; mi < mainTimed.length; mi++) {
    const mainSub = mainTimed[mi];

    const cleanMainText = joinSubtitleLines(
      sanitize(mainSub.text, { allowedTags: [], allowedAttributes: {} }),
      mainLang
    );
    if (!cleanMainText) continue;

    let mergedText;
    const transIdxs = matches.get(mi);
    if (transIdxs && transIdxs.length > 0) {
      const transParts = [];
      for (const ti of transIdxs) {
        const t = transTimed[ti];
        if (!t) continue;
        const piece = joinSubtitleLines(
          sanitize(t.text, { allowedTags: [], allowedAttributes: {} }),
          transLang
        );
        if (piece) transParts.push(piece);
      }
      if (transParts.length > 0) {
        const cleanTransText = transParts.join(transJoiner);
        const encMain = htmlEncodeSrt(cleanMainText);
        const encTrans = htmlEncodeSrt(cleanTransText);
        mergedText =
          `<b>${encMain}</b>\n\u203a <i><font color="${DUAL_SUB_TRANS_COLOR}">${encTrans}</font></i>`;
      }
    }

    if (mergedText === undefined) {
      mergedText = `<b>${htmlEncodeSrt(cleanMainText)}</b>`;
    }

    if (!mergedText) continue;

    mergedSubs.push({
      id: mainSub.id,
      startTime: mainSub.startTime,
      endTime: mainSub.endTime,
      text: mergedText
    });
  }

  // Backwards compatible: callers that used `mergeSubtitles` as a plain
  // array still iterate / .length / spread it as before. Quality-gate
  // callers can read alignment metrics from non-enumerable properties.
  Object.defineProperty(mergedSubs, 'matchRate', {
    value: alignment.matchRate || 0,
    enumerable: false
  });
  Object.defineProperty(mergedSubs, 'alignment', {
    value: {
      offsetMs: alignment.offsetMs,
      drift: alignment.drift,
      localAnchors: alignment.localAnchors,
      matchedCount: matches.size,
      mainCount: mainTimed.length
    },
    enumerable: false
  });
  return mergedSubs;
}

/**
 * Format subtitle array back to SRT string.
 */
function formatSrt(subtitleArray) {
  if (!Array.isArray(subtitleArray)) return null;

  try {
    return formatSrtSimple(subtitleArray);
  } catch (error) {
    debugServer.error('Error formatting SRT:', sanitizeForLogging(error.message));
    return null;
  }
}

// In-memory cache for merged subtitles
const subtitleCache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Store subtitle in cache and return data URL.
 */
function storeSubtitle(key, srtContent) {
  // Clean old entries
  const now = Date.now();
  for (const [k, v] of subtitleCache.entries()) {
    if (now - v.timestamp > CACHE_TTL) {
      subtitleCache.delete(k);
    }
  }

  subtitleCache.set(key, {
    content: srtContent,
    timestamp: now
  });

  return key;
}

/**
 * Get subtitle from cache.
 */
function getSubtitle(key) {
  const entry = subtitleCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    subtitleCache.delete(key);
    return null;
  }
  
  return entry.content;
}

/**
 * Try candidate (main, trans) pairs in order. For each pair, fetch both
 * subtitle files, parse them, and run mergeSubtitles. The first pair whose
 * match rate clears QUALITY_GATE_THRESHOLD wins; otherwise we return the
 * best pair we saw, capped at MAX_PAIR_ATTEMPTS.
 *
 * Each fetched subtitle is cached in `parsedCache` so retrying with the
 * same main against a different trans (or vice versa) doesn't re-download.
 *
 * @param {Array} candidatePairs    output of generateCandidatePairs
 * @param {string} mainLang
 * @param {string} transLang
 * @returns {Promise<{
 *   merged: Array, mergedSrt: string, matchRate: number,
 *   mainSub: object, transSub: object, attempts: number,
 *   passedGate: boolean
 * } | null>}
 */
async function selectAndMergeBestPair(candidatePairs, mainLang, transLang) {
  if (!Array.isArray(candidatePairs) || candidatePairs.length === 0) return null;

  const parsedCache = new Map();
  async function getParsed(sub, lang) {
    if (parsedCache.has(sub.id)) return parsedCache.get(sub.id);
    const content = await fetchSubtitleContent(sub.url, lang);
    const parsed = content ? parseSrt(content) : null;
    parsedCache.set(sub.id, parsed);
    return parsed;
  }

  let best = null;
  const attempts = Math.min(candidatePairs.length, MAX_PAIR_ATTEMPTS);

  for (let i = 0; i < attempts; i++) {
    const pair = candidatePairs[i];
    debugServer.log(
      `Pair attempt ${i + 1}/${attempts}: main=${pair.main.id} trans=${pair.trans.id} ` +
      `source=${pair.source} sameGroup=${pair.sameGroup} g=${pair.group}`
    );

    const [mainParsed, transParsed] = await Promise.all([
      getParsed(pair.main, mainLang),
      getParsed(pair.trans, transLang)
    ]);
    if (!mainParsed || mainParsed.length === 0) {
      debugServer.warn(`  main subtitle ${pair.main.id} unparsable, skipping`);
      continue;
    }
    if (!transParsed || transParsed.length === 0) {
      debugServer.warn(`  trans subtitle ${pair.trans.id} unparsable, skipping`);
      continue;
    }

    const merged = mergeSubtitles(mainParsed, transParsed, { mainLang, transLang });
    const matchRate = merged && merged.matchRate != null ? merged.matchRate : 0;
    debugServer.log(`  match rate: ${(matchRate * 100).toFixed(1)}%`);

    if (!best || matchRate > best.matchRate) {
      best = {
        merged,
        mergedSrt: merged && merged.length > 0 ? formatSrt(merged) : null,
        matchRate,
        mainSub: pair.main,
        transSub: pair.trans,
        attempts: i + 1,
        passedGate: matchRate >= QUALITY_GATE_THRESHOLD
      };
    }
    if (matchRate >= QUALITY_GATE_THRESHOLD) {
      debugServer.log(`  passed quality gate, stopping`);
      break;
    }
  }

  if (best) {
    debugServer.log(
      `Selected pair: main=${best.mainSub.id} trans=${best.transSub.id} ` +
      `matchRate=${(best.matchRate * 100).toFixed(1)}% attempts=${best.attempts} ` +
      `passedGate=${best.passedGate}`
    );
  }
  return best;
}

// Subtitle handler function
async function subtitlesHandler({ type, id, extra, config }) {
  debugServer.log('Subtitle request:', sanitizeForLogging({ type, id }));

  // Get configured languages
  const mainLangRaw = config?.mainLang || 'English [eng]';
  const transLangRaw = config?.transLang || 'Turkish [tur]';

  const mainLang = parseLangCode(mainLangRaw);
  const transLang = parseLangCode(transLangRaw);

  debugServer.log(`Languages: Primary=${mainLang}, Secondary=${transLang}`);

  // Prevent same language selection
  if (mainLang === transLang) {
    debugServer.warn('Error: Same language selected for both');
    return { subtitles: [] };
  }

  // Parse IMDB ID
  let imdbId = extra?.imdbId || id;
  let season = extra?.season;
  let episode = extra?.episode;

  if (imdbId.includes(':')) {
    const parts = imdbId.split(':');
    imdbId = parts[0];
    if (parts.length >= 3) {
      season = season || parts[1];
      episode = episode || parts[2];
    }
  }

  imdbId = imdbId.replace('tt', '');

  if (!imdbId) {
    debugServer.warn('No valid IMDB ID');
    return { subtitles: [] };
  }

  try {
    // Video params for better matching
    const videoParams = {
      filename: extra?.filename,
      videoSize: extra?.videoSize,
      videoHash: extra?.videoHash
    };

    // Fetch all subtitles
    debugServer.log('Fetching subtitles from OpenSubtitles...');
    const allSubtitles = await fetchAllSubtitles(imdbId, type, season, episode, videoParams);

    if (!allSubtitles) {
      debugServer.warn('No subtitles found');
      return { subtitles: [] };
    }

    debugServer.log(`Found ${allSubtitles.length} total subtitles`);

    // Build the ordered list of (main, trans) candidates. Same-`g`
    // (same release) pairs come first; this is our biggest single
    // accuracy win on titles like Sopranos S01E03.
    const candidatePairs = generateCandidatePairs(allSubtitles, mainLang, transLang);

    if (candidatePairs.length === 0) {
      debugServer.warn(`No ${mainLang}/${transLang} candidate pairs available`);
      return { subtitles: [] };
    }

    debugServer.log(
      `Built ${candidatePairs.length} candidate pair(s); ` +
      `same-group: ${candidatePairs.filter(p => p.sameGroup).length}`
    );

    // CPU-cheap path: do NOT fetch / parse / merge here. Just publish
    // the URL of the best-ranked pair. The actual download + alignment
    // happens once, on demand, when Stremio fetches the .srt URL. This
    // halves Vercel Active CPU per dual-subtitle request, since the old
    // code ran the entire pipeline twice (once here for nothing).
    const best = candidatePairs[0];

    const dynamicParams = [
      type,
      imdbId,
      season || '0',
      episode || '0',
      mainLang,
      transLang,
      best.main.id,
      best.trans.id
    ].join('/');

    const finalSubtitles = [{
      id: `dual-${best.main.id}-${best.trans.id}`,
      url: `{{ADDON_URL}}/subs/${dynamicParams}.srt`,
      lang: mainLang,
      SubtitlesName:
        `Dual (${mainLang.toUpperCase()}+${transLang.toUpperCase()}) - ` +
        `${getLanguageName(mainLang)} + ${getLanguageName(transLang)}`
    }];

    debugServer.log(
      `Selected pair (no merge): main=${best.main.id} trans=${best.trans.id} ` +
      `source=${best.source} sameGroup=${best.sameGroup}`
    );

    return {
      subtitles: finalSubtitles,
      cacheMaxAge: 6 * 3600
    };

  } catch (error) {
    debugServer.error('Error in subtitle handler:', sanitizeForLogging(error.message));
    return { subtitles: [] };
  }
}

// Register the handler with the builder
builder.defineSubtitlesHandler(subtitlesHandler);

/**
 * Generate merged subtitle dynamically (for serverless environments)
 * Called directly by URL. Results are cached in `subtitleCache` so any
 * repeat hit on the same Vercel instance skips fetch + parse + merge
 * entirely — even ahead of Vercel's edge cache (which ALSO caches via
 * Cache-Control headers in server.js routes).
 */
async function generateDynamicSubtitle(type, imdbId, season, episode, mainLang, transLang, mainSubId, transSubId) {
  debugServer.log('Dynamic subtitle generation:', { type, imdbId, mainLang, transLang });

  const cacheKey = `${imdbId}_${season || ''}_${episode || ''}_${mainLang}_${transLang}_${mainSubId}_${transSubId}`;
  const cached = getSubtitle(cacheKey);
  if (cached) {
    debugServer.log(`Cache hit (in-instance): ${cacheKey}`);
    return cached;
  }

  try {
    // Fetch all subtitles
    const allSubtitles = await fetchAllSubtitles(
      imdbId, 
      type, 
      season !== '0' ? season : null, 
      episode !== '0' ? episode : null
    );

    if (!allSubtitles) {
      debugServer.warn('No subtitles found');
      return null;
    }

    // Build candidate pairs for this title; we'll start by trying the
    // exact pair encoded in the URL (the one subtitlesHandler picked),
    // then fall back to other candidates if the match rate is too low.
    const candidatePairs = generateCandidatePairs(allSubtitles, mainLang, transLang);

    const requestedMain = allSubtitles.find(s => String(s.id) === String(mainSubId));
    const requestedTrans = allSubtitles.find(s => String(s.id) === String(transSubId));

    let orderedPairs = candidatePairs;
    if (requestedMain && requestedTrans) {
      // Move the URL-requested pair to the front (or insert it if it
      // wasn't in the candidate list, e.g. addon was upgraded mid-cache).
      const isSameGroup =
        requestedMain.g === requestedTrans.g && requestedMain.g != null;
      const head = {
        main: requestedMain,
        trans: requestedTrans,
        sameGroup: isSameGroup,
        group: isSameGroup ? requestedMain.g : null,
        source: 'requested'
      };
      orderedPairs = [
        head,
        ...candidatePairs.filter(
          p => !(String(p.main.id) === String(mainSubId) &&
                 String(p.trans.id) === String(transSubId))
        )
      ];
    } else {
      debugServer.warn(
        'Requested specific pair not present in fresh subtitle list; ' +
        'falling back to ranked candidates'
      );
    }

    if (orderedPairs.length === 0) return null;

    const best = await selectAndMergeBestPair(orderedPairs, mainLang, transLang);
    if (!best || !best.merged || best.merged.length === 0) {
      debugServer.warn('No usable merged subtitle from any pair');
      return null;
    }

    const srtContent = best.mergedSrt;
    debugServer.log(
      `Generated ${best.merged.length} merged subtitle entries ` +
      `(matchRate=${(best.matchRate * 100).toFixed(1)}%, attempts=${best.attempts})`
    );

    if (srtContent) storeSubtitle(cacheKey, srtContent);
    return srtContent;
  } catch (error) {
    debugServer.error('Error generating dynamic subtitle:', sanitizeForLogging(error.message));
    return null;
  }
}

module.exports = {
  builder,
  manifest,
  getSubtitle,
  subtitleCache,
  subtitlesHandler,
  generateDynamicSubtitle,
  // Exported for testing
  _test: {
    parseTimeToMs,
    parseSrt,
    parseSrtSimple,
    normalizeVttToSrt,
    mergeSubtitles,
    joinSubtitleLines,
    formatSrt,
    formatSrtSimple,
    msToSrtTime
  }
};
