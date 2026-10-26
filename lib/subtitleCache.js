'use strict';

/**
 * Tiered cache for merged subtitle SRT files.
 *
 * L1 — in-memory Map (instance-local, fastest)
 * L2 — Upstash Redis (survives serverless invocations; optional via env)
 * L3 — disk (local deployments only; auto-disabled on Vercel)
 *
 * Every tier degrades gracefully: disabled/errored layers fall through to
 * the next, and a fully-down cache only costs re-generation.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { redisGet, redisSet } = require('./persistence');
const { debugServer } = require('./debug');

const TTL_MS = 6 * 60 * 60 * 1000;               // 6 hours, mirrors old behavior
const REDIS_TTL_SECONDS = Math.floor(TTL_MS / 1000);
const REDIS_MAX_BYTES = 512 * 1024;              // Upstash free-tier friendly cap
// Namespace subtitle entries so they can't collide with (or expose) the
// analytics keys that share the same Upstash database.
const REDIS_PREFIX = 'sub:';

const memCache = new Map();

function isDiskEnabled() {
  const v = String(process.env.SUBTITLE_DISK_CACHE || '').toLowerCase();
  if (v === 'off') return false;
  if (v === 'on') return true;
  return !process.env.VERCEL;                    // auto: no persistent FS on Vercel
}

function diskDir() {
  return process.env.SUBTITLE_DISK_DIR || path.join(__dirname, '..', '.cache', 'subtitles');
}

function diskPath(key) {
  const file = crypto.createHash('sha1').update(key).digest('hex') + '.srt';
  return path.join(diskDir(), file);
}

function diskGet(key) {
  if (!isDiskEnabled()) return null;
  try {
    const file = diskPath(key);
    const stat = fs.statSync(file);
    if (Date.now() - stat.mtimeMs > TTL_MS) {
      fs.rmSync(file, { force: true });
      return null;
    }
    return fs.readFileSync(file, 'utf8');
  } catch (_) {
    return null;
  }
}

function diskPut(key, srt) {
  if (!isDiskEnabled()) return;
  try {
    const dir = diskDir();
    fs.mkdirSync(dir, { recursive: true });
    const target = diskPath(key);
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, srt, 'utf8');
    fs.renameSync(tmp, target);                  // atomic-ish replace
  } catch (err) {
    debugServer.warn(`Subtitle disk cache write failed: ${err && err.message}`);
  }
}

function pruneExpired() {
  const now = Date.now();
  for (const [k, v] of memCache.entries()) {
    if (now - v.timestamp > TTL_MS) memCache.delete(k);
  }
}

async function get(key) {
  // L1: memory
  const entry = memCache.get(key);
  if (entry) {
    if (Date.now() - entry.timestamp <= TTL_MS) return entry.content;
    memCache.delete(key);
  }

  // L2: Redis
  try {
    const redisValue = await redisGet(REDIS_PREFIX + key);
    if (redisValue) {
      memCache.set(key, { content: redisValue, timestamp: Date.now() });
      debugServer.log(`Cache L2 hit: ${key}`);
      return redisValue;
    }
  } catch (_) { /* fall through */ }

  // L3: disk
  const diskValue = diskGet(key);
  if (diskValue) {
    memCache.set(key, { content: diskValue, timestamp: Date.now() });
    debugServer.log(`Cache L3 hit: ${key}`);
    return diskValue;
  }

  return null;
}

function put(key, srt) {
  memCache.set(key, { content: srt, timestamp: Date.now() });
  if (Buffer.byteLength(srt, 'utf8') <= REDIS_MAX_BYTES) {
    redisSet(REDIS_PREFIX + key, srt, REDIS_TTL_SECONDS).catch(() => {});
  }
  diskPut(key, srt);
  pruneExpired();
}

function clearMem() {
  memCache.clear();
}

module.exports = {
  get,
  put,
  clearMem,
  _test: { memCache, isDiskEnabled, diskPath, REDIS_MAX_BYTES, REDIS_PREFIX }
};
