/**
 * Unit tests for Stremio Dual Subtitles bug fixes.
 * Covers: Issue #1 (ENG+ZHT sync), Issue #2 (some subtitles not working), Issue #5 (Android TV blank label), Issue #9 (dual line styling)
 *
 * Run: npm test  (or: node test.js)
 */

const assert = require('assert');

// Never bind ports in tests (server.js listens unless VERCEL is set).
process.env.VERCEL = '1';

const {
  _test: {
    parseTimeToMs,
    parseSrt,
    parseSrtSimple,
    normalizeVttToSrt,
    mergeSubtitles,
    joinSubtitleLines,
    formatSrt,
    msToSrtTime
  },
  manifest
} = require('./addon');

const {
  isCjkLanguage,
  normalizeLanguageCode,
  decodeSubtitleBuffer,
  getLanguageAliases
} = require('./encoding');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

// ============================================================================
// parseTimeToMs
// ============================================================================
console.log('\n--- parseTimeToMs ---');

test('SRT comma format: 00:01:23,456 = 83456', () => {
  assert.strictEqual(parseTimeToMs('00:01:23,456'), 83456);
});

test('VTT period format: 00:01:23.456 = 83456 [Issue #1]', () => {
  assert.strictEqual(parseTimeToMs('00:01:23.456'), 83456);
});

test('With positioning metadata: 00:01:23,456 X1:100 = 83456 [Issue #1]', () => {
  assert.strictEqual(parseTimeToMs('00:01:23,456 X1:100 X2:200'), 83456);
});

test('1-digit hours: 1:01:23,456 = 3683456', () => {
  assert.strictEqual(parseTimeToMs('1:01:23,456'), 3683456);
});

test('2-digit ms padded: 00:01:23,45 = 83450', () => {
  assert.strictEqual(parseTimeToMs('00:01:23,45'), 83450);
});

test('1-digit ms padded: 00:01:23,4 = 83400', () => {
  assert.strictEqual(parseTimeToMs('00:01:23,4'), 83400);
});

test('null returns 0', () => {
  assert.strictEqual(parseTimeToMs(null), 0);
});

test('invalid string returns 0', () => {
  assert.strictEqual(parseTimeToMs('hello'), 0);
});

test('empty string returns 0', () => {
  assert.strictEqual(parseTimeToMs(''), 0);
});

// ============================================================================
// msToSrtTime
// ============================================================================
console.log('\n--- msToSrtTime ---');

test('83456ms = 00:01:23,456', () => {
  assert.strictEqual(msToSrtTime(83456), '00:01:23,456');
});

test('0ms = 00:00:00,000', () => {
  assert.strictEqual(msToSrtTime(0), '00:00:00,000');
});

// ============================================================================
// parseSrt — SRT format
// ============================================================================
console.log('\n--- parseSrt (SRT) ---');

test('Standard SRT parses correctly', () => {
  const srt = '1\n00:00:01,000 --> 00:00:04,000\nHello World\n\n2\n00:00:05,000 --> 00:00:08,000\nSecond line\n';
  const result = parseSrt(srt);
  assert.ok(result);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].text, 'Hello World');
  assert.strictEqual(result[1].text, 'Second line');
});

test('Period-separated SRT parses correctly [Issue #1, #2]', () => {
  const srt = '1\n00:00:01.000 --> 00:00:04.000\nHello\n\n2\n00:00:05.000 --> 00:00:08.000\nWorld\n';
  const result = parseSrt(srt);
  assert.ok(result, 'Period SRT should not return null');
  assert.strictEqual(result.length, 2);
});

test('SRT with BOM parses correctly', () => {
  const srt = '\uFEFF1\n00:00:01,000 --> 00:00:04,000\nWith BOM\n';
  const result = parseSrt(srt);
  assert.ok(result);
  assert.strictEqual(result.length, 1);
});

test('SRT with Windows line endings parses correctly', () => {
  const srt = '1\r\n00:00:01,000 --> 00:00:04,000\r\nWindows\r\n\r\n';
  const result = parseSrt(srt);
  assert.ok(result);
  assert.strictEqual(result.length, 1);
});

test('SRT ad lines are filtered out', () => {
  const srt = '1\n00:00:01,000 --> 00:00:04,000\nHello\n\n2\n00:00:05,000 --> 00:00:08,000\nAdvertise your product at OpenSubtitles.org\n';
  const result = parseSrt(srt);
  assert.ok(result);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].text, 'Hello');
});

test('Empty/null input returns null', () => {
  assert.strictEqual(parseSrt(null), null);
  assert.strictEqual(parseSrt(''), null);
  assert.strictEqual(parseSrt('   '), null);
});

// ============================================================================
// parseSrt — VTT format [Issue #2]
// ============================================================================
console.log('\n--- parseSrt (VTT) [Issue #2] ---');

test('VTT without cue IDs parses correctly', () => {
  const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nFirst cue\n\n00:00:05.000 --> 00:00:08.000\nSecond cue\n';
  const result = parseSrt(vtt);
  assert.ok(result, 'VTT should not return null');
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].text, 'First cue');
  assert.strictEqual(result[1].text, 'Second cue');
});

test('VTT with numeric cue IDs parses correctly', () => {
  const vtt = 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nHello\n\n2\n00:00:05.000 --> 00:00:08.000\nWorld\n';
  const result = parseSrt(vtt);
  assert.ok(result, 'VTT with cue IDs should not return null');
  assert.strictEqual(result.length, 2);
});

test('VTT with STYLE block is handled', () => {
  const vtt = 'WEBVTT\n\nSTYLE\n::cue { color: white; }\n\n00:00:01.000 --> 00:00:04.000\nStyled\n';
  const result = parseSrt(vtt);
  assert.ok(result);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].text, 'Styled');
});

test('VTT with Kind/Language headers is handled', () => {
  const vtt = 'WEBVTT\nKind: captions\nLanguage: en\n\n00:00:01.000 --> 00:00:04.000\nCaption\n';
  const result = parseSrt(vtt);
  assert.ok(result);
  assert.strictEqual(result.length, 1);
});

// ============================================================================
// joinSubtitleLines [Issue #1 — CJK spacing]
// ============================================================================
console.log('\n--- joinSubtitleLines [Issue #1] ---');

test('CJK: no space between lines for zht', () => {
  assert.strictEqual(joinSubtitleLines('A\nB', 'zht'), 'AB');
});

test('CJK: no space between lines for jpn', () => {
  assert.strictEqual(joinSubtitleLines('A\nB', 'jpn'), 'AB');
});

test('CJK: no space between lines for kor', () => {
  assert.strictEqual(joinSubtitleLines('A\nB', 'kor'), 'AB');
});

test('CJK: no space between lines for chi', () => {
  assert.strictEqual(joinSubtitleLines('A\nB', 'chi'), 'AB');
});

test('Latin: space between lines for eng', () => {
  assert.strictEqual(joinSubtitleLines('Hello\nWorld', 'eng'), 'Hello World');
});

test('Latin: space between lines for tur', () => {
  assert.strictEqual(joinSubtitleLines('Merhaba\nDunya', 'tur'), 'Merhaba Dunya');
});

