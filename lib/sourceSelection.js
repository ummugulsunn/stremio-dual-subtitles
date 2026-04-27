/**
 * Smart source-pair selection for the dual-subtitle merger.
 *
 * Background
 * ----------
 * The OpenSubtitles v3 stream API returns a flat list of subtitles per IMDB
 * id, where each entry has only six fields:
 *
 *   { id, url, lang, SubEncoding, m, g }
 *
 * No fps, no filename, no download counts, no video size. The historical
 * picker therefore just took the first hit per language and hoped for the
 * best. On titles like The Sopranos S01E03 ENG+TUR that strategy paired
 * subtitles from different releases, producing nonlinear local drift no
 * sync engine can fully repair.
 *
 * Empirically the `g` field is a release/source grouping id: subtitles
 * that share the same `g` come from the same source upload and are timed
 * against the same video release. We measured the impact on Sopranos
 * S01E03:
 *   - cross-group pair (production today): 75.3% match rate
 *   - same-`g` pair                       : 89.4% match rate
 *
 * This module exposes:
 *   • rankCandidatesForLanguage  - rank the in-language candidates so the
 *                                  top one is the best stand-alone choice.
 *   • generateCandidatePairs     - produce ordered (main, trans) pairs to
 *                                  try, preferring same-`g` and falling
 *                                  back to ranked-by-language pairs. The
 *                                  caller (subtitlesHandler) tries pairs
 *                                  in order until one passes the
 *                                  alignment quality gate.
 */

const { getLanguageAliases } = require('../encoding');

/**
 * Filter the flat sub list down to the ones whose lang code matches a given
 * canonical language id (with all language aliases).
 */
function filterByLanguage(allSubtitles, languageId) {
  if (!Array.isArray(allSubtitles) || !languageId) return [];
  const aliases = getLanguageAliases(languageId);
  return allSubtitles.filter(s => s && aliases.includes(s.lang));
}

/**
 * Score a candidate subtitle on its own merits (not against a peer).
 * Higher is better. Used only to break ties / order fallbacks; the
 * cross-language `g` match still dominates pairing decisions.
 */
function selfScore(sub) {
  if (!sub) return 0;
  let s = 0;
  // `m === 'i'` means "imdb match" in opensubtitles-v3 vocabulary; it's
  // present on essentially every entry but we keep the bonus in case it
  // ever differentiates.
  if (sub.m === 'i') s += 10;
  // Prefer commonly-used encodings; obscure ones tend to break decoders.
  if (sub.SubEncoding === 'UTF-8') s += 5;
  else if (sub.SubEncoding === 'CP1254' || sub.SubEncoding === 'CP1251') s += 2;
  return s;
}

/**
 * Rank candidates of a single language. Stable: ties keep original order
 * (which the API delivers in download/popularity order).
 */
function rankCandidatesForLanguage(allSubtitles, languageId) {
  const list = filterByLanguage(allSubtitles, languageId);
  return list
    .map((sub, idx) => ({ sub, idx }))
    .sort((a, b) => {
      const ds = selfScore(b.sub) - selfScore(a.sub);
      if (ds !== 0) return ds;
      return a.idx - b.idx;
    })
    .map(x => x.sub);
}

/**
 * Build an ordered list of (main, trans) candidate pairs to try.
 *
 * `g` is a strong signal but it's not perfect — empirically (Sopranos
 * S02E05) we sometimes find a same-`g` pair that syncs at ~73% while a
 * cross-`g` pair from the API's own popularity order syncs at ~96%. So
 * the strategy interleaves three sources to give the quality gate a
 * diverse set within MAX_PAIR_ATTEMPTS attempts:
 *
 *   1. Best same-`g` pair (highest-ranked main whose `g` exists in trans).
 *   2. Zipped popularity pair (mainList[0] × transList[0]) — what
 *      production used to do. Cheap insurance for edge cases like S02E05.
 *   3. Second-best same-`g` pair (different `g`, or same `g` with the
 *      next best trans peer).
 *   4. Remaining same-`g` and zipped pairs in order.
 *
 * @param {Array} allSubtitles
 * @param {string} mainLang
 * @param {string} transLang
 * @param {object} [options]
 * @param {number} [options.maxPairs=6]
 * @param {number} [options.maxPerGroup=2]
 * @returns {Array<{
 *   main: object, trans: object, sameGroup: boolean,
 *   group: (string|null), source: 'group'|'fallback'|'requested'
 * }>}
 */
