/**
 * Upstash Redis REST API persistence layer.
 *
 * Provides buffered writes and cached reads for analytics counters. Writes
 * are collected in memory and sent as one pipeline every few minutes, and
 * reads are cached for the same span, so a busy instance stays far below
 * Upstash's free monthly command quota (one command per request did not).
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

// How often buffered counter writes are sent, and how long a read of the
// persistent totals is reused. Reads stay live in between because pending
// (not yet flushed) increments are added on top of the cached totals.
// Serverless instances can be frozen at any time, so they flush quickly.
const FLUSH_INTERVAL_MS = Number(process.env.STATS_FLUSH_INTERVAL_MS) ||
  (process.env.VERCEL ? 5_000 : 5 * 60_000);
const READ_CACHE_TTL = 5 * 60_000;
// Cap on buffered set members while Upstash is unreachable.
const MAX_PENDING_SET_MEMBERS = 5000;

let countersCache = null; // { value, ts }

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
 * @param {string[][]} commands   Array of Redis command arrays.
 * @returns {Promise<any[]|null>} Results in order, or null when the call
 *                                failed (disabled, quota, network).
 */
async function pipeline(commands) {
  if (!ENABLED) return null;

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
      return null;
    }

    const data = await res.json();
    // Upstash returns [{result: ...}, {result: ...}, ...]
    if (!Array.isArray(data)) return null;
    return data.map(d => (d && d.result != null ? d.result : null));
  } catch (err) {
    debugServer.warn(`Upstash pipeline error: ${err.message}`);
    return null;
  }
}

// ── Buffered writes ────────────────────────────────────────────────────────

let pending = newPending();

function newPending() {
  return { counters: new Map(), sortedSets: new Map(), sets: new Map() };
}

function bump(map, key, by) {
  map.set(key, (map.get(key) || 0) + by);
}

/** Buffer an increment. Never blocks the caller. */
function incrementCounter(key) {
  if (!ENABLED) return;
  bump(pending.counters, key, 1);
}

/** Buffer: add member to a Set (unique visitors). */
function addToSet(key, member) {
  if (!ENABLED) return;
  if (!pending.sets.has(key)) pending.sets.set(key, new Set());
  const members = pending.sets.get(key);
  if (members.size < MAX_PENDING_SET_MEMBERS) members.add(String(member));
}

/** Buffer: increment member score in a Sorted Set (language popularity). */
function incrementSortedSet(key, member) {
  if (!ENABLED) return;
  if (!pending.sortedSets.has(key)) pending.sortedSets.set(key, new Map());
  bump(pending.sortedSets.get(key), String(member), 1);
}

function buildFlushCommands(batch) {
  const commands = [];
  for (const [key, by] of batch.counters) commands.push(['INCRBY', key, String(by)]);
  for (const [key, members] of batch.sortedSets) {
    for (const [member, by] of members) commands.push(['ZINCRBY', key, String(by), member]);
  }
  for (const [key, members] of batch.sets) {
    if (members.size) commands.push(['SADD', key, ...members]);
  }
  return commands;
}

/** Put a batch that could not be sent back so the next flush retries it. */
function restore(batch) {
  for (const [key, by] of batch.counters) bump(pending.counters, key, by);
  for (const [key, members] of batch.sortedSets) {
    if (!pending.sortedSets.has(key)) pending.sortedSets.set(key, new Map());
    for (const [member, by] of members) bump(pending.sortedSets.get(key), member, by);
  }
  for (const [key, members] of batch.sets) {
    for (const member of members) addToSet(key, member);
  }
}

let flushing = null;

/**
 * Send everything buffered so far as a single pipeline. Never rejects.
 * @returns {Promise<boolean>} false when the batch had to be kept for retry.
 */
function flush() {
  if (!ENABLED) return Promise.resolve(true);
  if (flushing) return flushing;

  const batch = pending;
  const commands = buildFlushCommands(batch);
  if (commands.length === 0) return Promise.resolve(true);
  pending = newPending();

  flushing = pipeline(commands)
    .then((results) => {
      if (!results) {
        restore(batch);
        return false;
      }
      // Fold what was just written into the cached totals so the numbers
      // don't dip until the next read from Redis.
      if (countersCache) {
        for (const [key, by] of batch.counters) {
          const field = COUNTER_FIELDS[key];
          if (field) countersCache.value[field] += by;
        }
      }
      return true;
    })
    .catch(() => {
      restore(batch);
      return false;
    })
    .finally(() => { flushing = null; });
  return flushing;
}

if (ENABLED) {
  setInterval(flush, FLUSH_INTERVAL_MS).unref();
  // Hosts send SIGTERM before a restart or redeploy: write the buffer first.
  process.once('SIGTERM', () => {
    flush().finally(() => process.exit(0));
  });
}

// ── Cached reader ──────────────────────────────────────────────────────────

const COUNTER_FIELDS = {
  'stats:totalPageViews': 'totalPageViews',
  'stats:totalInstalls': 'totalInstalls',
  'stats:totalSubtitleRequests': 'totalSubtitleRequests',
  'stats:totalSubtitlesServed': 'totalSubtitlesServed'
};

// Parse sorted set results: [member, score, member, score, ...]
function parseSortedSet(arr) {
  if (!Array.isArray(arr)) return [];
  const pairs = [];
  for (let i = 0; i < arr.length; i += 2) {
    pairs.push([arr[i], parseInt(arr[i + 1], 10) || 0]);
  }
  return pairs;
}

async function readCounters() {
  const results = await pipeline([
    ['GET', 'stats:totalPageViews'],
    ['GET', 'stats:totalInstalls'],
    ['GET', 'stats:totalSubtitleRequests'],
    ['GET', 'stats:totalSubtitlesServed'],
    ['SCARD', 'stats:uniqueVisitors'],
    ['ZREVRANGE', 'stats:languages', '0', '9', 'WITHSCORES'],
    ['ZREVRANGE', 'stats:languagePairs', '0', '9', 'WITHSCORES']
  ]);
  if (!results) return null;

  return {
    totalPageViews: parseInt(results[0], 10) || 0,
    totalInstalls: parseInt(results[1], 10) || 0,
    totalSubtitleRequests: parseInt(results[2], 10) || 0,
    totalSubtitlesServed: parseInt(results[3], 10) || 0,
    uniqueVisitors: parseInt(results[4], 10) || 0,
    topLanguages: parseSortedSet(results[5]),
    topPairs: parseSortedSet(results[6])
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Persistent totals for the landing page and dashboard: the last read from
 * Redis plus increments that are still buffered.
 * Returns null when Upstash cannot be reached and nothing is cached, so
 * callers fall back to in-memory numbers instead of showing zeros.
 */
async function getPublicCounters() {
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

  if (!countersCache || Date.now() - countersCache.ts >= READ_CACHE_TTL) {
    const fresh = await readCounters();
    if (fresh) {
      countersCache = { value: fresh, ts: Date.now() };
    } else if (countersCache) {
      countersCache.ts = Date.now(); // keep serving stale, retry after the TTL
    } else {
      return null;
    }
  }

  const counters = { ...countersCache.value };
  for (const [key, by] of pending.counters) {
    const field = COUNTER_FIELDS[key];
    if (field) counters[field] += by;
  }
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
  flush,
  redisGet,
  redisSet,
  _test: { buildFlushCommands, newPending }
};
