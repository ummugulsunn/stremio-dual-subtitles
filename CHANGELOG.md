# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Performance

- Halved Vercel Active CPU per dual-subtitle request. The previous flow ran the entire fetch + parse + merge pipeline twice — once in `subtitlesHandler` (whose result was thrown away after extracting a URL) and once in `generateDynamicSubtitle`. `subtitlesHandler` now only fetches the OpenSubtitles list and picks the top-ranked candidate pair via metadata; all heavy work happens once, on demand, when Stremio fetches the `.srt` URL.
- Added `s-maxage` + `stale-while-revalidate` to subtitle routes so Vercel's edge cache can serve repeat requests for popular titles without invoking the function. `/subs/...srt` is cached on the edge for 6 hours, the manifest-style `/{config}/subtitles/...json` for 1 hour.
- Added in-instance SRT cache lookup in `generateDynamicSubtitle`. Repeat hits on the same URL within an instance return in ≈0 ms instead of re-running fetch + parse + merge.

### Fixed

- Android TV subtitle listing compatibility by using a standard single `lang` code for dual subtitles and clearer dual naming format (`#8`)
- Clearer visual distinction between primary and secondary lines in merged SRT (`<b>`, muted color, and a `›` marker) for clients that support basic SRT HTML (`#9`)
- Dual-subtitle desync between two language tracks taken from different releases. Replaced the single-pass nearest-start-time matcher with a multi-stage alignment engine (`lib/syncEngine.js`):
  - **Stage 1 — global offset:** cross-correlation of cue presence signals detects a uniform shift between the tracks (the most common failure mode, e.g. The Sopranos S01E03 ENG+TUR where the entire translation was off by ~2.5s).
  - **Stage 2 — linear drift:** least-squares affine fit on anchor pairs corrects framerate-mismatch drift (e.g. 23.976 vs 25 fps).
  - **Stage 3 — sliding-window local offsets:** per-window cross-correlation produces piecewise-linear anchor offsets so non-linear drift (cuts/edits, ad break differences between releases) gets corrected segment-by-segment instead of with a single global slope.
  - **Stage 4 — bipartite assignment:** overlap-fraction (Jaccard) scoring with used-set tracking, so a single translation cue can no longer be glued to two different primary cues.
  - **Stage 5 — 1:N consolidation:** a primary cue may absorb multiple short translation cues that all overlap it, fixing cue-boundary mismatches.
- Dual-subtitle source pairing. The OpenSubtitles v3 stream API exposes a `g` field (release/source grouping id) that the previous picker ignored, so it would routinely pair the most-popular ENG sub with the most-popular TUR sub even when they were timed against completely different releases. New `lib/sourceSelection.js` builds an ordered list of candidate (main, trans) pairs that interleaves same-`g` pairs (same source upload, almost always sync cleanly) with the legacy zipped-popularity pair (insurance for the cases where `g` is unreliable). `subtitlesHandler` and `generateDynamicSubtitle` now run a quality gate over up to three pairs and pick the one with the highest measured match rate. Measured improvements on real titles:
  - Sopranos S01E03 (eng+tur): 76.9% → **99.5%** (+22.7pp)
  - Sopranos S01E01 (eng+tur): 69.1% → **91.0%** (+21.9pp)
  - Inception (eng+tur): 67.9% → **90.3%** (+22.4pp)
  - Inception (eng+spa): 69.7% → **85.4%** (+15.8pp)
  - Breaking Bad S01E01 (eng+spa): 75.7% → **82.4%** (+6.7pp)
  - Sopranos S02E05 / Shawshank / Game of Thrones S01E01: tied (no regressions)
  - Mean across 8 titles: **+11.2pp**, 5 wins, 3 ties, 0 losses

## [1.1.0] - 2026-02-04

### Added

- **Analytics Dashboard**: Real-time usage statistics at `/stats`
  - Page views, installs, and subtitle requests tracking
  - Hourly activity chart
  - Top languages and language pairs
  - Recent activity feed
- **Professional Landing Page**: Complete redesign with modern UI
  - Animated background with floating orbs
  - Smooth scroll navigation
  - Interactive FAQ accordion
  - Live subtitle preview
  - Open Graph meta tags for social sharing
- **Error Pages**: Custom styled 404 and 500 error pages
- **Privacy Policy**: Dedicated privacy policy page at `/privacy`
- **Gzip Compression**: Faster load times with response compression
- **New Logo**: Professional dual-bubble logo design
- **GitHub Actions CI/CD**: Automated testing and deployment checks

### Changed

- Improved landing page design with animations
- Enhanced subtitle preview with multiple language support
- Better mobile responsiveness

### Technical

- Added `compression` middleware for gzip
- Created `lib/analytics.js` for usage tracking
- Created `lib/templates.js` for HTML page generation
- Improved rate limiting with better error messages

## [1.0.0] - 2026-02-03

### Added

- Initial release
- Dual subtitle merging for movies and series
- Support for 70+ languages via OpenSubtitles
- Smart time-based subtitle synchronization
- In-memory caching with 6-hour TTL
- Multiple encoding support (UTF-8, UTF-16, legacy codepages)
- Configuration page for language selection
- Stremio addon SDK integration
- Rate limiting for API protection
- Debug logging system

### Features

- Primary language displayed on top
- Secondary language (native) displayed below in italics
- Automatic browser language detection
- Multiple subtitle versions (up to 3)
- Ad filtering from subtitles

---

## Roadmap

### Planned for v1.2.0

- Subtitle style customization (colors, sizes)
- Offline caching for mobile
- Subtitle delay adjustment
- Export merged subtitles

### Planned for v2.0.0

- User accounts and preferences sync
- Vocabulary highlighting
- Flashcard generation from subtitles
- Community translations

