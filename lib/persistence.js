/**
 * Upstash Redis REST API persistence layer.
 *
 * Provides fire-and-forget writes and cached reads for analytics counters.
 * When UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN env vars are missing,
 * every method gracefully returns null / 0 so the rest of the app keeps
 * working with the existing in-memory analytics.
 */

const { debugServer } = require('./debug');

// ── Configuration ──────────────────────────────────────────────────────────
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const ENABLED = !!(UPSTASH_URL && UPSTASH_TOKEN);
// Abort slow Upstash calls so callers (e.g. the subtitle cache) fall through
// instead of stalling the request.
const REQUEST_TIMEOUT_MS = 1500;

// Simple in-memory read cache so we don't hit Redis on every page render.
// TTL = 15 s — fresh enough for a "live" badge, cheap on command quota.
const READ_CACHE_TTL = 15_000;
const readCache = new Map();

// ── Low-level helpers ──────────────────────────────────────────────────────

/**
 * Execute a Redis command via the Upstash REST API.
 * @param {string[]} command  e.g. ['INCR', 'stats:totalPageViews']
 * @returns {Promise<any>}    The `result` field from Upstash response.
 */
async function redis(command) {
  if (!ENABLED) return null;

  try {
    const res = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    if (!res.ok) {
      debugServer.warn(`Upstash HTTP ${res.status}: ${await res.text()}`);
      return null;
    }

    const data = await res.json();
    return data.result;
  } catch (err) {
    debugServer.warn(`Upstash error: ${err.message}`);
    return null;
  }
}

/**
 * Pipeline multiple commands in a single HTTP request.
 * @param {string[][]} commands  Array of Redis command arrays.
 * @returns {Promise<any[]>}     Array of results (same order).
 */
async function pipeline(commands) {
  if (!ENABLED) return commands.map(() => null);

  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    if (!res.ok) {
      debugServer.warn(`Upstash pipeline HTTP ${res.status}`);
      return commands.map(() => null);
    }

    const data = await res.json();
    // Upstash returns [{result: ...}, {result: ...}, ...]
    return data.map(d => (d && d.result != null ? d.result : null));
  } catch (err) {
    debugServer.warn(`Upstash pipeline error: ${err.message}`);
    return commands.map(() => null);
  }
}

// ── Cached reader ──────────────────────────────────────────────────────────

function getCached(key) {
  const entry = readCache.get(key);
  if (entry && Date.now() - entry.ts < READ_CACHE_TTL) return entry.value;
  return undefined; // miss
}

function setCache(key, value) {
  readCache.set(key, { value, ts: Date.now() });
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Fire-and-forget increment. Never blocks the caller. */
function incrementCounter(key) {
  if (!ENABLED) return;
  redis(['INCR', key]).catch(() => {});
}

/** Fire-and-forget: add member to a Set (unique visitors). */
function addToSet(key, member) {
  if (!ENABLED) return;
  redis(['SADD', key, member]).catch(() => {});
}

/** Fire-and-forget: increment member score in a Sorted Set (language popularity). */
function incrementSortedSet(key, member) {
  if (!ENABLED) return;
  redis(['ZINCRBY', key, 1, member]).catch(() => {});
}

/**
 * Read all public stats in one pipeline call, with caching.
 * Returns an object shaped for the landing page.
 */
async function getPublicCounters() {
  const cacheKey = '__publicCounters__';
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  if (!ENABLED) {
    return {
      totalPageViews: 0,
      totalInstalls: 0,
      totalSubtitleRequests: 0,
      totalSubtitlesServed: 0,
      uniqueVisitors: 0,
      topLanguages: [],
      topPairs: []
    };
  }

  const results = await pipeline([
    ['GET', 'stats:totalPageViews'],
    ['GET', 'stats:totalInstalls'],
    ['GET', 'stats:totalSubtitleRequests'],
    ['GET', 'stats:totalSubtitlesServed'],
    ['SCARD', 'stats:uniqueVisitors'],
    ['ZREVRANGE', 'stats:languages', '0', '9', 'WITHSCORES'],
    ['ZREVRANGE', 'stats:languagePairs', '0', '9', 'WITHSCORES']
  ]);

  // Parse sorted set results: [member, score, member, score, ...]
  function parseSortedSet(arr) {
    if (!Array.isArray(arr)) return [];
    const pairs = [];
    for (let i = 0; i < arr.length; i += 2) {
      pairs.push([arr[i], parseInt(arr[i + 1], 10) || 0]);
    }
    return pairs;
  }

  const counters = {
    totalPageViews: parseInt(results[0], 10) || 0,
    totalInstalls: parseInt(results[1], 10) || 0,
    totalSubtitleRequests: parseInt(results[2], 10) || 0,
    totalSubtitlesServed: parseInt(results[3], 10) || 0,
    uniqueVisitors: parseInt(results[4], 10) || 0,
    topLanguages: parseSortedSet(results[5]),
    topPairs: parseSortedSet(results[6])
  };

  setCache(cacheKey, counters);
  return counters;
}

/** Check if persistence is enabled. */
function isEnabled() {
  return ENABLED;
}

// ── Generic cache access (subtitle cache uses these) ────────────────────────

/** Read a raw string value. Returns null when disabled or missing. */
async function redisGet(key) {
  if (!ENABLED) return null;
  const result = await redis(['GET', key]);
  return typeof result === 'string' ? result : null;
}

/** Fire-and-forget write with TTL. Never rejects. */
function redisSet(key, value, ttlSeconds) {
  if (!ENABLED) return Promise.resolve();
  return redis(['SET', key, value, 'EX', String(ttlSeconds)]).catch(() => {});
}

module.exports = {
  incrementCounter,
  addToSet,
  incrementSortedSet,
  getPublicCounters,
  isEnabled,
  redisGet,
  redisSet
};
