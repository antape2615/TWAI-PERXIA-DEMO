import { useEffect, useMemo, useState } from 'react';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import { useRoomMonitor } from '../hooks/useRoomMonitor';
import { profileLabel } from '../utils/realtimeProfile';
import styles from './VoiceAnalysisDashboard.module.css';

const STATUS_COPY = {
  idle: 'Inactivo',
  waiting: 'Esperando celular',
  connecting: 'Conectando…',
  listening: 'Escuchando',
  speaking: 'Agente hablando',
  ended: 'Finalizada',
  error: 'Error',
};

const ORIGIN_KEY = 'voice_public_origin';

function emotionClass(emotion, stylesMap) {
  switch (emotion) {
    case 'frustrado':
    case 'ansioso':
      return stylesMap.emotionAlert;
    case 'emocionado':
      return stylesMap.emotionUp;
    case 'confundido':
      return stylesMap.emotionSoft;
    default:
      return stylesMap.emotionCalm;
  }
}

function formatTime(at) {
  try {
    return new Date(at).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

function normalizeOrigin(value) {
  const raw = (value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return u.origin;
  } catch {
    return '';
  }
}

export default function VoiceAnalysisDashboard() {
  const { room, error: roomError, loading, createRoom } = useRoomMonitor({ pollMs: 500 });
  const [publicOrigin, setPublicOrigin] = useState(() => {
    try {
      return sessionStorage.getItem(ORIGIN_KEY) || '';
    } catch {
      return '';
    }
  });
  const [tunnelOrigin, setTunnelOrigin] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/realtime/tunnel');
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data?.origin) {
          setTunnelOrigin(data.origin);
          setPublicOrigin((prev) => prev || data.origin);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    try {
      if (publicOrigin) sessionStorage.setItem(ORIGIN_KEY, publicOrigin);
    } catch {
      /* ignore */
    }
  }, [publicOrigin]);

  const effectiveOrigin = useMemo(() => {
    const manual = normalizeOrigin(publicOrigin);
    if (manual) return manual;
    if (tunnelOrigin) return normalizeOrigin(tunnelOrigin);
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return window.location.origin;
    }
    return '';
  }, [publicOrigin, tunnelOrigin]);

  const joinUrl = useMemo(() => {
    if (!room.code || !effectiveOrigin) return '';
    return `${effectiveOrigin}/voz/${room.code}`;
  }, [room.code, effectiveOrigin]);

  const qrUrl = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`
    : '';

  const needsHttpsHint =
    !effectiveOrigin ||
    (typeof window !== 'undefined' &&
      window.location.protocol === 'http:' &&
      !tunnelOrigin &&
      !normalizeOrigin(publicOrigin));

  const {
    status: localStatus,
    error: localError,
    connect,
    disconnect,
    isActive,
  } = useRealtimeChat({ roomCode: room.code });

  const liveStatus = isActive ? localStatus : room.status;
  const profile = room.profile;
  const transcripts = room.transcripts || [];
  const events = [...(room.events || [])].slice().reverse();
  const analysis = room.analysis || [];

  return (
    <section className={styles.dashboard} aria-label="Dashboard de análisis de voz en tiempo real">
      <header className={styles.top}>
        <div>
          <p className={styles.kicker}>Análisis en tiempo real</p>
          <h2 className={styles.title}>Traza · Transcripción · Sentimiento</h2>
          <p className={styles.lead}>
            En iPhone Safari exige HTTPS (HTTP en la Wi‑Fi no funciona ni permite micrófono). Arranca
            el túnel y escanea el QR.
          </p>
        </div>
        <div className={styles.statusBlock}>
          <span className={`${styles.pill} ${styles[`st_${liveStatus}`] || ''}`}>
            {STATUS_COPY[liveStatus] || liveStatus}
          </span>
          <span className={styles.meta}>
            {room.mobileConnected ? 'Celular conectado' : 'Sin audio remoto'}
          </span>
        </div>
      </header>

      {(roomError || localError) && (
        <p className={styles.error} role="alert">
          {localError || roomError}
        </p>
      )}

      {needsHttpsHint && (
        <p className={styles.warn} role="status">
          Para iPhone: con <code>npm run dev:full</code> ya corriendo, abre otra terminal y ejecuta{' '}
          <code>npm run tunnel</code>. Pega la URL <strong>https://…trycloudflare.com</strong> abajo
          (o espera a que el QR se actualice solo).
        </p>
      )}

      <div className={styles.grid}>
        <aside className={styles.pairCard}>
          <h3>Activar desde el celular</h3>
          {loading && !room.code ? (
            <p className={styles.muted}>Creando sala…</p>
          ) : (
            <>
              <p className={styles.code}>{room.code}</p>
              <label className={styles.originLabel} htmlFor="public-origin">
                Origen HTTPS (túnel)
              </label>
              <input
                id="public-origin"
                className={styles.originInput}
                type="url"
                placeholder="https://xxxx.trycloudflare.com"
                value={publicOrigin}
                onChange={(e) => setPublicOrigin(e.target.value)}
              />
              {qrUrl ? (
                <img
                  className={styles.qr}
                  src={qrUrl}
                  alt={`Código QR para unirse a la sala ${room.code}`}
                />
              ) : (
                <p className={styles.muted}>Esperando URL HTTPS del túnel para generar el QR…</p>
              )}
              {joinUrl ? (
                <p className={styles.joinUrl}>{joinUrl}</p>
              ) : (
                <p className={styles.hint}>
                  No uses http://192.168… en iPhone: Safari lo bloquea. Usa el túnel HTTPS.
                </p>
              )}
              {tunnelOrigin && (
                <p className={styles.hint}>Túnel detectado: {tunnelOrigin}</p>
              )}
            </>
          )}
          <div className={styles.pairActions}>
            <button type="button" className={styles.secondaryBtn} onClick={createRoom}>
              Nueva sala
            </button>
            {!isActive ? (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={connect}
                disabled={!room.code}
              >
                Usar micrófono de este equipo
              </button>
            ) : (
              <button type="button" className={styles.stopBtn} onClick={disconnect}>
                Colgar aquí
              </button>
            )}
          </div>
        </aside>

        <div className={`${styles.sentimentCard} ${emotionClass(profile?.emotion, styles)}`}>
          <h3>Sentimiento actual</h3>
          <p className={styles.sentimentValue}>{profile?.emotion || 'neutro'}</p>
          <p className={styles.sentimentSub}>{profileLabel(profile)}</p>
          <dl className={styles.profileGrid}>
            <div>
              <dt>Edad aprox.</dt>
              <dd>{profile?.ageBand}</dd>
            </div>
            <div>
              <dt>Nivel técnico</dt>
              <dd>{profile?.technicalLevel}</dd>
            </div>
            <div>
              <dt>Ritmo</dt>
              <dd>{profile?.speechPace}</dd>
            </div>
            <div>
              <dt>Respuestas</dt>
              <dd>{profile?.responsePreference}</dd>
            </div>
            <div>
              <dt>Formalidad</dt>
              <dd>{profile?.formality}</dd>
            </div>
            <div>
              <dt>Confianza</dt>
              <dd>{Math.round((profile?.confidence || 0) * 100)}%</dd>
            </div>
          </dl>
        </div>

        <section className={`${styles.panel} ${styles.transcriptPanel}`}>
          <h3>Transcripción en vivo</h3>
          <ul className={styles.transcriptList}>
            {transcripts.length === 0 && (
              <li className={styles.empty}>Aún no hay habla detectada…</li>
            )}
            {transcripts.map((t) => (
              <li
                key={`${t.at}-${t.role}-${t.text.slice(0, 12)}`}
                className={t.role === 'user' ? styles.userLine : styles.botLine}
              >
                <div className={styles.lineMeta}>
                  <span>{t.role === 'user' ? 'Usuario' : 'Agente'}</span>
                  <time>{formatTime(t.at)}</time>
                  {t.emotion && <em>{t.emotion}</em>}
                </div>
                {t.text}
              </li>
            ))}
          </ul>
        </section>

        <section className={`${styles.panel} ${styles.tracePanel}`}>
          <h3>Traza de análisis</h3>
          <ol className={styles.traceList}>
            {events.length === 0 && <li className={styles.empty}>Sin eventos todavía</li>}
            {events.map((ev) => (
              <li key={ev.id}>
                <time>{formatTime(ev.at)}</time>
                <strong>{ev.label}</strong>
                {ev.detail ? <span>{ev.detail}</span> : null}
              </li>
            ))}
          </ol>
        </section>

        <section className={`${styles.panel} ${styles.analysisWide}`}>
          <h3>Historial de sentimiento / perfil</h3>
          <div className={styles.analysisRow}>
            {analysis.length === 0 && <p className={styles.empty}>Esperando primer análisis…</p>}
            {analysis.map((a) => (
              <article key={`${a.at}-${a.emotion}`} className={emotionClass(a.emotion, styles)}>
                <time>{formatTime(a.at)}</time>
                <strong>{a.emotion}</strong>
                <span>
                  {a.technicalLevel} · {a.ageBand} · {a.speechPace}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
