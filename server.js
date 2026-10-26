#!/usr/bin/env node

/**
 * Stremio Dual Subtitles Addon Server
 * Serves the addon with configuration support, analytics, and subtitle caching.
 */

const path = require('path');
const express = require('express');
const compression = require('compression');
const { getRouter } = require('stremio-addon-sdk');
const { debugServer, sanitizeForLogging } = require('./lib/debug');
const { 
  trackPageView, 
  trackInstall, 
  trackSubtitleRequest, 
  trackSubtitleServed,
  getAnalyticsSummary,
  getPublicStats 
} = require('./lib/analytics');
const { generateStatsHTML, generatePrivacyHTML, generateErrorHTML } = require('./lib/templates');
const { builder, manifest, getSubtitle, subtitlesHandler, generateDynamicSubtitle } = require('./addon');
const generateLandingHTML = require('./landingTemplate');
const { parseLangCode, getLanguageOptions } = require('./languages');

// Configuration
const PORT = process.env.PORT || 7000;
const HOST = process.env.HOST || '0.0.0.0';

// Get external URL for manifest
function getExternalUrl(req) {
  if (process.env.EXTERNAL_URL) {
    return process.env.EXTERNAL_URL;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}

// Get client IP
function getClientIP(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .toString()
    .split(',')[0]
    .trim();
}

// Get manifest with full logo URL
function getManifestWithLogo(req) {
  const baseUrl = getExternalUrl(req);
  return {
    ...manifest,
    logo: manifest.logo.startsWith('http') ? manifest.logo : `${baseUrl}${manifest.logo}`
  };
}

// Create Express app
const app = express();

// Gzip compression
app.use(compression());

// JSON body parser for API endpoints
app.use(express.json());

// CORS for the addon/API surface (Stremio clients call it cross-origin);
// the HTML pages don't need it. Baseline security headers on everything.
const HTML_PAGES = new Set(['/', '/configure', '/privacy', '/stats']);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  if (!HTML_PAGES.has(req.path)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    debugServer.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Serve static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

// Basic rate limiter (per IP)
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 60);
const rateLimitStore = new Map();

app.use((req, res, next) => {
  // Skip rate limiting for static files, health check and the two reads that
  // are served from cache anyway (landing page, public stats)
  if (req.path.startsWith('/logo') || req.path.startsWith('/favicon') ||
      req.path === '/health' || req.path === '/configure' || req.path === '/api/stats/public') {
    return next();
  }
  
  const ip = getClientIP(req);
  const now = Date.now();

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  const entry = rateLimitStore.get(ip);
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
    return next();
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    if (req.path.startsWith('/api/')) {
      return res.status(429).json({ success: false, error: 'Too many requests' });
    }
    const baseUrl = getExternalUrl(req);
    const manifestWithLogo = getManifestWithLogo(req);
    res.status(429).send(generateErrorHTML(429, 'Too many requests', baseUrl, manifestWithLogo));
    return;
  }

  entry.count += 1;
  next();
});

// Periodically drop expired IP buckets so the Map doesn't grow forever
// (long-running local instances previously leaked memory here).
function sweepRateLimitStore() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(ip);
  }
}
const rateLimitSweeperTimer = setInterval(sweepRateLimitStore, RATE_LIMIT_WINDOW_MS);
rateLimitSweeperTimer.unref(); // don't keep the process alive just for sweeping

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Analytics tracking endpoint
const VALID_LANGUAGE_OPTIONS = new Set(getLanguageOptions());
const isLanguageOption = (v) => typeof v === 'string' && VALID_LANGUAGE_OPTIONS.has(v);
const shortString = (v, max) => (typeof v === 'string' ? v.slice(0, max) : undefined);

app.post('/api/track', (req, res) => {
  try {
    const { event, page, mainLang, transLang, contentType } = req.body || {};
    const ip = getClientIP(req);
    
    switch (event) {
      case 'pageView':
        trackPageView(ip, shortString(page, 32) || 'unknown');
        break;
      case 'install':
      case 'subtitleRequest':
        // Free-form strings here would reach the analytics store (and the stats page)
        if (!isLanguageOption(mainLang) || !isLanguageOption(transLang)) {
          return res.status(400).json({ success: false, error: 'Unknown language' });
        }
        if (event === 'install') trackInstall(ip, mainLang, transLang);
        else trackSubtitleRequest(mainLang, transLang, shortString(contentType, 16));
        break;
    }
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
});

// Public stats API (for landing page auto-refresh)
app.get('/api/stats/public', async (req, res) => {
  try {
    const stats = await getPublicStats();
    // Edge-cache for 30s — keeps Vercel CPU near zero for popular pages
    res.setHeader('Cache-Control', 'public, max-age=10, s-maxage=30, stale-while-revalidate=60');
    res.json(stats);
  } catch (error) {
    res.json({ totalSubtitlesServed: 0, totalInstalls: 0, totalPageViews: 0, uniqueVisitors: 0, topPairs: [], live: false });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: manifest.version,
    uptime: process.uptime()
  });
});