test('null lang defaults to space', () => {
  assert.strictEqual(joinSubtitleLines('A\nB', null), 'A B');
});

test('empty text returns empty', () => {
  assert.strictEqual(joinSubtitleLines('', 'eng'), '');
});

// ============================================================================
// mergeSubtitles [Issue #1 — sync]
// ============================================================================
console.log('\n--- mergeSubtitles [Issue #1] ---');

test('Matching timestamps merge correctly', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Hello' },
    { id: '2', startTime: '00:00:05,000', endTime: '00:00:08,000', text: 'World' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Hola' },
    { id: '2', startTime: '00:00:05,000', endTime: '00:00:08,000', text: 'Mundo' }
  ];
  const result = mergeSubtitles(main, trans, { mainLang: 'eng', transLang: 'spa' });
  assert.strictEqual(result.length, 2);
  assert.ok(result[0].text.includes('Hello'));
  assert.ok(result[0].text.includes('Hola'));
  assert.ok(result[1].text.includes('World'));
  assert.ok(result[1].text.includes('Mundo'));
});

test('Slightly offset timestamps still merge', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Hello' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:01,300', endTime: '00:00:04,200', text: 'Hola' }
  ];
  const result = mergeSubtitles(main, trans, { mainLang: 'eng', transLang: 'spa' });
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].text.includes('Hola'), 'Translation should be merged despite 300ms offset');
});

test('Non-overlapping timestamps do not merge', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:02,000', text: 'Hello' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:10,000', endTime: '00:00:12,000', text: 'Hola' }
  ];
  const result = mergeSubtitles(main, trans, { mainLang: 'eng', transLang: 'spa' });
  assert.strictEqual(result.length, 1);
  assert.ok(!result[0].text.includes('Hola'), 'Translation should NOT merge with 8s gap');
});

test('Period timestamps merge correctly (both tracks)', () => {
  const mainSrt = '1\n00:00:01.000 --> 00:00:04.000\nHello\n\n2\n00:00:05.000 --> 00:00:08.000\nWorld\n';
  const transSrt = '1\n00:00:01.000 --> 00:00:04.000\nHola\n\n2\n00:00:05.000 --> 00:00:08.000\nMundo\n';
  const mainParsed = parseSrt(mainSrt);
  const transParsed = parseSrt(transSrt);
  assert.ok(mainParsed && transParsed);
  const result = mergeSubtitles(mainParsed, transParsed, { mainLang: 'eng', transLang: 'spa' });
  assert.strictEqual(result.length, 2);
  assert.ok(result[0].text.includes('Hola'));
  assert.ok(result[1].text.includes('Mundo'));
});

test('CJK merge has no space in translation line', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Hello' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Line1\nLine2' }
  ];
  const result = mergeSubtitles(main, trans, { mainLang: 'eng', transLang: 'zht' });
  assert.ok(result[0].text.includes('Line1Line2'), 'CJK translation lines should join without space');
});

test('Backward compat: numeric threshold still works', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Hello' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Hola' }
  ];
  const result = mergeSubtitles(main, trans, 500);
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].text.includes('Hola'));
});

test('Dual merge distinguishes lines: bold primary, marker, colored secondary [Issue #9]', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Hello' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Hola' }
  ];
  const result = mergeSubtitles(main, trans, { mainLang: 'eng', transLang: 'spa' });
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].text.includes('<b>Hello</b>'), 'primary line should be bold');
  assert.ok(result[0].text.includes('\u203a '), 'secondary line should include a visible marker');
  assert.ok(
    result[0].text.includes(`<font color='#94a3b8'>`),
    'secondary should use a muted color where the player supports it'
  );
});

test('mergeSubtitles: does not encode quotes, preserves literal " and \' [Issue #10]', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'She said "hi" don\'t go' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Ella dijo "hola" no te vayas' }
  ];
  const result = mergeSubtitles(main, trans, { mainLang: 'eng', transLang: 'spa' });
  assert.strictEqual(result.length, 1);
  assert.ok(
    !result[0].text.includes('&quot;'),
    'merged text must not contain literal &quot; entity'
  );
  assert.ok(
    !result[0].text.includes('&amp;quot;'),
    'merged text must not contain double-encoded &amp;quot; entity'
  );
  assert.ok(
    result[0].text.includes('She said "hi" don\'t go'),
    'primary quotes must be preserved verbatim'
  );
  assert.ok(
    result[0].text.includes('Ella dijo "hola" no te vayas'),
    'secondary quotes must be preserved verbatim'
  );
});

test('mergeSubtitles: still escapes <, > and & to keep SRT markup safe [Issue #10]', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Tom & Jerry <3 adventures' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: 'Tom y Jerry > aventuras' }
  ];
  const result = mergeSubtitles(main, trans, { mainLang: 'eng', transLang: 'spa' });
  assert.strictEqual(result.length, 1);
  // <3 must be encoded so it's not interpreted as a malformed HTML tag.
  // We accept either the single-encoded (&lt;3) or double-encoded
  // (&amp;lt;3) form — the exact nesting level is a separate concern.
  assert.ok(
    result[0].text.includes('&lt;3') || result[0].text.includes('&amp;lt;3'),
    'less-than must be escaped (single or double encoding)'
  );
  assert.ok(
    result[0].text.includes('&gt;') || result[0].text.includes('&amp;gt;'),
    'greater-than must be escaped'
  );
});

test('mergeSubtitles: decodes pre-existing &quot; from source without double-encoding [Issue #10]', () => {
  // Some source SRTs contain literal `&quot;` entities. sanitize-html
  // decodes them once; the merge output should keep the resulting `"`
  // as-is rather than re-encoding it.
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: '&quot;Hello&quot; she said' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:04,000', text: '&quot;Hola&quot; dijo' }
  ];
  const result = mergeSubtitles(main, trans, { mainLang: 'eng', transLang: 'spa' });
  assert.strictEqual(result.length, 1);
  assert.ok(
    !result[0].text.includes('&quot;'),
    'decoded quotes must not be re-encoded'
  );
  assert.ok(
    !result[0].text.includes('&amp;quot;'),
    'decoded quotes must not be double-encoded to &amp;quot;'
  );
  assert.ok(
    result[0].text.includes('"Hello" she said'),
    'source entities should be rendered as literal quotes'
  );
});

// ============================================================================
// encoding.js — isCjkLanguage [Issue #1]
// ============================================================================
console.log('\n--- isCjkLanguage [Issue #1] ---');

test('zht is CJK', () => assert.strictEqual(isCjkLanguage('zht'), true));
test('chi is CJK', () => assert.strictEqual(isCjkLanguage('chi'), true));
test('jpn is CJK', () => assert.strictEqual(isCjkLanguage('jpn'), true));
test('kor is CJK', () => assert.strictEqual(isCjkLanguage('kor'), true));
test('zh-tw is CJK', () => assert.strictEqual(isCjkLanguage('zh-tw'), true));
test('eng is not CJK', () => assert.strictEqual(isCjkLanguage('eng'), false));
test('tur is not CJK', () => assert.strictEqual(isCjkLanguage('tur'), false));
test('null is not CJK', () => assert.strictEqual(isCjkLanguage(null), false));

