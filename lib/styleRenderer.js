'use strict';

/**
 * Style rendering for merged dual-subtitle cues.
 *
 * User style settings travel from the addon config (set inside Stremio's
 * native configuration screen, or the website) to the .srt endpoint as a
 * compact 6-field, pipe-separated code:
 *
 *   <mainColor>|<transColor>|<mainBold>|<transItalic>|<marker>|<swapLines>
 *   e.g. "none|#94a3b8|1|1|›|0"      (fields come from buildStyleCode)
 *
 * Colors are hex or `none` (unset). Booleans are '1'/'0'. '|' cannot appear
 * in a field because the marker options deliberately exclude it — that is
 * why MARKER_OPTIONS does not offer '|'.
 *
 * applyStyle() receives HTML-ESCAPED text (addon.js escapes before calling).
 * With default settings the output is byte-identical to the pre-styling
 * hardcoded format:
 *   <b>MAIN</b>\n› <i><font color='#94a3b8'>TRANS</font></i>
 */

const DEFAULT_STYLE = Object.freeze({
  mainColor: '',        // '' = no <font> tag around the primary line
  transColor: '#94a3b8',
  mainBold: true,
  transItalic: true,
  marker: '\u203a',     // ›
  swapLines: false
});

// 'none' = marker omitted; '|' is excluded on purpose (style-code separator)
const MARKER_OPTIONS = ['\u203a', '::', '\u2014', 'none'];

const COLOR_PRESETS = [
  'None (player default)',
  'Gray (#94a3b8)',
  'Red (#f43f5e)',
  'Blue (#38bdf8)',
  'Green (#22c55e)',
  'Yellow (#eab308)',
  'Purple (#a855f7)',
  'White (#ffffff)'
];

const SUB_COLOR_PRESETS = COLOR_PRESETS.slice(1);

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Checkbox values from Stremio's config form arrive as 'on' (FormData) or
// 'checked'; unchecked boxes are omitted (see buildStyleCode).
function boolish(value, fallback) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === 'true' || value === '1' || value === 'on' || value === 'checked') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

/**
 * Extract a hex color from any config string (raw hex, preset label like
 * "Red (#f43f5e)", or "None (player default)").
 *
 * Behavior:
 *  - null/undefined            -> fallback (module default)
 *  - '', whitespace-only       -> '' (explicitly unset: no <font> tag)
 *  - contains valid hex        -> that hex (handles preset labels like
 *                                "Red (#f43f5e)")
 *  - anything else (invalid)   -> fallback (never injected into SRT)
 */
function extractColor(value, fallback) {
  if (value == null) return fallback;
  const s = String(value).trim();
  if (!s) return '';                       // empty string = explicitly unset
  const m = s.match(/#[0-9a-fA-F]{6}\b/);
  return m ? m[0] : fallback;              // invalid -> fallback, never injected
}

/** Clamp an arbitrary config object (or style object) to a valid style. */
function normalizeStyle(input = {}) {
  const c = input || {};
  const style = { ...DEFAULT_STYLE };
  if ('mainColor' in c) style.mainColor = extractColor(c.mainColor, '');
  if ('transColor' in c) style.transColor = extractColor(c.transColor, DEFAULT_STYLE.transColor);
  if ('mainBold' in c) style.mainBold = boolish(c.mainBold, DEFAULT_STYLE.mainBold);
  if ('transItalic' in c) style.transItalic = boolish(c.transItalic, DEFAULT_STYLE.transItalic);
  if ('marker' in c && MARKER_OPTIONS.includes(c.marker)) style.marker = c.marker;
  if ('swapLines' in c) style.swapLines = boolish(c.swapLines, DEFAULT_STYLE.swapLines);
  return style;
}

/** Parse a compact style code (or style config object) into a valid style.
 * Any other non-object input (e.g. booleans) falls back to defaults.
 */
function parseStyleCode(code) {
  if (code == null) return normalizeStyle({});
  if (typeof code === 'object') return normalizeStyle(code);
  const parts = String(code).split('|').map(p => p.trim());
  const cfg = {};
  const fields = ['mainColor', 'transColor'];
  for (let i = 0; i < fields.length; i++) {
    const raw = parts[i];
    if (raw === undefined || raw === '') continue;        // keep default
    if (raw === 'none') { cfg[fields[i]] = ''; continue; }
    if (HEX_RE.test(raw)) { cfg[fields[i]] = raw; continue; }
    // invalid -> leave default
  }
  const [ , , mainBold, transItalic, marker, swap] = parts;
  if (mainBold !== undefined && mainBold !== '') cfg.mainBold = mainBold;
  if (transItalic !== undefined && transItalic !== '') cfg.transItalic = transItalic;
  if (marker !== undefined && marker !== '') cfg.marker = marker;
  if (swap !== undefined && swap !== '') cfg.swapLines = swap;
  return normalizeStyle(cfg);
}

const CHECKBOX_KEYS = ['mainBold', 'transItalic', 'swapLines'];
const SELECT_KEYS = ['mainColor', 'transColor', 'marker'];

/** Serialize a config object/settings into the compact code for .srt URLs. */
function buildStyleCode(config = {}) {
  const c = { ...(config || {}) };
  // A config from the native form always carries the select fields but omits
  // unchecked checkboxes, so a missing checkbox there means "off". Configs
  // without any style fields (website / pipe-form installs) keep defaults.
  if (SELECT_KEYS.some(k => k in c)) {
    for (const k of CHECKBOX_KEYS) if (!(k in c)) c[k] = false;
  }
  const s = normalizeStyle(c);
  return [
    s.mainColor === '' ? 'none' : s.mainColor,
    s.transColor === '' ? 'none' : s.transColor,
    s.mainBold ? '1' : '0',
    s.transItalic ? '1' : '0',
    s.marker,
    s.swapLines ? '1' : '0'
  ].join('|');
}

/**
 * Render one merged cue's text from escaped main/trans strings.
 * Tag order is fixed so style presets stay readable on players:
 *   primary:  <font color='mainColor'><b>main</b></font>
 *   secondary: marker + <i><font color='transColor'>…</font></i> (legacy order)
 */
function applyStyle(encMainText, encTransText, styleInput = {}) {
  const s = normalizeStyle(styleInput);
  if (encMainText == null) encMainText = '';

  let main = encMainText;
  if (s.mainBold) main = `<b>${main}</b>`;
  if (s.mainColor) main = `<font color='${s.mainColor}'>${main}</font>`;

  if (encTransText == null || encTransText.length === 0) {
    return main;
  }

  let secondary = encTransText;
  if (s.transColor) secondary = `<font color='${s.transColor}'>${secondary}</font>`;
  if (s.transItalic) secondary = `<i>${secondary}</i>`;
  // Marker sits outside <i>/<font> so default output stays byte-identical
  // to the v1 hardcoded format in addon.js.
  const prefix = s.marker && s.marker !== 'none' ? `${s.marker} ` : '';
  secondary = `${prefix}${secondary}`;

  return s.swapLines ? `${secondary}\n${main}` : `${main}\n${secondary}`;
}

module.exports = {
  DEFAULT_STYLE,
  MARKER_OPTIONS,
  COLOR_PRESETS,
  SUB_COLOR_PRESETS,
  normalizeStyle,
  parseStyleCode,
  buildStyleCode,
  applyStyle
};
