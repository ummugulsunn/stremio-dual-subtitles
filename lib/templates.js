/**
 * HTML templates for various pages
 */

function generateStatsHTML(stats, baseUrl, manifest) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics - ${manifest.name}</title>
  <link rel="icon" type="image/png" href="${manifest.logo}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --primary: #667eea;
      --secondary: #764ba2;
      --bg-dark: #0f0f1a;
      --bg-card: rgba(255, 255, 255, 0.03);
      --text: #ffffff;
      --text-muted: rgba(255, 255, 255, 0.6);
      --border: rgba(255, 255, 255, 0.08);
      --success: #10b981;
      --warning: #f59e0b;
      --gradient: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    }
    
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg-dark);
      color: var(--text);
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .header-left img {
      width: 48px;
      height: 48px;
      border-radius: 12px;
    }
    
    .header-left h1 {
      font-size: 24px;
      font-weight: 700;
    }
    
    .header-left p {
      font-size: 14px;
      color: var(--text-muted);
    }
    
    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      text-decoration: none;
      font-size: 14px;
      transition: all 0.3s;
    }
    
    .back-btn:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
    }
    
    .stat-card.highlight {
      background: var(--gradient);
      border: none;
    }
    
    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    
    .stat-card.highlight .stat-label {
      color: rgba(255, 255, 255, 0.8);
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: 800;
    }
    
    .stat-change {
      font-size: 12px;
      color: var(--success);
      margin-top: 4px;
    }
    
    .section {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section-title svg {
      width: 20px;
      height: 20px;
      color: var(--primary);
    }
    
    .chart-container {
      height: 200px;
      display: flex;
      align-items: flex-end;
      gap: 4px;
      padding: 20px 0;
    }
    
    .chart-bar {
      flex: 1;
      background: var(--gradient);
      border-radius: 4px 4px 0 0;
      min-height: 4px;
      transition: all 0.3s;
      position: relative;
    }
    
    .chart-bar:hover {
      opacity: 0.8;
    }
    
    .chart-bar::after {
      content: attr(data-value);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: var(--text-muted);
      padding-bottom: 4px;
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .chart-bar:hover::after {
      opacity: 1;
    }
    
    .chart-labels {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--text-muted);
      padding-top: 8px;
      border-top: 1px solid var(--border);
    }
    
    .language-list {
      display: grid;
      gap: 12px;
    }
    
    .language-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .language-rank {
      width: 28px;
      height: 28px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
    }
    
    .language-name {
      flex: 1;
      font-size: 14px;
    }
    
    .language-count {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary);
    }
    
    .activity-list {
      display: grid;
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .activity-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
    }
    
    .activity-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    
    .activity-icon.pageView { background: rgba(102, 126, 234, 0.2); }
    .activity-icon.install { background: rgba(16, 185, 129, 0.2); }
    .activity-icon.subtitleRequest { background: rgba(245, 158, 11, 0.2); }
    
    .activity-content {
      flex: 1;
    }
    
    .activity-title {
      font-size: 13px;
      font-weight: 500;
    }
    
    .activity-time {
      font-size: 11px;
      color: var(--text-muted);
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
    }
    
    .uptime-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 20px;
      font-size: 12px;
      color: var(--success);
    }
    
    .uptime-badge::before {
      content: '';
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        align-items: flex-start;
        gap: 20px;
      }
      
      .grid-2 {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <img src="${manifest.logo}" alt="Logo">
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Real-time addon usage statistics</p>
        </div>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span class="uptime-badge">Online • ${stats.overview.uptime}</span>
        <a href="${baseUrl}/configure" class="back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Addon
        </a>
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card highlight">
        <div class="stat-label">Total Page Views</div>
        <div class="stat-value">${stats.overview.totalPageViews.toLocaleString()}</div>
        <div class="stat-change">Today: ${stats.today.pageViews}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Addon Installs</div>
        <div class="stat-value">${stats.overview.totalInstalls.toLocaleString()}</div>
        <div class="stat-change">Today: ${stats.today.installs}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Subtitle Requests</div>
        <div class="stat-value">${stats.overview.totalSubtitleRequests.toLocaleString()}</div>
        <div class="stat-change">Today: ${stats.today.subtitleRequests}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Unique Visitors</div>
        <div class="stat-value">${stats.overview.uniqueVisitors.toLocaleString()}</div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
        Hourly Activity (Last 24 Hours)
      </div>
      <div class="chart-container">
        ${stats.hourlyChart.map((h, i) => {
          const maxVal = Math.max(...stats.hourlyChart.map(x => x.pageViews || 1));
          const height = ((h.pageViews || 0) / maxVal) * 100;
          return `<div class="chart-bar" style="height: ${Math.max(height, 2)}%" data-value="${h.pageViews || 0}"></div>`;
        }).join('')}
      </div>
      <div class="chart-labels">
        <span>24h ago</span>
        <span>12h ago</span>
        <span>Now</span>
      </div>
    </div>
    
    <div class="grid-2">
      <div class="section">
        <div class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          Top Languages
        </div>
        <div class="language-list">
          ${stats.topLanguages.length > 0 ? stats.topLanguages.map(([lang, count], i) => `
            <div class="language-item">
              <div class="language-rank">${i + 1}</div>
              <div class="language-name">${lang}</div>
              <div class="language-count">${count}</div>
            </div>
          `).join('') : '<div class="empty-state">No data yet</div>'}
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Top Language Pairs
        </div>
        <div class="language-list">
          ${stats.topPairs.length > 0 ? stats.topPairs.map(([pair, count], i) => `
            <div class="language-item">
              <div class="language-rank">${i + 1}</div>
              <div class="language-name">${pair}</div>
              <div class="language-count">${count}</div>
            </div>
          `).join('') : '<div class="empty-state">No data yet</div>'}
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Recent Activity
      </div>
      <div class="activity-list">
        ${stats.recentActivity.length > 0 ? stats.recentActivity.map(activity => {
          const icons = { pageView: '👁️', install: '⬇️', subtitleRequest: '🎬' };
          const titles = { 
            pageView: 'Page View', 
            install: \`Install: \${activity.details.mainLang?.split(' ')[0] || ''} + \${activity.details.transLang?.split(' ')[0] || ''}\`,
            subtitleRequest: \`Subtitle: \${activity.details.contentType || 'content'}\`
          };
          const timeAgo = formatTimeAgo(activity.timestamp);
          return \`
            <div class="activity-item">
              <div class="activity-icon \${activity.type}">\${icons[activity.type] || '📌'}</div>
              <div class="activity-content">
                <div class="activity-title">\${titles[activity.type] || activity.type}</div>
                <div class="activity-time">\${timeAgo}</div>
              </div>
            </div>
          \`;
        }).join('') : '<div class="empty-state">No recent activity</div>'}
      </div>
    </div>
  </div>
  
  <script>
    function formatTimeAgo(timestamp) {
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      if (seconds < 60) return 'Just now';
      if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
      if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
      return Math.floor(seconds / 86400) + 'd ago';
    }
    
    // Refresh every 30 seconds
    setTimeout(() => location.reload(), 30000);
  </script>
</body>
</html>`;
}

function generatePrivacyHTML(baseUrl, manifest) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - ${manifest.name}</title>
  <link rel="icon" type="image/png" href="${manifest.logo}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0f0f1a;
      color: #fff;
      line-height: 1.8;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 20px;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: rgba(255,255,255,0.6);
      text-decoration: none;
      font-size: 14px;
      margin-bottom: 40px;
    }
    .back-link:hover { color: #fff; }
    h1 {
      font-size: 36px;
      margin-bottom: 16px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .updated {
      font-size: 14px;
      color: rgba(255,255,255,0.5);
      margin-bottom: 40px;
    }
    h2 {
      font-size: 22px;
      margin: 40px 0 16px;
      color: #a5b4fc;
    }
    p, ul {
      color: rgba(255,255,255,0.8);
      margin-bottom: 16px;
    }
    ul {
      padding-left: 24px;
    }
    li {
      margin-bottom: 8px;
    }
    .highlight {
      background: rgba(102, 126, 234, 0.1);
      border-left: 3px solid #667eea;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="${baseUrl}/configure" class="back-link">← Back to Addon</a>
    
    <h1>Privacy Policy</h1>
    <p class="updated">Last updated: February 2026</p>
    
    <div class="highlight">
      <strong>TL;DR:</strong> We don't collect personal data. We don't track you. We don't sell anything. Your privacy is respected.
    </div>
    
    <h2>What We Collect</h2>
    <p>We collect minimal, anonymous data solely for improving the service:</p>
    <ul>
      <li><strong>Anonymous usage statistics:</strong> Page views, install counts, and language preferences (no personal identifiers)</li>
      <li><strong>Hashed IP addresses:</strong> Used only for counting unique visitors, not stored in identifiable form</li>
      <li><strong>Error logs:</strong> Technical errors for debugging, automatically deleted</li>
    </ul>
    
    <h2>What We Don't Collect</h2>
    <ul>
      <li>Personal information (name, email, etc.)</li>
      <li>Viewing history or what you watch</li>
      <li>Device information beyond basic stats</li>
      <li>Cookies for tracking purposes</li>
    </ul>
    
    <h2>Third-Party Services</h2>
    <p>We use:</p>
    <ul>
      <li><strong>OpenSubtitles:</strong> For fetching subtitles. Their privacy policy applies to their service.</li>
      <li><strong>Vercel:</strong> For hosting. Standard server logs may be collected by the hosting provider.</li>
    </ul>
    
    <h2>Data Storage</h2>
    <p>All analytics data is stored in memory and resets when the server restarts. No persistent database of user activity is maintained.</p>
    
    <h2>Your Rights</h2>
    <p>Since we don't collect personal data, there's nothing to delete or export. You can use the addon completely anonymously.</p>
    
    <h2>Open Source</h2>
    <p>This addon is open source. You can verify our privacy practices by reviewing the code on <a href="https://github.com/ummugulsunn/stremio-dual-subtitles" style="color: #667eea;">GitHub</a>.</p>
    
    <h2>Contact</h2>
    <p>Questions? Open an issue on our GitHub repository.</p>
  </div>
</body>
</html>`;
}

function generateErrorHTML(code, message, baseUrl, manifest) {
  const titles = {
    404: 'Page Not Found',
    500: 'Server Error',
    429: 'Too Many Requests'
  };
  
  const descriptions = {
    404: "The page you're looking for doesn't exist or has been moved.",
    500: "Something went wrong on our end. Please try again later.",
    429: "You've made too many requests. Please wait a moment and try again."
  };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${code} - ${titles[code] || 'Error'}</title>
  <link rel="icon" type="image/png" href="${manifest.logo}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0f0f1a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 40px 20px;
    }
    .code {
      font-size: 120px;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1;
    }
    h1 {
      font-size: 28px;
      margin: 20px 0 12px;
    }
    p {
      color: rgba(255,255,255,0.6);
      font-size: 16px;
      margin-bottom: 32px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 28px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      transition: transform 0.3s;
    }
    .btn:hover {
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="code">${code}</div>
    <h1>${titles[code] || 'Error'}</h1>
    <p>${descriptions[code] || message}</p>
    <a href="${baseUrl}/configure" class="btn">
      ← Back to Home
    </a>
  </div>
</body>
</html>`;
}

module.exports = {
  generateStatsHTML,
  generatePrivacyHTML,
  generateErrorHTML
};
