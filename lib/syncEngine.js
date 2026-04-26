/**
 * Subtitle alignment & matching engine.
 *
 * Solves the long-standing dual-subtitle desync problem in a principled way
 * instead of relying on a single best-effort proximity threshold. The pipeline
 * is staged so each stage only does what it can do confidently:
 *
 *   1. Global offset estimation (cross-correlation of "speaker active"
 *      presence signals). Catches the most common failure mode: two subtitle
 *      releases that are uniformly shifted by N seconds.
 *
 *   2. Linear drift correction (least-squares affine fit on anchor pairs).
 *      Catches framerate-mismatch drift (e.g. 23.976 fps vs 25 fps) that
 *      otherwise grows from 0 ms at the start to several seconds at the end.
 *
 *   3. Bipartite-style assignment with overlap-fraction scoring and used-set
 *      tracking. Eliminates the "same translation cue glued to two different
 *      primary cues" duplicate that the old greedy-by-start-time matcher
 *      produced.
 *
 *   4. Optional 1:N consolidation. Lets a single primary cue absorb several
 *      short translation cues that all overlap it (common when one language
 *      splits a sentence into multiple cues).
 *
 * All public functions operate on millisecond-based subtitle records of the
 * shape {startMs, endMs, ...}. The caller (addon.js#mergeSubtitles) converts
 * to/from SRT timestamp strings around the call.
 */

/**
 * Build a binary "speaker active" signal sampled at stepMs resolution.
 * Cell i is 1 iff some cue is active during [i*stepMs, (i+1)*stepMs).
 *
 * @param {Array<{startMs:number,endMs:number}>} subs
 * @param {number} cells
 * @param {number} stepMs
 * @returns {Uint8Array}
 */
function buildPresenceSignal(subs, cells, stepMs) {
  const sig = new Uint8Array(cells);
  for (const s of subs) {
    if (!s || s.endMs <= s.startMs) continue;
    const start = Math.max(0, Math.floor(s.startMs / stepMs));
    const end = Math.min(cells - 1, Math.floor((s.endMs - 1) / stepMs));
    for (let i = start; i <= end; i++) sig[i] = 1;
  }
  return sig;
}

function countActive(sig) {
  let n = 0;
  for (let i = 0; i < sig.length; i++) if (sig[i]) n++;
  return n;
}

/**
 * Estimate the global offset (ms) between two subtitle tracks via brute-force
 * cross-correlation. Returns the offset to ADD to the secondary track's
 * timestamps so it aligns to the primary.
 *
 * Returns 0 when the alignment is too ambiguous to trust (signals barely
 * overlap, or no improvement over the lag=0 baseline).
 *
 * @param {Array} mainSubs
 * @param {Array} transSubs
 * @param {object} [options]
 * @param {number} [options.maxOffsetMs=30000] - search window (±)
 * @param {number} [options.stepMs=100]        - signal granularity
 * @param {number} [options.minConfidence=0.25]
 *        Best correlation score must be at least this fraction of the
 *        theoretical maximum (min of two active counts) to be trusted.
 * @returns {number} offset in ms (positive shifts trans later)
 */
function estimateOffsetMs(mainSubs, transSubs, options = {}) {
  const {
    maxOffsetMs = 30000,
    stepMs = 100,
    minConfidence = 0.25
  } = options;

  if (!mainSubs || !transSubs || mainSubs.length === 0 || transSubs.length === 0) {
    return 0;
  }

  // Cross-correlation needs enough cues to be statistically meaningful;
  // with only a handful of cues, the best lag is essentially noise and
  // we may align two unrelated cues that happen to be alone in the file.
  if (mainSubs.length < 5 || transSubs.length < 5) {
    return 0;
  }

  const maxMain = mainSubs[mainSubs.length - 1].endMs || 0;
  const maxTrans = transSubs[transSubs.length - 1].endMs || 0;
  const totalDuration = Math.max(maxMain, maxTrans) + maxOffsetMs;
  if (totalDuration <= 0) return 0;

  const cells = Math.ceil(totalDuration / stepMs) + 1;
  const main = buildPresenceSignal(mainSubs, cells, stepMs);
  const trans = buildPresenceSignal(transSubs, cells, stepMs);

  const mainActive = countActive(main);
  const transActive = countActive(trans);
  if (mainActive === 0 || transActive === 0) return 0;

  const maxLag = Math.floor(maxOffsetMs / stepMs);
  let bestLag = 0;
  let bestScore = -1;
  let zeroScore = 0;

  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let score = 0;
    const iStart = Math.max(0, -lag);
    const iEnd = Math.min(cells, cells - lag);
    for (let i = iStart; i < iEnd; i++) {
      if (main[i] && trans[i + lag]) score++;
    }
    if (lag === 0) zeroScore = score;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  // Confidence checks: best alignment must be meaningfully better than
  // doing nothing, and must explain a reasonable share of the signal.
  const maxPossible = Math.min(mainActive, transActive);
  if (bestScore < minConfidence * maxPossible) return 0;
  if (bestLag !== 0 && bestScore < zeroScore * 1.05) return 0;

  // bestLag>0 means trans is delayed wrt main by bestLag*stepMs. To align trans
  // to main we shift trans EARLIER, i.e. add a negative offset.
  return -bestLag * stepMs;
}

