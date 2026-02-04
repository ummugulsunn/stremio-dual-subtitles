/**
 * Landing page template for the Dual Subtitles addon.
 * Provides a modern, user-friendly configuration interface.
 */

const { getLanguageOptions, extractBrowserLanguage, getLanguageOption } = require('./languages');

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
  <title>${manifest.name} - Stremio Addon</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #fff;
      line-height: 1.6;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .logo-container {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      margin-bottom: 30px;
    }

    .feature-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin-bottom: 30px;
    }

    .feature {
      background: rgba(102, 126, 234, 0.2);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      color: #a5b4fc;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: rgba(255, 255, 255, 0.9);
    }

    .label-hint {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 400;
      margin-left: 8px;
    }

    select {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      color: #fff;
      font-size: 15px;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.3s ease;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 20px;
    }

    select:hover, select:focus {
      border-color: #667eea;
      outline: none;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
    }

    select option {
      background: #1a1a2e;
      color: #fff;
      padding: 10px;
    }

    .button-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 30px;
    }

    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      border: none;
      font-family: inherit;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .btn svg {
      width: 20px;
      height: 20px;
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 20px 0;
      color: rgba(255, 255, 255, 0.3);
      font-size: 12px;
    }

    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
    }

    .divider::before { margin-right: 15px; }
    .divider::after { margin-left: 15px; }

    .info-box {
      background: rgba(102, 126, 234, 0.15);
      border: 1px solid rgba(102, 126, 234, 0.3);
      border-radius: 12px;
      padding: 16px;
      margin-top: 24px;
    }

    .info-box h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #a5b4fc;
    }

    .info-box p {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
    }

    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .footer a {
      color: #a5b4fc;
      text-decoration: none;
      font-size: 13px;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    .version {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 10px;
    }

    .copied-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #22c55e;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
    }

    .copied-toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    @media (max-width: 480px) {
      .container { padding: 20px 15px; }
      .card { padding: 25px 20px; }
      h1 { font-size: 24px; }
      .feature-list { gap: 8px; }
      .feature { font-size: 12px; padding: 6px 12px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo-container">
        <img src="${manifest.logo || 'https://www.stremio.com/website/stremio-logo-small.png'}" alt="Logo" class="logo">
      </div>
      
      <h1>${manifest.name}</h1>
      <p class="subtitle">${manifest.description}</p>

      <div class="feature-list">
        <span class="feature">🎬 Movies & Series</span>
        <span class="feature">🌍 70+ Languages</span>
        <span class="feature">📚 Language Learning</span>
        <span class="feature">⚡ Fast & Free</span>
      </div>

      <form id="configForm">
        <div class="form-group">
          <label>
            Primary Language
            <span class="label-hint">(Language you want to learn)</span>
          </label>
          <select id="mainLang" name="mainLang">
            ${optionsHTML}
          </select>
        </div>

        <div class="form-group">
          <label>
            Secondary Language
            <span class="label-hint">(Your native language)</span>
          </label>
          <select id="transLang" name="transLang">
            ${optionsHTML}
          </select>
        </div>

        <div class="button-group">
          <button type="button" class="btn btn-primary" onclick="installAddon()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Install Addon
          </button>
          
          <div class="divider">or</div>
          
          <button type="button" class="btn btn-secondary" onclick="copyManifestUrl()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy Manifest URL
          </button>
        </div>
      </form>

      <div class="info-box">
        <h3>💡 How it works</h3>
        <p>
          This addon fetches subtitles from OpenSubtitles and merges two languages into one.
          The primary language appears on top, and your native language appears below in italics.
          Perfect for learning a new language while watching your favorite content!
        </p>
      </div>

      <div class="footer">
        <a href="https://github.com/Serkali-sudo/strelingo-addon" target="_blank">
          Inspired by Strelingo
        </a>
        <div class="version">Version ${manifest.version}</div>
      </div>
    </div>
  </div>

  <div class="copied-toast" id="toast">✓ Copied to clipboard!</div>

  <script>
    const BASE_URL = '${baseUrl}';
    
    // Auto-detect browser language for secondary
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
    
    const baseLang = browserLang.split('-')[0].toLowerCase();
    const detectedLang = langMap[baseLang];
    
    // Set defaults
    document.getElementById('mainLang').value = 'English [eng]';
    if (detectedLang && detectedLang !== 'English [eng]') {
      document.getElementById('transLang').value = detectedLang;
    } else {
      document.getElementById('transLang').value = 'Turkish [tur]';
    }

    function getConfigUrl() {
      const mainLang = encodeURIComponent(document.getElementById('mainLang').value);
      const transLang = encodeURIComponent(document.getElementById('transLang').value);
      return BASE_URL + '/' + mainLang + '|' + transLang + '/manifest.json';
    }

    function installAddon() {
      const mainVal = document.getElementById('mainLang').value;
      const transVal = document.getElementById('transLang').value;
      
      // Validate
      if (mainVal === transVal) {
        alert('Please select two different languages!');
        return;
      }
      
      const manifestUrl = getConfigUrl();
      const stremioUrl = 'stremio://' + manifestUrl.replace(/^https?:\\/\\//, '');
      window.location.href = stremioUrl;
    }

    function copyManifestUrl() {
      const mainVal = document.getElementById('mainLang').value;
      const transVal = document.getElementById('transLang').value;
      
      if (mainVal === transVal) {
        alert('Please select two different languages!');
        return;
      }
      
      const url = getConfigUrl();
      navigator.clipboard.writeText(url).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
      });
    }
  </script>
</body>
</html>`;
}

module.exports = generateLandingHTML;