// ============================================================================
// PAGE ROUTES
// ============================================================================

// Landing/configuration page
app.get('/', (req, res) => {
  res.redirect(301, '/configure');
});

// The landing HTML only varies with stats, which the page refreshes
// client-side anyway, so it can be cached in memory and at Vercel's edge.
// Page views are tracked client-side (/api/track), so caching loses nothing.
const LANDING_CACHE_TTL_MS = 60 * 1000;
const landingCache = new Map(); // baseUrl -> { html, at }

app.get('/configure', async (req, res) => {
  const baseUrl = getExternalUrl(req);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');

  const cached = landingCache.get(baseUrl);
  if (cached && Date.now() - cached.at < LANDING_CACHE_TTL_MS) {
    return res.send(cached.html);
  }

  const manifestWithLogo = getManifestWithLogo(req);
  let publicStats;
  try {
    publicStats = await getPublicStats();
  } catch (_) {
    publicStats = { totalSubtitlesServed: 0, totalInstalls: 0, totalPageViews: 0, uniqueVisitors: 0, topPairs: [], live: false };
  }
  const html = generateLandingHTML(manifestWithLogo, baseUrl, publicStats);
  if (landingCache.size >= 8) landingCache.clear();
  landingCache.set(baseUrl, { html, at: Date.now() });
  res.send(html);
});

