const DEFAULT_REDACT_KEYS = [
  'authorization',
  'token',
  'access_token',
  'refresh_token',
  'cookie',
  'set-cookie',
  'api_key',
  'apikey',
  'key',
  'password'
];

function isDebugEnabled() {
  return process.env.DEBUG_MODE === 'true' || process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
}

function sanitizeForLogging(data) {
  if (data == null) return data;
  if (typeof data === 'string') {
    return data.length > 500 ? `${data.slice(0, 500)}…` : data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeForLogging);
  }
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (DEFAULT_REDACT_KEYS.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }
    return sanitized;
  }
  return data;
}

function createLogger(prefix) {
  const enabled = isDebugEnabled();
  return {
    log: (...args) => {
      if (!enabled) return;
      console.log(prefix, ...args.map(sanitizeForLogging));
    },
    info: (...args) => {
      if (!enabled) return;
      console.info(prefix, ...args.map(sanitizeForLogging));
    },
    warn: (...args) => {
      if (!enabled) return;
      console.warn(prefix, ...args.map(sanitizeForLogging));
    },
    error: (...args) => {
      if (!enabled) return;
      console.error(prefix, ...args.map(sanitizeForLogging));
    },
    apiRequest: (message, meta = {}) => {
      if (!enabled) return;
      console.log(`${prefix} ${message}`, sanitizeForLogging(meta));
    }
  };
}

const debug = createLogger('[debug]');
const debugServer = createLogger('[server]');

module.exports = {
  debug,
  debugServer,
  sanitizeForLogging
};
