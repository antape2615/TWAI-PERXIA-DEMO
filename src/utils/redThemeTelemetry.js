const SESSION_KEY = 'cocinastore-session-id';
const LOG_RETENTION_DAYS = 30;

function getSessionId() {
  if (typeof window === 'undefined') return 'server';

  try {
    let sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      window.sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return 'anonymous';
  }
}

function getUserRole() {
  if (typeof window === 'undefined') return 'anonymous';

  try {
    const raw = window.localStorage.getItem('cocinastore-user');
    if (!raw) return 'anonymous';
    const user = JSON.parse(raw);
    return user?.email ? 'demo' : 'anonymous';
  } catch {
    return 'anonymous';
  }
}

export function trackRedThemeEvent(eventName, payload = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    user: getUserRole(),
    action: eventName,
    origin: 'red-theme-ui',
    retentionDays: LOG_RETENTION_DAYS,
    ...payload,
  };

  console.info('[RedTheme]', entry);
  return entry;
}
