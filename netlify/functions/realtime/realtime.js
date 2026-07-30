/**
 * OpenAI Realtime — client secrets + salas de análisis (móvil ↔ dashboard web).
 * La API key permanece solo en el servidor (OPENAI_API_KEY).
 */

const crypto = require("crypto");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
/** marin/cedar: las voces más naturales de Realtime API */
const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE || "marin";
const ROOM_TTL_MS = 60 * 60 * 1000;
const MAX_EVENTS = 120;
const MAX_TRANSCRIPTS = 80;
const MAX_ANALYSIS = 60;

/** @type {Map<string, object>} code -> room */
const rooms = new Map();
/** @type {Map<string, string>} sessionId -> room code */
const sessionToRoom = new Map();

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Email",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

function normalizePath(event) {
  let p = event.path || "";
  if (event.rawPath) p = event.rawPath;
  if (p.startsWith("http://") || p.startsWith("https://")) {
    try {
      p = new URL(p).pathname;
    } catch (_) {
      /* keep p */
    }
  }
  return (
    p
      .replace(/\/\.netlify\/functions\/realtime/gi, "")
      .replace(/\/api\/realtime/gi, "")
      .replace(/\/+$/, "") || "/"
  );
}

function defaultProfile() {
  return {
    ageBand: "desconocido",
    technicalLevel: "medio",
    emotion: "neutro",
    speechPace: "normal",
    responsePreference: "equilibrado",
    formality: "neutral",
    confidence: 0.3,
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}

function mergeProfile(current, patch = {}) {
  const next = { ...defaultProfile(), ...current };
  for (const key of Object.keys(defaultProfile())) {
    if (key === "updatedAt") continue;
    if (patch[key] !== undefined && patch[key] !== null && patch[key] !== "") {
      next[key] = patch[key];
    }
  }
  if (typeof next.confidence === "number") {
    next.confidence = Math.min(1, Math.max(0, next.confidence));
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

function purgeExpired() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.expiresAt <= now) {
      if (room.sessionId) sessionToRoom.delete(room.sessionId);
      rooms.delete(code);
    }
  }
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return code;
}

function createRoom() {
  purgeExpired();
  let code = makeRoomCode();
  while (rooms.has(code)) code = makeRoomCode();
  const now = Date.now();
  const room = {
    code,
    sessionId: null,
    status: "waiting",
    mobileConnected: false,
    profile: defaultProfile(),
    transcripts: [],
    events: [],
    analysis: [],
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    expiresAt: now + ROOM_TTL_MS,
  };
  rooms.set(code, room);
  return room;
}

function touch(room) {
  room.updatedAt = new Date().toISOString();
  room.expiresAt = Date.now() + ROOM_TTL_MS;
}

function pushEvent(room, event) {
  const item = {
    id: crypto.randomUUID(),
    at: event.at || Date.now(),
    type: event.type || "info",
    label: event.label || event.type || "evento",
    detail: event.detail || "",
  };
  room.events = [...room.events, item].slice(-MAX_EVENTS);
  touch(room);
  return item;
}