// Analytics dashboard (protected with secret key)
app.get('/stats', async (req, res) => {
  const analyticsSecret = process.env.ANALYTICS_SECRET;
  
  // If secret is set, require it in query parameter
  if (analyticsSecret && req.query.key !== analyticsSecret) {
    const baseUrl = getExternalUrl(req);
    const manifestWithLogo = getManifestWithLogo(req);
    return res.status(401).send(generateErrorHTML(401, 'Unauthorized', baseUrl, manifestWithLogo));
  }
  
  const baseUrl = getExternalUrl(req);
  const manifestWithLogo = getManifestWithLogo(req);
  const stats = await getAnalyticsSummary();
  const html = generateStatsHTML(stats, baseUrl, manifestWithLogo);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Privacy policy
app.get('/privacy', (req, res) => {
  const baseUrl = getExternalUrl(req);
  const manifestWithLogo = getManifestWithLogo(req);
  const html = generatePrivacyHTML(baseUrl, manifestWithLogo);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ============================================================================
// SEO ROUTES
// ============================================================================

// robots.txt
app.get('/robots.txt', (req, res) => {
  const baseUrl = getExternalUrl(req);
  const robotsTxt = `User-agent: *
Allow: /
Allow: /configure
Allow: /privacy

Disallow: /stats
Disallow: /api/
Disallow: /subtitles/
Disallow: /subs/

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.setHeader('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

// sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = getExternalUrl(req);
  const today = new Date().toISOString().split('T')[0];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/configure</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;
  res.setHeader('Content-Type', 'application/xml');
  res.send(sitemap);
});

// ============================================================================
// STREMIO ADDON ROUTES
// ============================================================================

// Serve cached subtitles (legacy/backup)
app.get('/subtitles/:filename', async (req, res) => {
  const filename = req.params.filename;
  const cacheKey = filename.replace('.srt', '');

  const content = await getSubtitle(cacheKey);

  if (!content) {
    debugServer.warn(`Subtitle not found in cache: ${cacheKey}`);
    return res.status(404).send('Subtitle not found or expired');
  }

  trackSubtitleServed();

  res.setHeader('Content-Type', 'text/srt; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=21600');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(content);
});

// Dynamic subtitle generation (serverless-compatible)
// URL format: /subs/:type/:imdbId/:season/:episode/:mainLang/:transLang/:mainSubId/:transSubId.srt
app.get('/subs/:type/:imdbId/:season/:episode/:mainLang/:transLang/:mainSubId/:transSubId.srt', async (req, res) => {
  const { type, imdbId, season, episode, mainLang, transLang, mainSubId, transSubId } = req.params;

  // Optional video matching params (forwarded as query-string by the
  // subtitles handler). These help OpenSubtitles pick the right
  // release variant for the specific video.
  const videoParams = {
    filename: req.query && req.query.filename ? req.query.filename : undefined,
    videoSize: req.query && req.query.videoSize ? req.query.videoSize : undefined,
    videoHash: req.query && req.query.videoHash ? req.query.videoHash : undefined
  };

  // Style code rides in the query (see lib/styleRenderer.js docs).
  // Website-configured installs don't send it -> undefined -> defaults used.
  const styleCode = req.query && typeof req.query.style === 'string' ? req.query.style : undefined;

  debugServer.log(`Dynamic subtitle request: ${type}/${imdbId} ${mainLang}+${transLang}`);
  
  try {
    const content = await generateDynamicSubtitle(
      type, imdbId, season, episode, mainLang, transLang, mainSubId, transSubId, videoParams, styleCode
    );
    
    if (!content) {
      debugServer.warn('Could not generate dynamic subtitle');
      return res.status(404).send('Subtitle generation failed');
    }
    
    trackSubtitleServed();

    res.setHeader('Content-Type', 'text/srt; charset=utf-8');
    // s-maxage tells Vercel's edge to cache for 6h; stale-while-revalidate
    // lets a stale copy serve while we regenerate in the background.
    // The function only runs again every 6h per (URL, edge node), which
    // is the single biggest Active CPU saving on this addon.
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400');
    res.setHeader('Content-Disposition', `inline; filename="dual_${mainLang}_${transLang}.srt"`);
    res.send(content);
  } catch (error) {
    debugServer.error('Dynamic subtitle error:', error.message);
    res.status(500).send('Internal server error');
  }
});

// Configuration-specific configure page (redirect to main configure, pre-filled)
const PREFILL_KEYS = ['mainLang', 'transLang', 'marker', 'mainBold', 'transItalic', 'swapLines'];

// "Configure" on an installed addon lands here: hand the current settings to
// the landing page so the form opens pre-filled instead of from scratch.
app.get('/:config/configure', (req, res) => {
  const parsed = parseConfigParam(req.params.config);
  if (!parsed) return res.redirect('/configure');
  const prefill = {};
  for (const key of PREFILL_KEYS) {
    if (typeof parsed[key] === 'string') prefill[key] = parsed[key];
  }
  res.redirect('/configure?config=' + encodeURIComponent(JSON.stringify(prefill)));
});


// Sentinel used internally by the config parser.
const INVALID_CONFIG = Symbol('invalid-config');

function tryDecode(raw) {
  // Express :params are already decoded; a second decode pass must not
  // throw on bare '%' characters. Returns '' when it throws.
  try {
    return decodeURIComponent(raw);
  } catch (_) {
    return '';
  }
}

function tryParseJsonConfig(decoded) {
  if (!decoded || !decoded.trim().startsWith('{')) return INVALID_CONFIG;
  try {
    const obj = JSON.parse(decoded);
    if (obj && typeof obj === 'object' && obj.mainLang && obj.transLang) return obj;
  } catch (_) {
    // not JSON (or broken JSON) — fall through
  }
  return decoded; // decoded string, maybe pipe form — caller decides
}

// Parse the config path segment. Two encodings are supported:
//  1) compact : "English [eng]|Turkish [tur]"  (website-generated URLs)
//  2) native  : URL-encoded JSON {"mainLang": "...", ...}  (Stremio builds
//               this when the user configures the addon inside the app)
// Also tolerates already-decoded input (Express :params arrive decoded).
// Returns a config object (languages + optional style keys) or null.
function parseConfigParam(raw) {
  if (raw == null || raw === '') return null;
  const rawStr = String(raw);

  // 1) JSON form (encoded or already decoded).
  const jsonOutcome = tryParseJsonConfig(tryDecode(rawStr));
  if (jsonOutcome !== INVALID_CONFIG && typeof jsonOutcome === 'object') {
    return jsonOutcome;
  }

  // 2) Compact form on the raw string, then on the decoded string.
  for (const candidate of [rawStr, tryDecode(rawStr)]) {
    const [mainLang, transLang] = candidate.split('|');
    if (mainLang && transLang) return { mainLang, transLang };
  }

  return null;
}

// Configuration-specific manifest
app.get('/:config/manifest.json', (req, res) => {
  try {
    const parsed = parseConfigParam(req.params.config);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid configuration' });
    }

    const mainCode = parseLangCode(parsed.mainLang);
    const transCode = parseLangCode(parsed.transLang);
    const baseUrl = getExternalUrl(req);

    const configuredManifest = {
      ...manifest,
      id: `${manifest.id}.${mainCode}.${transCode}`,
      name: `${manifest.name} (${mainCode.toUpperCase()}+${transCode.toUpperCase()})`,
      logo: manifest.logo.startsWith('http') ? manifest.logo : `${baseUrl}${manifest.logo}`,
      behaviorHints: {
        ...manifest.behaviorHints,
        configurationRequired: false
      }
    };

    res.json(configuredManifest);
  } catch (error) {
    debugServer.error('Error generating manifest:', sanitizeForLogging(error.message));
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Configuration-specific subtitles handler
app.get('/:config/subtitles/:type/:id/:extra?.json', async (req, res) => {
  try {
    const parsed = parseConfigParam(req.params.config);
    if (!parsed) {
      return res.status(400).json({ subtitles: [] });
    }

    const { type, id } = req.params;
    const extra = req.params.extra ? parseExtra(req.params.extra) : {};

    // parsed carries mainLang/transLang plus any style keys; the handler
    // reads exactly what it needs and styleRenderer clamps values.
    const config = parsed;

    trackSubtitleRequest(parseLangCode(parsed.mainLang), parseLangCode(parsed.transLang), type, id);
    debugServer.log(`Subtitle request: ${type}/${id}, langs: ${parseLangCode(parsed.mainLang)}+${parseLangCode(parsed.transLang)}`);

    const result = await subtitlesHandler({ type, id, extra, config });
    
    // Replace placeholder URL with actual server URL
    const baseUrl = getExternalUrl(req);
    if (result.subtitles) {
      result.subtitles = result.subtitles.map(sub => ({
        ...sub,
        url: sub.url.replace('{{ADDON_URL}}', baseUrl)
      }));
    }

    // Manifest-style response is essentially deterministic for a given
    // (config, type, id) for at least an hour — Stremio polls this on
    // every play and resume, so caching it on Vercel's edge is a major
    // CPU saving for popular titles. We use a short max-age for the
    // browser/Stremio (so config changes propagate fast) but a longer
    // s-maxage on the edge.
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600, stale-while-revalidate=21600');
    res.json(result);
  } catch (error) {
    debugServer.error('Error handling subtitle request:', sanitizeForLogging(error.message));
    res.json({ subtitles: [] });
  }
});

// Parse extra parameters from URL
function parseExtra(extraStr) {
  const extra = {};
  if (!extraStr) return extra;

  // Stremio passes addon extras as a path segment (not a real query
  // string). Older formats use dots as separators. The tricky bit is
  // filenames themselves contain dots, so we must only replace dots
  // that appear *before a known key= sequence*.
  const normalized = extraStr.replace(
    /\.(?=(?:videoHash|videoSize|filename|imdbId|season|episode)=)/g,
    '&'
  );

  // Now we can safely parse via URLSearchParams (handles URL encoding
  // and dotted filenames).
  const params = new URLSearchParams(normalized);
  for (const [key, value] of params.entries()) {
    if (key && value != null) extra[key] = value;
  }

  return extra;
}

// Default manifest (without config - redirects to configure)
app.get('/manifest.json', (req, res) => {
  const manifestWithLogo = getManifestWithLogo(req);
  res.json(manifestWithLogo);
});

// Mount addon routes for non-configured requests
const addonInterface = builder.getInterface();
app.use(getRouter(addonInterface));

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  const baseUrl = getExternalUrl(req);
  const manifestWithLogo = getManifestWithLogo(req);
  res.status(404).send(generateErrorHTML(404, 'Page not found', baseUrl, manifestWithLogo));
});

// Error handling
app.use((err, req, res, next) => {
  debugServer.error('Server error:', sanitizeForLogging(err && err.message ? err.message : err));
  const baseUrl = getExternalUrl(req);
  const manifestWithLogo = getManifestWithLogo(req);
  res.status(500).send(generateErrorHTML(500, 'Internal server error', baseUrl, manifestWithLogo));
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Start server only if not running on Vercel (Vercel handles this automatically)
if (!process.env.VERCEL) {
  app.listen(PORT, HOST, () => {
    debugServer.log('Dual Subtitles Addon Started');
    debugServer.log(`Local: http://localhost:${PORT}/configure`);
    debugServer.log(`Network: http://${HOST === '0.0.0.0' ? '<your-ip>' : HOST}:${PORT}/configure`);
    debugServer.log(`Manifest: http://localhost:${PORT}/manifest.json`);
    debugServer.log(`Analytics: http://localhost:${PORT}/stats`);
  });
}

// Export for Vercel
module.exports = app;
module.exports._test = { parseConfigParam, getClientIP, sweepRateLimitStore, rateLimitStore };
