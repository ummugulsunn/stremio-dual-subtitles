/**
 * Landing page template for the Dual Subtitles addon.
 * Modern, professional configuration interface with animations.
 */

const { getLanguageOptions } = require('./languages');

function generateLandingHTML(manifest, baseUrl) {
  const languageOptions = getLanguageOptions();
  
  const optionsHTML = languageOptions
    .map(opt => `<option value="${opt}">${opt}</option>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${manifest.name} - Learn Languages While Watching</title>
  
  <!-- SEO Meta Tags -->
  <meta name="description" content="${manifest.description}">
  <meta name="keywords" content="stremio, addon, dual subtitles, language learning, subtitles, movies, series">
  <meta name="author" content="Dual Subtitles">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${baseUrl}">
  <meta property="og:title" content="${manifest.name} - Learn Languages While Watching">
  <meta property="og:description" content="${manifest.description}">
  <meta property="og:image" content="${manifest.logo}">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${baseUrl}">
  <meta property="twitter:title" content="${manifest.name} - Learn Languages While Watching">
  <meta property="twitter:description" content="${manifest.description}">
  <meta property="twitter:image" content="${manifest.logo}">
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="${manifest.logo}">
  <link rel="apple-touch-icon" href="${manifest.logo}">
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary: #667eea;
      --primary-dark: #5a67d8;
      --secondary: #764ba2;
      --bg-dark: #0f0f1a;
      --bg-card: rgba(255, 255, 255, 0.03);
      --text: #ffffff;
      --text-muted: rgba(255, 255, 255, 0.6);
      --border: rgba(255, 255, 255, 0.08);
      --success: #10b981;
      --gradient: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg-dark);
      color: var(--text);
      line-height: 1.6;
      overflow-x: hidden;
    }

    /* Animated Background */
    .bg-animation {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      background: 
        radial-gradient(ellipse at 20% 20%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(118, 75, 162, 0.15) 0%, transparent 50%),
        var(--bg-dark);
    }

    .floating-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      animation: float 20s ease-in-out infinite;
    }

    .orb-1 {
      width: 400px;
      height: 400px;
      background: rgba(102, 126, 234, 0.2);
      top: 10%;
      left: 10%;
      animation-delay: 0s;
    }

    .orb-2 {
      width: 300px;
      height: 300px;
      background: rgba(118, 75, 162, 0.2);
      top: 60%;
      right: 10%;
      animation-delay: -7s;
    }

    .orb-3 {
      width: 250px;
      height: 250px;
      background: rgba(102, 126, 234, 0.15);
      bottom: 10%;
      left: 30%;
      animation-delay: -14s;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      25% { transform: translate(50px, -50px) rotate(5deg); }
      50% { transform: translate(0, -100px) rotate(0deg); }
      75% { transform: translate(-50px, -50px) rotate(-5deg); }
    }

    /* Navigation */
    .nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 20px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100;
      background: rgba(15, 15, 26, 0.8);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
    }

    .nav-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: var(--text);
    }

    .nav-logo img {
      width: 40px;
      height: 40px;
      border-radius: 10px;
    }

    .nav-logo span {
      font-weight: 700;
      font-size: 18px;
    }

    .nav-links {
      display: flex;
      gap: 30px;
      align-items: center;
    }

    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: color 0.3s;
    }

    .nav-links a:hover {
      color: var(--text);
    }

    .nav-btn {
      background: var(--gradient);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      transition: transform 0.3s, box-shadow 0.3s;
    }

    .nav-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    }

    /* Hero Section */
    .hero {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 120px 20px 80px;
    }

    .hero-content {
      max-width: 800px;
      text-align: center;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(102, 126, 234, 0.1);
      border: 1px solid rgba(102, 126, 234, 0.3);
      padding: 8px 16px;
      border-radius: 50px;
      font-size: 13px;
      color: var(--primary);
      margin-bottom: 24px;
      animation: fadeInUp 0.6s ease-out;
    }

    .hero-badge svg {
      width: 16px;
      height: 16px;
    }

    .hero h1 {
      font-size: clamp(40px, 8vw, 72px);
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 24px;
      animation: fadeInUp 0.6s ease-out 0.1s both;
    }

    .hero h1 .gradient-text {
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero p {
      font-size: 18px;
      color: var(--text-muted);
      max-width: 600px;
      margin: 0 auto 40px;
      animation: fadeInUp 0.6s ease-out 0.2s both;
    }

    .hero-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
      animation: fadeInUp 0.6s ease-out 0.3s both;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      border: none;
      font-family: inherit;
    }

    .btn-primary {
      background: var(--gradient);
      color: white;
      box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:hover {
      transform: translateY(-3px);
      box-shadow: 0 20px 50px rgba(102, 126, 234, 0.5);
    }

    .btn-secondary {
      background: var(--bg-card);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .btn svg {
      width: 20px;
      height: 20px;
    }

    /* Stats Section */
    .stats {
      padding: 40px 20px;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      background: var(--bg-card);
    }

    .stats-container {
      max-width: 1000px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 40px;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 36px;
      font-weight: 800;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stat-label {
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Features Section */
    .features {
      padding: 100px 20px;
    }

    .section-header {
      text-align: center;
      max-width: 600px;
      margin: 0 auto 60px;
    }

    .section-header h2 {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .section-header p {
      color: var(--text-muted);
      font-size: 16px;
    }

    .features-grid {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    }

    .feature-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px;
      transition: all 0.3s ease;
    }

    .feature-card:hover {
      transform: translateY(-5px);
      border-color: rgba(102, 126, 234, 0.3);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .feature-icon {
      width: 56px;
      height: 56px;
      background: var(--gradient);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      font-size: 24px;
    }

    .feature-card h3 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .feature-card p {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.7;
    }

    /* How It Works Section */
    .how-it-works {
      padding: 100px 20px;
      background: var(--bg-card);
    }

    .steps-container {
      max-width: 1000px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 30px;
    }

    .step-number {
      width: 60px;
      height: 60px;
      background: var(--gradient);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .step-content h3 {
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .step-content p {
      color: var(--text-muted);
      font-size: 15px;
      line-height: 1.7;
    }

    /* Preview Section */
    .preview {
      padding: 100px 20px;
    }

    .preview-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .subtitle-preview {
      background: rgba(0, 0, 0, 0.8);
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      border: 1px solid var(--border);
    }

    .preview-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 24px;
    }

    .preview-primary {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 8px;
      color: #fff;
    }

    .preview-secondary {
      font-size: 20px;
      font-style: italic;
      color: rgba(255, 255, 255, 0.7);
    }

    /* Configuration Section */
    .configure {
      padding: 100px 20px;
      background: var(--bg-card);
    }

    .configure-card {
      max-width: 500px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 40px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .form-group .hint {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 6px;
    }

    select {
      width: 100%;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: var(--text);
      font-size: 15px;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.3s;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 16px center;
      background-size: 20px;
    }

    select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
    }

    select option {
      background: var(--bg-dark);
      color: var(--text);
    }

    .button-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 32px;
    }

    .divider {
      display: flex;
      align-items: center;
      color: var(--text-muted);
      font-size: 12px;
      margin: 8px 0;
    }

    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    .divider::before { margin-right: 16px; }
    .divider::after { margin-left: 16px; }

    /* FAQ Section */
    .faq {
      padding: 100px 20px;
    }

    .faq-container {
      max-width: 700px;
      margin: 0 auto;
    }

    .faq-item {
      border-bottom: 1px solid var(--border);
    }

    .faq-question {
      width: 100%;
      padding: 24px 0;
      background: none;
      border: none;
      color: var(--text);
      font-size: 16px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: inherit;
    }

    .faq-question svg {
      width: 20px;
      height: 20px;
      transition: transform 0.3s;
      color: var(--text-muted);
    }

    .faq-question.active svg {
      transform: rotate(180deg);
    }

    .faq-answer {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
    }

    .faq-answer-content {
      padding-bottom: 24px;
      color: var(--text-muted);
      font-size: 15px;
      line-height: 1.7;
    }

    /* Footer */
    .footer {
      padding: 60px 20px;
      border-top: 1px solid var(--border);
      text-align: center;
    }

    .footer-links {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-bottom: 24px;
    }

    .footer-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      transition: color 0.3s;
    }

    .footer-links a:hover {
      color: var(--text);
    }

    .footer-copyright {
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--success);
      color: white;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .nav {
        padding: 15px 20px;
      }

      .nav-links {
        display: none;
      }

      .hero {
        padding: 100px 20px 60px;
      }

      .stats-container {
        grid-template-columns: repeat(2, 1fr);
        gap: 30px;
      }

      .step {
        flex-direction: column;
        text-align: center;
        align-items: center;
      }

      .features-grid {
        grid-template-columns: 1fr;
      }

      .configure-card {
        padding: 30px 20px;
      }
    }

    @media (max-width: 480px) {
      .hero h1 {
        font-size: 32px;
      }

      .hero p {
        font-size: 16px;
      }

      .stat-value {
        font-size: 28px;
      }

      .section-header h2 {
        font-size: 28px;
      }
    }
  </style>
</head>
<body>
  <!-- Animated Background -->
  <div class="bg-animation">
    <div class="floating-orb orb-1"></div>
    <div class="floating-orb orb-2"></div>
    <div class="floating-orb orb-3"></div>
  </div>

  <!-- Navigation -->
  <nav class="nav">
    <a href="#" class="nav-logo">
      <img src="${manifest.logo}" alt="Logo">
      <span>${manifest.name}</span>
    </a>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#how-it-works">How It Works</a>
      <a href="#faq">FAQ</a>
      <a href="${baseUrl}/stats" class="nav-btn">Analytics</a>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <div class="hero-badge">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        Free & Open Source Stremio Addon
      </div>
      <h1>
        Learn Languages<br>
        <span class="gradient-text">While You Watch</span>
      </h1>
      <p>
        Display two subtitle languages simultaneously. Perfect for language learners 
        who want to understand content in context while building vocabulary naturally.
      </p>
      <div class="hero-buttons">
        <a href="#configure" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          Get Started Free
        </a>
        <a href="https://github.com/ummugulsunn/stremio-dual-subtitles" target="_blank" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          View on GitHub
        </a>
      </div>
    </div>
  </section>

  <!-- Stats Section -->
  <section class="stats">
    <div class="stats-container">
      <div class="stat-item">
        <div class="stat-value">70+</div>
        <div class="stat-label">Languages Supported</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">Free</div>
        <div class="stat-label">Forever, No Ads</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">∞</div>
        <div class="stat-label">Movies & Series</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">24/7</div>
        <div class="stat-label">Available</div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="features" id="features">
    <div class="section-header">
      <h2>Why Choose Dual Subtitles?</h2>
      <p>The smartest way to learn a language through entertainment</p>
    </div>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🎯</div>
        <h3>Immersive Learning</h3>
        <p>Learn vocabulary in context. See how words are actually used in real conversations, not just textbook examples.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>Instant Setup</h3>
        <p>Configure once, enjoy forever. No account needed, no complicated setup. Just select your languages and start watching.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🌍</div>
        <h3>70+ Languages</h3>
        <p>From Spanish to Japanese, Arabic to Korean. All major world languages supported through OpenSubtitles.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔄</div>
        <h3>Smart Sync</h3>
        <p>Advanced algorithm matches subtitles by timing, ensuring translations align perfectly with the original dialogue.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🎬</div>
        <h3>All Content</h3>
        <p>Works with any movie or TV series in Stremio. If subtitles exist for both languages, we'll merge them.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔒</div>
        <h3>Privacy First</h3>
        <p>No tracking, no data collection, no ads. Your viewing habits stay private. Completely open source.</p>
      </div>
    </div>
  </section>

  <!-- How It Works Section -->
  <section class="how-it-works" id="how-it-works">
    <div class="section-header">
      <h2>How It Works</h2>
      <p>Three simple steps to start learning</p>
    </div>
    <div class="steps-container">
      <div class="step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3>Configure Your Languages</h3>
          <p>Select the language you're learning (primary) and your native language (secondary). The primary language appears on top, your native language below in italics.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3>Install the Addon</h3>
          <p>Click "Install Addon" and Stremio will automatically add it to your addon library. You can also copy the manifest URL for manual installation.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3>Watch & Learn</h3>
          <p>Play any movie or series. When subtitles are available, you'll see your dual subtitle option with a 🌍 icon. Select it and enjoy learning!</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Preview Section -->
  <section class="preview">
    <div class="preview-container">
      <div class="section-header">
        <h2>See It In Action</h2>
        <p>This is what you'll see when watching</p>
      </div>
      <div class="subtitle-preview">
        <div class="preview-label">Live Preview</div>
        <div class="preview-primary" id="previewPrimary">Hello, how are you today?</div>
        <div class="preview-secondary" id="previewSecondary">Merhaba, bugün nasılsın?</div>
      </div>
    </div>
  </section>

  <!-- Configuration Section -->
  <section class="configure" id="configure">
    <div class="section-header">
      <h2>Configure & Install</h2>
      <p>Select your languages and get started in seconds</p>
    </div>
    <div class="configure-card">
      <form id="configForm">
        <div class="form-group">
          <label>Primary Language (Learning)</label>
          <select id="mainLang" name="mainLang">
            ${optionsHTML}
          </select>
          <div class="hint">The language you want to learn - appears on top</div>
        </div>

        <div class="form-group">
          <label>Secondary Language (Native)</label>
          <select id="transLang" name="transLang">
            ${optionsHTML}
          </select>
          <div class="hint">Your native language - appears below in italics</div>
        </div>

        <div class="button-group">
          <button type="button" class="btn btn-primary" onclick="installAddon()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Install to Stremio
          </button>
          
          <div class="divider">or</div>
          
          <button type="button" class="btn btn-secondary" onclick="copyManifestUrl()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy Manifest URL
          </button>
        </div>
      </form>
    </div>
  </section>

  <!-- FAQ Section -->
  <section class="faq" id="faq">
    <div class="section-header">
      <h2>Frequently Asked Questions</h2>
    </div>
    <div class="faq-container">
      <div class="faq-item">
        <button class="faq-question">
          Is this addon free?
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-content">
            Yes, completely free! No premium tiers, no ads, no hidden costs. The addon is open source and will always remain free.
          </div>
        </div>
      </div>
      <div class="faq-item">
        <button class="faq-question">
          Where do the subtitles come from?
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-content">
            Subtitles are fetched from OpenSubtitles, the world's largest subtitle database. The addon merges two language files into one synchronized dual subtitle file.
          </div>
        </div>
      </div>
      <div class="faq-item">
        <button class="faq-question">
          Why are subtitles not showing for some content?
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-content">
            Dual subtitles require both languages to be available for that specific content. If either language is missing from OpenSubtitles, the merged option won't appear. Try popular movies and series for best results.
          </div>
        </div>
      </div>
      <div class="faq-item">
        <button class="faq-question">
          Can I use this on my TV/phone?
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-content">
            Yes! Once installed, the addon works on any device where you use Stremio - Android TV, Fire Stick, iOS, Android phones, desktop, etc.
          </div>
        </div>
      </div>
      <div class="faq-item">
        <button class="faq-question">
          How do I change languages after installing?
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-content">
            Simply come back to this page, select new languages, and click install again. Stremio will update your existing addon configuration.
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-links">
      <a href="https://github.com/ummugulsunn/stremio-dual-subtitles" target="_blank">GitHub</a>
      <a href="${baseUrl}/privacy">Privacy Policy</a>
      <a href="${baseUrl}/stats">Analytics</a>
      <a href="https://www.stremio.com/" target="_blank">Get Stremio</a>
    </div>
    <div class="footer-copyright">
      Made with ❤️ for language learners • Version ${manifest.version}
    </div>
  </footer>

  <!-- Toast Notification -->
  <div class="toast" id="toast">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
    <span id="toastMessage">Copied to clipboard!</span>
  </div>

  <script>
    const BASE_URL = '${baseUrl}';
    
    // Language detection and defaults
    const browserLang = navigator.language || navigator.userLanguage;
    const langMap = {
      'tr': 'Turkish [tur]', 'en': 'English [eng]', 'es': 'Spanish [spa]',
      'fr': 'French [fre]', 'de': 'German [ger]', 'it': 'Italian [ita]',
      'pt': 'Portuguese [por]', 'ru': 'Russian [rus]', 'ja': 'Japanese [jpn]',
      'ko': 'Korean [kor]', 'zh': 'Chinese (Simplified) [chi]', 'ar': 'Arabic [ara]',
      'hi': 'Hindi [hin]', 'pl': 'Polish [pol]', 'nl': 'Dutch [dut]',
      'sv': 'Swedish [swe]', 'da': 'Danish [dan]', 'no': 'Norwegian [nor]',
      'fi': 'Finnish [fin]', 'el': 'Greek [ell]', 'cs': 'Czech [cze]',
      'hu': 'Hungarian [hun]', 'ro': 'Romanian [rum]', 'uk': 'Ukrainian [ukr]',
      'vi': 'Vietnamese [vie]', 'th': 'Thai [tha]', 'id': 'Indonesian [ind]',
    };
    
    const previewTexts = {
      'Turkish [tur]': 'Merhaba, bugün nasılsın?',
      'Spanish [spa]': '¿Hola, cómo estás hoy?',
      'French [fre]': 'Bonjour, comment allez-vous?',
      'German [ger]': 'Hallo, wie geht es dir?',
      'Italian [ita]': 'Ciao, come stai oggi?',
      'Portuguese [por]': 'Olá, como você está?',
      'Russian [rus]': 'Привет, как дела?',
      'Japanese [jpn]': 'こんにちは、元気ですか？',
      'Korean [kor]': '안녕하세요, 오늘 기분이 어때요?',
      'Chinese (Simplified) [chi]': '你好，今天怎么样？',
      'Arabic [ara]': 'مرحبا، كيف حالك اليوم؟',
      'default': 'Hello, how are you today?'
    };
    
    const baseLang = browserLang.split('-')[0].toLowerCase();
    const detectedLang = langMap[baseLang];
    
    // Set defaults
    document.getElementById('mainLang').value = 'English [eng]';
    if (detectedLang && detectedLang !== 'English [eng]') {
      document.getElementById('transLang').value = detectedLang;
    } else {
      document.getElementById('transLang').value = 'Turkish [tur]';
    }

    // Update preview
    function updatePreview() {
      const transLang = document.getElementById('transLang').value;
      const transText = previewTexts[transLang] || previewTexts['default'];
      document.getElementById('previewSecondary').textContent = transText;
    }
    
    document.getElementById('transLang').addEventListener('change', updatePreview);
    updatePreview();

    function getConfigUrl() {
      const mainLang = encodeURIComponent(document.getElementById('mainLang').value);
      const transLang = encodeURIComponent(document.getElementById('transLang').value);
      return BASE_URL + '/' + mainLang + '|' + transLang + '/manifest.json';
    }

    function showToast(message) {
      const toast = document.getElementById('toast');
      document.getElementById('toastMessage').textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function installAddon() {
      const mainVal = document.getElementById('mainLang').value;
      const transVal = document.getElementById('transLang').value;
      
      if (mainVal === transVal) {
        showToast('Please select two different languages!');
        return;
      }
      
      // Track install
      fetch(BASE_URL + '/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'install', mainLang: mainVal, transLang: transVal })
      }).catch(() => {});
      
      const manifestUrl = getConfigUrl();
      const stremioUrl = 'stremio://' + manifestUrl.replace(/^https?:\\/\\//, '');
      window.location.href = stremioUrl;
    }

    function copyManifestUrl() {
      const mainVal = document.getElementById('mainLang').value;
      const transVal = document.getElementById('transLang').value;
      
      if (mainVal === transVal) {
        showToast('Please select two different languages!');
        return;
      }
      
      const url = getConfigUrl();
      navigator.clipboard.writeText(url).then(() => {
        showToast('Manifest URL copied!');
      });
    }

    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(button => {
      button.addEventListener('click', () => {
        const answer = button.nextElementSibling;
        const isOpen = button.classList.contains('active');
        
        // Close all
        document.querySelectorAll('.faq-question').forEach(q => q.classList.remove('active'));
        document.querySelectorAll('.faq-answer').forEach(a => a.style.maxHeight = null);
        
        // Open clicked if was closed
        if (!isOpen) {
          button.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    });

    // Track page view
    fetch(BASE_URL + '/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'pageView', page: 'landing' })
    }).catch(() => {});
  </script>
</body>
</html>`;
}

module.exports = generateLandingHTML;
