/**
 * Landing page template for the Dual Subtitles addon.
 * Professional, user-focused design with configuration upfront.
 */

const { getLanguageOptions } = require('./languages');

function generateLandingHTML(manifest, baseUrl, publicStats) {
  publicStats = publicStats || { totalSubtitlesServed: 0, totalInstalls: 0, totalPageViews: 0, uniqueVisitors: 0, topPairs: [], live: false };

  // Format number with commas instead of K/M suffix for visual satisfaction
  function formatNumber(n) {
    return Number(n).toLocaleString();
  }

  // Pre-render top pairs pills
  const topPairsHTML = (publicStats.topPairs || []).map(function(pair) {
    const name = pair[0] || '';
    return '<span class="pair-pill">' + name.replace(/\+/g, ' + ') + '</span>';
  }).join('');

  const languageOptions = getLanguageOptions();
  
  const optionsHTML = languageOptions
    .map(opt => `<option value="${opt}">${opt}</option>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${manifest.name} - Learn Languages While Watching Movies & TV Shows</title>
  
  <!-- SEO Meta Tags -->
  <meta name="description" content="Learn languages naturally by watching movies and TV shows with dual subtitles. Display two languages simultaneously - perfect for language learners. Free Stremio addon with 70+ languages.">
  <meta name="keywords" content="stremio addon, dual subtitles, language learning, bilingual subtitles, learn english, learn spanish, learn german, learn french, learn turkish, movie subtitles, tv series subtitles, stremio plugin, two language subtitles, subtitle translator, language immersion">
  <meta name="author" content="Dual Subtitles">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#7c3aed">
  <link rel="canonical" href="${baseUrl}/configure">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${baseUrl}/configure">
  <meta property="og:title" content="${manifest.name} - Learn Languages While Watching Movies">
  <meta property="og:description" content="Watch movies and TV shows with dual subtitles. Display two languages at once - perfect for language learning. Free Stremio addon with 70+ languages.">
  <meta property="og:image" content="${manifest.logo}">
  <meta property="og:site_name" content="Dual Subtitles">
  <meta property="og:locale" content="en_US">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${manifest.name} - Learn Languages While Watching">
  <meta name="twitter:description" content="Watch movies and TV shows with dual subtitles. Display two languages at once - perfect for language learning!">
  <meta name="twitter:image" content="${manifest.logo}">
  <meta name="twitter:creator" content="@dualsubtitles">
  
  <!-- Structured Data (JSON-LD) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "${manifest.name}",
    "description": "Learn languages naturally by watching movies and TV shows with dual subtitles.",
    "url": "${baseUrl}",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Windows, macOS, Linux, Android, iOS",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": ["70+ languages", "Dual subtitle display", "Movies and TV series", "Free to use"]
  }
  </script>
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="${manifest.logo}">
  <link rel="apple-touch-icon" href="${manifest.logo}">
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --primary: #6366f1;
      --primary-light: #818cf8;
      --secondary: #8b5cf6;
      --accent: #22d3ee;
      --bg: #09090b;
      --bg-elevated: #18181b;
      --bg-card: rgba(24, 24, 27, 0.8);
      --text: #fafafa;
      --text-muted: #a1a1aa;
      --border: rgba(255, 255, 255, 0.08);
      --success: #22c55e;
      --gradient: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    }
    
    html { scroll-behavior: smooth; }
    
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      overflow-x: hidden;
    }
    
    /* Background Effects */
    .bg-grid {
      position: fixed;
      inset: 0;
      background-image: 
        linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
      background-size: 64px 64px;
      z-index: -2;
    }
    
    .bg-glow {
      position: fixed;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      filter: blur(120px);
      z-index: -1;
      opacity: 0.4;
    }
    
    .glow-1 {
      background: var(--primary);
      top: -200px;
      right: -100px;
    }
    
    .glow-2 {
      background: var(--secondary);
      bottom: -200px;
      left: -100px;
    }
    
    /* Navigation */
    .nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100;
      background: rgba(9, 9, 11, 0.8);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
    }
    
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text);
    }
    
    .nav-brand img {
      width: 36px;
      height: 36px;
      border-radius: 8px;
    }
    
    .nav-brand span {
      font-weight: 700;
      font-size: 16px;
    }
    
    .nav-links {
      display: flex;
      gap: 32px;
      align-items: center;
    }
    
    .nav-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: color 0.2s;
    }
    
    .nav-links a:hover { color: var(--text); }
    
    .nav-github {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }
    
    .nav-github:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.15);
    }
    
    .nav-github svg { width: 16px; height: 16px; }
    
    .nav-sponsor-link {
      color: #fb7185 !important;
      font-weight: 600 !important;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    
    .nav-sponsor-link:hover {
      color: #fda4af !important;
      text-shadow: 0 0 12px rgba(244, 63, 94, 0.4);
    }
    
    /* Hero Section - Split Layout */
    .hero {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 80px;
      align-items: center;
      padding: 120px 80px 80px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .hero-content {
      max-width: 540px;
    }
    
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
      color: var(--primary-light);
      margin-bottom: 24px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .hero-badge::before {
      content: '';
      width: 6px;
      height: 6px;
      background: var(--success);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }
    
    .hero h1 {
      font-size: 56px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 20px;
      letter-spacing: -0.02em;
    }
    
    .hero h1 .highlight {
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .hero-desc {
      font-size: 18px;
      color: var(--text-muted);
      margin-bottom: 32px;
      line-height: 1.7;
    }
    
    .hero-features {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .hero-feature {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-muted);
    }
    
    .hero-feature svg {
      width: 18px;
      height: 18px;
      color: var(--success);
    }
    
    /* Configuration Card */
    .config-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 40px;
      backdrop-filter: blur(16px);
    }
    
    .config-header {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .config-header h2 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .config-header p {
      color: var(--text-muted);
      font-size: 14px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text);
    }
    
    .form-group .tag {
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    
    .tag-learning {
      background: rgba(34, 211, 238, 0.1);
      color: var(--accent);
    }
    
    .tag-native {
      background: rgba(139, 92, 246, 0.1);
      color: var(--secondary);
    }
    
    select {
      width: 100%;
      padding: 14px 16px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: var(--text);
      font-size: 15px;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a1a1aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      background-size: 18px;
    }
    
    select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
    
    select option {
      background: var(--bg);
      color: var(--text);
    }
    
    /* Preview Box */
    .preview-box {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      text-align: center;
    }
    
    .preview-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    
    .preview-primary {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .preview-secondary {
      font-size: 14px;
      font-style: italic;
      color: var(--text-muted);
    }

    .preview-secondary::before {
      content: '› ';
    }
    
    /* Buttons */
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 14px 24px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      border: none;
      font-family: inherit;
    }
    
    .btn-primary {
      background: var(--gradient);
      color: white;
      box-shadow: 0 4px 24px rgba(99, 102, 241, 0.4);
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(99, 102, 241, 0.5);
    }
    
    .btn-secondary {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border);
      margin-top: 12px;
    }
    
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.03);
      color: var(--text);
    }
    
    .btn svg { width: 18px; height: 18px; }
    
    /* Trust Badges */
    .trust-badges {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
    }
    
    .trust-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted);
    }
    
    .trust-badge svg {
      width: 14px;
      height: 14px;
      color: var(--success);
    }
    
    /* How It Works */
    .how-section {
      padding: 100px 80px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .section-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--primary-light);
      margin-bottom: 12px;
    }
    
    .section-title {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 48px;
    }
    
    .steps-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }
    
    .step-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      position: relative;
      overflow: hidden;
    }
    
    .step-card::before {
      content: attr(data-step);
      position: absolute;
      top: 24px;
      right: 24px;
      font-size: 72px;
      font-weight: 800;
      color: rgba(99, 102, 241, 0.08);
      line-height: 1;
    }
    
    .step-icon {
      width: 48px;
      height: 48px;
      background: var(--gradient);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      font-size: 22px;
    }
    
    .step-card h3 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .step-card p {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
    }
    
    /* Community Stats */
    .stats-section {
      padding: 80px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .stats-card {
      background: rgba(99, 102, 241, 0.05);
      border: 1px solid rgba(99, 102, 241, 0.15);
      border-radius: 16px;
      padding: 28px 24px;
      text-align: center;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .stats-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent), #a78bfa);
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .stats-card:hover {
      border-color: rgba(99, 102, 241, 0.35);
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(99, 102, 241, 0.12);
    }
    
    .stats-card:hover::before { opacity: 1; }
    
    .stats-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(167, 139, 250, 0.1);
      color: #a78bfa;
      border-radius: 12px;
    }
    
    .stats-icon svg {
      width: 24px;
      height: 24px;
    }
    
    .stats-value {
      font-size: 36px;
      font-weight: 800;
      background: linear-gradient(135deg, #fff 30%, rgba(167, 139, 250, 0.9));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.1;
      margin-bottom: 6px;
    }
    
    .stats-label {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
    }
    
    .stats-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    
    .pair-pill {
      display: inline-flex;
      align-items: center;
      padding: 6px 14px;
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.15);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.8);
      white-space: nowrap;
    }
    
    .live-dot {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--success);
      font-weight: 500;
    }
    
    .live-dot::before {
      content: '';
      width: 6px;
      height: 6px;
      background: var(--success);
      border-radius: 50%;
      animation: pulse-dot 2s ease-in-out infinite;
    }
    
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
      50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
    }
    
    @keyframes countUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .stats-card.animated .stats-value {
      animation: countUp 0.6s ease-out;
    }
    
    @media (max-width: 1024px) {
      .stats-section { padding-left: 24px; padding-right: 24px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    
    @media (max-width: 640px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .stats-card { padding: 20px 16px; }
      .stats-value { font-size: 28px; }
    }

    /* Features Grid */
    .features-section {
      padding: 80px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .feature-item {
      display: flex;
      gap: 16px;
      padding: 24px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      transition: all 0.2s;
    }
    
    .feature-item:hover {
      border-color: rgba(99, 102, 241, 0.3);
      background: rgba(99, 102, 241, 0.03);
    }
    
    .feature-icon {
      width: 40px;
      height: 40px;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    
    .feature-item h4 {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .feature-item p {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    
    /* FAQ */
    .faq-section {
      padding: 80px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .faq-item {
      border-bottom: 1px solid var(--border);
    }
    
    .faq-q {
      width: 100%;
      padding: 20px 0;
      background: none;
      border: none;
      color: var(--text);
      font-size: 15px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: inherit;
    }
    
    .faq-q svg {
      width: 18px;
      height: 18px;
      color: var(--text-muted);
      transition: transform 0.2s;
    }
    
    .faq-q.active svg { transform: rotate(180deg); }
    
    .faq-a {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s;
    }
    
    .faq-a-content {
      padding-bottom: 20px;
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.7;
    }
    
    /* Support Section */
    .support-section {
      padding: 100px 80px;
      max-width: 1400px;
      margin: 0 auto;
      text-align: center;
    }
    
    .support-desc {
      max-width: 680px;
      margin: -32px auto 48px;
      color: var(--text-muted);
      font-size: 16px;
      line-height: 1.7;
    }
    
    .support-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .support-card-link {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px 28px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      text-decoration: none;
      text-align: left;
      backdrop-filter: blur(20px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    .support-card-link:hover {
      border-color: rgba(99, 102, 241, 0.4);
      transform: translateY(-3px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.1);
    }
    
    .kofi-card:hover {
      border-color: rgba(244, 63, 94, 0.4);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(244, 63, 94, 0.12);
    }
    
    .support-card-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 24px;
    }
    
    .support-card-icon svg {
      width: 24px;
      height: 24px;
    }
    
    .kofi-icon {
      background: rgba(244, 63, 94, 0.12);
      color: #fb7185;
      border: 1px solid rgba(244, 63, 94, 0.2);
    }
    
    .github-icon {
      background: rgba(99, 102, 241, 0.12);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.2);
    }
    
    .github-icon svg {
      width: 24px;
      height: 24px;
    }
    
    .support-card-info {
      flex: 1;
    }
    
    .support-card-info h4 {
      font-size: 17px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .support-card-info p {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.4;
    }
    
    .support-card-arrow {
      color: var(--text-muted);
      transition: transform 0.2s, color 0.2s;
    }
    
    .support-card-link:hover .support-card-arrow {
      color: var(--text);
      transform: translateX(4px);
    }
    
    .support-card-arrow svg {
      width: 20px;
      height: 20px;
    }
    
    /* Footer */
    .footer {
      padding: 40px 80px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .footer-links {
      display: flex;
      gap: 24px;
    }
    
    .footer-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 13px;
      transition: color 0.2s;
    }
    
    .footer-links a:hover { color: var(--text); }
    
    .footer-copy {
      font-size: 13px;
      color: var(--text-muted);
    }
    
    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--success);
      color: white;
      padding: 14px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transition: all 0.3s;
      z-index: 1000;
    }
    
    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    
    /* Responsive */
    @media (max-width: 1024px) {
      .hero {
        grid-template-columns: 1fr;
        gap: 48px;
        padding: 100px 24px 60px;
        text-align: center;
      }
      
      .hero-content { max-width: 100%; }
      .hero h1 { font-size: 40px; }
      .hero-features { justify-content: center; }
      .config-card { max-width: 480px; margin: 0 auto; }
      
      .how-section, .features-section, .faq-section, .support-section, .footer {
        padding-left: 24px;
        padding-right: 24px;
      }
      
      .steps-grid { grid-template-columns: 1fr; }
      .features-grid { grid-template-columns: 1fr; }
      
      .footer {
        flex-direction: column;
        gap: 16px;
        text-align: center;
      }
    }
    
    @media (max-width: 640px) {
      .nav-links { display: none; }
      .hero h1 { font-size: 32px; }
      .section-title { font-size: 28px; }
      .trust-badges { flex-direction: column; gap: 12px; }
    }
  </style>
</head>
<body>
  <!-- Background -->
  <div class="bg-grid"></div>
  <div class="bg-glow glow-1"></div>
  <div class="bg-glow glow-2"></div>
  
  <!-- Navigation -->
  <nav class="nav">
    <a href="#" class="nav-brand">
      <img src="${manifest.logo}" alt="Logo">
      <span>${manifest.name}</span>
    </a>
    <div class="nav-links">
      <a href="#how">How It Works</a>
      <a href="#features">Features</a>
      <a href="#faq">FAQ</a>
      <a href="#support" class="nav-sponsor-link">Sponsor ❤️</a>
      <a href="https://github.com/ummugulsunn/stremio-dual-subtitles" target="_blank" class="nav-github">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        Star on GitHub
      </a>
    </div>
  </nav>
  
  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <div class="hero-badge">Stremio Addon • Free Forever</div>
      <h1>Watch Movies,<br><span class="highlight">Learn Languages</span></h1>
      <p class="hero-desc">
        Display two subtitle languages simultaneously while watching. 
        See the original dialogue with your native translation below — 
        the natural way to learn a new language.
      </p>
      <div class="hero-features">
        <div class="hero-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          70+ Languages
        </div>
        <div class="hero-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          No Account Required
        </div>
        <div class="hero-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Works on All Devices
        </div>
        <div class="hero-feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Open Source
        </div>
      </div>
    </div>
    
    <div class="config-card">
      <div class="config-header">
        <h2>Get Started in Seconds</h2>
        <p>Select your languages and install</p>
      </div>
      
      <form id="configForm">
        <div class="form-group">
          <label>
            Primary Language
            <span class="tag tag-learning">Learning</span>
          </label>
          <select id="mainLang" name="mainLang">
            ${optionsHTML}
          </select>
        </div>
        
        <div class="form-group">
          <label>
            Secondary Language
            <span class="tag tag-native">Native</span>
          </label>
          <select id="transLang" name="transLang">
            ${optionsHTML}
          </select>
        </div>
        
        <div class="preview-box">
          <div class="preview-label">Live Preview</div>
          <div class="preview-primary" id="previewPrimary">Hello, how are you today?</div>
          <div class="preview-secondary" id="previewSecondary">Merhaba, bugün nasılsın?</div>
        </div>
        
        <button type="button" class="btn btn-primary" onclick="installAddon()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Install to Stremio
        </button>
        
        <button type="button" class="btn btn-secondary" onclick="copyManifestUrl()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy Manifest URL
        </button>
      </form>
      
      <div class="trust-badges">
        <div class="trust-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Privacy Focused
        </div>
        <div class="trust-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          No Ads Ever
        </div>
        <div class="trust-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Always Free
        </div>
      </div>
    </div>
  </section>
  
  <!-- How It Works -->
  <section class="how-section" id="how">
    <div class="section-label">Simple Setup</div>
    <h2 class="section-title">How It Works</h2>
    
    <div class="steps-grid">
      <div class="step-card" data-step="01">
        <div class="step-icon">🎯</div>
        <h3>Choose Languages</h3>
        <p>Pick the language you're learning and your native language. We'll show both simultaneously.</p>
      </div>
      <div class="step-card" data-step="02">
        <div class="step-icon">⚡</div>
        <h3>One-Click Install</h3>
        <p>Click install and Stremio automatically adds the addon. No accounts, no configuration files.</p>
      </div>
      <div class="step-card" data-step="03">
        <div class="step-icon">🎬</div>
        <h3>Watch & Learn</h3>
        <p>Play any content. Select the dual subtitle option and start learning naturally through context.</p>
      </div>
    </div>
  </section>
  
  <!-- Features -->
  <section class="features-section" id="features">
    <div class="section-label">Why Choose Us</div>
    <h2 class="section-title">Built for Language Learners</h2>
    
    <div class="features-grid">
      <div class="feature-item">
        <div class="feature-icon">🌍</div>
        <div>
          <h4>70+ Languages Supported</h4>
          <p>From Spanish to Japanese, Arabic to Korean. All major languages via OpenSubtitles.</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🔄</div>
        <div>
          <h4>Smart Synchronization</h4>
          <p>Advanced matching ensures translations align perfectly with original dialogue timing.</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">📱</div>
        <div>
          <h4>All Devices</h4>
          <p>Works on Android TV, Fire Stick, iOS, Android, Windows, Mac, and Linux.</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🔒</div>
        <div>
          <h4>Privacy First</h4>
          <p>No tracking, no data collection. Your viewing habits stay completely private.</p>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Community Stats -->
  <section class="stats-section" id="stats">
    <div class="section-label">Global Community</div>
    <h2 class="section-title">Join Thousands Learning Languages Naturally</h2>
    
    <div class="stats-grid">
      <div class="stats-card">
        <div class="stats-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line></svg>
        </div>
        <div class="stats-value" data-target="${publicStats.totalSubtitlesServed}">${formatNumber(publicStats.totalSubtitlesServed)}</div>
        <div class="stats-label">Dual Subs Delivered</div>
      </div>
      <div class="stats-card">
        <div class="stats-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
        <div class="stats-value" data-target="${publicStats.totalInstalls}">${formatNumber(publicStats.totalInstalls)}</div>
        <div class="stats-label">Bilingual Viewers</div>
      </div>
      <div class="stats-card">
        <div class="stats-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        </div>
        <div class="stats-value" data-target="${publicStats.totalPageViews}">${formatNumber(publicStats.totalPageViews)}</div>
        <div class="stats-label">Global Interactions</div>
      </div>
      <div class="stats-card">
        <div class="stats-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
        </div>
        <div class="stats-value">70+</div>
        <div class="stats-label">Languages Bridged</div>
      </div>
    </div>
    
    <div class="stats-footer">
      ${topPairsHTML ? '<span style="display:inline-flex; align-items:center; gap:4px; font-size:12px; color:var(--text-muted); margin-right:4px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg> Top Learning Paths:</span>' + topPairsHTML : ''}
      <span class="live-dot">Updated live</span>
    </div>
  </section>

  <!-- FAQ -->
  <section class="faq-section" id="faq">
    <div class="section-label">Questions?</div>
    <h2 class="section-title">Frequently Asked</h2>
    
    <div class="faq-item">
      <button class="faq-q">
        Is this completely free?
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="faq-a">
        <div class="faq-a-content">Yes, 100% free with no premium tiers, no ads, and no hidden costs. The addon is open source and will always remain free.</div>
      </div>
    </div>
    <div class="faq-item">
      <button class="faq-q">
        Why aren't subtitles showing for some content?
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="faq-a">
        <div class="faq-a-content">Dual subtitles require both languages to be available on OpenSubtitles. If either is missing, the option won't appear. Popular content usually has better coverage.</div>
      </div>
    </div>
    <div class="faq-item">
      <button class="faq-q">
        How do I change languages later?
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="faq-a">
        <div class="faq-a-content">Simply return to this page, select new languages, and click install again. Stremio will update your configuration automatically.</div>
      </div>
    </div>
    <div class="faq-item">
      <button class="faq-q">
        Does this work on smart TVs?
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="faq-a">
        <div class="faq-a-content">Yes! Once installed, the addon works on any device running Stremio — Android TV, Fire Stick, Apple TV (via web), and more.</div>
      </div>
    </div>
  </section>
  
  <!-- Support -->
  <section class="support-section" id="support">
    <div class="section-label">Open Source & Support</div>
    <h2 class="section-title">Support Dual Subtitles</h2>
    <p class="support-desc">This project is 100% free, open source, and built by a Computer Engineering student. If it helps your language learning journey, consider supporting to help keep the servers running!</p>
    
    <div class="support-grid">
      <a href="https://ko-fi.com/ummugulsunn" target="_blank" class="support-card-link kofi-card">
        <div class="support-card-icon kofi-icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 7.4c-.6-3.8-5-4.4-5-4.4H4.5C3 3 2.2 4 2.2 5.5v11c0 1.5.8 2.5 2.3 2.5h10.3c1.5 0 2.2-1 2.2-2.5V13c.2 0 4.1 0 4.8-1.5.5-1.2.1-3.3-.8-4.1zM15 17.5H4.5c-.3 0-.7-.2-.7-.8v-11c0-.6.4-.8.7-.8h10.4c.3 0 .7.2.7.8v11c0 .6-.3.8-.6.8zM19 11c-.3.6-1.5.7-2 .7V6.5c1 0 2.6 0 3.3.6.4.4.7 1.6.4 2.9zM9.5 7.8c-2 0-3.6 1.6-3.6 3.6 0 2.5 3.6 5.5 3.6 5.5s3.6-3 3.6-5.5c0-2-1.6-3.6-3.6-3.6z"/></svg>
        </div>
        <div class="support-card-info">
          <h4>Buy me a Coffee</h4>
          <p>One-time support via Ko-fi (Card or PayPal)</p>
        </div>
        <div class="support-card-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      </a>
      
      <a href="https://github.com/sponsors/ummugulsunn" target="_blank" class="support-card-link github-card">
        <div class="support-card-icon github-icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.118 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        </div>
        <div class="support-card-info">
          <h4>GitHub Sponsors</h4>
          <p>Support monthly or one-time via GitHub</p>
        </div>
        <div class="support-card-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      </a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-links">
      <a href="https://github.com/ummugulsunn/stremio-dual-subtitles" target="_blank">GitHub</a>
      <a href="${baseUrl}/privacy">Privacy</a>
      <a href="https://www.stremio.com/" target="_blank">Get Stremio</a>
      <a href="https://ko-fi.com/ummugulsunn" target="_blank">Support ❤️</a>
    </div>
    <div class="footer-copy">v${manifest.version} • Made for language learners</div>
  </footer>
  
  <!-- Toast -->
  <div class="toast" id="toast"></div>
  
  <script>
    const BASE_URL = '${baseUrl}';
    
    const langMap = {
      'tr': 'Turkish [tur]', 'en': 'English [eng]', 'es': 'Spanish [spa]',
      'fr': 'French [fre]', 'de': 'German [ger]', 'it': 'Italian [ita]',
      'pt': 'Portuguese [por]', 'ru': 'Russian [rus]', 'ja': 'Japanese [jpn]',
      'ko': 'Korean [kor]', 'zh': 'Chinese (Simplified) [chi]', 'ar': 'Arabic [ara]',
      'hi': 'Hindi [hin]', 'pl': 'Polish [pol]', 'nl': 'Dutch [dut]'
    };
    
    const previewTexts = {
      'English [eng]': 'Hello, how are you today?',
      'Turkish [tur]': 'Merhaba, bugün nasılsın?',
      'Spanish [spa]': '¿Hola, cómo estás hoy?',
      'Spanish (Latin America) [spl]': '¿Hola, cómo estás hoy?',
      'French [fre]': 'Bonjour, comment allez-vous?',
      'German [ger]': 'Hallo, wie geht es dir heute?',
      'Italian [ita]': 'Ciao, come stai oggi?',
      'Portuguese [por]': 'Olá, como você está hoje?',
      'Portuguese (Brazil) [pob]': 'Olá, como você está hoje?',
      'Russian [rus]': 'Привет, как дела сегодня?',
      'Japanese [jpn]': 'こんにちは、今日の調子はどう？',
      'Korean [kor]': '안녕하세요, 오늘 기분이 어때요?',
      'Chinese (Simplified) [chi]': '你好，今天怎么样？',
      'Chinese (Traditional) [zht]': '你好，今天怎麼樣？',
      'Arabic [ara]': 'مرحبا، كيف حالك اليوم؟',
      'Hindi [hin]': 'नमस्ते, आज आप कैसे हैं?',
      'Polish [pol]': 'Cześć, jak się dziś masz?',
      'Dutch [dut]': 'Hallo, hoe gaat het vandaag?',
      'Swedish [swe]': 'Hej, hur mår du idag?',
      'Norwegian [nor]': 'Hei, hvordan har du det i dag?',
      'Danish [dan]': 'Hej, hvordan har du det i dag?',
      'Finnish [fin]': 'Hei, mitä kuuluu tänään?',
      'Greek [ell]': 'Γεια σου, πώς είσαι σήμερα;',
      'Czech [cze]': 'Ahoj, jak se dnes máš?',
      'Hungarian [hun]': 'Szia, hogy vagy ma?',
      'Romanian [rum]': 'Bună, ce mai faci azi?',
      'Bulgarian [bul]': 'Здравей, как си днес?',
      'Ukrainian [ukr]': 'Привіт, як справи сьогодні?',
      'Thai [tha]': 'สวัสดี วันนี้เป็นอย่างไรบ้าง?',
      'Vietnamese [vie]': 'Xin chào, hôm nay bạn thế nào?',
      'Indonesian [ind]': 'Halo, apa kabar hari ini?',
      'Malay [may]': 'Hai, apa khabar hari ini?',
      'Croatian [hrv]': 'Bok, kako si danas?',
      'Serbian [scc]': 'Здраво, како си данас?',
      'Slovak [slo]': 'Ahoj, ako sa máš dnes?',
      'Slovenian [slv]': 'Živjo, kako si danes?',
      'Estonian [est]': 'Tere, kuidas sul täna läheb?',
      'Latvian [lav]': 'Sveiki, kā tev šodien klājas?',
      'Lithuanian [lit]': 'Sveiki, kaip sekasi šiandien?',
      'Persian [per]': 'سلام، امروز حالت چطوره؟',
      'Catalan [cat]': 'Hola, com estàs avui?',
      'Basque [baq]': 'Kaixo, zer moduz zaude gaur?',
      'Icelandic [ice]': 'Halló, hvernig hefur þú það í dag?',
      'Afrikaans [afr]': 'Hallo, hoe gaan dit vandag?',
      'Albanian [alb]': 'Përshëndetje, si jeni sot?',
      'Armenian [arm]': 'Բարև, ինչպես եք այսօdelays?',
      'Azerbaijani [aze]': 'Salam, bu gün necəsiniz?',
      'Belarusian [bel]': 'Прывітанне, як справы сёння?',
      'Bengali [ben]': 'হ্যালো, আজ কেমন আছেন?',
      'Bosnian [bos]': 'Zdravo, kako si danas?',
      'Breton [bre]': "Demat, penaos emañ ar bed hiziv?",
      'Burmese [bur]': 'မင်္ဂလာပါ, ဒီနေ့ကျန်းမာပါသလား?',
      'Esperanto [epo]': 'Saluton, kiel vi fartas hodiau?',
      'Georgian [geo]': 'გამარჯობა, როგორ ხარ დღეს?',
      'Haitian Creole [hat]': 'Bonjou, koman ou ye jodi a?',
      'Irish [gle]': 'Dia duit, conas atá tú inniu?',
      'Kannada [kan]': 'ಹಲೋ, ಇಂದು ನೀವು ಹೇಗಿದ್ದೀರಿ?',
      'Kazakh [kaz]': 'Сәлем, бүгін қалдарыңыз?',
      'Khmer [khm]': 'សួស្តី តើអ្នកសុខសប្បាយទេថ្ងៃនេះ?',
      'Kurdish [kur]': 'Silav, îro tu çawa yî?',
      'Luxembourgish [ltz]': 'Moien, wéi geet et Iech haut?',
      'Macedonian [mac]': 'Здраво, како сте денес?',
      'Malayalam [mal]': 'ഹലോ, ഇന്ന് സുഖമാണോ?',
      'Maltese [mlt]': "Bongu, kif int illum?",
      'Marathi [mar]': 'नमस्कार, आज तुम्ही कसे आहात?',
      'Mongolian [mon]': 'Сайн уу, өнөөдөр ямар байна?',
      'Nepali [nep]': 'नमस्ते, आज तपाईंलाई कस्तो छ?',
      'Sinhala [sin]': 'හෙලෝ, අද ඔබට කොහොමද?',
      'Somali [som]': 'Salaan, sidee tahay maanta?',
      'Swahili [swa]': 'Habari, hali yako leo?',
      'Tagalog [tgl]': 'Kumusta, kamusta ka ngayon?',
      'Tamil [tam]': 'வணக்கம், இன்று எப்படி இருக்கிறீர்கள்?',
      'Telugu [tel]': 'హలో, మీరు ఈ రోజు ఎలా ఉన్నారు?',
      'Urdu [urd]': 'ہیلو، آج آپ کیسے ہیں؟',
      'Uzbek [uzb]': "Salom, bugun qandaysiz?",
      'Welsh [wel]': 'Helo, sut ydych chi heddiw?',
      'default': 'Hello, how are you today?'
    };
    
    // Detect browser language
    const browserLang = (navigator.language || '').split('-')[0].toLowerCase();
    const detectedLang = langMap[browserLang];
    
    // Set defaults
    document.getElementById('mainLang').value = 'English [eng]';
    document.getElementById('transLang').value = detectedLang && detectedLang !== 'English [eng]' ? detectedLang : 'Turkish [tur]';
    
    // Update preview - both primary and secondary
    function updatePreview() {
      const main = document.getElementById('mainLang').value;
      const trans = document.getElementById('transLang').value;
      document.getElementById('previewPrimary').textContent = previewTexts[main] || previewTexts['default'];
      document.getElementById('previewSecondary').textContent = previewTexts[trans] || previewTexts['default'];
    }
    
    document.getElementById('mainLang').addEventListener('change', updatePreview);
    document.getElementById('transLang').addEventListener('change', updatePreview);
    updatePreview();
    
    function getConfigUrl() {
      const main = encodeURIComponent(document.getElementById('mainLang').value);
      const trans = encodeURIComponent(document.getElementById('transLang').value);
      return BASE_URL + '/' + main + '|' + trans + '/manifest.json';
    }
    
    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }
    
    function installAddon() {
      const main = document.getElementById('mainLang').value;
      const trans = document.getElementById('transLang').value;
      
      if (main === trans) {
        showToast('Please select two different languages!');
        return;
      }
      
      fetch(BASE_URL + '/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'install', mainLang: main, transLang: trans })
      }).catch(() => {});
      
      const url = getConfigUrl();
      window.location.href = 'stremio://' + url.replace(/^https?:\\/\\//, '');
    }
    
    function copyManifestUrl() {
      const main = document.getElementById('mainLang').value;
      const trans = document.getElementById('transLang').value;
      
      if (main === trans) {
        showToast('Please select two different languages!');
        return;
      }
      
      navigator.clipboard.writeText(getConfigUrl()).then(() => showToast('Copied to clipboard!'));
    }
    
    // FAQ accordion
    document.querySelectorAll('.faq-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const ans = btn.nextElementSibling;
        const isOpen = btn.classList.contains('active');
        
        document.querySelectorAll('.faq-q').forEach(q => q.classList.remove('active'));
        document.querySelectorAll('.faq-a').forEach(a => a.style.maxHeight = null);
        
        if (!isOpen) {
          btn.classList.add('active');
          ans.style.maxHeight = ans.scrollHeight + 'px';
        }
      });
    });
    
    // Track pageview
    fetch(BASE_URL + '/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'pageView', page: 'landing' })
    }).catch(() => {});
    
    // ── Community Stats: CountUp on scroll + auto-refresh ──
    (function() {
      function fmtNum(n) {
        return Number(n).toLocaleString();
      }
      
      // Animate cards when they scroll into view
      var statsCards = document.querySelectorAll('.stats-card');
      if (statsCards.length && 'IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function(entries) {
          entries.forEach(function(e) {
            if (e.isIntersecting) {
              e.target.classList.add('animated');
              obs.unobserve(e.target);
            }
          });
        }, { threshold: 0.3 });
        statsCards.forEach(function(c) { obs.observe(c); });
      }
      
      // Auto-refresh public stats every 30s
      setInterval(function() {
        fetch(BASE_URL + '/api/stats/public')
          .then(function(r) { return r.json(); })
          .then(function(d) {
            var vals = document.querySelectorAll('.stats-value[data-target]');
            var map = {
              'totalSubtitlesServed': 0,
              'totalInstalls': 1,
              'totalPageViews': 2
            };
            var keys = ['totalSubtitlesServed', 'totalInstalls', 'totalPageViews'];
            keys.forEach(function(k, i) {
              if (vals[i] && d[k] != null) {
                vals[i].setAttribute('data-target', d[k]);
                vals[i].textContent = fmtNum(d[k]);
              }
            });
          })
          .catch(function() {});
      }, 30000);
    })();
  </script>
  
  <!-- Vercel Analytics -->
  <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`;
}

module.exports = generateLandingHTML;