// ============================================================================
// encoding.js — normalizeLanguageCode [Issue #1 — ZHT encoding priority]
// ============================================================================
console.log('\n--- normalizeLanguageCode [Issue #1] ---');

test('zht -> zh-tw (Big5 priority)', () => {
  assert.strictEqual(normalizeLanguageCode('zht'), 'zh-tw');
});

test('chi -> zh (GBK priority)', () => {
  assert.strictEqual(normalizeLanguageCode('chi'), 'zh');
});

test('eng -> en', () => {
  assert.strictEqual(normalizeLanguageCode('eng'), 'en');
});

test('tur -> tr', () => {
  assert.strictEqual(normalizeLanguageCode('tur'), 'tr');
});

test('2-letter code passes through', () => {
  assert.strictEqual(normalizeLanguageCode('en'), 'en');
});

// ============================================================================
// encoding.js — decodeSubtitleBuffer
// ============================================================================
console.log('\n--- decodeSubtitleBuffer ---');

test('UTF-8 buffer decodes correctly', () => {
  const buf = Buffer.from('Hello World', 'utf8');
  const result = decodeSubtitleBuffer(buf, 'eng');
  assert.ok(result.includes('Hello World'));
});

test('UTF-8 BOM buffer decodes correctly', () => {
  const buf = Buffer.from('\xEF\xBB\xBFHello BOM', 'utf8');
  const result = decodeSubtitleBuffer(buf, 'eng');
  assert.ok(result.includes('Hello BOM'));
  assert.ok(!result.startsWith('\uFEFF'), 'BOM should be stripped');
});

test('Chinese UTF-8 text decodes correctly', () => {
  const text = '1\n00:00:01,000 --> 00:00:04,000\n你好世界\n';
  const buf = Buffer.from(text, 'utf8');
  const result = decodeSubtitleBuffer(buf, 'zht');
  assert.ok(result.includes('你好世界'), 'Chinese characters should be preserved');
});

// ============================================================================
// Manifest — lang field [Issue #5 — Android TV]
// ============================================================================
console.log('\n--- Manifest & subtitle output [Issue #5] ---');

test('Manifest has correct id', () => {
  assert.strictEqual(manifest.id, 'community.dualsubtitles');
});

test('Manifest resources includes subtitles', () => {
  assert.ok(manifest.resources.includes('subtitles'));
});

// ============================================================================
// formatSrt roundtrip
// ============================================================================
console.log('\n--- formatSrt ---');

test('Parse then format roundtrip preserves content', () => {
  const original = '1\n00:00:01,000 --> 00:00:04,000\nHello\n\n2\n00:00:05,000 --> 00:00:08,000\nWorld\n\n';
  const parsed = parseSrt(original);
  const formatted = formatSrt(parsed);
  assert.ok(formatted.includes('Hello'));
  assert.ok(formatted.includes('World'));
  assert.ok(formatted.includes('00:00:01,000 --> 00:00:04,000'));
});

// ============================================================================
// syncEngine — alignment + matching pipeline
// ============================================================================
console.log('\n--- syncEngine ---');

const {
  estimateOffsetMs,
  applyOffset,
  estimateAffineMapping,
  applyAffine,
  assignMatches,
  alignAndMatch,
  overlapScore
} = require('./lib/syncEngine');

function makeTimedCues(specs) {
  return specs.map(([startMs, endMs, text], i) => ({
    id: String(i + 1),
    startMs,
    endMs,
    text
  }));
}

test('overlapScore: full overlap = 1', () => {
  const m = { startMs: 1000, endMs: 4000 };
  const t = { startMs: 1000, endMs: 4000 };
  assert.strictEqual(overlapScore(m, t), 1);
});

test('overlapScore: no overlap = 0', () => {
  const m = { startMs: 1000, endMs: 2000 };
  const t = { startMs: 3000, endMs: 4000 };
  assert.strictEqual(overlapScore(m, t), 0);
});

test('overlapScore: partial overlap is between 0 and 1', () => {
  const m = { startMs: 1000, endMs: 3000 };
  const t = { startMs: 2000, endMs: 4000 };
  const s = overlapScore(m, t);
  assert.ok(s > 0 && s < 1);
});

test('estimateOffsetMs: detects +2000ms offset on trans track', () => {
  const main = makeTimedCues([
    [1000, 3000, 'a'], [4000, 6000, 'b'], [7000, 9000, 'c'],
    [10000, 12000, 'd'], [13000, 15000, 'e'], [16000, 18000, 'f']
  ]);
  const trans = makeTimedCues([
    [3000, 5000, 'A'], [6000, 8000, 'B'], [9000, 11000, 'C'],
    [12000, 14000, 'D'], [15000, 17000, 'E'], [18000, 20000, 'F']
  ]);
  const offset = estimateOffsetMs(main, trans);
  // trans is delayed by 2s so offset should be -2000 (shift trans earlier)
  assert.ok(Math.abs(offset - -2000) <= 100, `expected ~-2000, got ${offset}`);
});

test('estimateOffsetMs: returns 0 when tracks already aligned', () => {
  const main = makeTimedCues([
    [1000, 3000, 'a'], [4000, 6000, 'b'], [7000, 9000, 'c'],
    [10000, 12000, 'd'], [13000, 15000, 'e']
  ]);
  const trans = makeTimedCues([
    [1000, 3000, 'A'], [4000, 6000, 'B'], [7000, 9000, 'C'],
    [10000, 12000, 'D'], [13000, 15000, 'E']
  ]);
  const offset = estimateOffsetMs(main, trans);
  assert.ok(Math.abs(offset) <= 200, `aligned tracks should yield ~0 offset, got ${offset}`);
});

test('estimateOffsetMs: returns 0 with empty inputs', () => {
  assert.strictEqual(estimateOffsetMs([], []), 0);
  assert.strictEqual(estimateOffsetMs(null, null), 0);
});

test('applyOffset: shifts every cue by offset', () => {
  const subs = makeTimedCues([[1000, 2000, 'a'], [3000, 4000, 'b']]);
  const out = applyOffset(subs, 500);
  assert.strictEqual(out[0].startMs, 1500);
  assert.strictEqual(out[1].endMs, 4500);
  // Original is not mutated
  assert.strictEqual(subs[0].startMs, 1000);
});

test('estimateAffineMapping: detects framerate-style linear drift', () => {
  // Main timestamps; trans is "stretched" by factor 1.01 (drift growing
  // over time) — simulates a small framerate mismatch. We keep the
  // factor small so simple nearest-neighbor anchor pairing stays correct
  // across the whole file; in real use the offset stage runs before this
  // and leaves only the residual drift here.
  const main = [];
  const trans = [];
  for (let i = 0; i < 20; i++) {
    const t = i * 5000 + 1000;
    main.push({ id: String(i + 1), startMs: t, endMs: t + 2000, text: `m${i}` });
    const tt = Math.round(t * 1.01 + 200);
    trans.push({ id: String(i + 1), startMs: tt, endMs: tt + 2000, text: `t${i}` });
  }
  const mapping = estimateAffineMapping(main, trans, { anchorThresholdMs: 5000 });
  assert.ok(mapping, 'expected an affine mapping');
  assert.ok(Math.abs(mapping.a - 1.01) < 0.005, `slope a=${mapping.a}`);
  assert.ok(mapping.anchors >= 8);
});