/**
 * Translate every cue's timestamps by a constant offset.
 *
 * @param {Array} subs
 * @param {number} offsetMs
 * @returns {Array} new array (input not mutated)
 */
function applyOffset(subs, offsetMs) {
  if (!offsetMs) return subs;
  return subs.map(s => ({
    ...s,
    startMs: s.startMs + offsetMs,
    endMs: s.endMs + offsetMs
  }));
}

/**
 * Find anchor pairs (mainSub, transSub) where each main has a single clearly
 * closest trans within the threshold. Used as the regression input for
 * drift detection.
 */
function findAnchorPairs(mainSubs, transSubs, anchorThresholdMs) {
  const anchors = [];
  let j = 0;
  for (const m of mainSubs) {
    while (j < transSubs.length && transSubs[j].endMs < m.startMs - anchorThresholdMs) j++;
    let bestK = -1;
    let bestD = Infinity;
    let secondD = Infinity;
    for (let k = j; k < transSubs.length; k++) {
      const t = transSubs[k];
      if (t.startMs > m.endMs + anchorThresholdMs) break;
      const d = Math.abs(t.startMs - m.startMs);
      if (d < bestD) {
        secondD = bestD;
        bestD = d;
        bestK = k;
      } else if (d < secondD) {
        secondD = d;
      }
    }
    if (bestK >= 0 && bestD <= anchorThresholdMs && secondD > bestD * 1.5) {
      anchors.push([m.startMs, transSubs[bestK].startMs]);
    }
  }
  return anchors;
}

/**
 * Estimate an affine timebase mapping y = a*x + b from main (x) to trans (y)
 * using the anchor pairs. Returns null when there aren't enough confident
 * anchors to fit a line meaningfully.
 *
 * @returns {{a:number,b:number,anchors:number}|null}
 */
function estimateAffineMapping(mainSubs, transSubs, options = {}) {
  const {
    anchorThresholdMs = 1500,
    minAnchors = 8
  } = options;

  const anchors = findAnchorPairs(mainSubs, transSubs, anchorThresholdMs);
  if (anchors.length < minAnchors) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const [x, y] of anchors) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const n = anchors.length;
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const a = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - a * sumX) / n;

  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  // Clamp to a sane range; a far from 1 means anchors are noise.
  if (a < 0.85 || a > 1.15) return null;

  return { a, b, anchors: n };
}

/**
 * Apply an affine timebase mapping (y = a*x + b describes trans wrt main).
 * Maps trans times INTO main's timebase: main_t = (trans_t - b) / a.
 */
function applyAffine(subs, mapping) {
  const { a, b } = mapping;
  return subs.map(s => ({
    ...s,
    startMs: Math.round((s.startMs - b) / a),
    endMs: Math.round((s.endMs - b) / a)
  }));
}

/**
 * Jaccard-style overlap score: intersection / union of the two intervals.
 * Returns 0 if the cues do not overlap at all.
 */
function overlapScore(m, t) {
  const overlapStart = Math.max(m.startMs, t.startMs);
  const overlapEnd = Math.min(m.endMs, t.endMs);
  const overlap = overlapEnd - overlapStart;
  if (overlap <= 0) return 0;
  const unionStart = Math.min(m.startMs, t.startMs);
  const unionEnd = Math.max(m.endMs, t.endMs);
  const union = unionEnd - unionStart;
  if (union <= 0) return 0;
  return overlap / union;
}

/**
 * Score one (main, trans) pair. Returns 0 when they're irrelevant.
 *
 * Primary signal is interval overlap (Jaccard). When the cues do not
 * overlap at all but start within `threshold` ms of each other we still
 * give a small inverse-distance score so that cue-boundary mismatches
 * don't drop a translation entirely.
 */
function pairScore(m, t, threshold) {
  const o = overlapScore(m, t);
  if (o > 0) return o;
  const startDiff = Math.abs(t.startMs - m.startMs);
  if (startDiff < threshold) return 0.001 + 1 / (1 + startDiff);
  return 0;
}

/**
 * Bipartite assignment of trans cues to main cues using a two-pass
 * strategy that maximizes overall match rate while still preventing
 * the "same trans cue glued to two different mains" bug.
 *
 *   Pass 1 — global score sort: enumerate every (main, trans) pair
 *            within `threshold`, sort by score desc, then walk the list
 *            assigning each pair only if neither side is already used.
 *            This is a Hungarian-lite that produces the best 1:1
 *            assignment in practice without the algorithmic overhead.
 *
 *   Pass 2 — 1:N consolidation (only when allowMultiTrans): for each
 *            main that already got a match in pass 1, look for ADJACENT
 *            unused trans cues that materially overlap and absorb them.
 *            Handles the case where one language splits a single line
 *            into several short cues.
 *
 * @returns {Map<number, number[]>} mainIdx -> sorted transIdx[]
 */