function generateCandidatePairs(allSubtitles, mainLang, transLang, options = {}) {
  const { maxPairs = 6, maxPerGroup = 2 } = options;

  const mainList = rankCandidatesForLanguage(allSubtitles, mainLang);
  const transList = rankCandidatesForLanguage(allSubtitles, transLang);
  if (mainList.length === 0 || transList.length === 0) return [];

  const seen = new Set();
  const pairKey = (m, t) => `${m.id}:${t.id}`;

  // Build same-group pair queue (FIFO), highest-ranked main first.
  const transByG = new Map();
  for (const t of transList) {
    const g = t.g;
    if (g == null || g === '') continue;
    if (!transByG.has(g)) transByG.set(g, []);
    transByG.get(g).push(t);
  }
  const groupQueue = [];
  for (const m of mainList) {
    const peers = transByG.get(m.g);
    if (!peers || peers.length === 0) continue;
    let emittedForThisMain = 0;
    for (const t of peers) {
      const key = pairKey(m, t);
      if (seen.has(key)) continue;
      groupQueue.push({ main: m, trans: t, sameGroup: true, group: m.g, source: 'group' });
      seen.add(key);
      emittedForThisMain++;
      if (emittedForThisMain >= maxPerGroup) break;
    }
  }

  // Build zipped-popularity pair queue (the legacy behavior).
  const zipQueue = [];
  const zipLen = Math.min(mainList.length, transList.length);
  for (let i = 0; i < zipLen; i++) {
    const key = pairKey(mainList[i], transList[i]);
    if (seen.has(key)) continue;
    zipQueue.push({
      main: mainList[i],
      trans: transList[i],
      sameGroup: mainList[i].g === transList[i].g && mainList[i].g != null,
      group: mainList[i].g === transList[i].g ? mainList[i].g : null,
      source: 'fallback'
    });
    seen.add(key);
  }

  // Interleave. Prefer the first same-`g` (typically a big win), then a
  // zipped fallback (insurance for cases where `g` lies), then alternate.
  const pairs = [];
  const order = [groupQueue, zipQueue, groupQueue, zipQueue, groupQueue, zipQueue];
  for (const queue of order) {
    if (pairs.length >= maxPairs) break;
    if (queue.length > 0) pairs.push(queue.shift());
  }
  // Drain remainders.
  while (pairs.length < maxPairs && (groupQueue.length > 0 || zipQueue.length > 0)) {
    if (groupQueue.length > 0) pairs.push(groupQueue.shift());
    if (pairs.length >= maxPairs) break;
    if (zipQueue.length > 0) pairs.push(zipQueue.shift());
  }

  // Last-resort cross-products: top main × each remaining trans, top trans
  // × each remaining main. Useful when the languages have very few subs.
  for (let i = 1; i < transList.length && pairs.length < maxPairs; i++) {
    const key = pairKey(mainList[0], transList[i]);
    if (seen.has(key)) continue;
    pairs.push({
      main: mainList[0],
      trans: transList[i],
      sameGroup: mainList[0].g === transList[i].g && mainList[0].g != null,
      group: null,
      source: 'fallback'
    });
    seen.add(key);
  }
  for (let i = 1; i < mainList.length && pairs.length < maxPairs; i++) {
    const key = pairKey(mainList[i], transList[0]);
    if (seen.has(key)) continue;
    pairs.push({
      main: mainList[i],
      trans: transList[0],
      sameGroup: mainList[i].g === transList[0].g && mainList[i].g != null,
      group: null,
      source: 'fallback'
    });
    seen.add(key);
  }

  return pairs;
}

module.exports = {
  filterByLanguage,
  rankCandidatesForLanguage,
  generateCandidatePairs,
  _internal: { selfScore }
};