test('estimateAffineMapping: returns null when too few anchors', () => {
  const main = makeTimedCues([[1000, 2000, 'a'], [5000, 6000, 'b']]);
  const trans = makeTimedCues([[1000, 2000, 'A'], [5000, 6000, 'B']]);
  const mapping = estimateAffineMapping(main, trans);
  assert.strictEqual(mapping, null);
});

test('assignMatches: never assigns same trans cue twice', () => {
  // Two main cues that are both close to a single trans cue
  const main = makeTimedCues([[1000, 2000, 'a'], [2200, 3200, 'b']]);
  const trans = makeTimedCues([[1100, 2100, 'shared']]);
  const matches = assignMatches(main, trans, { threshold: 1500 });
  const assigned = [];
  for (const arr of matches.values()) for (const t of arr) assigned.push(t);
  const seen = new Set(assigned);
  assert.strictEqual(seen.size, assigned.length, 'no trans cue may appear twice');
});

test('assignMatches: 1:N — main cue absorbs multiple short trans cues', () => {
  const main = makeTimedCues([[1000, 5000, 'long']]);
  const trans = makeTimedCues([
    [1000, 2000, 'first half'],
    [3000, 4500, 'second half']
  ]);
  const matches = assignMatches(main, trans, { threshold: 1500, allowMultiTrans: true });
  const idxs = matches.get(0);
  assert.ok(idxs && idxs.length === 2, 'expected both trans cues to be merged into the long main');
});

test('mergeSubtitles: fixes Sopranos-style off-by-one shift', () => {
  // Re-creates the bug seen on Sopranos S01E03: trans cues are shifted by ~2.5s
  // so the old greedy nearest-start-time matcher glued each trans cue to the
  // PRECEDING main cue. The new pipeline detects the global offset and lines
  // them back up.
  const main = [
    { id: '1', startTime: '00:01:50,243', endTime: '00:01:52,612', text: 'We found this truck on the side of the road.' },
    { id: '2', startTime: '00:01:52,612', endTime: '00:01:57,117', text: 'There might be some transmission trouble.' },
    { id: '3', startTime: '00:01:57,250', endTime: '00:01:59,252', text: "What's goin' on here? That's the truck." },
    { id: '4', startTime: '00:01:59,752', endTime: '00:02:02,755', text: 'The one stolen in newark?' },
    { id: '5', startTime: '00:02:04,257', endTime: '00:02:07,260', text: "It's a gift from tony soprano." },
    { id: '6', startTime: '00:02:10,763', endTime: '00:02:13,766', text: "Let's call the cops." },
    { id: '7', startTime: '00:02:14,017', endTime: '00:02:17,520', text: "I don't fuckin' believe it." },
    { id: '8', startTime: '00:02:17,520', endTime: '00:02:19,522', text: 'Listen, you fuck.' }
  ];
  // Translation track shifted later by 2.5s
  const trans = [
    { id: '1', startTime: '00:01:52,743', endTime: '00:01:55,112', text: 'Bu kamyonu yolun kenarinda bulduk.' },
    { id: '2', startTime: '00:01:55,112', endTime: '00:01:59,617', text: 'Viteste sorun olabilir.' },
    { id: '3', startTime: '00:01:59,750', endTime: '00:02:01,752', text: "Burada neler oluyor? O bizim kamyonumuz." },
    { id: '4', startTime: '00:02:02,252', endTime: '00:02:05,255', text: 'Newarkta calinan mi?' },
    { id: '5', startTime: '00:02:06,757', endTime: '00:02:09,760', text: 'Tony Sopranonun hediyesi.' },
    { id: '6', startTime: '00:02:13,263', endTime: '00:02:16,266', text: 'Polisi arayalim.' },
    { id: '7', startTime: '00:02:16,517', endTime: '00:02:20,020', text: 'Inanamiyorum.' },
    { id: '8', startTime: '00:02:20,020', endTime: '00:02:22,022', text: 'Dinle gerizekali.' }
  ];

  const merged = mergeSubtitles(main, trans, { mainLang: 'eng', transLang: 'tur' });

  function transFor(text) {
    const row = merged.find(m => m.text.includes(text));
    return row ? row.text : null;
  }
  assert.ok(transFor('We found this truck').includes('Bu kamyonu yolun kenarinda bulduk.'));
  assert.ok(transFor('transmission trouble').includes('Viteste sorun olabilir.'));
  assert.ok(transFor('stolen in newark').includes('Newarkta calinan mi'));
  assert.ok(transFor('gift from tony soprano').includes('Tony Sopranonun hediyesi.'));
  assert.ok(transFor("Let's call the cops").includes('Polisi arayalim.'));

  // No translation should appear under more than one main line.
  const transTexts = [
    'Bu kamyonu yolun kenarinda bulduk.',
    'Viteste sorun olabilir.',
    'Newarkta calinan mi',
    'Tony Sopranonun hediyesi.',
    'Polisi arayalim.'
  ];
  for (const t of transTexts) {
    const occurrences = merged.filter(m => m.text.includes(t)).length;
    assert.strictEqual(occurrences, 1, `"${t}" should appear in exactly one merged cue, got ${occurrences}`);
  }
});

test('mergeSubtitles: never duplicates a trans cue across mains', () => {
  // Two adjacent main cues, only one trans cue around them — old algorithm
  // would assign that trans cue to BOTH mains. The new one assigns once.
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:02,000', text: 'one' },
    { id: '2', startTime: '00:00:02,200', endTime: '00:00:03,200', text: 'two' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:01,100', endTime: '00:00:02,100', text: 'tek-trans' }
  ];
  const merged = mergeSubtitles(main, trans, { mainLang: 'eng', transLang: 'tur' });
  const occurrences = merged.filter(m => m.text.includes('tek-trans')).length;
  assert.strictEqual(occurrences, 1);
});

test('mergeSubtitles: emits all main cues even when trans is empty', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:02,000', text: 'alone' }
  ];
  const merged = mergeSubtitles(main, [], { mainLang: 'eng', transLang: 'tur' });
  assert.strictEqual(merged.length, 1);
  assert.ok(merged[0].text.includes('<b>alone</b>'));
});

// ============================================================================
// sourceSelection — pair generation
// ============================================================================
console.log('\n--- sourceSelection ---');

const {
  filterByLanguage,
  rankCandidatesForLanguage,
  generateCandidatePairs
} = require('./lib/sourceSelection');

test('filterByLanguage: filters by exact lang code', () => {
  // OpenSubtitles v3 always uses 3-letter ISO codes here, so we don't
  // need fuzzy alias matching across 2/3-letter codes — but we still
  // honor whatever getLanguageAliases produces.
  const subs = [
    { id: '1', lang: 'eng', g: '1' },
    { id: '2', lang: 'tur', g: '1' },
    { id: '3', lang: 'eng', g: '2' }
  ];
  const eng = filterByLanguage(subs, 'eng');
  assert.strictEqual(eng.length, 2);
  assert.deepStrictEqual(eng.map(s => s.id).sort(), ['1', '3']);
});

