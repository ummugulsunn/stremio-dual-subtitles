/**
 * Stremio Dual Subtitles Addon
 * Fetches subtitles from OpenSubtitles and merges two languages into one file.
 * Perfect for language learners who want to see both original and translation.
 */

const { addonBuilder } = require('stremio-addon-sdk');
const axios = require('axios');
const pako = require('pako');
const sanitize = require('sanitize-html');
const SrtParser = require('srt-parser-2').default;

const { decodeSubtitleBuffer, getLanguageAliases } = require('./encoding');
const { 
  languageMap, 
  getLanguageOptions, 
  extractBrowserLanguage, 
  parseLangCode,
  getLanguageName 
} = require('./languages');

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
  logo: 'https://raw.githubusercontent.com/Serkali-sudo/strelingo-addon/main/assets/strelingo_icon.jpg',
  behaviorHints: {
    configurable: true,
    configurationRequired: true
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

/**
 * Fetch all subtitles from OpenSubtitles API.
 */
async function fetchAllSubtitles(imdbId, type, season = null, episode = null, videoParams = {}) {
  let apiUrl = `https://opensubtitles-v3.strem.io/subtitles/${type}/tt${imdbId}`;

  if (type === 'series' && season && episode) {
    apiUrl += `:${season}:${episode}`;
  } else {
    // Use video hash for better matching, or 0 to trigger full API
    apiUrl += `:${videoParams.videoHash || '0'}`;
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
    const response = await axios.get(apiUrl, { timeout: 15000 });
    
    if (!response.data || !response.data.subtitles || response.data.subtitles.length === 0) {
      return null;
    }

    return response.data.subtitles;
  } catch (error) {
    console.error('Error fetching subtitles:', error.message);
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
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 5 * 1024 * 1024 // 5MB limit
    });

    let buffer = Buffer.from(response.data);

    // Handle gzip compressed files
    if (url.endsWith('.gz') || (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b)) {
      try {
        buffer = Buffer.from(pako.ungzip(buffer));
      } catch (e) {
        console.error('Error decompressing gzip:', e.message);
        return null;
      }
    }

    const text = decodeSubtitleBuffer(buffer, languageCode);
    return text;
  } catch (error) {
    console.error('Error fetching subtitle:', error.message);
    return null;
  }
}

/**
 * Parse SRT time format to milliseconds.
 */
function parseTimeToMs(timeString) {
  if (!timeString || !/\d{2}:\d{2}:\d{2},\d{3}/.test(timeString)) {
    return 0;
  }
  const parts = timeString.split(':');
  const secondsParts = parts[2].split(',');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1], 10);
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
}

/**
 * Parse SRT text into subtitle objects.
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
    
    // Use srt-parser-2 to parse
    const parser = new SrtParser();
    const parsed = parser.fromSrt(srtText);
    
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    // Filter out ads
    const adKeywords = ['OpenSubtitles.org', 'OpenSubtitles.com', 'osdb.link', 'Advertise your'];
    const filtered = parsed.filter(sub => 
      !adKeywords.some(keyword => (sub.text || '').includes(keyword))
    );

    // srt-parser-2 returns: { id, startTime, endTime, text }
    // startTime/endTime are already in SRT format "HH:MM:SS,mmm"
    return filtered.map(sub => ({
      startTime: sub.startTime,
      endTime: sub.endTime,
      text: sub.text || ''
    }));
  } catch (error) {
    console.error('Error parsing SRT:', error.message);
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
 * Merge two subtitle arrays based on time overlap.
 */
function mergeSubtitles(mainSubs, transSubs, mergeThresholdMs = 500) {
  const mergedSubs = [];
  let transIndex = 0;

  for (const mainSub of mainSubs) {
    if (!mainSub || !mainSub.startTime || !mainSub.endTime) continue;

    const mainStartTime = parseTimeToMs(mainSub.startTime);
    const mainEndTime = parseTimeToMs(mainSub.endTime);

    let bestMatchIndex = -1;
    let smallestTimeDiff = Infinity;

    // Search for matching translation subtitle
    for (let i = transIndex; i < transSubs.length; i++) {
      const transSub = transSubs[i];
      if (!transSub || !transSub.startTime || !transSub.endTime) continue;

      const transStartTime = parseTimeToMs(transSub.startTime);
      const transEndTime = parseTimeToMs(transSub.endTime);

      // Check for overlap or proximity
      const startsOverlap = transStartTime >= mainStartTime && transStartTime < mainEndTime;
      const endsOverlap = transEndTime > mainStartTime && transEndTime <= mainEndTime;
      const isWithin = transStartTime >= mainStartTime && transEndTime <= mainEndTime;
      const contains = transStartTime < mainStartTime && transEndTime > mainEndTime;
      const timeDiff = Math.abs(mainStartTime - transStartTime);

      if (startsOverlap || endsOverlap || isWithin || contains || timeDiff < mergeThresholdMs) {
        if (timeDiff < smallestTimeDiff) {
          smallestTimeDiff = timeDiff;
          bestMatchIndex = i;
        }
      } else if (transStartTime > mainEndTime + mergeThresholdMs) {
        break;
      }

      // Advance starting point for next search
      if (transEndTime < mainStartTime - mergeThresholdMs * 2 && i === transIndex) {
        transIndex = i + 1;
      }
    }

    // Clean and flatten main text
    const cleanMainText = sanitize(mainSub.text, {
      allowedTags: [],
      allowedAttributes: {}
    }).replace(/\r?\n|\r/g, ' ').trim();

    let mergedText = cleanMainText;

    // Add translation if found
    if (bestMatchIndex !== -1) {
      const transSub = transSubs[bestMatchIndex];
      const cleanTransText = sanitize(transSub.text, {
        allowedTags: [],
        allowedAttributes: {}
      }).replace(/\r?\n|\r/g, ' ').trim();

      if (cleanTransText) {
        // Primary on top, secondary (italic) on bottom
        mergedText = `${cleanMainText}\n<i>${cleanTransText}</i>`;
      }
    }

    if (!mergedText) continue;

    mergedSubs.push({
      ...mainSub,
      text: mergedText
    });
  }

  return mergedSubs;
}

