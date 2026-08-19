const { fetchSecondarySubtitles } = require('../lib/secondarySource');

async function test() {
  // tt15047880 (Disclosure Day) has 0 'heb' subs on the primary source
  // but 10 real (non-AI) 'heb' subs on the secondary mirror, verified
  // manually 2026-07-29 via curl against opensubtitles.stremio.homes.
  const subs = await fetchSecondarySubtitles('15047880', 'movie', 'heb', 'rus');

  const hebCount = subs.filter(s => s.lang === 'heb').length;
  const rusCount = subs.filter(s => s.lang === 'rus').length;

  console.log(`Found ${subs.length} total, ${hebCount} heb, ${rusCount} rus`);

  if (hebCount === 0) {
    console.log('FAILED: expected at least 1 heb subtitle');
    process.exit(1);
  }

  // Every entry must have the shape the primary-source merge pipeline expects
  const bad = subs.find(s => !s.id || !s.url || !s.lang);
  if (bad) {
    console.log('FAILED: malformed entry', bad);
    process.exit(1);
  }

  console.log('SUCCESS');
}

const { generateDynamicSubtitle } = require('../addon');

async function testFullPipeline() {
  // Before Task 2: returns null (0 heb subs from primary, no fallback).
  // After Task 2: should return a merged heb+rus SRT.
  const srt = await generateDynamicSubtitle(
    'movie', '15047880', null, null, 'heb', 'rus', 'dummyMain', 'dummyTrans'
  );

  if (!srt) {
    console.log('FAILED: expected merged subtitle, got null');
    process.exit(1);
  }
  console.log('FULL PIPELINE SUCCESS, length:', srt.length);
}

test().then(testFullPipeline);