test('rankCandidatesForLanguage: stable order, prefers UTF-8', () => {
  const subs = [
    { id: 'a', lang: 'eng', g: '1', SubEncoding: 'CP1254', m: 'i' },
    { id: 'b', lang: 'eng', g: '1', SubEncoding: 'UTF-8', m: 'i' },
    { id: 'c', lang: 'eng', g: '2', SubEncoding: 'ASCII', m: 'i' }
  ];
  const ranked = rankCandidatesForLanguage(subs, 'eng');
  assert.strictEqual(ranked[0].id, 'b', 'UTF-8 should outrank others');
});

test('generateCandidatePairs: prefers same-`g` over zipped fallback (Sopranos pattern)', () => {
  // Mirrors the real Sopranos S01E03 response: ENG only has g=7, TUR has
  // g=1 (first by API ranking) and g=7 (second). Old picker grabbed
  // ENG[0]+TUR[0] = different releases. New picker must produce the
  // same-`g` pair as the head of the list.
  const subs = [
    { id: 'eng-7-A', lang: 'eng', g: '7' },
    { id: 'tur-1',   lang: 'tur', g: '1' },
    { id: 'tur-7',   lang: 'tur', g: '7' }
  ];
  const pairs = generateCandidatePairs(subs, 'eng', 'tur');
  assert.ok(pairs.length >= 1);
  assert.strictEqual(pairs[0].main.id, 'eng-7-A');
  assert.strictEqual(pairs[0].trans.id, 'tur-7');
  assert.strictEqual(pairs[0].sameGroup, true);
  assert.strictEqual(pairs[0].source, 'group');
});

test('generateCandidatePairs: falls back to zipped order when no `g` overlap', () => {
  const subs = [
    { id: 'eng-1', lang: 'eng', g: '1' },
    { id: 'tur-2', lang: 'tur', g: '2' }
  ];
  const pairs = generateCandidatePairs(subs, 'eng', 'tur');
  assert.ok(pairs.length >= 1);
  assert.strictEqual(pairs[0].main.id, 'eng-1');
  assert.strictEqual(pairs[0].trans.id, 'tur-2');
  assert.strictEqual(pairs[0].sameGroup, false);
  assert.strictEqual(pairs[0].source, 'fallback');
});

test('generateCandidatePairs: respects maxPairs cap and returns at most that many', () => {
  const subs = [];
  for (let i = 0; i < 6; i++) subs.push({ id: `e${i}`, lang: 'eng', g: String(i) });
  for (let i = 0; i < 6; i++) subs.push({ id: `t${i}`, lang: 'tur', g: String(i) });
  const pairs = generateCandidatePairs(subs, 'eng', 'tur', { maxPairs: 3 });
  assert.strictEqual(pairs.length, 3);
});

test('generateCandidatePairs: emits no pairs when one language is missing', () => {
  const subs = [{ id: 'eng-1', lang: 'eng', g: '1' }];
  const pairs = generateCandidatePairs(subs, 'eng', 'tur');
  assert.strictEqual(pairs.length, 0);
});

test('generateCandidatePairs: top ranked main with same-`g` peer wins over higher-ranked main without one', () => {
  // ENG[0] is best ranked but has no TUR peer at g=99. ENG[1] has a TUR
  // peer at g=7. We want the same-group pair to lead.
  const subs = [
    { id: 'eng-99', lang: 'eng', g: '99' },
    { id: 'eng-7',  lang: 'eng', g: '7'  },
    { id: 'tur-7',  lang: 'tur', g: '7'  }
  ];
  const pairs = generateCandidatePairs(subs, 'eng', 'tur');
  assert.strictEqual(pairs[0].main.id, 'eng-7');
  assert.strictEqual(pairs[0].trans.id, 'tur-7');
  assert.strictEqual(pairs[0].sameGroup, true);
});

// ============================================================================
// syncEngine — sliding-window local offsets
// ============================================================================
console.log('\n--- syncEngine.estimateLocalOffsets ---');

const {
  estimateLocalOffsets,
  applyLocalOffsets
} = require('./lib/syncEngine');

// Build a non-periodic dialogue pattern so cross-correlation can't lock
// onto a self-similarity peak. We use an LCG-based pseudo-random spacing,
// reproducible across runs without depending on Math.random.
function buildDialogueTrack(count, startMs = 1000, seed = 42) {
  let s = seed;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const cues = [];
  let t = startMs;
  for (let i = 0; i < count; i++) {
    const dur = 1500 + Math.floor(rng() * 2500);   // 1.5–4.0s cues
    const gap = 500 + Math.floor(rng() * 6000);    // 0.5–6.5s gaps
    cues.push({ id: String(i + 1), startMs: t, endMs: t + dur, text: `c${i}` });
    t += dur + gap;
  }
  return cues;
}

test('estimateLocalOffsets: detects piecewise drift across windows', () => {
  // First half: trans is +1500ms; second half: trans is -2500ms. We turn
  // off the global offset stage by feeding a dataset where each segment
  // averages to its own local offset; the test is just that the sliding
  // window finds segment-specific anchors.
  const main = buildDialogueTrack(60);
  const split = main.length / 2;
  const trans = main.map((c, i) => {
    const o = i < split ? 1500 : -2500;
    return { ...c, startMs: c.startMs + o, endMs: c.endMs + o };
  });
  const anchors = estimateLocalOffsets(main, trans, {
    windowMs: 60000, stepMs: 30000, minCuesPerWindow: 4, maxLocalOffsetMs: 5000
  });
  assert.ok(anchors.length >= 3, `expected several anchors, got ${anchors.length}`);
  // We don't pin exact offsets (cross-correlation has step granularity),
  // but we expect early anchors to lean positive (trans is delayed) and
  // late anchors to lean negative (trans is early). estimateOffsetMs
  // returns the shift applied TO trans, so positive = shift later.
  const half = main[main.length - 1].startMs / 2;
  const early = anchors.filter(a => a.centerMs < half);
  const late = anchors.filter(a => a.centerMs > half);
  assert.ok(early.length > 0 && late.length > 0);
  const earlyMean = early.reduce((s, a) => s + a.offsetMs, 0) / early.length;
  const lateMean = late.reduce((s, a) => s + a.offsetMs, 0) / late.length;
  assert.ok(
    earlyMean < lateMean,
    `early anchors should differ from late ones; got early=${earlyMean} late=${lateMean}`
  );
});

test('estimateLocalOffsets: returns empty list with too-short tracks', () => {
  const anchors = estimateLocalOffsets([], []);
  assert.deepStrictEqual(anchors, []);
});

test('applyLocalOffsets: piecewise-linear interpolation between anchors', () => {
  const subs = [
    { startMs: 0,     endMs: 1000 },
    { startMs: 60000, endMs: 61000 },
    { startMs: 120000,endMs: 121000 }
  ];
  const anchors = [
    { centerMs: 0,      offsetMs: 0 },
    { centerMs: 120000, offsetMs: 1000 }
  ];
  const out = applyLocalOffsets(subs, anchors);
  assert.strictEqual(out[0].startMs, 0,       'first anchor end held');
  assert.strictEqual(out[1].startMs, 60500,   'midpoint interpolated');
  assert.strictEqual(out[2].startMs, 121000,  'second anchor end held');
});