/**
 * Format subtitle array back to SRT string.
 */
function formatSrt(subtitleArray) {
  if (!Array.isArray(subtitleArray)) return null;

  try {
    const parser = new SrtParser();
    
    // Ensure IDs are sequential strings
    const sanitized = subtitleArray.map((sub, index) => ({
      id: String(index + 1),
      startTime: sub.startTime,
      endTime: sub.endTime,
      text: sub.text
    }));

    return parser.toSrt(sanitized);
  } catch (error) {
    console.error('Error formatting SRT:', error.message);
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

// Subtitle handler function
async function subtitlesHandler({ type, id, extra, config }) {
  console.log('Subtitle request:', { type, id });

  // Get configured languages
  const mainLangRaw = config?.mainLang || 'English [eng]';
  const transLangRaw = config?.transLang || 'Turkish [tur]';

  const mainLang = parseLangCode(mainLangRaw);
  const transLang = parseLangCode(transLangRaw);

  console.log(`Languages: Primary=${mainLang}, Secondary=${transLang}`);

  // Prevent same language selection
  if (mainLang === transLang) {
    console.log('Error: Same language selected for both');
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
    console.log('No valid IMDB ID');
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
    console.log('Fetching subtitles from OpenSubtitles...');
    const allSubtitles = await fetchAllSubtitles(imdbId, type, season, episode, videoParams);

    if (!allSubtitles) {
      console.log('No subtitles found');
      return { subtitles: [] };
    }

    console.log(`Found ${allSubtitles.length} total subtitles`);

    // Filter by languages
    const mainSubList = filterSubtitlesByLanguage(allSubtitles, mainLang);
    const transSubList = filterSubtitlesByLanguage(allSubtitles, transLang);

    if (!mainSubList || mainSubList.length === 0) {
      console.log(`No ${mainLang} subtitles found`);
      return { subtitles: [] };
    }

    if (!transSubList || transSubList.length === 0) {
      console.log(`No ${transLang} subtitles found`);
      return { subtitles: [] };
    }

    console.log(`Found ${mainSubList.length} ${mainLang} and ${transSubList.length} ${transLang} subtitles`);

    // Process and create merged subtitles
    const finalSubtitles = [];
    const usedTransUrls = new Set();

    // Find a valid main subtitle first
    let mainParsed = null;
    let selectedMainSub = null;

    for (const mainSubInfo of mainSubList) {
      const content = await fetchSubtitleContent(mainSubInfo.url, mainSubInfo.lang);
      if (!content) continue;

      const parsed = parseSrt(content);
      if (!parsed || parsed.length === 0) continue;

      mainParsed = parsed;
      selectedMainSub = mainSubInfo;
      console.log(`Using main subtitle: ${mainSubInfo.id}`);
      break;
    }

    if (!mainParsed) {
      console.log('Could not process any main subtitle');
      return { subtitles: [] };
    }

    // Process translations (up to 3 versions)
    for (const transSubInfo of transSubList) {
      if (finalSubtitles.length >= 3) break;
      if (usedTransUrls.has(transSubInfo.url)) continue;
      usedTransUrls.add(transSubInfo.url);

      const version = finalSubtitles.length + 1;
      console.log(`Processing translation v${version}...`);

      const transContent = await fetchSubtitleContent(transSubInfo.url, transSubInfo.lang);
      if (!transContent) continue;

      const transParsed = parseSrt(transContent);
      if (!transParsed || transParsed.length === 0) continue;

      // Merge subtitles
      const merged = mergeSubtitles([...mainParsed], transParsed);
      if (!merged || merged.length === 0) continue;

      const mergedSrt = formatSrt(merged);
      if (!mergedSrt) continue;

      // Store in cache
      const cacheKey = `${imdbId}_${season || ''}_${episode || ''}_${mainLang}_${transLang}_v${version}`;
      storeSubtitle(cacheKey, mergedSrt);

      finalSubtitles.push({
        id: `dual-${selectedMainSub.id}-${transSubInfo.id}-v${version}`,
        url: `{{ADDON_URL}}/subtitles/${encodeURIComponent(cacheKey)}.srt`,
        lang: `${mainLang}+${transLang}`,
        SubtitlesName: `🌍 ${getLanguageName(mainLang)} + ${getLanguageName(transLang)} (v${version})`
      });
    }

    console.log(`Created ${finalSubtitles.length} merged subtitle(s)`);

    return {
      subtitles: finalSubtitles,
      cacheMaxAge: 6 * 3600
    };

  } catch (error) {
    console.error('Error in subtitle handler:', error.message);
    return { subtitles: [] };
  }
}

// Register the handler with the builder
builder.defineSubtitlesHandler(subtitlesHandler);

module.exports = {
  builder,
  manifest,
  getSubtitle,
  subtitleCache,
  subtitlesHandler
};