function assignMatches(mainSubs, transSubs, options = {}) {
  const {
    threshold = 1500,
    minOverlapFraction = 0.1,
    allowMultiTrans = true,
    maxTransPerMain = 3
  } = options;

  const matches = new Map();
  const usedMain = new Set();
  const usedTrans = new Set();

  // ---- Pass 1: global score-sorted 1:1 assignment ------------------------
  const pairs = [];
  let transStart = 0;
  for (let mi = 0; mi < mainSubs.length; mi++) {
    const m = mainSubs[mi];
    while (
      transStart < transSubs.length &&
      transSubs[transStart].endMs < m.startMs - threshold
    ) {
      transStart++;
    }
    for (let ti = transStart; ti < transSubs.length; ti++) {
      const t = transSubs[ti];
      if (t.startMs > m.endMs + threshold) break;
      const score = pairScore(m, t, threshold);
      if (score > 0) pairs.push({ mi, ti, score });
    }
  }

  pairs.sort((a, b) => b.score - a.score);
  for (const p of pairs) {
    if (usedMain.has(p.mi) || usedTrans.has(p.ti)) continue;
    usedMain.add(p.mi);
    usedTrans.add(p.ti);
    matches.set(p.mi, [p.ti]);
  }

  if (!allowMultiTrans) return matches;

  // ---- Pass 2: extend each main with adjacent unused trans cues ----------
  for (const [mi, picked] of matches) {
    if (picked.length >= maxTransPerMain) continue;
    const m = mainSubs[mi];
    const anchor = picked[0];

    // Look at neighbors to the right and left of the anchor trans cue.
    for (const dir of [1, -1]) {
      let ti = anchor + dir;
      while (
        ti >= 0 &&
        ti < transSubs.length &&
        picked.length < maxTransPerMain &&
        !usedTrans.has(ti)
      ) {
        const t = transSubs[ti];
        const score = overlapScore(m, t);
        if (score < minOverlapFraction) break;
        picked.push(ti);
        usedTrans.add(ti);
        ti += dir;
      }
    }
    picked.sort((a, b) => a - b);
  }

  return matches;
}

/**
 * Top-level alignment + matching pipeline.
 *
 * @param {Array} mainSubs   array of {startMs,endMs,...}
 * @param {Array} transSubs  array of {startMs,endMs,...}
 * @param {object} [options]
 * @returns {{
 *   matches: Map<number, number[]>,
 *   transAdjusted: Array,
 *   offsetMs: number,
 *   drift: ({a:number,b:number,anchors:number}|null),
 *   matchRate: number
 * }}
 */
function alignAndMatch(mainSubs, transSubs, options = {}) {
  const {
    enableOffset = true,
    enableDrift = true,
    matchThreshold = 1500,
    allowMultiTrans = true,
    log = () => {}
  } = options;

  let trans = transSubs;
  let offsetMs = 0;
  let drift = null;

  if (enableOffset && trans.length > 0 && mainSubs.length > 0) {
    offsetMs = estimateOffsetMs(mainSubs, trans);
    if (offsetMs !== 0) {
      trans = applyOffset(trans, offsetMs);
      log(`syncEngine: applied global offset ${offsetMs}ms`);
    }
  }

  if (enableDrift && trans.length >= 8 && mainSubs.length >= 8) {
    drift = estimateAffineMapping(mainSubs, trans);
    // Only act on drift large enough to matter (>0.1% slope deviation).
    if (drift && Math.abs(drift.a - 1) > 0.001) {
      trans = applyAffine(trans, drift);
      log(
        `syncEngine: applied affine drift a=${drift.a.toFixed(5)} ` +
        `b=${drift.b.toFixed(0)} from ${drift.anchors} anchors`
      );
    } else {
      drift = null;
    }
  }

  const matches = assignMatches(mainSubs, trans, {
    threshold: matchThreshold,
    allowMultiTrans
  });

  const matchRate = mainSubs.length > 0 ? matches.size / mainSubs.length : 0;
  log(
    `syncEngine: matched ${matches.size}/${mainSubs.length} ` +
    `(${(matchRate * 100).toFixed(1)}%)`
  );

  return {
    matches,
    transAdjusted: trans,
    offsetMs,
    drift,
    matchRate
  };
}

module.exports = {
  estimateOffsetMs,
  applyOffset,
  estimateAffineMapping,
  applyAffine,
  assignMatches,
  alignAndMatch,
  overlapScore,
  _internal: {
    buildPresenceSignal,
    findAnchorPairs,
    countActive
  }
};
