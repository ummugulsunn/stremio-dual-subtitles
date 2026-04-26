/**
 * Unit tests for Stremio Dual Subtitles bug fixes.
 * Covers: Issue #1 (ENG+ZHT sync), Issue #2 (some subtitles not working), Issue #5 (Android TV blank label), Issue #9 (dual line styling)
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
    result[0].text.includes(`<font color="#94a3b8">`),
    'secondary should use a muted color where the player supports it'
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
// RESULTS
// ============================================================================
console.log('\n========================================');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
