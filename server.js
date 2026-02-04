#!/usr/bin/env node

/**
 * Stremio Dual Subtitles Addon Server
 * Serves the addon with configuration support and subtitle caching.
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const { getRouter } = require('stremio-addon-sdk');
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

// Create Express app
const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: manifest.version });
});

// Serve cached subtitles
app.get('/subtitles/:filename', (req, res) => {
  const filename = req.params.filename;
  const cacheKey = filename.replace('.srt', '');
  
  const content = getSubtitle(cacheKey);
  
  if (!content) {
    console.log(`Subtitle not found in cache: ${cacheKey}`);
    return res.status(404).send('Subtitle not found or expired');
  }
  
  res.setHeader('Content-Type', 'text/srt; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(content);
});

// Landing/configuration page
app.get('/', (req, res) => {
  res.redirect('/configure');
});

app.get('/configure', (req, res) => {
  const baseUrl = getExternalUrl(req);
  const html = generateLandingHTML(manifest, baseUrl);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
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

    // Create configured manifest
    const configuredManifest = {
      ...manifest,
      id: `${manifest.id}.${mainCode}.${transCode}`,
      name: `${manifest.name} (${mainCode.toUpperCase()}+${transCode.toUpperCase()})`,
      behaviorHints: {
        ...manifest.behaviorHints,
        configurationRequired: false
      }
    };

    res.json(configuredManifest);
  } catch (error) {
    console.error('Error generating manifest:', error.message);
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

    console.log(`Subtitle request: ${type}/${id}, langs: ${parseLangCode(mainLang)}+${parseLangCode(transLang)}`);

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
    console.error('Error handling subtitle request:', error.message, error.stack);
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
  res.json(manifest);
});

// Mount addon routes for non-configured requests
const addonInterface = builder.getInterface();
app.use(getRouter(addonInterface));

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server only if not running on Vercel (Vercel handles this automatically)
if (!process.env.VERCEL) {
  app.listen(PORT, HOST, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              🌍 Dual Subtitles Addon Started 🌍              ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Local:     http://localhost:${PORT}/configure`);
    console.log(`║  Network:   http://${HOST === '0.0.0.0' ? '<your-ip>' : HOST}:${PORT}/configure`);
    console.log(`║  Manifest:  http://localhost:${PORT}/manifest.json`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Open the configure URL in your browser to get started!      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
  });
}

// Export for Vercel
module.exports = app;