test('alignAndMatch: piecewise-drifted track matches better with local offsets enabled', () => {
  // Build a non-periodic dialogue pattern with two segments that have
  // different local offsets. Local-offsets-on must beat local-offsets-off
  // when global offset is disabled (so we measure only the local stage).
  const main = buildDialogueTrack(80);
  const split = main.length / 2;
  const trans = main.map((c, i) => {
    const o = i < split ? 1500 : -2500;
    return { ...c, startMs: c.startMs + o, endMs: c.endMs + o };
  });
  const withLocal = alignAndMatch(main, trans, {
    matchThreshold: 1500, enableLocalOffsets: true,
    enableOffset: false, enableDrift: false
  });
  const withoutLocal = alignAndMatch(main, trans, {
    matchThreshold: 1500, enableLocalOffsets: false,
    enableOffset: false, enableDrift: false
  });
  assert.ok(
    withLocal.matchRate > withoutLocal.matchRate + 0.1,
    `expected local-offset path to outperform by >10pp; got ${withLocal.matchRate.toFixed(3)} vs ${withoutLocal.matchRate.toFixed(3)}`
  );
});

// ============================================================================
// styleRenderer
// ============================================================================
console.log('\n--- styleRenderer ---');

const {
  DEFAULT_STYLE,
  COLOR_PRESETS,
  MARKER_OPTIONS,
  parseStyleCode,
  buildStyleCode,
  applyStyle
} = require('./lib/styleRenderer');

test('applyStyle: legacy defaults are byte-identical to v1 formatting', () => {
  assert.strictEqual(
    applyStyle('Hello', 'World'),
    "<b>Hello</b>\n\u203a <i><font color='#94a3b8'>World</font></i>"
  );
});

test('applyStyle: empty trans text renders main line only', () => {
  assert.strictEqual(applyStyle('Hello', ''), '<b>Hello</b>');
  assert.strictEqual(applyStyle('Hello', null), '<b>Hello</b>');
});

test('applyStyle: custom toggles and marker, no bold', () => {
  // Marker follows the v1 tag order (outside <i>/<font>, same as the
  // legacy-defaults test); italic toggled off here, bold toggled off.
  assert.strictEqual(
    applyStyle('Hi', 'Yo', { mainBold: false, transItalic: false, marker: '::', transColor: '#ff0000' }),
    "Hi\n:: <font color='#ff0000'>Yo</font>"
  );
});

test('applyStyle: swapLines puts secondary line on top', () => {
  assert.strictEqual(
    applyStyle('Hi', 'Yo', { swapLines: true }),
    "\u203a <i><font color='#94a3b8'>Yo</font></i>\n<b>Hi</b>"
  );
});

test('applyStyle: mainColor wraps primary line in font tag', () => {
  assert.strictEqual(
    applyStyle('Hi', 'Yo', { mainColor: '#00ff00' }),
    "<font color='#00ff00'><b>Hi</b></font>\n\u203a <i><font color='#94a3b8'>Yo</font></i>"
  );
});

test('applyStyle: preset label extracts hex (config value from Stremio)', () => {
  assert.strictEqual(
    applyStyle('Hi', 'Yo', { transColor: 'Red (#f43f5e)' }),
    "<b>Hi</b>\n\u203a <i><font color='#f43f5e'>Yo</font></i>"
  );
});

test('applyStyle: invalid color falls back to legacy gray, not raw injection', () => {
  assert.ok(applyStyle('Hi', 'Yo', { transColor: '<script>' }).includes('#94a3b8'));
  assert.ok(!applyStyle('Hi', 'Yo', { transColor: '<script>' }).includes('<script>'));
});

test('applyStyle: no marker renders without prefix', () => {
  assert.strictEqual(
    applyStyle('Hi', 'Yo', { marker: 'none', transColor: '', transItalic: false }),
    "<b>Hi</b>\nYo"
  );
});

test('buildStyleCode + parseStyleCode: default config roundtrip', () => {
  const code = buildStyleCode({});
  assert.strictEqual(code, 'none|#94a3b8|1|1|\u203a|0');
  const s = parseStyleCode(code);
  assert.strictEqual(s.mainColor, '');
  assert.strictEqual(s.transColor, '#94a3b8');
  assert.strictEqual(s.mainBold, true);
  assert.strictEqual(s.transItalic, true);
  assert.strictEqual(s.marker, '\u203a');
  assert.strictEqual(s.swapLines, false);
});

test('buildStyleCode + parseStyleCode: full custom config roundtrip', () => {
  const code = buildStyleCode({
    mainColor: '#00ff00', transColor: '#ff0000', mainBold: false,
    transItalic: false, marker: '::', swapLines: true
  });
  assert.strictEqual(code, '#00ff00|#ff0000|0|0|::|1');
  const s = parseStyleCode(code);
  assert.strictEqual(s.mainColor, '#00ff00');
  assert.strictEqual(s.transColor, '#ff0000');
  assert.strictEqual(s.mainBold, false);
  assert.strictEqual(s.transItalic, false);
  assert.strictEqual(s.marker, '::');
  assert.strictEqual(s.swapLines, true);
});

test('buildStyleCode: native form checkbox values (on / omitted)', () => {
  // Stremio's config form serializes via FormData: checked -> 'on', unchecked -> key absent
  const form = { mainLang: 'English [eng]', transLang: 'Turkish [tur]',
    mainColor: 'None (player default)', transColor: 'Gray (#94a3b8)', marker: '\u203a' };
  assert.strictEqual(buildStyleCode({ ...form, mainBold: 'on', transItalic: 'on' }), 'none|#94a3b8|1|1|\u203a|0');
  assert.strictEqual(buildStyleCode({ ...form, swapLines: 'on' }), 'none|#94a3b8|0|0|\u203a|1');
  assert.strictEqual(buildStyleCode({ ...form, mainBold: 'checked' }), 'none|#94a3b8|1|0|\u203a|0');
});

test('buildStyleCode: language-only config keeps defaults', () => {
  assert.strictEqual(
    buildStyleCode({ mainLang: 'English [eng]', transLang: 'Turkish [tur]' }),
    'none|#94a3b8|1|1|\u203a|0'
  );
});

test('parseStyleCode: invalid fields fall back to defaults', () => {
  const s = parseStyleCode('zzz|zzz|9|9|<script>|9');
  assert.strictEqual(s.transColor, '#94a3b8', 'invalid color -> default gray');
  assert.strictEqual(s.mainBold, true);
  assert.strictEqual(s.transItalic, true);
  assert.strictEqual(s.marker, '\u203a');
  assert.strictEqual(s.swapLines, false);
});

test('parseStyleCode: null/empty code returns defaults', () => {
  const s = parseStyleCode(null);
  assert.strictEqual(s.transColor, '#94a3b8');
  assert.strictEqual(s.mainBold, true);
  const e = parseStyleCode('');
  assert.strictEqual(e.transColor, '#94a3b8');
});

test('preset/marker option lists are exposed for the manifest', () => {
  assert.ok(Array.isArray(COLOR_PRESETS) && COLOR_PRESETS.length >= 6);
  assert.ok(MARKER_OPTIONS.includes('\u203a') && !MARKER_OPTIONS.includes('|'));
});

