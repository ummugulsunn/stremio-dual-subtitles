# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- [ ] Subtitle style customization (colors, sizes)
- [ ] Offline caching for mobile
- [ ] Subtitle delay adjustment
- [ ] Export merged subtitles

### Planned for v2.0.0
- [ ] User accounts and preferences sync
- [ ] Vocabulary highlighting
- [ ] Flashcard generation from subtitles
- [ ] Community translations
