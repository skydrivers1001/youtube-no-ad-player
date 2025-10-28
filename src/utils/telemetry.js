// Lightweight telemetry for SPA: local buffer + optional remote POST
const LOG_KEY = '__telemetry_logs__';
const MAX_LOGS = 300;
let buffer = [];
let initialized = false;
let config = {
  env: process.env.NODE_ENV || 'production',
  release: 'unknown',
  endpoint: null,
  debug: false,
};

const now = () => new Date().toISOString();

function loadStored() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStored(logs) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
  } catch (e) {}
}

function append(entry) {
  const enriched = {
    ...entry,
    ts: now(),
    env: config.env,
    release: config.release,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  buffer.push(enriched);
  const stored = loadStored();
  stored.push(enriched);
  saveStored(stored);
  if (config.debug) {
    const tag = entry.type === 'error' ? '[telemetry:error]' : '[telemetry]';
    // eslint-disable-next-line no-console
    console.log(tag, enriched);
  }
}

async function tryPost(payload) {
  if (!config.endpoint) return;
  try {
    await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (e) {
    // network issues; keep silent
  }
}

const telemetry = {
  init(options = {}) {
    if (initialized) return;
    initialized = true;
    config = {
      ...config,
      ...options,
    };
    // enable debug via query ?debug=1
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('debug') === '1') config.debug = true;
    } catch {}
    // basic boot event
    append({ type: 'event', name: 'boot', data: { path: window.location.pathname } });
  },
  captureGlobalErrors() {
    // window error
    window.addEventListener('error', (event) => {
      const { message, filename, lineno, colno, error } = event;
      const isScriptError = message === 'Script error.' && (!filename || filename === '');
      append({ type: 'error', name: 'window_error', data: { message, filename, lineno, colno, stack: (error && error.stack) || null, scriptError: isScriptError } });
      tryPost({ kind: 'error', source: 'window', message, filename, lineno, colno });
    }, true);
    // unhandled rejection
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event?.reason;
      append({ type: 'error', name: 'unhandled_rejection', data: { message: reason?.message || String(reason), stack: reason?.stack || null } });
      tryPost({ kind: 'error', source: 'promise', message: reason?.message || String(reason) });
    });
    // chunk loading errors (heuristic)
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function(tagName, options) {
      const el = origCreateElement(tagName, options);
      if (tagName.toLowerCase() === 'script') {
        el.addEventListener('error', () => {
          append({ type: 'error', name: 'script_load_error', data: { src: el.src } });
          tryPost({ kind: 'error', source: 'script', src: el.src });
        });
      }
      return el;
    };
  },
  logEvent(name, data = {}) {
    append({ type: 'event', name, data });
  },
  logError(error, context = {}) {
    const data = {
      message: error?.message || String(error),
      stack: error?.stack || null,
      context,
    };
    append({ type: 'error', name: 'caught_error', data });
    tryPost({ kind: 'error', source: 'caught', ...data });
  },
  flush() {
    const logs = loadStored();
    if (!logs.length) return Promise.resolve();
    return tryPost({ kind: 'batch', logs });
  },
  getLogs() {
    return loadStored();
  },
  clear() {
    saveStored([]);
    buffer = [];
  },
};

export default telemetry;