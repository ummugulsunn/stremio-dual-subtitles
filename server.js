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
  getAnalyticsSummary 
} = require('./lib/analytics');
const { generateStatsHTML, generatePrivacyHTML, generateErrorHTML } = require('./lib/templates');
const { builder, manifest, getSubtitle, subtitlesHandler } = require('./addon');
const generateLandingHTML = require('./landingTemplate');
const { parseLangCode } = require('./languages');

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

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
  // Skip rate limiting for static files and health check
  if (req.path.startsWith('/logo') || req.path === '/health') {
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
    const baseUrl = getExternalUrl(req);
    const manifestWithLogo = getManifestWithLogo(req);
    res.status(429).send(generateErrorHTML(429, 'Too many requests', baseUrl, manifestWithLogo));
    return;
  }

  entry.count += 1;
  next();
});

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Analytics tracking endpoint
app.post('/api/track', (req, res) => {
  try {
    const { event, page, mainLang, transLang, contentType } = req.body;
    const ip = getClientIP(req);
    
    switch (event) {
      case 'pageView':
        trackPageView(ip, page);
        break;
      case 'install':
        trackInstall(ip, mainLang, transLang);
        break;
      case 'subtitleRequest':
        trackSubtitleRequest(mainLang, transLang, contentType);
        break;
    }
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
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
  res.redirect('/configure');
});

app.get('/configure', (req, res) => {
  const baseUrl = getExternalUrl(req);
  const manifestWithLogo = getManifestWithLogo(req);
  const html = generateLandingHTML(manifestWithLogo, baseUrl);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Analytics dashboard (protected with secret key)
app.get('/stats', (req, res) => {
  const analyticsSecret = process.env.ANALYTICS_SECRET;
  
  // If secret is set, require it in query parameter
  if (analyticsSecret && req.query.key !== analyticsSecret) {
    const baseUrl = getExternalUrl(req);
    const manifestWithLogo = getManifestWithLogo(req);
    return res.status(401).send(generateErrorHTML(401, 'Unauthorized', baseUrl, manifestWithLogo));
  }
  
  const baseUrl = getExternalUrl(req);
  const manifestWithLogo = getManifestWithLogo(req);
  const stats = getAnalyticsSummary();
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
// STREMIO ADDON ROUTES
// ============================================================================

// Serve cached subtitles
app.get('/subtitles/:filename', (req, res) => {
  const filename = req.params.filename;
  const cacheKey = filename.replace('.srt', '');
  
  const content = getSubtitle(cacheKey);
  
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

// Configuration-specific configure page (redirect to main configure)
app.get('/:config/configure', (req, res) => {
  res.redirect('/configure');
});

// Configuration-specific manifest
app.get('/:config/manifest.json', (req, res) => {
  try {
    const configParam = decodeURIComponent(req.params.config);
    const [mainLang, transLang] = configParam.split('|');
    
    if (!mainLang || !transLang) {
      return res.status(400).json({ error: 'Invalid configuration' });
    }

    const mainCode = parseLangCode(mainLang);
    const transCode = parseLangCode(transLang);
    const baseUrl = getExternalUrl(req);

    // Create configured manifest
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
    const configParam = decodeURIComponent(req.params.config);
    const [mainLang, transLang] = configParam.split('|');
    
    if (!mainLang || !transLang) {
      return res.status(400).json({ subtitles: [] });
    }

    const { type, id } = req.params;
    const extra = req.params.extra ? parseExtra(req.params.extra) : {};

    // Build config object
    const config = {
      mainLang,
      transLang
    };

    // Track subtitle request
    trackSubtitleRequest(parseLangCode(mainLang), parseLangCode(transLang), type);

    debugServer.log(`Subtitle request: ${type}/${id}, langs: ${parseLangCode(mainLang)}+${parseLangCode(transLang)}`);

    // Call the subtitle handler directly
    const result = await subtitlesHandler({ type, id, extra, config });
    
    // Replace placeholder URL with actual server URL
    const baseUrl = getExternalUrl(req);
    if (result.subtitles) {
      result.subtitles = result.subtitles.map(sub => ({
        ...sub,
        url: sub.url.replace('{{ADDON_URL}}', baseUrl)
      }));
    }

    res.json(result);
  } catch (error) {
    debugServer.error('Error handling subtitle request:', sanitizeForLogging(error.message));
    res.json({ subtitles: [] });
  }
});

// Parse extra parameters from URL
function parseExtra(extraStr) {
  const extra = {};
  
  // Handle the format: videoHash.videoSize.filename or just extra params
  const parts = extraStr.split('.');
  
  // Try to parse as key=value pairs
  for (const part of parts) {
    if (part.includes('=')) {
      const [key, value] = part.split('=');
      extra[key] = value;
    }
  }
  
  // Also handle query-style params
  if (extraStr.includes('&')) {
    const params = extraStr.split('&');
    for (const param of params) {
      if (param.includes('=')) {
        const [key, value] = param.split('=');
        extra[key] = decodeURIComponent(value);
      }
    }
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