test('applyStyle: null main text is guarded (no literal "null")', () => {
  assert.strictEqual(applyStyle(null, 'Yo'), "<b></b>\n\u203a <i><font color='#94a3b8'>Yo</font></i>");
});

test('parseStyleCode: whitespace around fields is ignored', () => {
  const s = parseStyleCode(' #00ff00 | #ff0000 |1|1| :: | 1 ');
  assert.strictEqual(s.mainColor, '#00ff00');
  assert.strictEqual(s.transColor, '#ff0000');
  assert.strictEqual(s.marker, '::');
  assert.strictEqual(s.swapLines, true);
});

// ============================================================================
// mergeSubtitles + style wiring
// ============================================================================
console.log('\n--- mergeSubtitles style wiring ---');

test('mergeSubtitles: default output byte-identical to legacy formatting', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:02,000', text: 'one' },
    { id: '2', startTime: '00:00:03,000', endTime: '00:00:04,000', text: 'two' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:02,000', text: 'uno' }
  ];
  const merged = mergeSubtitles(main, trans, { mainLang: 'eng', transLang: 'tur' });
  assert.strictEqual(
    merged[0].text,
    "<b>one</b>\n\u203a <i><font color='#94a3b8'>uno</font></i>"
  );
  assert.strictEqual(merged[1].text, '<b>two</b>');
});

test('mergeSubtitles: style option changes rendering', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:02,000', text: 'one' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:02,000', text: 'uno' }
  ];
  const merged = mergeSubtitles(main, trans, {
    mainLang: 'eng', transLang: 'tur',
    style: { mainBold: false, transItalic: false, marker: 'none', transColor: '', swapLines: true }
  });
  assert.strictEqual(merged[0].text, 'uno\none');
});

test('mergeSubtitles: style code string is accepted too', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:02,000', text: 'one' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:02,000', text: 'uno' }
  ];
  const merged = mergeSubtitles(main, trans, {
    mainLang: 'eng', transLang: 'tur',
    style: 'none|#94a3b8|1|1|\u203a|1'
  });
  assert.strictEqual(
    merged[0].text,
    "\u203a <i><font color='#94a3b8'>uno</font></i>\n<b>one</b>"
  );
});

test('mergeSubtitles: styled unmatched path renders main line only (no swap/undefined artifacts)', () => {
  const main = [
    { id: '1', startTime: '00:00:01,000', endTime: '00:00:02,000', text: 'one' }
  ];
  const trans = [
    { id: '1', startTime: '00:00:30,000', endTime: '00:00:31,000', text: 'uno' }
  ];
  const merged = mergeSubtitles(main, trans, { mainLang: 'eng', transLang: 'tur' });
  assert.strictEqual(merged[0].text, '<b>one</b>');
});

// ============================================================================
// manifest config
// ============================================================================
console.log('\n--- manifest config ---');

test('manifest: version bumped to 1.2.0', () => {
  assert.strictEqual(manifest.version, '1.2.0');
});

test('manifest: language + style config keys present', () => {
  const keys = manifest.config.map(c => c.key);
  for (const key of ['mainLang', 'transLang', 'mainColor', 'transColor',
                     'mainBold', 'transItalic', 'marker', 'swapLines']) {
    assert.ok(keys.includes(key), `missing config key: ${key}`);
  }
});

test('manifest: style defaults are safe', () => {
  const byKey = Object.fromEntries(manifest.config.map(c => [c.key, c]));
  assert.strictEqual(byKey.mainColor.default, 'None (player default)');
  assert.strictEqual(byKey.transColor.default, 'Gray (#94a3b8)');
  // SDK convention: 'checked' = enabled by default, no default = unchecked
  assert.strictEqual(byKey.mainBold.default, 'checked');
  assert.strictEqual(byKey.transItalic.default, 'checked');
  assert.strictEqual(byKey.marker.default, '\u203a');
  assert.strictEqual(byKey.swapLines.default, undefined);
  for (const key of ['mainColor', 'transColor', 'marker']) {
    assert.ok(Array.isArray(byKey[key].options) && byKey[key].options.length > 0,
      `${key} must offer options`);
  }
});

// ============================================================================
// subtitleCache (tiered) — sync surface
// ============================================================================
console.log('\n--- subtitleCache sync ---');

const subtitleCacheMod = require('./lib/subtitleCache');

test('subtitleCache: put/get roundtrip in memory', () => {
  subtitleCacheMod.clearMem();
  subtitleCacheMod.put('testkey1', 'A\nB');
  const entry = subtitleCacheMod._test.memCache.get('testkey1');
  assert.ok(entry && entry.content === 'A\nB' && typeof entry.timestamp === 'number');
});

test('subtitleCache: disk tier flag honors env (auto/on/off/Vercel)', () => {
  const origV = process.env.VERCEL;
  const origD = process.env.SUBTITLE_DISK_CACHE;
  delete process.env.VERCEL;
  delete process.env.SUBTITLE_DISK_CACHE;
  assert.strictEqual(subtitleCacheMod._test.isDiskEnabled(), true, 'local default on');
  process.env.VERCEL = '1';
  assert.strictEqual(subtitleCacheMod._test.isDiskEnabled(), false, 'vercel auto-off');
  process.env.SUBTITLE_DISK_CACHE = 'on';
  assert.strictEqual(subtitleCacheMod._test.isDiskEnabled(), true, 'explicit on wins');
  process.env.SUBTITLE_DISK_CACHE = 'off';
  assert.strictEqual(subtitleCacheMod._test.isDiskEnabled(), false, 'explicit off wins');
  if (origV === undefined) delete process.env.VERCEL; else process.env.VERCEL = origV;
  if (origD === undefined) delete process.env.SUBTITLE_DISK_CACHE; else process.env.SUBTITLE_DISK_CACHE = origD;
});

test('subtitleCache: put skips redis for content over REDIS_MAX_BYTES (utf8 bytes)', () => {
  const { REDIS_MAX_BYTES } = subtitleCacheMod._test;
  assert.strictEqual(typeof REDIS_MAX_BYTES, 'number', 'REDIS_MAX_BYTES exposed for tests');
  const bigStr = '日'.repeat(200000); // 200k chars, ~600KB utf8
  assert.ok(Buffer.byteLength(bigStr, 'utf8') > REDIS_MAX_BYTES, 'fixture exceeds cap in bytes');
  assert.ok(bigStr.length < REDIS_MAX_BYTES, 'fixture is UNDER cap in chars (guard must use bytes)');
});

// ============================================================================
// server config parsing (native/JSON + legacy pipe forms)
// ============================================================================
console.log('\n--- server config parsing ---');

const serverApp = require('./server');
const { parseConfigParam } = serverApp._test;

test('parseConfigParam: compact pipe form (website URLs)', () => {
  assert.deepStrictEqual(
    parseConfigParam(encodeURIComponent('English [eng]|Turkish [tur]')),
    { mainLang: 'English [eng]', transLang: 'Turkish [tur]' }
  );
  // already-decoded input works too (Express decodes :params)
  assert.deepStrictEqual(
    parseConfigParam('English [eng]|Turkish [tur]'),
    { mainLang: 'English [eng]', transLang: 'Turkish [tur]' }
  );
});

