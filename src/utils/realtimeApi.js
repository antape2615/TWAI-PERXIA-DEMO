const API_BASE = '/api/realtime';

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function createRealtimeSession(roomCode) {
  return parse(
    await fetch(`${API_BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomCode ? { roomCode } : {}),
    }),
  );
}

export async function updateRealtimeProfile(sessionId, profilePatch) {
  return parse(
    await fetch(`${API_BASE}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, profile: profilePatch }),
    }),
  );
}

export async function fetchRealtimeProfile(sessionId) {
  const qs = new URLSearchParams({ sessionId });
  return parse(await fetch(`${API_BASE}/profile?${qs.toString()}`));
}

export async function createAnalysisRoom() {
  return parse(
    await fetch(`${API_BASE}/room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
  );
}

export async function fetchAnalysisRoom(code) {
  return parse(await fetch(`${API_BASE}/room/${encodeURIComponent(code)}`));
}

export async function syncAnalysisRoom(code, payload) {
  return parse(
    await fetch(`${API_BASE}/room/${encodeURIComponent(code)}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}