function publicRoom(room) {
  return {
    ok: true,
    code: room.code,
    sessionId: room.sessionId,
    status: room.status,
    mobileConnected: room.mobileConnected,
    profile: room.profile,
    transcripts: room.transcripts,
    events: room.events,
    analysis: room.analysis,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

function getRoom(code) {
  purgeExpired();
  if (!code) return null;
  return rooms.get(String(code).toUpperCase()) || null;
}

function baseInstructions(profile) {
  return [
    "Eres una asesora de cobranzas cálida y humana en «Gestiona tus créditos».",
    "Hablas en español latinoamericano coloquial-profesional, siempre por voz.",
    "Suena como una persona real en una llamada: contracciones (está, vamos, mira), ritmo irregular natural,",
    "pausas breves, ligera expresividad. Nunca como un robot, locutor de IVR ni texto leído en voz alta.",
    "Prohibido: listas numeradas, viñetas, markdown, «Absolutamente», «Por supuesto», «Claro que sí» de relleno.",
    "No digas que analizas al usuario. Si detectas señales de perfil, llama a update_user_profile en silencio.",
    `Perfil inicial: emoción=${profile.emotion}, técnico=${profile.technicalLevel}, edad≈${profile.ageBand}.`,
  ].join(" ");
}

const PROFILE_TOOL = {
  type: "function",
  name: "update_user_profile",
  description:
    "Actualiza el perfil temporal del interlocutor cuando detectes señales en voz, ritmo, vocabulario o emoción.",
  parameters: {
    type: "object",
    properties: {
      ageBand: { type: "string", enum: ["joven", "adulto", "mayor", "desconocido"] },
      technicalLevel: { type: "string", enum: ["bajo", "medio", "alto"] },
      emotion: {
        type: "string",
        enum: ["tranquilo", "frustrado", "confundido", "emocionado", "neutro", "ansioso"],
      },
      speechPace: { type: "string", enum: ["lento", "normal", "rapido"] },
      responsePreference: { type: "string", enum: ["corto", "equilibrado", "detallado"] },
      formality: { type: "string", enum: ["cercana", "neutral", "formal"] },
      confidence: { type: "number" },
      notes: { type: "string" },
    },
    required: ["ageBand", "technicalLevel", "emotion", "speechPace", "responsePreference"],
  },
};

async function mintClientSecret(sessionId, profile) {
  const body = {
    expires_after: { anchor: "created_at", seconds: 600 },
    session: {
      type: "realtime",
      model: REALTIME_MODEL,
      instructions: baseInstructions(profile),
      output_modalities: ["audio"],
      tools: [PROFILE_TOOL],
      tool_choice: "auto",
      audio: {
        input: {
          turn_detection: { type: "semantic_vad" },
          transcription: { model: "gpt-4o-mini-transcribe" },
        },
        output: { voice: REALTIME_VOICE },
      },
    },
  };

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": crypto
        .createHash("sha256")
        .update(sessionId)
        .digest("hex")
        .slice(0, 64),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error?.message || data?.message || "No se pudo crear la sesión Realtime";
    const err = new Error(msg);
    err.status = response.status;
    err.payload = data;
    throw err;
  }
  return data;
}

function applyRoomSync(room, body) {
  if (body.status) room.status = body.status;
  if (typeof body.mobileConnected === "boolean") room.mobileConnected = body.mobileConnected;
  if (body.sessionId) {
    room.sessionId = body.sessionId;
    sessionToRoom.set(body.sessionId, room.code);
  }
  if (body.profile) {
    room.profile = mergeProfile(room.profile, body.profile);
    room.analysis = [
      ...room.analysis,
      {
        at: Date.now(),
        emotion: room.profile.emotion,
        technicalLevel: room.profile.technicalLevel,
        ageBand: room.profile.ageBand,
        speechPace: room.profile.speechPace,
        responsePreference: room.profile.responsePreference,
        formality: room.profile.formality,
        confidence: room.profile.confidence,
        notes: room.profile.notes || "",
      },
    ].slice(-MAX_ANALYSIS);
  }
  if (body.transcript) {
    const t = {
      role: body.transcript.role || "user",
      text: String(body.transcript.text || "").trim(),
      at: body.transcript.at || Date.now(),
      emotion: room.profile.emotion,
    };
    if (t.text) {
      room.transcripts = [...room.transcripts, t].slice(-MAX_TRANSCRIPTS);
    }
  }
  if (Array.isArray(body.events)) {
    for (const ev of body.events) pushEvent(room, ev);
  } else if (body.event) {
    pushEvent(room, body.event);
  }
  touch(room);
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  const path = normalizePath(event);
  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      return json(400, { ok: false, error: "Cuerpo de solicitud inválido" });
    }
  }

  try {
    if (event.httpMethod === "POST" && path === "/room") {
      const room = createRoom();
      pushEvent(room, {
        type: "room_created",
        label: "Sala creada",
        detail: "Esperando audio desde el celular o este equipo",
      });
      return json(200, publicRoom(room));
    }

    const roomMatch = path.match(/^\/room\/([A-Za-z0-9]+)$/);
    const roomSyncMatch = path.match(/^\/room\/([A-Za-z0-9]+)\/sync$/);
    const roomEventsMatch = path.match(/^\/room\/([A-Za-z0-9]+)\/events$/);

    if (event.httpMethod === "GET" && roomMatch) {
      const room = getRoom(roomMatch[1]);
      if (!room) return json(404, { ok: false, error: "Sala no encontrada o expirada" });
      return json(200, publicRoom(room));
    }

    if (event.httpMethod === "POST" && roomSyncMatch) {
      const room = getRoom(roomSyncMatch[1]);
      if (!room) return json(404, { ok: false, error: "Sala no encontrada o expirada" });
      applyRoomSync(room, body);
      return json(200, publicRoom(room));
    }

    if (event.httpMethod === "POST" && roomEventsMatch) {
      const room = getRoom(roomEventsMatch[1]);
      if (!room) return json(404, { ok: false, error: "Sala no encontrada o expirada" });
      if (Array.isArray(body.events)) {
        for (const ev of body.events) pushEvent(room, ev);
      } else {
        pushEvent(room, body);
      }
      return json(200, publicRoom(room));
    }

    if (event.httpMethod === "POST" && (path === "/session" || path === "/" || path === "")) {
      if (!OPENAI_API_KEY) {
        return json(503, {
          ok: false,
          error:
            "Falta OPENAI_API_KEY en el entorno del servidor. Configúrala en Netlify o al ejecutar netlify dev.",
        });
      }

      const roomCode = body.roomCode ? String(body.roomCode).toUpperCase() : null;
      let room = roomCode ? getRoom(roomCode) : null;
      if (roomCode && !room) {
        return json(404, { ok: false, error: "Sala no encontrada o expirada" });
      }

      const sessionId = crypto.randomUUID();
      const profile = room ? room.profile : defaultProfile();
      const secret = await mintClientSecret(sessionId, profile);
      const clientSecret = secret.value || secret.client_secret?.value || null;

      if (!clientSecret) {
        return json(502, {
          ok: false,
          error: "Respuesta inesperada de OpenAI al crear client secret",
          detail: secret,
        });
      }

      if (room) {
        room.sessionId = sessionId;
        room.mobileConnected = true;
        room.status = "connecting";
        sessionToRoom.set(sessionId, room.code);
        pushEvent(room, {
          type: "session_started",
          label: "Sesión de voz iniciada",
          detail: `session ${sessionId.slice(0, 8)}…`,
        });
        touch(room);
      }

      return json(200, {
        ok: true,
        sessionId,
        clientSecret,
        model: REALTIME_MODEL,
        voice: REALTIME_VOICE,
        profile,
        roomCode: room ? room.code : null,
        expiresAt: secret.expires_at || null,
      });
    }

    if (event.httpMethod === "POST" && path === "/profile") {
      const sessionId = body.sessionId;
      if (!sessionId) {
        return json(400, { ok: false, error: "sessionId requerido" });
      }
      const code = sessionToRoom.get(sessionId);
      const room = code ? getRoom(code) : null;
      if (room) {
        applyRoomSync(room, { profile: body.profile || body, sessionId });
        pushEvent(room, {
          type: "profile_update",
          label: "Perfil actualizado",
          detail: `${room.profile.emotion} · ${room.profile.technicalLevel} · ${room.profile.ageBand}`,
        });
        return json(200, { ok: true, sessionId, profile: room.profile, roomCode: room.code });
      }
      return json(200, {
        ok: true,
        sessionId,
        profile: mergeProfile(defaultProfile(), body.profile || body),
      });
    }

    if (event.httpMethod === "GET" && path === "/profile") {
      const sessionId =
        (event.queryStringParameters && event.queryStringParameters.sessionId) || "";
      if (!sessionId) {
        return json(400, { ok: false, error: "sessionId requerido" });
      }
      const code = sessionToRoom.get(sessionId);
      const room = code ? getRoom(code) : null;
      if (!room) {
        return json(404, { ok: false, error: "Perfil de sesión no encontrado o expirado" });
      }
      return json(200, { ok: true, sessionId, profile: room.profile, roomCode: room.code });
    }

    return json(404, { ok: false, error: "Ruta no encontrada" });
  } catch (err) {
    console.error("Realtime error:", err);
    return json(err.status || 500, {
      ok: false,
      error: err.message || "Error interno del servicio Realtime",
      detail: err.payload || undefined,
    });
  }
};