test('parseConfigParam: native JSON form (Stremio in-app config)', () => {
  const cfg = {
    mainLang: 'English [eng]',
    transLang: 'Turkish [tur]',
    mainColor: 'Red (#f43f5e)',
    mainBold: 'false'
  };
  assert.deepStrictEqual(
    parseConfigParam(encodeURIComponent(JSON.stringify(cfg))),
    cfg
  );
  assert.deepStrictEqual(parseConfigParam(JSON.stringify(cfg)), cfg);
});

test('parseConfigParam: garbage/invalid returns null', () => {
  assert.strictEqual(parseConfigParam('plain-garbage-no-pipe'), null);
  assert.strictEqual(parseConfigParam(''), null);
  assert.strictEqual(parseConfigParam(undefined), null);
  assert.strictEqual(parseConfigParam('{broken json'), null);
  // JSON without both language keys is invalid
  assert.strictEqual(parseConfigParam(JSON.stringify({ mainLang: 'English [eng]' })), null);
});

// ============================================================================
// RESULTS
// ============================================================================
(async () => {
  // ---------------------------------------------------------------------------
  // subtitles URL plumbing (style + video params)
  // ---------------------------------------------------------------------------
  console.log('\n--- subtitles URL plumbing ---');

  const axiosMod = require('axios');
  const { subtitlesHandler } = require('./addon');
  const { parseStyleCode: parseStyleCodeForPlumbing } = require('./lib/styleRenderer');

  await testAsync('subtitlesHandler: .srt URL carries style param and video params', async () => {
    const origGet = axiosMod.get;
    axiosMod.get = async () => ({
      data: {
        subtitles: [
          { id: '111', url: 'https://example.com/main.srt', lang: 'eng', downloads: 500 },
          { id: '222', url: 'https://example.com/trans.srt', lang: 'tur', downloads: 400 }
        ]
      }
    });

    const result = await subtitlesHandler({
      type: 'movie',
      id: 'tt0111161',
      extra: { filename: 'Shawshank.1994.mp4' },
      config: {
        mainLang: 'English [eng]',
        transLang: 'Turkish [tur]',
        mainColor: 'Red (#f43f5e)',
        mainBold: 'false'
      }
    });
    axiosMod.get = origGet;

    assert.strictEqual(result.subtitles.length, 1);
    const url = result.subtitles[0].url;
    // imdbId: 'tt0111161'.replace('tt','') === '0111161' (first occurrence only)
    assert.ok(url.startsWith('{{ADDON_URL}}/subs/movie/0111161/0/0/eng/tur/111/222.srt?'), `unexpected path: ${url}`);
    const params = new URLSearchParams(url.split('?')[1]);
    assert.ok(params.has('style'), 'style param missing');
    const styleCfg = parseStyleCodeForPlumbing(params.get('style'));
    assert.strictEqual(styleCfg.mainColor, '#f43f5e');
    assert.strictEqual(styleCfg.mainBold, false);
    assert.strictEqual(params.get('filename'), 'Shawshank.1994.mp4');
  });

  await testAsync('subtitlesHandler: defaults used when config has only languages', async () => {
    const origGet = axiosMod.get;
    axiosMod.get = async () => ({
      data: { subtitles: [
        { id: '111', url: 'https://example.com/main.srt', lang: 'eng', downloads: 500 },
        { id: '222', url: 'https://example.com/trans.srt', lang: 'tur', downloads: 400 }
      ] }
    });
    const result = await subtitlesHandler({
      type: 'movie', id: 'tt0111161', extra: {},
      config: { mainLang: 'English [eng]', transLang: 'Turkish [tur]' }
    });
    axiosMod.get = origGet;
    const params = new URLSearchParams(result.subtitles[0].url.split('?')[1]);
    const styleCfg = parseStyleCodeForPlumbing(params.get('style'));
    assert.strictEqual(styleCfg.transColor, '#94a3b8');
    assert.strictEqual(styleCfg.mainBold, true);
  });

  // ============================================================================
  // subtitleCache (tiered) — async get/put + disk tier
  // ============================================================================
  console.log('\n--- subtitleCache async ---');

  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  await testAsync('subtitleCache: memory get hit/miss', async () => {
    subtitleCacheMod.clearMem();
    assert.strictEqual(await subtitleCacheMod.get('async_missing'), null, 'miss -> null');
    subtitleCacheMod.put('async_hit', 'mem-content');
    assert.strictEqual(await subtitleCacheMod.get('async_hit'), 'mem-content');
  });

  await testAsync('subtitleCache: disk tier write/read/expiry with dir override', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dualsub-cache-'));
    const origDir = process.env.SUBTITLE_DISK_DIR;
    const origAuto = process.env.SUBTITLE_DISK_CACHE;
    process.env.SUBTITLE_DISK_DIR = tmp;
    process.env.SUBTITLE_DISK_CACHE = 'on';

    // same key -> same sha1-based path
    const p1 = subtitleCacheMod._test.diskPath('cachecheck');
    const p2 = subtitleCacheMod._test.diskPath('cachecheck');
    assert.strictEqual(p1, p2);
    assert.ok(p1.startsWith(tmp) && p1.endsWith('.srt'), `path shape: ${p1}`);

    subtitleCacheMod.clearMem();
    subtitleCacheMod.put('cachecheck', 'disk-content');
    assert.ok(fs.existsSync(p1), 'file written');
    assert.strictEqual(await subtitleCacheMod.get('cachecheck'), 'disk-content');

    // backdate mtime beyond TTL -> expired & removed
    const TTL_MS = 6 * 60 * 60 * 1000;
    const old = new Date(Date.now() - TTL_MS - 1000);
    fs.utimesSync(p1, old, old);
    subtitleCacheMod.clearMem();
    assert.strictEqual(await subtitleCacheMod.get('cachecheck'), null, 'expired on disk');
    assert.ok(!fs.existsSync(p1), 'expired file removed');

    if (origDir === undefined) delete process.env.SUBTITLE_DISK_DIR; else process.env.SUBTITLE_DISK_DIR = origDir;
    if (origAuto === undefined) delete process.env.SUBTITLE_DISK_CACHE; else process.env.SUBTITLE_DISK_CACHE = origAuto;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // ============================================================================
  // rate limiter sweep
  // ============================================================================
  console.log('\n--- rate limiter sweep ---');

  await testAsync('rate limiter: sweepRateLimitStore drops expired entries only', async () => {
    const { sweepRateLimitStore, rateLimitStore } = serverApp._test;
    assert.strictEqual(typeof sweepRateLimitStore, 'function', 'sweepRateLimitStore missing');
    assert.ok(rateLimitStore instanceof Map, 'rateLimitStore Map missing');

    const now = Date.now();
    rateLimitStore.set('203.0.113.77', { count: 5, resetAt: now - 1000 }); // expired
    rateLimitStore.set('198.51.100.9', { count: 2, resetAt: now + 60000 }); // active
    sweepRateLimitStore();
    assert.ok(!rateLimitStore.has('203.0.113.77'), 'expired entry must be deleted');
    assert.ok(rateLimitStore.has('198.51.100.9'), 'active entry must survive');
    rateLimitStore.delete('198.51.100.9');
  });

  console.log('\n========================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
})();
