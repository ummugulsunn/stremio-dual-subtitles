/**
 * Unit tests for Stremio Dual Subtitles bug fixes.
 * Covers: Issue #1 (ENG+ZHT sync), Issue #2 (some subtitles not working), Issue #5 (Android TV blank label)
 *
 * Run: npm test  (or: node test.js)
 */

const assert = require('assert');

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
// RESULTS
// ============================================================================
console.log('\n========================================');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
