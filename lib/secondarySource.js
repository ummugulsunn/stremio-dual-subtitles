/**
 * Fallback subtitle source: a community OpenSubtitles mirror with a
 * fuller catalog than the primary opensubtitles-v3.strem.io index.
 * Verified 2026-07-29: for tt15047880 (Disclosure Day), primary has
 * 0 Hebrew subs, this mirror has 10 real (non-AI-translated) ones.
 *
 * Queried ONLY as a fallback (see addon.js fetchAllSubtitles) when the
 * primary source is missing coverage for a requested language — never
 * called on the default/working path.
 */

const axios = require('axios');
const { debugServer, sanitizeForLogging } = require('./debug');
const { normalizeLanguageCode } = require('../encoding');

const SECONDARY_SOURCE_ENABLED = process.env.SECONDARY_SOURCE_ENABLED !== 'false';

function buildUrl(imdbId, type, mainLang, transLang) {
  // The mirror expects two-letter codes joined with '|' in the path,
  // e.g. "he|ru". Our language ids are three-letter (heb/rus).
  const toTwoLetter = (lang3) => normalizeLanguageCode(lang3) || lang3;

  const langs = [toTwoLetter(mainLang), toTwoLetter(transLang)].join('|');
  return (
    `https://opensubtitles.stremio.homes/${langs}/` +
    `ai-translated=true|from=all|auto-adjustment=false/` +
    `subtitles/${type}/tt${imdbId}.json`
  );
}

async function fetchSecondarySubtitles(imdbId, type, mainLang, transLang) {
  if (!SECONDARY_SOURCE_ENABLED) return [];

  const url = buildUrl(imdbId, type, mainLang, transLang);

  try {
    const response = await axios.get(url, { timeout: 10000 });
    const raw = response.data && response.data.subtitles;
    if (!Array.isArray(raw) || raw.length === 0) return [];

    return raw
      .filter(s => s && s.url && s.lang)
      .map(s => ({
        id: `v3plus-${s.sub_id || s.id}`,
        url: s.url,
        lang: s.lang,
        m: null,
        g: null,
        downloads: 0
      }));
  } catch (error) {
    debugServer.warn('Secondary source fetch failed:', sanitizeForLogging(error.message));
    return [];
  }
}

module.exports = { fetchSecondarySubtitles };
