/**
 * Simple in-memory analytics for tracking addon usage.
 * Note: Data resets on server restart. For persistent analytics,
 * consider using a database or external service.
 */

const analytics = {
  // General stats
  totalPageViews: 0,
  totalInstalls: 0,
  totalSubtitleRequests: 0,
  totalSubtitlesServed: 0,
  
  // Time-based stats (last 24 hours, hourly buckets)
  hourlyStats: new Array(24).fill(null).map(() => ({
    pageViews: 0,
    installs: 0,
    subtitleRequests: 0,
    timestamp: null
  })),
  
  // Language popularity
  languageStats: {},
  
  // Daily stats (last 7 days)
  dailyStats: new Array(7).fill(null).map(() => ({
    pageViews: 0,
    installs: 0,
    subtitleRequests: 0,
    date: null
  })),
  
  // Recent activity log (last 100 events)
  recentActivity: [],
  
  // Server start time
  serverStartTime: Date.now(),
  
  // Unique visitors (approximate, based on IP hash)
  uniqueVisitors: new Set()
};

// Simple hash function for IP anonymization
function hashIP(ip) {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function getCurrentHourIndex() {
  return new Date().getHours();
}

function getCurrentDayIndex() {
  return new Date().getDay();
}

function updateHourlyStats(field) {
  const hourIndex = getCurrentHourIndex();
  const currentHour = new Date().setMinutes(0, 0, 0);
  
  if (analytics.hourlyStats[hourIndex].timestamp !== currentHour) {
    // Reset this hour's stats
    analytics.hourlyStats[hourIndex] = {
      pageViews: 0,
      installs: 0,
      subtitleRequests: 0,
      timestamp: currentHour
    };
  }
  
  analytics.hourlyStats[hourIndex][field]++;
}

function updateDailyStats(field) {
  const dayIndex = getCurrentDayIndex();
  const today = new Date().toDateString();
  
  if (analytics.dailyStats[dayIndex].date !== today) {
    // Reset this day's stats
    analytics.dailyStats[dayIndex] = {
      pageViews: 0,
      installs: 0,
      subtitleRequests: 0,
      date: today
    };
  }
  
  analytics.dailyStats[dayIndex][field]++;
}

function addActivity(type, details) {
  analytics.recentActivity.unshift({
    type,
    details,
    timestamp: Date.now()
  });
  
  // Keep only last 100 events
  if (analytics.recentActivity.length > 100) {
    analytics.recentActivity.pop();
  }
}

// Track page view
function trackPageView(ip, page) {
  analytics.totalPageViews++;
  updateHourlyStats('pageViews');
  updateDailyStats('pageViews');
  
  const hashedIP = hashIP(ip || 'unknown');
  analytics.uniqueVisitors.add(hashedIP);
  
  addActivity('pageView', { page });
}

// Track addon install
function trackInstall(ip, mainLang, transLang) {
  analytics.totalInstalls++;
  updateHourlyStats('installs');
  updateDailyStats('installs');
  
  // Track language popularity
  const langPair = `${mainLang}+${transLang}`;
  analytics.languageStats[langPair] = (analytics.languageStats[langPair] || 0) + 1;
  analytics.languageStats[mainLang] = (analytics.languageStats[mainLang] || 0) + 1;
  analytics.languageStats[transLang] = (analytics.languageStats[transLang] || 0) + 1;
  
  addActivity('install', { mainLang, transLang });
}

// Track subtitle request
function trackSubtitleRequest(mainLang, transLang, contentType) {
  analytics.totalSubtitleRequests++;
  updateHourlyStats('subtitleRequests');
  updateDailyStats('subtitleRequests');
  
  addActivity('subtitleRequest', { mainLang, transLang, contentType });
}

// Track subtitle served
function trackSubtitleServed() {
  analytics.totalSubtitlesServed++;
}

// Get analytics summary
function getAnalyticsSummary() {
  const now = Date.now();
  const uptime = Math.floor((now - analytics.serverStartTime) / 1000);
  
  // Calculate today's stats
  const todayIndex = getCurrentDayIndex();
  const todayStats = analytics.dailyStats[todayIndex].date === new Date().toDateString()
    ? analytics.dailyStats[todayIndex]
    : { pageViews: 0, installs: 0, subtitleRequests: 0 };
  
  // Get top languages
  const topLanguages = Object.entries(analytics.languageStats)
    .filter(([key]) => !key.includes('+')) // Exclude pairs
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  // Get top language pairs
  const topPairs = Object.entries(analytics.languageStats)
    .filter(([key]) => key.includes('+'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  // Calculate hourly chart data (last 24 hours)
  const hourlyChart = [];
  for (let i = 0; i < 24; i++) {
    const hourIndex = (getCurrentHourIndex() - 23 + i + 24) % 24;
    hourlyChart.push({
      hour: hourIndex,
      ...analytics.hourlyStats[hourIndex]
    });
  }
  
  return {
    overview: {
      totalPageViews: analytics.totalPageViews,
      totalInstalls: analytics.totalInstalls,
      totalSubtitleRequests: analytics.totalSubtitleRequests,
      totalSubtitlesServed: analytics.totalSubtitlesServed,
      uniqueVisitors: analytics.uniqueVisitors.size,
      uptime: formatUptime(uptime)
    },
    today: todayStats,
    topLanguages,
    topPairs,
    hourlyChart,
    recentActivity: analytics.recentActivity.slice(0, 20)
  };
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

module.exports = {
  trackPageView,
  trackInstall,
  trackSubtitleRequest,
  trackSubtitleServed,
  getAnalyticsSummary
};
